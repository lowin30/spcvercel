-- ============================================
-- SCRIPT 3: CORREGIR 29 PRESUPUESTOS BASE HISTORICOS
-- CAMBIOS MINIMOS - SOLO APRUEBA PRESUPUESTOS BASE
-- ============================================

-- ============================================
-- PASO 1: VERIFICAR PRESUPUESTOS A CORREGIR
-- ============================================

-- Ver los 29 presupuestos base NO aprobados que tienen presupuesto final
SELECT 
    pb.id as base_id,
    pb.code as base_code,
    pb.aprobado as base_aprobado,
    pb.fecha_aprobacion,
    pf.id as final_id,
    pf.code as final_code
FROM presupuestos_finales pf
INNER JOIN presupuestos_base pb ON pf.id_presupuesto_base = pb.id
WHERE pb.aprobado = false
ORDER BY pf.created_at DESC;

-- Contar cuántos son
SELECT 
    COUNT(*) as total_a_aprobar
FROM presupuestos_finales pf
INNER JOIN presupuestos_base pb ON pf.id_presupuesto_base = pb.id
WHERE pb.aprobado = false;

-- ============================================
-- PASO 2: APROBAR PRESUPUESTOS BASE
-- ============================================

-- Actualizar aprobado = true y fecha_aprobacion = NOW()
UPDATE presupuestos_base
SET 
    aprobado = true,
    fecha_aprobacion = NOW(),
    updated_at = NOW()
WHERE id IN (
    SELECT pb.id
    FROM presupuestos_finales pf
    INNER JOIN presupuestos_base pb ON pf.id_presupuesto_base = pb.id
    WHERE pb.aprobado = false
);

-- ============================================
-- PASO 3: VERIFICACION
-- ============================================

-- Verificar que NO quedan presupuestos base sin aprobar con final asociado
SELECT 
    COUNT(*) as deberia_ser_cero
FROM presupuestos_finales pf
INNER JOIN presupuestos_base pb ON pf.id_presupuesto_base = pb.id
WHERE pb.aprobado = false;

-- Ver los que se aprobaron (con fecha reciente)
SELECT 
    pb.id,
    pb.code,
    pb.aprobado,
    pb.fecha_aprobacion,
    pf.code as presupuesto_final
FROM presupuestos_base pb
INNER JOIN presupuestos_finales pf ON pf.id_presupuesto_base = pb.id
WHERE pb.fecha_aprobacion >= NOW() - INTERVAL '5 minutes'
ORDER BY pb.fecha_aprobacion DESC;

-- ============================================
-- RESULTADO ESPERADO
-- ============================================

/*
PASO 1: Ver los 29 presupuestos
  - Debe mostrar 29 filas
  - Todos con aprobado = false

PASO 2: UPDATE ejecutado
  - Debe decir "UPDATE 29"

PASO 3: Verificación
  - deberia_ser_cero = 0
  - Segunda query muestra los 29 aprobados con fecha reciente

RESULTADO FINAL:
✅ 29 presupuestos base aprobados
✅ Fecha de aprobación establecida
✅ Ya NO hay inconsistencias
✅ Trigger evitará futuras inconsistencias
*/

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================

/*
ESTE SCRIPT:
✅ Solo actualiza aprobado = true
✅ Solo afecta presupuestos base con final asociado
✅ NO modifica montos ni otros campos
✅ Cambio mínimo y exacto

IMPACTO:
- 29 presupuestos base pasan a aprobado
- Inconsistencias resueltas
- Flujo normal continúa
- Nuevos presupuestos finales crearán base automáticamente
*/
