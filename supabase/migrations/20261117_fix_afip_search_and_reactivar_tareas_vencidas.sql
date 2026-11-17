-- Migración: Optimización de búsqueda de facturas AFIP y reactivación de tareas en presupuestos rechazados/vencidos
-- Fecha: 2026-11-17

-- 1. Actualizar buscar_facturas_super_inteligente con soporte inteligente de formatos AFIP
CREATE OR REPLACE FUNCTION public.buscar_facturas_super_inteligente(
  p_query text, 
  p_id_administrador integer DEFAULT NULL::integer, 
  p_id_estado integer DEFAULT NULL::integer, 
  p_enviada boolean DEFAULT NULL::boolean, 
  p_pagada boolean DEFAULT NULL::boolean, 
  p_limit integer DEFAULT 50
)
RETURNS TABLE(
  id integer, 
  code text, 
  nombre text, 
  total bigint, 
  fecha_vencimiento date, 
  administrador_nombre text, 
  estado_nombre text, 
  enviada boolean, 
  pagada boolean, 
  relevancia real
)
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_query_clean text := trim(p_query);
  v_query_digits text := regexp_replace(v_query_clean, '[^0-9]', '', 'g');
  v_query_num text := ltrim(v_query_digits, '0');
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.code::TEXT,
    b.nombre::TEXT,
    b.total::BIGINT,
    b.fecha_vencimiento::DATE,
    b.administrador_nombre::TEXT,
    b.estado_nombre::TEXT,
    b.enviada,
    b.pagada,
    b.calc_relevancia::REAL as relevancia
  FROM (
    SELECT 
      f.id,
      f.code,
      f.nombre,
      f.total,
      f.fecha_vencimiento,
      a.nombre as administrador_nombre,
      ef.nombre as estado_nombre,
      f.enviada,
      f.pagada,
      GREATEST(
        -- Match exacto en AFIP (peso 15 - máxima prioridad)
        CASE 
          WHEN (v_query_num <> '' AND f.datos_afip IS NOT NULL AND f.datos_afip::TEXT = v_query_num)
            OR (v_query_num <> '' AND f.afip_numero IS NOT NULL AND ltrim(regexp_replace(f.afip_numero, '[^0-9]', '', 'g'), '0') = v_query_num)
            OR (f.datos_afip IS NOT NULL AND f.datos_afip::TEXT = v_query_clean)
            OR (f.afip_numero IS NOT NULL AND f.afip_numero = v_query_clean)
          THEN 15.0 
          -- Match por padding AFIP (ej: 0004 o 00000004)
          WHEN (v_query_digits <> '' AND f.datos_afip IS NOT NULL AND (
            lpad(f.datos_afip::TEXT, 4, '0') = v_query_digits
            OR lpad(f.datos_afip::TEXT, 8, '0') = v_query_digits
            OR lpad(f.datos_afip::TEXT, 8, '0') LIKE '%' || v_query_digits || '%'
          )) THEN 12.0
          ELSE 0.0 
        END,
        -- Match exacto en código (peso 10)
        CASE WHEN lower(f.code) = lower(v_query_clean) THEN 10.0 ELSE 0.0 END,
        -- Similitud en código (peso 7)
        similarity(f_unaccent_lower(f.code), f_unaccent_lower(v_query_clean)) * 7.0,
        -- Match exacto en nombre (peso 8)
        CASE WHEN f_unaccent_lower(f.nombre) = f_unaccent_lower(v_query_clean) THEN 8.0 ELSE 0.0 END,
        -- Nombre contiene query (peso 6)
        CASE WHEN f_unaccent_lower(f.nombre) LIKE '%' || f_unaccent_lower(v_query_clean) || '%' THEN 6.0 ELSE 0.0 END,
        -- Similitud en nombre (peso 5)
        similarity(f_unaccent_lower(f.nombre), f_unaccent_lower(v_query_clean)) * 5.0,
        -- Match en administrador (peso 4)
        CASE WHEN f_unaccent_lower(a.nombre) LIKE '%' || f_unaccent_lower(v_query_clean) || '%' THEN 4.0 ELSE 0.0 END,
        -- Similitud en administrador (peso 3)
        similarity(f_unaccent_lower(a.nombre), f_unaccent_lower(v_query_clean)) * 3.0,
        -- Parcial en afip_numero / datos_afip (peso 8)
        CASE 
          WHEN (f.datos_afip IS NOT NULL AND f.datos_afip::TEXT LIKE '%' || v_query_clean || '%')
            OR (f.afip_numero IS NOT NULL AND f.afip_numero LIKE '%' || v_query_clean || '%')
          THEN 8.0 
          ELSE 0.0 
        END
      ) as calc_relevancia
    FROM facturas f
    LEFT JOIN administradores a ON f.id_administrador = a.id
    LEFT JOIN estados_facturas ef ON f.id_estado_nuevo = ef.id
    WHERE 
      (p_id_administrador IS NULL OR f.id_administrador = p_id_administrador)
      AND (p_id_estado IS NULL OR f.id_estado_nuevo = p_id_estado)
      AND (p_enviada IS NULL OR f.enviada = p_enviada)
      AND (p_pagada IS NULL OR f.pagada = p_pagada)
      AND (
        lower(f.code) = lower(v_query_clean)
        OR similarity(f_unaccent_lower(f.code), f_unaccent_lower(v_query_clean)) > 0.3
        OR f_unaccent_lower(f.nombre) LIKE '%' || f_unaccent_lower(v_query_clean) || '%'
        OR similarity(f_unaccent_lower(f.nombre), f_unaccent_lower(v_query_clean)) > 0.3
        OR f_unaccent_lower(a.nombre) LIKE '%' || f_unaccent_lower(v_query_clean) || '%'
        OR similarity(f_unaccent_lower(a.nombre), f_unaccent_lower(v_query_clean)) > 0.3
        OR (f.datos_afip IS NOT NULL AND f.datos_afip::TEXT LIKE '%' || v_query_clean || '%')
        OR (f.afip_numero IS NOT NULL AND f.afip_numero LIKE '%' || v_query_clean || '%')
        OR (v_query_num <> '' AND f.datos_afip IS NOT NULL AND f.datos_afip::TEXT = v_query_num)
        OR (v_query_num <> '' AND f.afip_numero IS NOT NULL AND ltrim(regexp_replace(f.afip_numero, '[^0-9]', '', 'g'), '0') = v_query_num)
        OR (v_query_digits <> '' AND f.datos_afip IS NOT NULL AND (
          lpad(f.datos_afip::TEXT, 4, '0') = v_query_digits
          OR lpad(f.datos_afip::TEXT, 8, '0') = v_query_digits
          OR lpad(f.datos_afip::TEXT, 8, '0') LIKE '%' || v_query_digits || '%'
        ))
      )
  ) b
  WHERE b.calc_relevancia > 0.2
  ORDER BY b.calc_relevancia DESC, b.fecha_vencimiento DESC NULLS LAST
  LIMIT p_limit;
END;
$function$;

-- 2. Actualizar sync_factura_creada para reactivar tareas vencidas/finalizadas
CREATE OR REPLACE FUNCTION public.sync_factura_creada()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id_tarea INTEGER;
  v_estado_id INTEGER;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT id_tarea INTO v_id_tarea
    FROM public.presupuestos_finales
    WHERE id = NEW.id_presupuesto_final;
    
    IF v_id_tarea IS NOT NULL THEN
      SELECT id INTO v_estado_id
      FROM public.estados_tareas 
      WHERE codigo = 'facturado'
      LIMIT 1;
      
      IF v_estado_id IS NOT NULL THEN
        UPDATE public.tareas
        SET 
          id_estado_nuevo = v_estado_id,
          finalizada = false,
          updated_at = NOW()
        WHERE id = v_id_tarea
          AND id_estado_nuevo NOT IN (7, 9);
        
        RAISE NOTICE 'Tarea % actualizada a Facturado (id_estado: %) por creación de Factura %', 
                      v_id_tarea, v_estado_id, NEW.id;
      ELSE
        RAISE WARNING 'Estado "facturado" no encontrado en estados_tareas';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 3. Actualizar sync_factura_creada_set_pf_y_tarea_facturado
CREATE OR REPLACE FUNCTION public.sync_factura_creada_set_pf_y_tarea_facturado()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_estado_facturado_pf INTEGER;
  v_estado_facturado_tarea INTEGER;
  v_tarea_id INTEGER;
BEGIN
  IF NEW.id_presupuesto_final IS NOT NULL THEN
    SELECT id INTO v_estado_facturado_pf 
    FROM estados_presupuestos 
    WHERE codigo = 'facturado'
    LIMIT 1;
    
    SELECT id INTO v_estado_facturado_tarea 
    FROM estados_tareas 
    WHERE codigo = 'facturado'
    LIMIT 1;
    
    IF v_estado_facturado_pf IS NOT NULL THEN
      UPDATE presupuestos_finales
      SET id_estado = v_estado_facturado_pf,
          aprobado = true,
          rechazado = false,
          updated_at = NOW()
      WHERE id = NEW.id_presupuesto_final;
      
      SELECT id_tarea INTO v_tarea_id
      FROM presupuestos_finales
      WHERE id = NEW.id_presupuesto_final;
      
      IF v_tarea_id IS NOT NULL AND v_estado_facturado_tarea IS NOT NULL THEN
        UPDATE tareas
        SET id_estado_nuevo = v_estado_facturado_tarea,
            finalizada = false,
            updated_at = NOW()
        WHERE id = v_tarea_id
          AND id_estado_nuevo NOT IN (7, 9);
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 4. Actualizar sync_presupuesto_final_facturado_set_tarea_facturado
CREATE OR REPLACE FUNCTION public.sync_presupuesto_final_facturado_set_tarea_facturado()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_estado_facturado_pf integer;
  v_estado_facturado_tarea integer;
  v_tarea_id integer;
BEGIN
  IF (OLD.id_estado IS DISTINCT FROM NEW.id_estado) THEN
    SELECT id INTO v_estado_facturado_pf FROM estados_presupuestos WHERE codigo = 'facturado' LIMIT 1;
    SELECT id INTO v_estado_facturado_tarea FROM estados_tareas WHERE codigo = 'facturado' LIMIT 1;

    IF v_estado_facturado_pf IS NOT NULL AND v_estado_facturado_tarea IS NOT NULL AND NEW.id_estado = v_estado_facturado_pf THEN
      v_tarea_id := NEW.id_tarea;
      IF v_tarea_id IS NOT NULL THEN
        UPDATE tareas
        SET id_estado_nuevo = v_estado_facturado_tarea,
            finalizada = false,
            updated_at = NOW()
        WHERE id = v_tarea_id
          AND id_estado_nuevo NOT IN (7, 9);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 5. Actualizar sync_presupuesto_final_aprobado
CREATE OR REPLACE FUNCTION public.sync_presupuesto_final_aprobado()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.aprobado = true AND (OLD.aprobado IS NULL OR OLD.aprobado = false) THEN
    -- Desmarcar rechazado si estaba rechazado
    UPDATE presupuestos_finales
    SET rechazado = false
    WHERE id = NEW.id AND rechazado = true;
    
    UPDATE public.tareas
    SET 
      id_estado_nuevo = (
        SELECT id 
        FROM public.estados_tareas 
        WHERE codigo = 'aprobado'
        LIMIT 1
      ),
      finalizada = false,
      updated_at = NOW()
    WHERE id = NEW.id_tarea
      AND id_estado_nuevo NOT IN (7, 9);
    
    RAISE NOTICE 'Tarea % actualizada a Aprobado por aprobación de Presupuesto Final %', 
                  NEW.id_tarea, NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;
