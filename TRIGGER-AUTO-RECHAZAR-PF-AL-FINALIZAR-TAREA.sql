-- ============================================
-- TRIGGER-AUTO-RECHAZAR-PF-AL-FINALIZAR-TAREA.sql
-- ============================================
-- 
-- OBJETIVO:
-- Automatización centralizada que auto-rechaza presupuestos finales
-- cuando la tarea asociada se marca como finalizada.
--
-- CASOS CUBIERTOS:
-- 1. Auto-finalización por inactividad (pg_cron)
-- 2. Cambio manual de estado a "Cerrado sin respuesta" (vencido)
-- 3. Cambio manual de estado a "Terminado"
-- 4. Finalización mediante diálogo de la app
-- 5. Cualquier otro flujo futuro que marque finalizada=true
--
-- LÓGICA:
-- - Detecta cuando finalizada cambia de FALSE → TRUE
-- - Detecta cuando id_estado_nuevo cambia a 'vencido' o 'terminado'
-- - Auto-rechaza TODOS los presupuestos finales de esa tarea
-- - Solo afecta PF que NO estén ya rechazados
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
  v_estado_terminado_id INTEGER;
  v_pf_afectados INTEGER := 0;
  v_debe_rechazar BOOLEAN := FALSE;
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
  
  SELECT id INTO v_estado_terminado_id
  FROM public.estados_tareas
  WHERE codigo = 'terminado'
  LIMIT 1;

  -- CONDICIÓN 1: Tarea se marcó como finalizada
  IF NEW.finalizada = TRUE AND COALESCE(OLD.finalizada, FALSE) = FALSE THEN
    v_debe_rechazar := TRUE;
  END IF;

  -- CONDICIÓN 2: Estado cambió a 'vencido' (Cerrado sin respuesta)
  IF v_estado_vencido_id IS NOT NULL 
     AND NEW.id_estado_nuevo = v_estado_vencido_id 
     AND OLD.id_estado_nuevo IS DISTINCT FROM NEW.id_estado_nuevo THEN
    v_debe_rechazar := TRUE;
  END IF;

  -- CONDICIÓN 3: Estado cambió a 'terminado'
  IF v_estado_terminado_id IS NOT NULL 
     AND NEW.id_estado_nuevo = v_estado_terminado_id 
     AND OLD.id_estado_nuevo IS DISTINCT FROM NEW.id_estado_nuevo THEN
    v_debe_rechazar := TRUE;
  END IF;

  -- Si se debe rechazar y tenemos el estado rechazado configurado
  IF v_debe_rechazar AND v_estado_rechazado_id IS NOT NULL THEN
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
-- SCRIPT DE LIMPIEZA: Corregir tareas ya finalizadas
-- ============================================
-- Este script se ejecuta UNA VEZ para corregir inconsistencias existentes.
-- Rechaza PF de tareas que ya están finalizadas pero tienen PF activos.

DO $$
DECLARE
  v_estado_rechazado_id INTEGER;
  v_tareas_corregidas INTEGER := 0;
BEGIN
  -- Obtener ID del estado 'rechazado'
  SELECT id INTO v_estado_rechazado_id
  FROM public.estados_presupuestos
  WHERE codigo = 'rechazado'
  LIMIT 1;
  
  IF v_estado_rechazado_id IS NOT NULL THEN
    -- Rechazar PF de tareas finalizadas que tienen PF activos
    WITH tareas_finalizadas AS (
      SELECT DISTINCT id
      FROM public.tareas
      WHERE finalizada = TRUE
    ),
    pf_corregidos AS (
      UPDATE public.presupuestos_finales pf
      SET id_estado = v_estado_rechazado_id,
          updated_at = NOW()
      FROM tareas_finalizadas tf
      WHERE pf.id_tarea = tf.id
        AND pf.id_estado IS DISTINCT FROM v_estado_rechazado_id
      RETURNING pf.id
    )
    SELECT COUNT(*) INTO v_tareas_corregidas FROM pf_corregidos;
    
    RAISE NOTICE 'LIMPIEZA: % presupuesto(s) final(es) corregido(s) de tareas ya finalizadas', 
      v_tareas_corregidas;
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
-- Usuario finaliza tarea → Este trigger → Auto-rechaza PF
-- ó
-- pg_cron finaliza tarea → Este trigger → Auto-rechaza PF
--
-- Casos especiales ya cubiertos:
-- - Tarea 156: Cerrado sin respuesta → PF se auto-rechazará
-- - Tarea 70: PF rechazado manualmente → No aparece en liquidaciones
-- - Tarea 63: Auto-finalizada → PF se auto-rechazó (arreglo previo)
-- ============================================
