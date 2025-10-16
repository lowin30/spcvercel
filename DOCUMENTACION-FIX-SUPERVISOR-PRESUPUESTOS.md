# 🔒 CORRECCIÓN: Supervisores y Presupuestos Base

**Fecha:** 16 de Octubre, 2025  
**Estado:** 📋 PENDIENTE DE EJECUCIÓN  
**Prioridad:** 🔴 ALTA

---

## 📋 PROBLEMA REPORTADO

### **Síntoma:**
- Supervisor no puede ver presupuesto base en: `/dashboard/presupuestos-base`
- Supervisor no puede ver detalle en: `/dashboard/presupuestos-base/47`
- Supervisor ESTÁ asignado a la tarea en `supervisores_tareas`

### **Ejemplo concreto:**
```
Presupuesto base #47
  - Tarea: "Mitre 4483 5D albañilería piso baño" (ID: 71)
  - Supervisor asignado: Walter Mauricio Quispe Callisaya
  - Estado: Aprobado
  
Supervisor NO puede verlo en la aplicación
```

---

## 🔍 INVESTIGACIÓN REALIZADA

### **Scripts de investigación creados:**
1. `INVESTIGACION-PRESUPUESTOS-BASE-SUPERVISOR.sql`
2. `VERIFICACION-ANTES-ELIMINAR-TEMPORAL.sql`
3. `FIX-ELIMINAR-TEMPORARY-ALL-ACCESS.sql` (script de corrección)

### **Hallazgos:**

#### ✅ **Política correcta existe:**
```sql
"Supervisores pueden ver presupuestos base de sus tareas"
Condición: id_tarea IN (SELECT id_tarea FROM supervisores_tareas WHERE id_supervisor = auth.uid())
```

#### ❌ **Problema encontrado:**
```sql
"temporary_all_access"
Condición: true
Operación: ALL
```

**Esta política temporal está interfiriendo con las políticas específicas.**

---

## 📊 ANÁLISIS TÉCNICO

### **Tablas afectadas por temporary_all_access:**
1. `comentarios`
2. `presupuestos_base`
3. `supervisores_tareas`
4. `trabajadores_tareas`

### **Políticas existentes (sin temporal):**

#### **presupuestos_base:**
- ✅ Admin puede gestionar todos (ALL)
- ✅ Supervisores pueden ver (SELECT) - Existe pero no funciona por temporal
- ❌ **FALTA:** UPDATE para supervisores
- ❌ **FALTA:** INSERT para supervisores

#### **comentarios:**
- ✅ admin_all_comentarios
- ✅ supervisor_all_comentarios
- ✅ trabajador_select/insert

#### **supervisores_tareas:**
- ✅ Acceso consolidado admin+supervisor

#### **trabajadores_tareas:**
- ✅ 9 políticas (admin, supervisor, trabajador)

---

## 🎯 SOLUCIÓN IMPLEMENTADA

### **Cambios en el script:**

#### **1. Eliminar temporary_all_access (4 tablas):**
```sql
DROP POLICY "temporary_all_access" ON comentarios;
DROP POLICY "temporary_all_access" ON presupuestos_base;
DROP POLICY "temporary_all_access" ON supervisores_tareas;
DROP POLICY "temporary_all_access" ON trabajadores_tareas;
```

**Razón:** Política temporal con `condición: true` permite a TODOS acceso total, interfiriendo con políticas específicas.

**Seguridad:** Las 4 tablas tienen políticas alternativas que cubren todos los casos.

#### **2. Agregar políticas faltantes en presupuestos_base:**

**Política UPDATE:**
```sql
"Supervisores pueden editar presupuestos base no aprobados"
Condición USING: 
  - get_my_role() = 'supervisor'
  - aprobado = false (solo si NO está aprobado)
  - id_tarea IN (SELECT ... FROM supervisores_tareas)
```

**Política INSERT:**
```sql
"Supervisores pueden crear presupuestos base de sus tareas"
Condición WITH CHECK:
  - get_my_role() = 'supervisor'
  - id_tarea IN (SELECT ... FROM supervisores_tareas)
```

---

## 📊 COMPORTAMIENTO FINAL

### **Admin:**
| Operación | presupuestos_base | comentarios | supervisores_tareas | trabajadores_tareas |
|-----------|-------------------|-------------|---------------------|---------------------|
| SELECT    | ✅ Todos          | ✅ Todos    | ✅ Todos            | ✅ Todos            |
| INSERT    | ✅ Todos          | ✅ Todos    | ✅ Todos            | ✅ Todos            |
| UPDATE    | ✅ Todos (incluso aprobados) | ✅ Todos | ✅ Todos | ✅ Todos |
| DELETE    | ✅ Todos          | ✅ Todos    | ✅ Todos            | ✅ Todos            |

### **Supervisor:**
| Operación | presupuestos_base | comentarios | supervisores_tareas | trabajadores_tareas |
|-----------|-------------------|-------------|---------------------|---------------------|
| SELECT    | ✅ Sus tareas     | ✅ Todos    | ✅ Sus asignaciones | ✅ Trabajadores de sus tareas |
| INSERT    | ✅ Sus tareas     | ✅ Todos    | ✅ Sus asignaciones | ✅ Trabajadores de sus tareas |
| UPDATE    | ✅ Solo NO aprobados | ✅ Todos | ✅ Sus asignaciones | ✅ Trabajadores de sus tareas |
| DELETE    | ❌ No             | ✅ Todos    | ✅ Sus asignaciones | ✅ Trabajadores de sus tareas |

### **Trabajador:**
| Operación | presupuestos_base | comentarios | supervisores_tareas | trabajadores_tareas |
|-----------|-------------------|-------------|---------------------|---------------------|
| SELECT    | ❌ No             | ✅ Sus tareas | ❌ No             | ✅ Sus asignaciones |
| INSERT    | ❌ No             | ✅ Sus tareas | ❌ No             | ❌ No              |
| UPDATE    | ❌ No             | ❌ No       | ❌ No             | ❌ No              |
| DELETE    | ❌ No             | ❌ No       | ❌ No             | ❌ No              |

---

## ✅ VERIFICACIONES DEL SCRIPT

El script incluye 6 verificaciones automáticas:

1. **BEFORE:** Políticas temporales existentes (debe mostrar 4)
2. **BEFORE:** Políticas de presupuestos_base (debe mostrar 3)
3. **AFTER:** Políticas temporales restantes (debe ser 0)
4. **AFTER:** Políticas de presupuestos_base (debe mostrar 4)
5. **AFTER:** Políticas de otras tablas (deben existir múltiples)
6. **TEST:** Simulación de acceso de supervisores

---

## ⚠️ RIESGOS Y MITIGACIONES

### **Riesgo 1: Supervisores no ven presupuestos**
**Causa:** Falta registro en `supervisores_tareas`  
**Mitigación:** Script de verificación incluido  
**Solución:**
```sql
INSERT INTO supervisores_tareas (id_tarea, id_supervisor)
VALUES ([id_tarea], [uuid_supervisor]);
```

### **Riesgo 2: Error "permission denied"**
**Causa:** Función `get_my_role()` no funciona  
**Mitigación:** Políticas usan esta función que ya está probada  
**Solución:** Verificar rol en tabla `usuarios`

### **Riesgo 3: Comentarios dejan de funcionar**
**Causa:** Políticas alternativas fallan  
**Mitigación:** Comentarios tiene 5 políticas alternativas verificadas  
**Probabilidad:** Muy baja

### **Riesgo 4: Trabajadores no ven tareas**
**Causa:** Políticas alternativas fallan  
**Mitigación:** trabajadores_tareas tiene 9 políticas alternativas  
**Probabilidad:** Muy baja

---

## 🔄 PLAN DE REVERSIÓN

Si algo falla después de ejecutar el script:

### **Reversión completa (solo si es necesario):**
```sql
-- Restaurar temporary_all_access
CREATE POLICY "temporary_all_access" ON comentarios FOR ALL USING (true);
CREATE POLICY "temporary_all_access" ON presupuestos_base FOR ALL USING (true);
CREATE POLICY "temporary_all_access" ON supervisores_tareas FOR ALL USING (true);
CREATE POLICY "temporary_all_access" ON trabajadores_tareas FOR ALL USING (true);

-- Eliminar políticas nuevas
DROP POLICY "Supervisores pueden editar presupuestos base no aprobados" ON presupuestos_base;
DROP POLICY "Supervisores pueden crear presupuestos base de sus tareas" ON presupuestos_base;
```

---

## 📊 DATOS ACTUALES (SNAPSHOT)

### **Presupuestos base:**
```
Total: 31
  - Con supervisor asignado: 5
  - Sin supervisor asignado: 26 (solo admin debe verlos)
```

### **Supervisores:**
```
1. super1 (5a641df9...)
2. jesus (f1d219b3...)
3. Walter Mauricio Quispe Callisaya (c07845b4...)
```

### **Presupuestos que verá Walter Mauricio:**
```
1. PB-121799-537 - Mitre 4483 5D albañilería piso baño
2. PB-539397-177 - ohiggins 2740 7a pintura techo baño
+ otros de sus tareas asignadas
```

---

## 📝 PASOS PARA EJECUTAR

### **1. Backup (recomendado):**
```sql
-- Exportar políticas actuales
SELECT * FROM pg_policies 
WHERE tablename IN ('comentarios', 'presupuestos_base', 'supervisores_tareas', 'trabajadores_tareas')
ORDER BY tablename, policyname;
```

### **2. Ejecutar script:**
```bash
# En Supabase SQL Editor
- Abrir archivo: FIX-ELIMINAR-TEMPORARY-ALL-ACCESS.sql
- Ejecutar todo el script
- Revisar resultados de verificaciones
```

### **3. Verificar en aplicación:**
```
1. Login como supervisor (Walter Mauricio)
2. Ir a /dashboard/presupuestos-base
3. Verificar que se ven los presupuestos de sus tareas
4. Intentar editar presupuesto NO aprobado (debe funcionar)
5. Intentar editar presupuesto aprobado (debe dar error - correcto)
```

### **4. Actualizar documentación:**
```
- Actualizar POLITICAS.md con fecha de ejecución
- Marcar este documento como EJECUTADO
- Commit y push a GitHub
```

---

## 🎯 RESULTADO ESPERADO

### **Antes del script:**
- ❌ Supervisor no ve presupuestos base de sus tareas
- ❌ Error de permisos en aplicación
- ❌ temporary_all_access interfiere

### **Después del script:**
- ✅ Supervisor ve presupuestos base de sus tareas
- ✅ Supervisor puede editar si NO están aprobados
- ✅ Supervisor puede crear presupuestos base
- ✅ Admin sigue teniendo acceso total
- ✅ Sin políticas temporales
- ✅ Sistema más seguro y predecible

---

## 📞 CONTACTO Y SOPORTE

**Si hay problemas después de ejecutar:**
1. Revisar sección "RIESGOS Y MITIGACIONES"
2. Ejecutar queries de diagnóstico en script
3. Revisar logs de Supabase
4. Si es crítico: ejecutar plan de reversión

---

**Documentado por:** Cascade AI  
**Fecha:** 16 de Octubre, 2025  
**Versión:** 1.0  
**Estado:** 📋 Pendiente de ejecución
