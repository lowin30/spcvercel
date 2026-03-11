-- ============================================
-- ELIMINAR-TRIGGER-AUTO-APROBAR-PB.sql
-- ============================================
-- 
-- OBJETIVO:
-- Eliminar el trigger y la función que aprobaban automáticamente
-- el Presupuesto Base cuando una tarea pasaba a estado finalizada (= true).
-- 
-- MOTIVACIÓN:
-- La regla de negocio estricta requiere que el PB se apruebe SOLAMENTE
-- cuando se aprueba explícitamente el Presupuesto Final. El trigger
-- causaba falsos positivos y aprobaba el PB prematuramente (ej. al 
-- crear el PF de una tarea ya finalizada). La lógica correcta ya 
-- reside en el backend (actions.ts -> aprobarPresupuestoAction).
-- ============================================

BEGIN;

-- 1. Eliminar el trigger de la tabla tareas
DROP TRIGGER IF EXISTS trg_tarea_finalizada_aprobar_pb ON public.tareas;

-- 2. Eliminar la función asociada
DROP FUNCTION IF EXISTS public.sync_tarea_finalizada_aprobar_presupuesto_base();

-- Opcional: Registrar evento de eliminación
DO $$
BEGIN
  RAISE NOTICE 'Trigger trg_tarea_finalizada_aprobar_pb y su función asociada han sido eliminados correctamente.';
END $$;

COMMIT;
