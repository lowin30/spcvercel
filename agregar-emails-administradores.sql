-- =====================================================
-- Script: Agregar campos de email a tabla administradores
-- Fecha: 2 de Octubre 2025
-- Descripción: Agrega email1 y email2 a administradores
-- =====================================================

-- 1. Agregar columnas de email a la tabla administradores
ALTER TABLE administradores
ADD COLUMN IF NOT EXISTS email1 TEXT,
ADD COLUMN IF NOT EXISTS email2 TEXT;

-- 2. Agregar comentarios a las columnas
COMMENT ON COLUMN administradores.email1 IS 'Email principal del administrador';
COMMENT ON COLUMN administradores.email2 IS 'Email secundario/alternativo del administrador (opcional)';

-- 3. Eliminar y recrear la vista vista_administradores con los nuevos campos
-- Primero eliminar la vista existente
DROP VIEW IF EXISTS vista_administradores CASCADE;

-- Crear la vista nuevamente con los campos email incluidos
CREATE VIEW vista_administradores AS
SELECT 
    a.id,
    a.code,
    a.nombre,
    a.telefono,
    a.email1,
    a.email2,
    a.estado,
    a.created_at,
    a.aplica_ajustes,
    a.porcentaje_default
FROM administradores a
ORDER BY a.nombre;

-- 4. Agregar comentario a la vista actualizada
COMMENT ON VIEW vista_administradores IS 
'Vista de administradores con información completa incluyendo emails y configuración de ajustes';

-- 5. Verificación de cambios
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'administradores'
AND column_name IN ('email1', 'email2')
ORDER BY column_name;

-- Mensaje de éxito
DO $$
BEGIN
    RAISE NOTICE '✅ Campos email1 y email2 agregados exitosamente a tabla administradores';
    RAISE NOTICE '✅ Vista vista_administradores actualizada con nuevos campos';
END $$;
