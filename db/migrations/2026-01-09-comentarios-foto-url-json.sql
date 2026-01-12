-- Migración: convertir comentarios.foto_url a jsonb (array de URLs)
-- Nota: se asume que los valores actuales son URLs simples o NULL.

BEGIN;

-- 1) Añadir nueva columna temporal de tipo jsonb con default []
ALTER TABLE public.comentarios
ADD COLUMN foto_url_json jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2) Migrar datos existentes: si foto_url no es NULL, envolver en array
UPDATE public.comentarios
SET foto_url_json =
  CASE
    WHEN foto_url IS NULL OR trim(foto_url) = '' THEN '[]'::jsonb
    ELSE jsonb_build_array(foto_url)
  END;

-- 3) Eliminar columna antigua
ALTER TABLE public.comentarios
DROP COLUMN foto_url;

-- 4) Renombrar columna nueva a foto_url
ALTER TABLE public.comentarios
RENAME COLUMN foto_url_json TO foto_url;

COMMIT;
