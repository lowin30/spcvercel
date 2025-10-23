# 🚀 PLAN DE IMPLEMENTACIÓN - MI CENTRO DE LIQUIDACIONES
## Sistema Unificado de Pagos y Jornales

**Fecha:** 23 de Octubre, 2025  
**Estado:** 🟢 IMPLEMENTACIÓN EN CURSO  
**Autorización:** ✅ LUZ VERDE CONFIRMADA

---

## ✅ **INFORMACIÓN CONFIRMADA DE SUPABASE**

### **1. TABLAS Y VISTAS:**

#### **vista_partes_trabajo_completa** ✅
- `id`, `created_at`, `id_trabajador`, `id_tarea`, `fecha`, `tipo_jornada`
- `liquidado` (boolean) ← **Campo clave para filtrar pendientes**
- `id_liquidacion` (integer)
- `titulo_tarea`, `code_tarea`, `email_trabajador`, `nombre_edificio`

#### **vista_gastos_tarea_completa** ✅
- `id`, `id_tarea`, `id_usuario`, `tipo_gasto`, `monto`, `descripcion`
- `liquidado` (boolean) ← **Campo clave para filtrar pendientes**
- `id_liquidacion` (integer)
- `fecha_gasto`, `estado`, `metodo_registro`, `datos_ocr`
- `titulo_tarea`, `code_tarea`, `email_usuario`, `nombre_edificio`

#### **liquidaciones_trabajadores** ✅
- `id`, `id_trabajador`
- `semana_inicio`, `semana_fin`
- `total_dias` (numeric)
- `salario_base`, `plus_manual`, `gastos_reembolsados`, `total_pagar`
- `estado` (text: 'pagado', 'pendiente', etc)
- `observaciones`, `created_at`, `updated_at`

#### **configuracion_trabajadores** ✅
- `id_trabajador` (uuid, NOT NULL)
- `salario_diario` (integer, NOT NULL) ← **Para calcular jornales**
- `activo` (boolean)

---

### **2. ESTADO ACTUAL DEL SISTEMA:**

```
Partes de trabajo:
├─ Total: 19
├─ Liquidados: 6 (liquidado = true)
└─ Pendientes: 13 (liquidado = false) ← ESTOS mostrar

Liquidaciones trabajadores:
├─ Total registradas: 27+
└─ Última: #27 ($199,497 pagado Oct 18)

Liquidaciones supervisores:
└─ Total: 2 (liquidaciones_nuevas)
```

---

### **3. REGLAS DE NEGOCIO CONFIRMADAS:**

1. **liquidaciones_trabajadores:**
   - 💰 Pago semanal a trabajadores/supervisores
   - 📅 Se crea al finalizar cada semana
   - 💵 Incluye: jornales + gastos reembolsados

2. **liquidaciones_nuevas:**
   - 💼 Liquidación final a supervisores
   - 🏗️ Se paga al terminar la tarea supervisada
   - 📊 Basada en presupuestos finales

3. **Supervisores:**
   - ✅ SÍ pueden registrar partes de trabajo
   - ✅ Tienen jornales pendientes como trabajadores
   - ✅ También reciben liquidaciones semanales

---

## 🎯 **ESTRUCTURA DEL SISTEMA**

### **PÁGINA: `/dashboard/trabajadores/gastos`**
**Nuevo nombre:** "Mi Centro de Liquidaciones"

### **4 TABS PRINCIPALES:**

#### **📊 TAB 1: RESUMEN GENERAL**
- Cards con totales:
  - Gastos pendientes (monto + cantidad)
  - Jornales pendientes (monto + cantidad días)
  - Total a cobrar (gastos + jornales)
  - Última liquidación recibida
- Desglose por tarea (colapsable)
- Filtros: Esta semana / Semanas anteriores / Todo

#### **💰 TAB 2: MIS GASTOS** (Ya existe - mantener)
- Sistema actual de gastos con OCR
- Historial de comprobantes
- Por tarea con filtros

#### **📅 TAB 3: MIS JORNALES** (NUEVO)
- Listado de partes de trabajo NO liquidados
- Agrupado por tarea o por fecha
- Muestra: fecha, tipo_jornada, tarea, monto calculado
- Total días trabajados
- Total a cobrar por jornales

#### **💵 TAB 4: HISTORIAL DE PAGOS** (NUEVO)
- Lista de liquidaciones recibidas
- Filtros: Mes, Año
- Desglose detallado por liquidación:
  - Periodo (semana_inicio → semana_fin)
  - Días trabajados
  - Salario base
  - Gastos reembolsados
  - Total pagado
  - Estado

---

## 📝 **COMPONENTES A CREAR**

### **1. ResumenLiquidaciones.tsx**
**Ubicación:** `components/resumen-liquidaciones.tsx`

**Props:**
```typescript
{
  userId: string
  userRole: string
  gastosPendientes: { total: number, count: number }
  jornalesPendientes: { total: number, count: number, dias: number }
  ultimaLiquidacion?: { monto: number, fecha: string }
}
```

**Funcionalidad:**
- 4 Cards de resumen con iconos
- Desglose por tarea (accordion)
- Alertas si hay montos altos pendientes
- Responsive

---

### **2. HistorialJornalesGlobal.tsx**
**Ubicación:** `components/historial-jornales-global.tsx`

**Diferencia con historial-jornales-tarea.tsx:**
- NO filtra por tarea (muestra TODOS los pendientes del usuario)
- Agrupa por tarea (en lugar de por trabajador)
- Solo muestra `liquidado = false`
- Vista de tabla/cards responsive

**Props:**
```typescript
{
  userId: string
  userRole: string
  filterByTarea?: number  // Opcional
  showOnlyPending?: boolean  // Default true
}
```

**Query base:**
```typescript
supabase
  .from('vista_partes_trabajo_completa')
  .select('*')
  .eq('id_trabajador', userId)
  .eq('liquidado', false)
  .order('fecha', { ascending: false })
```

**Para supervisor (ver sus tareas):**
```typescript
// 1. Obtener tareas supervisadas
const { data: tareasIds } = await supabase
  .from('supervisores_tareas')
  .select('id_tarea')
  .eq('id_supervisor', userId)

// 2. Filtrar partes de esas tareas
supabase
  .from('vista_partes_trabajo_completa')
  .select('*')
  .in('id_tarea', tareasIds)
  .eq('liquidado', false)
```

---

### **3. HistorialPagos.tsx**
**Ubicación:** `components/historial-pagos.tsx`

**Props:**
```typescript
{
  userId: string
  userRole: string
}
```

**Query:**
```typescript
supabase
  .from('liquidaciones_trabajadores')
  .select('*')
  .eq('id_trabajador', userId)
  .order('created_at', { ascending: false })
```

**Funcionalidad:**
- Lista de liquidaciones con cards
- Desglose expandible por liquidación
- Filtros: Mes, Año, Estado
- Totales: Total cobrado, Promedio mensual
- Botón "Descargar comprobante" (futuro)

---

## 🔧 **MODIFICACIONES A ARCHIVO EXISTENTE**

### **trabajadores/gastos/page.tsx**

#### **Cambios principales:**

1. **Renombrar título:**
```typescript
<h1>Mi Centro de Liquidaciones</h1>
<p>Gestiona tus gastos, jornales y pagos en un solo lugar</p>
```

2. **Agregar queries de jornales:**
```typescript
// Jornales pendientes
const { data: jornalesPendientes } = await supabase
  .from('vista_partes_trabajo_completa')
  .select(`
    *,
    usuarios!vista_partes_trabajo_completa_id_trabajador_fkey (
      configuracion_trabajadores (salario_diario)
    )
  `)
  .eq('id_trabajador', userId)
  .eq('liquidado', false)

// Calcular total jornales
const totalJornales = jornalesPendientes.reduce((sum, parte) => {
  const salario = parte.usuarios.configuracion_trabajadores.salario_diario
  const monto = parte.tipo_jornada === 'dia_completo' ? salario : salario * 0.5
  return sum + monto
}, 0)
```

3. **Agregar query última liquidación:**
```typescript
const { data: ultimaLiq } = await supabase
  .from('liquidaciones_trabajadores')
  .select('*')
  .eq('id_trabajador', userId)
  .order('created_at', { ascending: false })
  .limit(1)
  .single()
```

4. **Implementar Tabs:**
```typescript
<Tabs defaultValue="resumen" className="w-full">
  <TabsList className="grid w-full grid-cols-4">
    <TabsTrigger value="resumen">Resumen</TabsTrigger>
    <TabsTrigger value="gastos">Gastos</TabsTrigger>
    <TabsTrigger value="jornales">Jornales</TabsTrigger>
    <TabsTrigger value="historial">Pagos</TabsTrigger>
  </TabsList>

  <TabsContent value="resumen">
    <ResumenLiquidaciones {...} />
  </TabsContent>

  <TabsContent value="gastos">
    {/* Sistema actual de gastos */}
  </TabsContent>

  <TabsContent value="jornales">
    <HistorialJornalesGlobal {...} />
  </TabsContent>

  <TabsContent value="historial">
    <HistorialPagos {...} />
  </TabsContent>
</Tabs>
```

---

## 🎨 **DISEÑO Y UX**

### **Colores semánticos:**
- 🟢 Verde: Pagado, completado
- 🟡 Amarillo/Naranja: Pendiente
- 🔵 Azul: Información, jornales
- 🟣 Morado: Gastos, materiales
- ⚫ Gris: Deshabilitado, histórico

### **Iconos (Lucide):**
- `Receipt` - Gastos
- `CalendarDays` - Jornales
- `DollarSign` - Pagos
- `Clock` - Pendiente
- `CheckCircle` - Completado
- `TrendingUp` - Totales

---

## 🔐 **PERMISOS POR ROL**

### **TRABAJADOR:**
```typescript
// Ver SOLO sus propios datos
WHERE id_trabajador = userId
```

### **SUPERVISOR:**
```typescript
// Ver datos de sus tareas supervisadas
WHERE id_tarea IN (
  SELECT id_tarea FROM supervisores_tareas WHERE id_supervisor = userId
)

// ADEMÁS ver sus propios jornales como trabajador
WHERE id_trabajador = userId
```

### **ADMIN:**
```typescript
// Ver TODO sin filtros
// Sin restricciones
```

---

## 📊 **QUERIES CLAVE**

### **1. Gastos pendientes por usuario:**
```sql
SELECT 
  SUM(monto) as total,
  COUNT(*) as cantidad
FROM vista_gastos_tarea_completa
WHERE id_usuario = 'USER_ID'
  AND liquidado = false;
```

### **2. Jornales pendientes con cálculo:**
```sql
SELECT 
  p.*,
  ct.salario_diario,
  CASE 
    WHEN p.tipo_jornada = 'dia_completo' THEN ct.salario_diario
    WHEN p.tipo_jornada = 'medio_dia' THEN ct.salario_diario * 0.5
  END as monto_jornal
FROM vista_partes_trabajo_completa p
JOIN configuracion_trabajadores ct ON p.id_trabajador = ct.id_trabajador
WHERE p.id_trabajador = 'USER_ID'
  AND p.liquidado = false;
```

### **3. Última liquidación:**
```sql
SELECT *
FROM liquidaciones_trabajadores
WHERE id_trabajador = 'USER_ID'
ORDER BY created_at DESC
LIMIT 1;
```

### **4. Historial completo:**
```sql
SELECT *
FROM liquidaciones_trabajadores
WHERE id_trabajador = 'USER_ID'
ORDER BY semana_inicio DESC;
```

---

## ✅ **CHECKLIST DE IMPLEMENTACIÓN**

- [ ] Crear ResumenLiquidaciones.tsx
- [ ] Crear HistorialJornalesGlobal.tsx
- [ ] Crear HistorialPagos.tsx
- [ ] Modificar trabajadores/gastos/page.tsx con tabs
- [ ] Agregar queries de jornales pendientes
- [ ] Implementar cálculo de montos
- [ ] Agregar filtros por rol (trabajador/supervisor/admin)
- [ ] Testing con usuario trabajador
- [ ] Testing con usuario supervisor
- [ ] Testing con usuario admin
- [ ] Verificar responsive mobile
- [ ] Commit y push a GitHub

---

## 🚀 **ORDEN DE DESARROLLO**

1. ✅ **FASE 1:** Crear ResumenLiquidaciones (30 min)
2. ✅ **FASE 2:** Crear HistorialJornalesGlobal (45 min)
3. ✅ **FASE 3:** Crear HistorialPagos (30 min)
4. ✅ **FASE 4:** Modificar página con tabs (30 min)
5. ✅ **FASE 5:** Testing y ajustes (30 min)

**Tiempo estimado total:** 2.5 - 3 horas

---

## 📝 **NOTAS IMPORTANTES**

- ✅ NO eliminar componentes existentes
- ✅ NO modificar `historial-jornales-tarea.tsx` (mantener intacto)
- ✅ Usar campo `liquidado` (NO `id_liquidacion IS NULL`)
- ✅ Salario diario viene de `configuracion_trabajadores`
- ✅ Vista `vista_partes_trabajo_completa` YA EXISTE
- ✅ Supervisores tienen jornales como trabajadores

---

**Estado:** 🟢 LISTO PARA IMPLEMENTAR - INFORMACIÓN COMPLETA CONFIRMADA
