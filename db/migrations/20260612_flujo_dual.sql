-- ============================================================================
-- MIGRACION: FLUJO DUAL DE LIQUIDACION (CASO 1)
-- FECHA: 2026-06-12
-- AUTOR: antigravity
-- ============================================================================

-- 1. Insertar el nuevo estado de tarea si no existe
INSERT INTO public.estados_tareas (id, codigo, nombre, descripcion, orden, color)
VALUES (12, 'base', 'Presupuesto Base', 'Supervisor cargo presupuesto base', 12, 'purple')
ON CONFLICT (id) DO NOTHING;

-- 2. Agregar columna fisica a presupuestos_base
ALTER TABLE public.presupuestos_base ADD COLUMN IF NOT EXISTS base_liquidada BOOLEAN DEFAULT false;

-- 3. Eliminar vistas dependientes para evitar errores de tipo/columna
DROP VIEW IF EXISTS public.vista_pb_admin;
DROP VIEW IF EXISTS public.vista_pb_supervisor;
DROP VIEW IF EXISTS public.vista_presupuestos_base_completa;

-- 4. Recrear vista_presupuestos_base_completa
CREATE OR REPLACE VIEW public.vista_presupuestos_base_completa AS
 SELECT pb.id,
    pb.code,
    pb.id_tarea,
    t.titulo AS titulo_tarea,
    pb.materiales,
    pb.mano_obra,
    pb.total,
    pb.aprobado,
    pb.fecha_aprobacion,
    pb.id_supervisor,
    u.email AS email_supervisor,
    pb.id_edificio,
    e.nombre AS nombre_edificio,
    pb.id_administrador,
    a.nombre AS nombre_administrador,
    pb.created_at,
    pb.updated_at,
    pb.nota_pb,
    pb.base_liquidada, -- Nueva columna fisica
    (EXISTS ( SELECT 1
           FROM liquidaciones_nuevas ln
          WHERE (ln.id_presupuesto_base = pb.id))) AS tiene_liquidacion,
    pb.base_liquidada AS esta_liquidado, -- Sincronizado con la columna fisica
    t.se_trabajo
   FROM ((((presupuestos_base pb
     LEFT JOIN tareas t ON ((pb.id_tarea = t.id)))
     LEFT JOIN usuarios u ON ((pb.id_supervisor = u.id)))
     LEFT JOIN edificios e ON ((pb.id_edificio = e.id)))
     LEFT JOIN administradores a ON ((pb.id_administrador = a.id)));

-- 5. Recrear vista_pb_supervisor
CREATE OR REPLACE VIEW public.vista_pb_supervisor AS
 WITH pf_info AS (
         SELECT pf.id_tarea,
            ep.codigo AS estado_pf,
            pf.aprobado AS pf_aprobado,
            pf.rechazado AS pf_rechazado
           FROM (presupuestos_finales pf
             JOIN estados_presupuestos ep ON ((pf.id_estado = ep.id)))
        )
 SELECT pb.id,
    pb.code,
    pb.id_tarea,
    pb.nota_pb,
    pb.materiales,
    pb.mano_obra,
    pb.total,
    pb.aprobado AS pb_aprobado,
    pb.created_at,
    pb.updated_at,
    pb.base_liquidada, -- Nueva columna fisica
    COALESCE(st.id_supervisor, pb.id_supervisor) AS id_supervisor,
    t.titulo AS titulo_tarea,
    t.code AS code_tarea,
    t.id_estado_nuevo AS id_estado_tarea,
    et.nombre AS estado_tarea,
    pb.id_edificio,
    e.nombre AS nombre_edificio,
    e.direccion AS direccion_edificio,
    adm.nombre AS nombre_administrador,
    pfi.estado_pf AS codigo_estado_pf,
    COALESCE(pfi.pf_aprobado, false) AS pf_aprobado,
    COALESCE(pfi.pf_rechazado, false) AS pf_rechazado,
    pb.base_liquidada AS esta_liquidado, -- Sincronizado con la columna fisica
    (EXTRACT(day FROM (now() - (pb.created_at)::timestamp with time zone)))::integer AS dias_desde_creacion,
        CASE
            WHEN pb.base_liquidada THEN 'pagada'::text
            WHEN ((pfi.estado_pf)::text = ANY (ARRAY[('aprobado'::character varying)::text, ('facturado'::character varying)::text])) THEN 'activa'::text
            WHEN ((pfi.estado_pf)::text = 'rechazado'::text) THEN 'rechazada'::text
            ELSE 'pendiente'::text
        END AS estado_operativo,
    t.se_trabajo
   FROM ((((((presupuestos_base pb
     LEFT JOIN tareas t ON ((pb.id_tarea = t.id)))
     LEFT JOIN estados_tareas et ON ((t.id_estado_nuevo = et.id)))
     LEFT JOIN edificios e ON ((pb.id_edificio = e.id)))
     LEFT JOIN administradores adm ON ((e.id_administrador = adm.id)))
     LEFT JOIN supervisores_tareas st ON ((pb.id_tarea = st.id_tarea)))
     LEFT JOIN pf_info pfi ON ((pb.id_tarea = pfi.id_tarea)));

-- 6. Recrear vista_pb_admin
CREATE OR REPLACE VIEW public.vista_pb_admin AS
 SELECT id,
    code,
    id_tarea,
    nota_pb,
    materiales,
    mano_obra,
    total,
    pb_aprobado,
    created_at,
    updated_at,
    base_liquidada, -- Nueva columna fisica
    id_supervisor,
    titulo_tarea,
    code_tarea,
    id_estado_tarea,
    estado_tarea,
    id_edificio,
    nombre_edificio,
    direccion_edificio,
    nombre_administrador,
    codigo_estado_pf,
    pf_aprobado,
    pf_rechazado,
    esta_liquidado,
    dias_desde_creacion,
    estado_operativo,
    se_trabajo
   FROM public.vista_pb_supervisor;

-- 7. Trigger para actualizar estado al crear Presupuesto Base
CREATE OR REPLACE FUNCTION public.pb_creado_actualizar_estado_tarea()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Si el estado actual de la tarea es organizar (1) o preguntar (2), actualizar a presupuesto base (12)
  UPDATE public.tareas
     SET id_estado_nuevo = 12,
         updated_at = NOW()
   WHERE id = NEW.id_tarea
     AND id_estado_nuevo IN (1, 2);
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_pb_creado_actualizar_estado_tarea ON public.presupuestos_base;

CREATE TRIGGER trg_pb_creado_actualizar_estado_tarea
AFTER INSERT ON public.presupuestos_base
FOR EACH ROW
EXECUTE FUNCTION public.pb_creado_actualizar_estado_tarea();

-- 8. Ajustar funcion fn_tareas_sincronizar_finalizada
CREATE OR REPLACE FUNCTION public.fn_tareas_sincronizar_finalizada()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_estado_vencido_id INTEGER;
  v_estado_terminado_id INTEGER;
  v_estado_liquidada_id INTEGER;
BEGIN
  -- Obtener los IDs de estados de finalizacion
  SELECT id INTO v_estado_vencido_id FROM public.estados_tareas WHERE codigo = 'vencido' LIMIT 1;
  SELECT id INTO v_estado_terminado_id FROM public.estados_tareas WHERE codigo = 'terminado' LIMIT 1;
  SELECT id INTO v_estado_liquidada_id FROM public.estados_tareas WHERE codigo = 'liquidada' LIMIT 1;

  -- Si el estado nuevo es uno de los estados de finalizacion, validar si tiene presupuesto base pendiente de liquidar
  IF NEW.id_estado_nuevo IN (v_estado_terminado_id, v_estado_liquidada_id) THEN
    IF EXISTS (
      SELECT 1 
        FROM public.presupuestos_base 
       WHERE id_tarea = NEW.id 
         AND COALESCE(base_liquidada, false) = false
    ) THEN
      NEW.finalizada := false; -- Queda viva
    ELSE
      NEW.finalizada := true;
    END IF;
  ELSIF NEW.id_estado_nuevo = v_estado_vencido_id THEN
    NEW.finalizada := true;
  -- Si no, y el estado cambio, forzar finalizada = false (reactivacion)
  ELSIF OLD.id_estado_nuevo IS DISTINCT FROM NEW.id_estado_nuevo THEN
    NEW.finalizada := false;
  END IF;

  RETURN NEW;
END;
$function$;

-- 9. Ajustar trigger sync_factura_pagada (al pagar el cliente)
CREATE OR REPLACE FUNCTION public.sync_factura_pagada()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_id_tarea INTEGER;
  v_id_presupuesto_final INTEGER;
  v_todas_pagadas BOOLEAN;
  v_total_facturas INTEGER;
  v_facturas_pagadas INTEGER;
  v_estado_id INTEGER;
  v_has_pb_pending BOOLEAN;
BEGIN
  IF NEW.pagada = true AND (OLD.pagada IS NULL OR OLD.pagada = false) THEN
    v_id_presupuesto_final := NEW.id_presupuesto_final;
    
    SELECT id_tarea INTO v_id_tarea
    FROM public.presupuestos_finales
    WHERE id = v_id_presupuesto_final;
    
    IF v_id_tarea IS NOT NULL THEN
      SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE pagada = true)
      INTO 
        v_total_facturas,
        v_facturas_pagadas
      FROM public.facturas 
      WHERE id_presupuesto_final = v_id_presupuesto_final;
      
      v_todas_pagadas := (v_total_facturas = v_facturas_pagadas);
      
      RAISE NOTICE 'Factura % pagada. Presupuesto Final %: % de % facturas pagadas', 
                    NEW.id, v_id_presupuesto_final, v_facturas_pagadas, v_total_facturas;
      
      IF v_todas_pagadas THEN
        -- Validar si hay un presupuesto base pendiente de liquidar
        SELECT EXISTS (
          SELECT 1 
            FROM public.presupuestos_base 
           WHERE id_tarea = v_id_tarea 
             AND COALESCE(base_liquidada, false) = false
        ) INTO v_has_pb_pending;

        IF v_has_pb_pending THEN
          -- Si hay PB pendiente de liquidar, pasamos la tarea a "terminado" (7) y queda viva
          SELECT id INTO v_estado_id
          FROM public.estados_tareas 
          WHERE codigo = 'terminado'
          LIMIT 1;
        ELSE
          -- Si no hay PB o ya esta liquidado, la pasamos a "liquidada" (9) y finaliza
          SELECT id INTO v_estado_id
          FROM public.estados_tareas 
          WHERE codigo = 'liquidada'
          LIMIT 1;
        END IF;
        
        IF v_estado_id IS NOT NULL THEN
          UPDATE public.tareas
          SET 
            id_estado_nuevo = v_estado_id,
            updated_at = NOW()
          WHERE id = v_id_tarea;
          
          RAISE NOTICE 'Tarea % actualizada a estado ID % - todas las facturas pagadas', 
                        v_id_tarea, v_estado_id;
        ELSE
          RAISE WARNING 'Estado no encontrado en estados_tareas';
        END IF;
      ELSE
        RAISE NOTICE 'Tarea % NO actualizada (faltan % facturas por pagar)', 
                      v_id_tarea, (v_total_facturas - v_facturas_pagadas);
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 10. Crear trigger en liquidaciones_nuevas para pago al supervisor
CREATE OR REPLACE FUNCTION public.fn_liquidacion_pagada_actualiza_pb_y_tarea()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_all_invoices_paid BOOLEAN;
  v_estado_liquidada_id INTEGER;
BEGIN
  -- Solo actuar cuando pagada pasa a true (sea INSERT o UPDATE)
  IF (TG_OP = 'INSERT' AND NEW.pagada = true) OR (TG_OP = 'UPDATE' AND NEW.pagada = true AND (OLD.pagada IS NULL OR OLD.pagada = false)) THEN
    -- 1. Marcar el presupuesto base como liquidado
    IF NEW.id_presupuesto_base IS NOT NULL THEN
      UPDATE public.presupuestos_base
         SET base_liquidada = true,
             updated_at = NOW()
       WHERE id = NEW.id_presupuesto_base;
    END IF;

    -- 2. Validar si el cliente ya pago todo
    SELECT NOT EXISTS (
      SELECT 1 
        FROM public.facturas f
        JOIN public.presupuestos_finales pf ON f.id_presupuesto_final = pf.id
       WHERE pf.id_tarea = NEW.id_tarea
         AND COALESCE(f.pagada, false) = false
    ) INTO v_all_invoices_paid;

    -- Si el cliente ya pago, pasamos la tarea a "liquidada" (9)
    IF v_all_invoices_paid THEN
      SELECT id INTO v_estado_liquidada_id
        FROM public.estados_tareas
       WHERE codigo = 'liquidada'
       LIMIT 1;

      IF v_estado_liquidada_id IS NOT NULL THEN
        UPDATE public.tareas
           SET id_estado_nuevo = v_estado_liquidada_id,
               updated_at = NOW()
         WHERE id = NEW.id_tarea;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_liquidacion_pagada_actualiza_pb_y_tarea ON public.liquidaciones_nuevas;

CREATE TRIGGER trg_liquidacion_pagada_actualiza_pb_y_tarea
AFTER INSERT OR UPDATE ON public.liquidaciones_nuevas
FOR EACH ROW
EXECUTE FUNCTION public.fn_liquidacion_pagada_actualiza_pb_y_tarea();
