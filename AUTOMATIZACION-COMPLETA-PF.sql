-- ============================================
-- AUTOMATIZACIÓN COMPLETA DE PRESUPUESTOS FINALES
-- ============================================
-- Objetivo: Sistema de 4 niveles de recordatorios y automatizaciones
-- para garantizar que ningún PF quede olvidado en el flujo:
-- Borrador → Enviado → Aprobado → Facturado
--
-- AUTOR: Sistema SPC
-- FECHA: 2026-01-15
-- ============================================

BEGIN;

-- ============================================
-- NIVEL 2: Vista PF Borrador Antiguo (>3 días)
-- ============================================
-- Detecta presupuestos finales que quedaron en Borrador
-- por más de 3 días y necesitan ser enviados al cliente

CREATE OR REPLACE VIEW vista_admin_pf_borrador_antiguo AS
SELECT 
  pf.id as id_presupuesto_final,
  pf.code as code_pf,
  pf.created_at,
  EXTRACT(DAY FROM NOW() - pf.created_at)::INTEGER as dias_en_borrador,
  t.id as id_tarea,
  t.code as code_tarea,
  t.titulo as titulo_tarea,
  e.id as id_edificio,
  e.nombre as nombre_edificio,
  e.id_administrador
FROM presupuestos_finales pf
INNER JOIN estados_presupuestos ep ON pf.id_estado = ep.id
LEFT JOIN tareas t ON pf.id_tarea = t.id
LEFT JOIN edificios e ON t.id_edificio = e.id
WHERE ep.codigo = 'borrador'
  AND EXTRACT(DAY FROM NOW() - pf.created_at) > 3
ORDER BY pf.created_at ASC;

COMMENT ON VIEW vista_admin_pf_borrador_antiguo IS 
'Detecta PF en estado Borrador por más de 3 días que necesitan ser enviados al cliente';

-- ============================================
-- NIVEL 3: Vista PF Enviado Sin Aprobar (CRÍTICO)
-- ============================================
-- Detecta presupuestos finales enviados al cliente
-- pero sin respuesta por más de 7 días
-- Incluye clasificación por prioridad (normal, urgente, crítico)

CREATE OR REPLACE VIEW vista_admin_pf_enviado_sin_aprobar AS
SELECT 
  pf.id as id_presupuesto_final,
  pf.code as code_pf,
  pf.created_at,
  pf.updated_at,
  EXTRACT(DAY FROM NOW() - pf.updated_at)::INTEGER as dias_sin_respuesta,
  CASE
    WHEN EXTRACT(DAY FROM NOW() - pf.updated_at) > 20 THEN 'critico'
    WHEN EXTRACT(DAY FROM NOW() - pf.updated_at) > 10 THEN 'urgente'
    ELSE 'normal'
  END as prioridad,
  t.id as id_tarea,
  t.code as code_tarea,
  t.titulo as titulo_tarea,
  e.id as id_edificio,
  e.nombre as nombre_edificio,
  e.id_administrador,
  pf.total as total_pf
FROM presupuestos_finales pf
INNER JOIN estados_presupuestos ep ON pf.id_estado = ep.id
LEFT JOIN tareas t ON pf.id_tarea = t.id
LEFT JOIN edificios e ON t.id_edificio = e.id
WHERE ep.codigo = 'enviado'
  AND EXTRACT(DAY FROM NOW() - pf.updated_at) > 7
ORDER BY pf.updated_at ASC;

COMMENT ON VIEW vista_admin_pf_enviado_sin_aprobar IS 
'CRÍTICO: Detecta PF enviados sin respuesta del cliente por más de 7 días. Clasificación: normal (7-10d), urgente (10-20d), crítico (>20d)';

-- ============================================
-- TRIGGER: Factura creada → PF y Tarea a Facturado
-- ============================================
-- Cuando se crea una factura (pueden ser 1 o 2 por PF):
-- 1. Actualiza PF a estado "Facturado"
-- 2. Actualiza Tarea a estado "Facturado"
-- 3. Funciona para 1 o 2 facturas (regular + materiales)

CREATE OR REPLACE FUNCTION public.sync_factura_creada_set_pf_y_tarea_facturado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_estado_facturado_pf INTEGER;
  v_estado_facturado_tarea INTEGER;
  v_tarea_id INTEGER;
BEGIN
  IF NEW.id_presupuesto_final IS NOT NULL THEN
    -- Obtener IDs de estados
    SELECT id INTO v_estado_facturado_pf 
    FROM estados_presupuestos 
    WHERE codigo = 'facturado'
    LIMIT 1;
    
    SELECT id INTO v_estado_facturado_tarea 
    FROM estados_tareas 
    WHERE codigo = 'facturado'
    LIMIT 1;
    
    IF v_estado_facturado_pf IS NOT NULL THEN
      -- Actualizar PF a Facturado (solo si no está ya facturado)
      UPDATE presupuestos_finales
      SET id_estado = v_estado_facturado_pf,
          updated_at = NOW()
      WHERE id = NEW.id_presupuesto_final
        AND id_estado IS DISTINCT FROM v_estado_facturado_pf;
      
      -- Obtener id_tarea del PF
      SELECT id_tarea INTO v_tarea_id
      FROM presupuestos_finales
      WHERE id = NEW.id_presupuesto_final;
      
      -- Actualizar Tarea a Facturado
      IF v_tarea_id IS NOT NULL AND v_estado_facturado_tarea IS NOT NULL THEN
        UPDATE tareas
        SET id_estado_nuevo = v_estado_facturado_tarea,
            updated_at = NOW()
        WHERE id = v_tarea_id
          AND id_estado_nuevo IS DISTINCT FROM v_estado_facturado_tarea;
      END IF;
      
      RAISE NOTICE 'Factura creada: PF #% y Tarea #% actualizados a Facturado', 
        NEW.id_presupuesto_final, v_tarea_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Eliminar trigger anterior si existe
DROP TRIGGER IF EXISTS trg_factura_creada_set_tarea_facturado ON public.facturas;

-- Crear nuevo trigger
CREATE TRIGGER trg_factura_creada_set_pf_y_tarea_facturado
AFTER INSERT ON public.facturas
FOR EACH ROW
EXECUTE FUNCTION public.sync_factura_creada_set_pf_y_tarea_facturado();

COMMENT ON FUNCTION public.sync_factura_creada_set_pf_y_tarea_facturado IS 
'Trigger que actualiza PF y Tarea a estado Facturado cuando se crea una factura (1 o 2 facturas)';

-- ============================================
-- FUNCIÓN: Auto-marcar PF antiguos como Enviado
-- ============================================
-- Ejecutada por pg_cron diariamente
-- Marca PF en Borrador por más de 5 días como "Enviado"

CREATE OR REPLACE FUNCTION public.auto_marcar_pf_borrador_como_enviado()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_estado_borrador_id INTEGER;
  v_estado_enviado_id INTEGER;
  v_pfs_actualizados INTEGER := 0;
BEGIN
  -- Obtener IDs de estados
  SELECT id INTO v_estado_borrador_id
  FROM estados_presupuestos
  WHERE codigo = 'borrador'
  LIMIT 1;
  
  SELECT id INTO v_estado_enviado_id
  FROM estados_presupuestos
  WHERE codigo = 'enviado'
  LIMIT 1;
  
  IF v_estado_borrador_id IS NOT NULL AND v_estado_enviado_id IS NOT NULL THEN
    -- Actualizar PFs antiguos en Borrador → Enviado
    WITH pfs_actualizados AS (
      UPDATE presupuestos_finales
      SET id_estado = v_estado_enviado_id,
          updated_at = NOW()
      WHERE id_estado = v_estado_borrador_id
        AND EXTRACT(DAY FROM NOW() - created_at) > 5
      RETURNING id
    )
    SELECT COUNT(*) INTO v_pfs_actualizados FROM pfs_actualizados;
    
    IF v_pfs_actualizados > 0 THEN
      RAISE NOTICE 'AUTO-ENVIADO: % presupuesto(s) final(es) marcado(s) como Enviado (>5 días en Borrador)', 
        v_pfs_actualizados;
    END IF;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.auto_marcar_pf_borrador_como_enviado IS 
'Función ejecutada por pg_cron diariamente. Marca PF en Borrador por >5 días como Enviado automáticamente';

-- ============================================
-- PROGRAMAR EJECUCIÓN AUTOMÁTICA DIARIA
-- ============================================
-- Ejecuta todos los días a las 02:00 AM
-- Si el job ya existe, lo elimina y recrea

DO $$
BEGIN
  -- Eliminar job si existe
  PERFORM cron.unschedule('auto-marcar-pf-enviado');
EXCEPTION WHEN OTHERS THEN
  NULL; -- Ignorar si no existe
END $$;

SELECT cron.schedule(
  'auto-marcar-pf-enviado',
  '0 2 * * *',  -- Todos los días a las 02:00 AM
  'SELECT auto_marcar_pf_borrador_como_enviado();'
);

COMMIT;

-- ============================================
-- RESUMEN DE IMPLEMENTACIÓN
-- ============================================
-- ✅ Vista: vista_admin_pf_borrador_antiguo
--    Detecta PF en Borrador >3 días
--
-- ✅ Vista: vista_admin_pf_enviado_sin_aprobar
--    Detecta PF Enviado sin respuesta >7 días (CRÍTICO)
--
-- ✅ Trigger: trg_factura_creada_set_pf_y_tarea_facturado
--    Factura creada → PF Facturado + Tarea Facturado
--
-- ✅ Función + pg_cron: auto_marcar_pf_borrador_como_enviado
--    Auto-envía PF en Borrador >5 días (ejecuta diariamente 02:00 AM)
--
-- SISTEMA COMPLETO DE 4 NIVELES:
-- 1. PB finalizado sin PF (vista existente: vista_admin_pb_finalizada_sin_pf)
-- 2. PF Borrador antiguo (NUEVA vista)
-- 3. PF Enviado sin aprobar (NUEVA vista - CRÍTICO)
-- 4. PF Aprobado sin factura (vista existente: vista_admin_pf_aprobado_sin_factura)
-- ============================================
