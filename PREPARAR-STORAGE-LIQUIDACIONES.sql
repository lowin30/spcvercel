-- ========================================
-- ❌ ARCHIVO OBSOLETO - NO USAR
-- ========================================
-- 
-- Este archivo YA NO SE NECESITA porque se cambió a generación
-- on-demand de PDFs (no se guardan en Storage).
--
-- Motivo del cambio:
-- - Sin costos de almacenamiento
-- - PDFs siempre actualizados
-- - Más simple de mantener
-- 
-- Ver: COMO-USAR-PDF-LIQUIDACIONES.md
-- 
-- ========================================
-- PREPARAR STORAGE Y CAMPO PARA PDFs DE LIQUIDACIONES
-- ========================================

-- 1. Verificar si existe el campo url_pdf
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'liquidaciones_nuevas' 
  AND column_name = 'url_pdf';

-- 2. Agregar campo url_pdf si no existe
ALTER TABLE liquidaciones_nuevas
ADD COLUMN IF NOT EXISTS url_pdf TEXT;

COMMENT ON COLUMN liquidaciones_nuevas.url_pdf IS 'URL del PDF de la liquidación en Supabase Storage';

-- 3. Verificar estructura actualizada
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'liquidaciones_nuevas'
  AND column_name IN ('url_pdf', 'total_supervisor')
ORDER BY ordinal_position;

-- ========================================
-- INSTRUCCIONES PARA STORAGE BUCKET
-- ========================================

/*
IMPORTANTE: Debes crear el bucket 'liquidaciones' manualmente en Supabase Dashboard:

1. Ve a Storage en Supabase Dashboard
2. Crea un nuevo bucket llamado 'liquidaciones'
3. Configuración recomendada:
   - Public bucket: NO (privado)
   - Allowed MIME types: application/pdf
   - File size limit: 10 MB

4. Configurar RLS Policies para el bucket:

-- Permitir INSERT solo a usuarios autenticados con rol admin
CREATE POLICY "Admin puede subir PDFs de liquidaciones"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'liquidaciones' 
  AND auth.uid() IN (
    SELECT id FROM usuarios WHERE rol = 'admin'
  )
);

-- Permitir SELECT a admins y al supervisor de la liquidación
CREATE POLICY "Admin y supervisor pueden ver PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'liquidaciones'
  AND (
    -- Admin puede ver todos
    auth.uid() IN (SELECT id FROM usuarios WHERE rol = 'admin')
    OR
    -- Supervisor puede ver sus propias liquidaciones
    EXISTS (
      SELECT 1 
      FROM liquidaciones_nuevas 
      WHERE id_usuario_supervisor = auth.uid()
        AND url_pdf LIKE '%' || name
    )
  )
);

*/

-- Verificación final
SELECT 
  id,
  code,
  url_pdf,
  total_supervisor,
  created_at
FROM liquidaciones_nuevas
ORDER BY created_at DESC
LIMIT 5;
