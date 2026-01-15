-- ============================================
-- TRIGGER-AUTO-RECHAZAR-PF-AL-FINALIZAR-TAREA.sql
-- ============================================
-- 
-- OBJETIVO:
-- Automatización centralizada que auto-rechaza presupuestos finales
-- cuando la tarea asociada se marca como finalizada.
--
-- CASOS CUBIERTOS:
-- 1. Auto-finalización por inactividad (pg_cron) → estado 'vencido'
-- 2. Cambio manual de estado a "Cerrado sin respuesta" (vencido)
--
-- LÓGICA:
-- - SOLO detecta cuando id_estado_nuevo cambia a 'vencido' (Cerrado sin respuesta)
-- - Auto-rechaza presupuestos finales de esa tarea
-- - Solo afecta PF que NO estén ya rechazados
-- - NO afecta tareas facturadas, liquidadas o terminadas normalmente
--
-- SEGURIDAD:
-- - SECURITY DEFINER: se ejecuta con permisos de owner, no del usuario
-- - No depende de RLS ni permisos de usuario
-- - Garantiza consistencia en todos los escenarios
--
-- BENEFICIOS:
-- ✅ Un solo punto de control (no hay que modificar múltiples componentes)
-- ✅ Funciona para TODAS las formas de finalizar tareas
-- ✅ No importa si es manual, automático, o desde API
-- ✅ Consistencia garantizada
-- ✅ Previene tareas finalizadas en liquidaciones
-- ✅ Fácil de auditar y mantener
--
-- AUTOR: Sistema SPC - Automatizaciones Centralizadas
-- FECHA: 2026-01-15
-- ============================================

BEGIN;

-- ============================================
-- FUNCIÓN: Auto-rechazar PF al finalizar tarea
-- ============================================
CREATE OR REPLACE FUNCTION public.auto_rechazar_pf_al_finalizar_tarea()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_estado_rechazado_id INTEGER;
  v_estado_vencido_id INTEGER;
  v_pf_afectados INTEGER := 0;
BEGIN
  -- Obtener IDs de estados relevantes
  SELECT id INTO v_estado_rechazado_id
  FROM public.estados_presupuestos
  WHERE codigo = 'rechazado'
  LIMIT 1;
  
  SELECT id INTO v_estado_vencido_id
  FROM public.estados_tareas
  WHERE codigo = 'vencido'
  LIMIT 1;

  -- ÚNICA CONDICIÓN: Estado cambió a 'vencido' (Cerrado sin respuesta)
  -- NO afecta tareas facturadas, liquidadas o terminadas normalmente
  IF v_estado_vencido_id IS NOT NULL 
     AND NEW.id_estado_nuevo = v_estado_vencido_id 
     AND OLD.id_estado_nuevo IS DISTINCT FROM NEW.id_estado_nuevo 
     AND v_estado_rechazado_id IS NOT NULL THEN
    -- Auto-rechazar todos los PF de esta tarea que NO estén ya rechazados
    UPDATE public.presupuestos_finales
    SET id_estado = v_estado_rechazado_id,
        updated_at = NOW()
    WHERE id_tarea = NEW.id
      AND id_estado IS DISTINCT FROM v_estado_rechazado_id;
    
    GET DIAGNOSTICS v_pf_afectados = ROW_COUNT;
    
    -- Log informativo (visible en logs de Supabase)
    IF v_pf_afectados > 0 THEN
      RAISE NOTICE 'AUTO-RECHAZAR: Tarea #% finalizada → % presupuesto(s) final(es) auto-rechazado(s)', 
        NEW.id, v_pf_afectados;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================
-- TRIGGER: Ejecutar después de UPDATE en tareas
-- ============================================
DROP TRIGGER IF EXISTS trg_auto_rechazar_pf_al_finalizar ON public.tareas;

CREATE TRIGGER trg_auto_rechazar_pf_al_finalizar
AFTER UPDATE ON public.tareas
FOR EACH ROW
EXECUTE FUNCTION public.auto_rechazar_pf_al_finalizar_tarea();

-- ============================================
-- SCRIPT DE LIMPIEZA: Corregir tareas "Cerrado sin respuesta"
-- ============================================
-- Este script se ejecuta UNA VEZ para corregir inconsistencias existentes.
-- Rechaza PF SOLO de tareas en estado 'vencido' (Cerrado sin respuesta).
-- NO afecta tareas facturadas, liquidadas o terminadas normalmente.

DO $$
DECLARE
  v_estado_rechazado_id INTEGER;
  v_estado_vencido_id INTEGER;
  v_pf_corregidos INTEGER := 0;
BEGIN
  -- Obtener IDs de estados
  SELECT id INTO v_estado_rechazado_id
  FROM public.estados_presupuestos
  WHERE codigo = 'rechazado'
  LIMIT 1;
  
  SELECT id INTO v_estado_vencido_id
  FROM public.estados_tareas
  WHERE codigo = 'vencido'
  LIMIT 1;
  
  IF v_estado_rechazado_id IS NOT NULL AND v_estado_vencido_id IS NOT NULL THEN
    -- Rechazar PF SOLO de tareas "Cerrado sin respuesta"
    WITH tareas_vencidas AS (
      SELECT DISTINCT id
      FROM public.tareas
      WHERE id_estado_nuevo = v_estado_vencido_id
    ),
    pf_corregidos AS (
      UPDATE public.presupuestos_finales pf
      SET id_estado = v_estado_rechazado_id,
          updated_at = NOW()
      FROM tareas_vencidas tv
      WHERE pf.id_tarea = tv.id
        AND pf.id_estado IS DISTINCT FROM v_estado_rechazado_id
      RETURNING pf.id
    )
    SELECT COUNT(*) INTO v_pf_corregidos FROM pf_corregidos;
    
    RAISE NOTICE 'LIMPIEZA: % presupuesto(s) final(es) corregido(s) de tareas "Cerrado sin respuesta"', 
      v_pf_corregidos;
  END IF;
END $$;

COMMIT;

-- ============================================
-- NOTAS DE IMPLEMENTACIÓN
-- ============================================
-- 
-- Este trigger trabaja en conjunto con:
-- 1. PF-AGING-AUTO.sql - Auto-finaliza tareas por inactividad
-- 2. TRIGGER-ESTADOS-INTELIGENTES-TAREAS.sql - Sincroniza estados
-- 3. TRIGGER-AUTO-APROBAR-PB-AL-FINALIZAR-TAREA.sql - Auto-aprueba PB
--
-- Orden de ejecución típico:
-- Usuario cambia estado a "Cerrado sin respuesta" → Este trigger → Auto-rechaza PF
-- ó
-- pg_cron auto-finaliza por inactividad (estado vencido) → Este trigger → Auto-rechaza PF
--
-- IMPORTANTE - NO AFECTA:
-- ✅ Tareas facturadas → PF debe estar aprobado → Aparecen en liquidaciones
-- ✅ Tareas liquidadas → PF debe estar aprobado → Ya liquidadas
-- ✅ Tareas terminadas normalmente → PF aprobado → Pueden liquidarse
--
-- SOLO AFECTA:
-- ❌ Tareas "Cerrado sin respuesta" → PF auto-rechazado → No en liquidaciones
--
-- Casos específicos:
-- - Tarea 63, 80, 81, 108, 118, 119, 120, 122, 130, 156, 160, 161
-- - Todas las tareas cerradas sin respuesta tendrán PF rechazado
-- - Tareas como la 40 (facturada) NO se afectan
-- ============================================
