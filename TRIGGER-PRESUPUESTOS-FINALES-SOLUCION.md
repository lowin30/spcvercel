# 🔐 SOLUCIÓN: TRIGGER + SEGURIDAD PRESUPUESTOS FINALES

## ⚠️ **PROBLEMA CRÍTICO DE SEGURIDAD DETECTADO**

```
❌ Supervisores NO deben ver presupuestos_finales
❌ Supervisores NO deben ver facturas
✅ Supervisores SÍ pueden ver presupuestos_base
```

---

## 📊 **ESTRUCTURA CONFIRMADA**

### **Tablas:**
```
presupuestos_base (admin + supervisor)
  ↓ id_presupuesto_base
presupuestos_finales (SOLO admin) ← ⚠️ CRÍTICO
  ↓ id_presupuesto
facturas (SOLO admin)
```

### **Campo Clave:**
```sql
presupuestos_finales.id_presupuesto_base → presupuestos_base.id
```

---

## 🎯 **SOLUCIÓN COMPLETA**

### **1. Trigger Automático (Aprobar Base al Crear Final)**

```sql
-- ============================================
-- FUNCIÓN: Aprobar presupuesto base automáticamente
-- ============================================

CREATE OR REPLACE FUNCTION aprobar_presupuesto_base_automatico()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo si el presupuesto final tiene un presupuesto base asociado
  IF NEW.id_presupuesto_base IS NOT NULL THEN
    
    -- Aprobar el presupuesto base automáticamente
    UPDATE presupuestos_base
    SET 
      aprobado = true,
      fecha_aprobacion = NOW()
    WHERE id = NEW.id_presupuesto_base
      AND aprobado = false; -- Solo si aún no está aprobado
    
    -- Log para auditoría (opcional)
    RAISE NOTICE 'Presupuesto base % aprobado automáticamente', NEW.id_presupuesto_base;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGER: Ejecutar después de INSERT en presupuestos_finales
-- ============================================

DROP TRIGGER IF EXISTS trigger_aprobar_presupuesto_base ON presupuestos_finales;

CREATE TRIGGER trigger_aprobar_presupuesto_base
AFTER INSERT ON presupuestos_finales
FOR EACH ROW
EXECUTE FUNCTION aprobar_presupuesto_base_automatico();

-- ============================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- ============================================

COMMENT ON FUNCTION aprobar_presupuesto_base_automatico() IS 
'Aprueba automáticamente el presupuesto base cuando se crea un presupuesto final asociado';

COMMENT ON TRIGGER trigger_aprobar_presupuesto_base ON presupuestos_finales IS 
'Trigger que aprueba automáticamente presupuestos_base al crear presupuestos_finales';
```

---

## 🔐 **2. CORREGIR POLÍTICAS DE SEGURIDAD (RLS)**

### **⚠️ CRÍTICO: Verificar y Corregir Acceso**

```sql
-- ============================================
-- PASO 1: VER POLÍTICAS ACTUALES
-- ============================================

SELECT 
    policyname,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN ('presupuestos_finales', 'presupuestos_base');

-- ============================================
-- PASO 2: ELIMINAR POLÍTICAS INCORRECTAS (si existen)
-- ============================================

-- ⚠️ EJECUTAR SOLO SI CONFIRMAS QUE HAY POLÍTICAS INCORRECTAS

-- DROP POLICY IF EXISTS nombre_politica_incorrecta ON presupuestos_finales;

-- ============================================
-- PASO 3: CREAR POLÍTICAS CORRECTAS
-- ============================================

-- ✅ presupuestos_finales: SOLO ADMIN
DROP POLICY IF EXISTS "presupuestos_finales_solo_admin" ON presupuestos_finales;

CREATE POLICY "presupuestos_finales_solo_admin" 
ON presupuestos_finales
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.rol = 'admin'
  )
);

-- ✅ presupuestos_base: ADMIN + SUPERVISOR (de su edificio)
DROP POLICY IF EXISTS "presupuestos_base_admin_supervisor" ON presupuestos_base;

CREATE POLICY "presupuestos_base_admin_supervisor" 
ON presupuestos_base
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND (
      usuarios.rol = 'admin'
      OR (
        usuarios.rol = 'supervisor'
        AND presupuestos_base.id_supervisor = auth.uid()
      )
    )
  )
);

-- ============================================
-- PASO 4: HABILITAR RLS (si no está habilitado)
-- ============================================

ALTER TABLE presupuestos_finales ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuestos_base ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PASO 5: VERIFICAR QUE FUNCIONA
-- ============================================

-- Como admin (debería devolver filas)
SELECT COUNT(*) FROM presupuestos_finales;

-- Como supervisor (debería devolver 0 o error)
-- Simular cambiando el contexto de auth.uid()
```

---

## 🛠️ **3. SCRIPT DE CORRECCIÓN DE INCONSISTENCIAS**

### **Si hay presupuestos finales con base NO aprobado:**

```sql
-- ============================================
-- CORREGIR DATOS HISTÓRICOS
-- ============================================

-- Ver inconsistencias primero
SELECT 
    pb.id as base_id,
    pb.code as base_code,
    pb.aprobado as base_aprobado,
    pf.id as final_id,
    pf.code as final_code,
    pf.created_at as final_fecha
FROM presupuestos_finales pf
INNER JOIN presupuestos_base pb ON pf.id_presupuesto_base = pb.id
WHERE pb.aprobado = false;

-- Corregir (aprobar bases que deberían estar aprobados)
UPDATE presupuestos_base pb
SET 
    aprobado = true,
    fecha_aprobacion = pf.created_at -- Usar fecha del presupuesto final
FROM presupuestos_finales pf
WHERE pb.id = pf.id_presupuesto_base
    AND pb.aprobado = false
    AND pf.id_presupuesto_base IS NOT NULL;

-- Verificar corrección
SELECT 
    COUNT(*) as bases_corregidos
FROM presupuestos_finales pf
INNER JOIN presupuestos_base pb ON pf.id_presupuesto_base = pb.id
WHERE pb.aprobado = false;
-- Debería devolver 0
```

---

## 🧪 **4. PLAN DE TESTING**

### **Fase 1: Testing en Desarrollo**

```sql
-- 1. Crear presupuesto base de prueba
INSERT INTO presupuestos_base (
    code, 
    id_tarea, 
    id_edificio, 
    id_administrador,
    materiales, 
    mano_obra, 
    total,
    aprobado
) VALUES (
    'PB-TEST-001',
    1, -- reemplazar con ID real
    1, -- reemplazar con ID real
    1, -- reemplazar con ID real
    10000,
    5000,
    15000,
    false -- NO aprobado
) RETURNING id;

-- Guardar el ID que devuelve (ejemplo: 999)

-- 2. Crear presupuesto final usando ese base
INSERT INTO presupuestos_finales (
    code,
    id_presupuesto_base,
    id_tarea,
    id_edificio,
    id_administrador,
    materiales,
    mano_obra,
    total,
    total_base
) VALUES (
    'PF-TEST-001',
    999, -- ID del base creado arriba
    1,
    1,
    1,
    12000,
    6000,
    18000,
    15000
) RETURNING id;

-- 3. Verificar que el base se aprobó automáticamente
SELECT 
    id,
    code,
    aprobado,
    fecha_aprobacion
FROM presupuestos_base
WHERE id = 999;

-- Debería mostrar:
-- aprobado = true
-- fecha_aprobacion = [fecha actual]

-- 4. Limpiar datos de prueba
DELETE FROM presupuestos_finales WHERE code = 'PF-TEST-001';
DELETE FROM presupuestos_base WHERE code = 'PB-TEST-001';
```

### **Fase 2: Testing de Seguridad**

```sql
-- Como supervisor, intentar ver presupuestos finales
-- Debería devolver 0 o error de permisos
SELECT COUNT(*) FROM presupuestos_finales;

-- Como admin, debería funcionar
SELECT COUNT(*) FROM presupuestos_finales;

-- Como supervisor, SÍ debería ver sus presupuestos base
SELECT COUNT(*) FROM presupuestos_base 
WHERE id_supervisor = auth.uid();
```

---

## 📋 **5. ORDEN DE EJECUCIÓN**

### **Paso a Paso:**

1. **Ejecutar investigación:**
   ```sql
   -- INVESTIGACION-PRESUPUESTOS-FINALES-CORREGIDA.sql
   ```

2. **Revisar resultados:**
   - Query 3: ¿Hay inconsistencias?
   - Query 4-5: ¿Políticas correctas?
   - Query 6: ¿RLS habilitado?

3. **Corregir seguridad (si es necesario):**
   ```sql
   -- Sección 2 de este archivo
   ```

4. **Crear trigger:**
   ```sql
   -- Sección 1 de este archivo
   ```

5. **Corregir inconsistencias (si existen):**
   ```sql
   -- Sección 3 de este archivo
   ```

6. **Testing:**
   ```sql
   -- Sección 4 de este archivo
   ```

---

## ⚠️ **ADVERTENCIAS CRÍTICAS**

### **Seguridad:**
```
❌ NUNCA dar acceso de presupuestos_finales a supervisores
❌ NUNCA dar acceso de facturas a supervisores
✅ Supervisores solo ven presupuestos_base de sus tareas
```

### **Trigger:**
```
✅ Solo afecta NUEVOS presupuestos finales
⚠️ Datos históricos necesitan script de corrección
✅ Trigger no impide anular aprobación manualmente
```

### **Testing:**
```
✅ Probar en desarrollo primero
✅ Verificar seguridad con diferentes roles
✅ Confirmar que no rompe flujos existentes
```

---

## 🎯 **RESUMEN EJECUTIVO**

### **Problema Actual:**
1. Presupuestos base NO se aprueban automáticamente
2. Posible problema de seguridad con acceso de supervisores

### **Solución:**
1. ✅ Trigger automático para aprobar base
2. ✅ Políticas RLS correctas (verificar)
3. ✅ Script de corrección para datos viejos
4. ✅ Testing completo

### **Resultado:**
- ✅ Automatización inteligente
- ✅ Seguridad garantizada
- ✅ Consistencia de datos
- ✅ Reversión manual disponible

---

## 📝 **SIGUIENTE PASO**

**Ejecuta en este orden:**

1. ✅ `INVESTIGACION-PRESUPUESTOS-FINALES-CORREGIDA.sql`
2. ⏸️ Comparte resultados
3. ⏸️ Ejecutamos correcciones necesarias
4. ⏸️ Testeamos

**¿Ejecutamos la investigación?** 🔍
