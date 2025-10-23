-- =============================================
-- ANÁLISIS DETALLADO: Tabla usuarios
-- 11 políticas (debe tener solo 3-4)
-- =============================================

-- Ver todas las políticas de usuarios con detalle
SELECT 
  ROW_NUMBER() OVER (ORDER BY policyname) as num,
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'ALL' THEN '⭐ CUBRE TODO'
    WHEN cmd = 'SELECT' THEN '👁️ Solo lectura'
    WHEN cmd = 'INSERT' THEN '➕ Solo crear'
    WHEN cmd = 'UPDATE' THEN '✏️ Solo editar'
    WHEN cmd = 'DELETE' THEN '🗑️ Solo eliminar'
  END as alcance,
  CASE
    WHEN qual LIKE '%admin%' THEN '👔 Admin'
    WHEN qual LIKE '%supervisor%' THEN '👨‍💼 Supervisor'
    WHEN qual LIKE '%trabajador%' THEN '👷 Trabajador'
    ELSE '❓ Otro'
  END as para_quien,
  SUBSTRING(qual, 1, 100) as condicion
FROM pg_policies
WHERE tablename = 'usuarios'
ORDER BY 
  CASE
    WHEN qual LIKE '%admin%' THEN 1
    WHEN qual LIKE '%supervisor%' THEN 2
    WHEN qual LIKE '%trabajador%' THEN 3
    ELSE 4
  END,
  cmd DESC;

-- Identificar duplicados
SELECT 
  CASE
    WHEN qual LIKE '%admin%' THEN '👔 Admin'
    WHEN qual LIKE '%supervisor%' THEN '👨‍💼 Supervisor'
    WHEN qual LIKE '%trabajador%' THEN '👷 Trabajador'
    ELSE '❓ Otro'
  END as rol,
  cmd,
  COUNT(*) as cantidad,
  CASE 
    WHEN COUNT(*) > 1 THEN '⚠️ DUPLICADO'
    ELSE '✅ OK'
  END as estado
FROM pg_policies
WHERE tablename = 'usuarios'
GROUP BY 
  CASE
    WHEN qual LIKE '%admin%' THEN '👔 Admin'
    WHEN qual LIKE '%supervisor%' THEN '👨‍💼 Supervisor'
    WHEN qual LIKE '%trabajador%' THEN '👷 Trabajador'
    ELSE '❓ Otro'
  END,
  cmd
ORDER BY rol, cmd;
