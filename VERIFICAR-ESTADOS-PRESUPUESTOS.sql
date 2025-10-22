-- =====================================================
-- VERIFICAR ESTADOS DE PRESUPUESTOS
-- Fecha: 21 de Octubre, 2025
-- Propósito: Encontrar el ID del estado "rechazado"
-- =====================================================

-- Ver todos los estados disponibles en la tabla estados_presupuestos
SELECT 
  id,
  codigo,
  nombre,
  descripcion,
  color
FROM estados_presupuestos
ORDER BY orden;

-- Buscar específicamente el estado "rechazado"
SELECT 
  id,
  codigo,
  nombre,
  descripcion,
  color
FROM estados_presupuestos
WHERE nombre ILIKE '%rechazado%'
   OR codigo ILIKE '%rechazado%'
   OR descripcion ILIKE '%rechazado%';

-- Ver el estado actual del presupuesto final ID 72
SELECT 
  pf.id,
  pf.code,
  pf.id_estado,
  pf.aprobado,
  pf.rechazado,
  ep.nombre as estado_actual,
  ep.codigo as codigo_estado
FROM presupuestos_finales pf
LEFT JOIN estados_presupuestos ep ON pf.id_estado = ep.id
WHERE pf.id = 72;

-- Una vez que sepamos el ID del estado "rechazado",
-- actualizar el presupuesto para que use ese estado

-- Ejemplo (reemplazar <ID_ESTADO_RECHAZADO> con el ID real):
-- UPDATE presupuestos_finales
-- SET id_estado = <ID_ESTADO_RECHAZADO>
-- WHERE id = 72;
