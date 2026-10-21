-- migracion: correccion quirurgica del ciclo de vida de tareas al pagar facturas
-- fecha: 2026-10-21
-- objetivo: 
-- evitar que el cobro de facturas fuerce la tarea a estado 7 ('terminado').
-- la finalizacion fisica solo debe nacer de la accion del supervisor/admin (se_trabajo = true, finalizada = true).
-- solo si la tarea ya fue terminada fisicamente y liquidada, se pasa a estado 9 ('liquidada').

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
  v_estado_liquidada_id INTEGER;
  v_tarea_finalizada BOOLEAN;
  v_tarea_se_trabajo BOOLEAN;
  v_base_liquidada BOOLEAN;
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
      
      -- REGLA OPERATIVA Y FINANCIERA (Plan 1):
      -- El cobro de facturas NUNCA debe alterar el estado operativo de la obra a 'terminado' (7).
      -- La finalizacion fisica solo la declara el supervisor/admin con 'finalizar tarea' (se_trabajo = true).
      -- Solo si la tarea YA FUE finalizada operativamente (finalizada = true Y se_trabajo = true)
      -- Y ADEMAS el presupuesto base ya fue liquidado (base_liquidada = true),
      -- entonces y solo entonces el ciclo se cierra por completo pasando la tarea a 'liquidada' (9).
      IF v_todas_pagadas THEN
        SELECT 
          COALESCE(finalizada, false),
          COALESCE(se_trabajo, false)
        INTO 
          v_tarea_finalizada,
          v_tarea_se_trabajo
        FROM public.tareas
        WHERE id = v_id_tarea;

        SELECT 
          COALESCE(base_liquidada, false)
        INTO 
          v_base_liquidada
        FROM public.presupuestos_base
        WHERE id_tarea = v_id_tarea;

        IF v_tarea_finalizada AND v_tarea_se_trabajo AND v_base_liquidada THEN
          SELECT id INTO v_estado_liquidada_id
          FROM public.estados_tareas 
          WHERE codigo = 'liquidada'
          LIMIT 1;

          IF v_estado_liquidada_id IS NOT NULL THEN
            UPDATE public.tareas
            SET 
              id_estado_nuevo = v_estado_liquidada_id,
              updated_at = NOW()
            WHERE id = v_id_tarea;
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;
