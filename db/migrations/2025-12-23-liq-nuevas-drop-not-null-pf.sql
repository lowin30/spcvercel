-- 2025-12-23: Permitir liquidaciones basadas en Presupuesto Base
-- Hacer nullable id_presupuesto_final en public.liquidaciones_nuevas

BEGIN;
ALTER TABLE public.liquidaciones_nuevas
  ALTER COLUMN id_presupuesto_final DROP NOT NULL;
COMMIT;
