# 📊 ANÁLISIS Y MEJORAS: Página Gastos de Trabajadores

**Fecha:** 22 de Octubre, 2025  
**Páginas analizadas:**
- `/dashboard/trabajadores/gastos` (actual)
- `/dashboard/tareas/[id]` (referencia)

---

## 🔍 **SITUACIÓN ACTUAL:**

### **Página `/dashboard/trabajadores/gastos`**

#### **✅ Lo que SÍ tiene:**
1. **Selector de tareas** (solo no finalizadas)
2. **ProcesadorImagen** con OCR mejorado
3. **Resumen estadístico:**
   - Gastos de esta semana
   - Gastos pendientes acumulados
   - Último reembolso pagado
4. **Historial general** con filtros:
   - Todos los gastos
   - Esta semana
   - Pendientes de semanas anteriores
5. **Filtros por fecha/semana**

#### **❌ Lo que NO tiene:**
1. **NO muestra gastos de la tarea seleccionada**
   - Al seleccionar tarea, solo aparece el procesador
   - No hay historial específico de esa tarea
2. **NO muestra jornales/partes de trabajo**
   - No hay componente para ver días trabajados
   - No hay calendario de partes
3. **NO tiene descarga de PDF por tarea**
   - Solo muestra gastos generales
4. **NO tiene vista detallada de tarea**
   - No muestra presupuestos
   - No muestra estado de la tarea
   - No muestra supervisor/trabajadores asignados

---

### **Página `/dashboard/tareas/[id]` (Referencia)**

#### **✅ Lo que tiene:**

1. **Información completa de la tarea:**
   - Estado, prioridad, supervisor
   - Trabajadores asignados
   - Presupuestos (base y final)
   - Comentarios

2. **ProcesadorImagen** con OCR

3. **HistorialGastosOCR:**
   - Gastos específicos de la tarea
   - Filtrado inteligente (no liquidados + materiales liquidados)
   - Descarga de PDF de gastos
   - Tiempo real (websockets)
   - Permisos por rol

4. **Registro de Partes de Trabajo:**
   - Formulario para registrar días trabajados
   - Calendario con partes registrados
   - Solo visible para trabajadores asignados

5. **Indicador de Semanas Liquidadas**
   - Para trabajadores
   - Muestra semanas con liquidación

---

## 📊 **COMPARACIÓN DETALLADA:**

| Característica | `/trabajadores/gastos` | `/tareas/[id]` |
|---|---|---|
| **Selector de tarea** | ✅ Sí | ❌ No (URL directa) |
| **Procesador OCR** | ✅ Sí | ✅ Sí |
| **Historial de gastos de tarea** | ❌ No | ✅ Sí (`HistorialGastosOCR`) |
| **PDF de gastos por tarea** | ❌ No | ✅ Sí |
| **Jornales/Partes de trabajo** | ❌ No | ✅ Sí |
| **Calendario de partes** | ❌ No | ✅ Sí (implícito) |
| **Resumen estadístico global** | ✅ Sí | ❌ No |
| **Filtros temporales** | ✅ Sí | ❌ No |
| **Información de tarea** | ❌ No | ✅ Sí |
| **Tiempo real** | ❌ No | ✅ Sí |
| **Permisos por rol** | ⚠️ Parcial | ✅ Sí |

---

## 🎯 **SUGERENCIAS DE MEJORA:**

### **OPCIÓN 1: Agregar Sección de Detalle de Tarea** ⭐ **RECOMENDADA**

**Concepto:** Cuando se selecciona una tarea, mostrar una vista completa similar a `/tareas/[id]`.

#### **Componentes a agregar:**

```typescript
// Después de seleccionar tarea:
<Card>
  <CardHeader>
    <div className="flex justify-between items-center">
      <div>
        <CardTitle>{tarea.code} - {tarea.titulo}</CardTitle>
        <CardDescription>Vista detallada de gastos y jornales</CardDescription>
      </div>
      <Button variant="ghost" onClick={() => setTareaSeleccionada("")}>
        <ArrowLeft /> Volver
      </Button>
    </div>
  </CardHeader>
  <CardContent>
    {/* Tabs para organizar contenido */}
    <Tabs defaultValue="gastos">
      <TabsList>
        <TabsTrigger value="gastos">💰 Gastos</TabsTrigger>
        <TabsTrigger value="jornales">👷 Jornales</TabsTrigger>
        <TabsTrigger value="registrar">➕ Registrar</TabsTrigger>
      </TabsList>
      
      {/* Tab 1: Historial de Gastos */}
      <TabsContent value="gastos">
        <HistorialGastosOCR 
          tareaId={tareaSeleccionada} 
          userRole={usuario?.rol}
          userId={usuario?.id}
        />
      </TabsContent>
      
      {/* Tab 2: Jornales/Partes de Trabajo */}
      <TabsContent value="jornales">
        <HistorialJornalesTarea 
          tareaId={tareaSeleccionada}
          userRole={usuario?.rol}
          userId={usuario?.id}
        />
      </TabsContent>
      
      {/* Tab 3: Registrar (ProcesadorImagen) */}
      <TabsContent value="registrar">
        <ProcesadorImagen 
          tareaId={tareaSeleccionada}
          // ...
        />
      </TabsContent>
    </Tabs>
  </CardContent>
</Card>
```

#### **Ventajas:**
- ✅ Usa componentes existentes
- ✅ No duplica código
- ✅ Experiencia consistente
- ✅ Fácil de implementar

#### **Desventajas:**
- ⚠️ Necesita crear componente `HistorialJornalesTarea`
- ⚠️ Puede ser visualmente denso

---

### **OPCIÓN 2: Dos Páginas Separadas** 

**Concepto:** Mantener página actual para vista general, crear nueva para detalle.

```
/dashboard/trabajadores/gastos          → Vista general (actual)
/dashboard/trabajadores/gastos/[id]     → Detalle de tarea
```

#### **Ventajas:**
- ✅ Separación clara de responsabilidades
- ✅ URLs específicas (mejor para navegación)
- ✅ Cada página puede tener su propio estado

#### **Desventajas:**
- ❌ Más navegación requerida
- ❌ Duplicación de componentes
- ❌ Más trabajo de desarrollo

---

### **OPCIÓN 3: Modal/Drawer para Detalle**

**Concepto:** Abrir modal o drawer lateral con detalle de tarea.

#### **Ventajas:**
- ✅ No pierde contexto de página principal
- ✅ Transición visual suave
- ✅ Fácil de cerrar

#### **Desventajas:**
- ❌ Espacio limitado en pantalla
- ❌ No funciona bien en móvil
- ❌ No se puede compartir URL específica

---

## 🏆 **RECOMENDACIÓN FINAL: OPCIÓN 1**

### **Implementación Sugerida:**

#### **Estructura de componentes:**

```
/dashboard/trabajadores/gastos/page.tsx
├─ Estado: tareaSeleccionada
├─ Si NO hay tarea seleccionada:
│  ├─ Selector de tareas
│  ├─ Resumen estadístico (actual)
│  └─ Historial general (actual)
└─ Si hay tarea seleccionada:
   ├─ Header con título y botón "Volver"
   ├─ Tabs:
   │  ├─ Tab "Gastos":
   │  │  └─ HistorialGastosOCR (ya existe)
   │  ├─ Tab "Jornales":
   │  │  └─ HistorialJornalesTarea (nuevo componente)
   │  └─ Tab "Registrar":
   │     └─ ProcesadorImagen (actual)
   └─ Botón "Descargar Resumen PDF" (global)
```

---

## 🔧 **COMPONENTE NUEVO A CREAR:**

### **`HistorialJornalesTarea`**

**Propósito:** Mostrar jornales/partes de trabajo de la tarea seleccionada.

**Props:**
```typescript
interface HistorialJornalesTareaProps {
  tareaId: number
  userRole: 'admin' | 'supervisor' | 'trabajador'
  userId?: string
}
```

**Funcionalidad:**

1. **Para Admin/Supervisor:**
   - Ver TODOS los partes de trabajo de la tarea
   - Mostrar todos los trabajadores
   - Totales por trabajador
   - Descargar PDF de jornales

2. **Para Trabajador:**
   - Ver solo SUS partes de trabajo
   - Sus horas/días trabajados
   - Total de sus jornales

**Query Supabase:**
```typescript
// Para admin/supervisor
const { data } = await supabase
  .from('partes_de_trabajo')
  .select(`
    *,
    usuarios (email, color_perfil),
    configuracion_trabajadores (salario_diario)
  `)
  .eq('id_tarea', tareaId)
  .order('fecha', { ascending: false })

// Para trabajador
const { data } = await supabase
  .from('partes_de_trabajo')
  .select(`
    *,
    configuracion_trabajadores!inner (salario_diario)
  `)
  .eq('id_tarea', tareaId)
  .eq('id_trabajador', userId)
  .order('fecha', { ascending: false })
```

**UI Sugerida:**
```
┌────────────────────────────────────────────┐
│ 👷 Jornales de la Tarea                    │
├────────────────────────────────────────────┤
│                                            │
│ 📊 Resumen:                                │
│   • Total días trabajados: 15              │
│   • Total en jornales: $450,000            │
│   • Trabajadores: 3                        │
│                                            │
│ [Descargar PDF de Jornales]               │
│                                            │
├────────────────────────────────────────────┤
│                                            │
│ 📅 15 Oct 2025 - Juan Pérez                │
│    Tipo: Día completo                      │
│    Monto: $30,000                          │
│    Horas: 8h                               │
│                                            │
│ 📅 14 Oct 2025 - Juan Pérez                │
│    Tipo: Medio día                         │
│    Monto: $15,000                          │
│    Horas: 4h                               │
│                                            │
│ 📅 14 Oct 2025 - María López               │
│    Tipo: Día completo                      │
│    Monto: $35,000                          │
│    Horas: 8h                               │
└────────────────────────────────────────────┘
```

---

## 📝 **PERMISOS POR ROL:**

### **Admin:**
- ✅ Ver TODAS las tareas (no finalizadas)
- ✅ Ver TODOS los gastos de cualquier tarea
- ✅ Ver TODOS los jornales de cualquier tarea
- ✅ Descargar PDF completo
- ✅ Eliminar/editar gastos de cualquier usuario

### **Supervisor:**
- ✅ Ver tareas donde es supervisor
- ✅ Ver TODOS los gastos de sus tareas
- ✅ Ver TODOS los jornales de sus tareas
- ✅ Descargar PDF completo
- ⚠️ Aprobar/rechazar gastos (si se implementa)

### **Trabajador:**
- ✅ Ver solo tareas donde está asignado
- ✅ Ver solo SUS gastos
- ✅ Ver solo SUS jornales
- ✅ Descargar PDF de sus datos
- ❌ No puede ver datos de otros trabajadores

---

## 🎨 **FLUJO DE USUARIO MEJORADO:**

### **Para Trabajador:**

1. Entra a `/dashboard/trabajadores/gastos`
2. Ve sus estadísticas globales
3. Ve selector de tareas (solo las asignadas a él)
4. Selecciona una tarea
5. Ve 3 tabs:
   - **Gastos:** Sus gastos en esa tarea con botón PDF
   - **Jornales:** Sus días trabajados con totales
   - **Registrar:** Subir nuevo gasto con OCR
6. Puede volver a vista general

### **Para Admin/Supervisor:**

1. Entra a `/dashboard/trabajadores/gastos`
2. Ve estadísticas globales de todos
3. Ve selector de todas las tareas (no finalizadas)
4. Selecciona una tarea
5. Ve 3 tabs:
   - **Gastos:** TODOS los gastos con filtro por usuario, PDF completo
   - **Jornales:** TODOS los partes con resumen por trabajador
   - **Registrar:** Subir gasto (si tiene permisos)
6. Puede gestionar/aprobar gastos
7. Puede descargar PDF con todo

---

## 📦 **ARCHIVOS A MODIFICAR/CREAR:**

### **Modificar:**
1. **`app/dashboard/trabajadores/gastos/page.tsx`**
   - Agregar Tabs cuando hay tarea seleccionada
   - Importar `HistorialGastosOCR`
   - Importar `HistorialJornalesTarea` (nuevo)
   - Agregar lógica de permisos

### **Crear:**
1. **`components/historial-jornales-tarea.tsx`** (NUEVO)
   - Query de partes_de_trabajo
   - Filtrado por rol
   - Cálculo de totales
   - UI con lista de jornales
   - Botón descarga PDF

2. **`lib/jornales-pdf.ts`** (NUEVO)
   - Función para generar PDF de jornales
   - Similar a `gastos-pdf.ts`
   - Tabla con partes de trabajo

### **Opcional:**
3. **`components/resumen-tarea-gastos.tsx`** (NUEVO)
   - Card con info resumida de tarea
   - Presupuesto vs Gastos reales
   - Gráfico simple de progreso

---

## 🚀 **PLAN DE IMPLEMENTACIÓN:**

### **Fase 1: UI Básica (1-2 horas)**
1. ✅ Agregar Tabs al área de tarea seleccionada
2. ✅ Integrar `HistorialGastosOCR` en Tab "Gastos"
3. ✅ Mover `ProcesadorImagen` a Tab "Registrar"
4. ✅ Botón "Volver" para deseleccionar tarea

### **Fase 2: Componente Jornales (2-3 horas)**
1. 📝 Crear `HistorialJornalesTarea.tsx`
2. 📝 Query a `partes_de_trabajo`
3. 📝 Filtrado por rol (admin/supervisor/trabajador)
4. 📝 UI con lista de jornales
5. 📝 Cálculo de totales

### **Fase 3: PDF de Jornales (1-2 horas)**
1. 📝 Crear `lib/jornales-pdf.ts`
2. 📝 Función `generarJornalesTareaPDF()`
3. 📝 Botón descarga en componente
4. 📝 Incluir totales y resumen

### **Fase 4: Permisos y Filtros (1 hora)**
1. 📝 Verificar permisos por rol
2. 📝 Filtrar tareas por usuario
3. 📝 Filtrar datos por permisos
4. 📝 Mensajes apropiados si no hay datos

### **Fase 5: Pulido (1 hora)**
1. 📝 Loading states
2. 📝 Error handling
3. 📝 Responsive design
4. 📝 Tooltips y ayudas

**Total estimado: 6-9 horas**

---

## ⚡ **QUICK WIN (Implementación Rápida):**

Si quieres tener algo funcionando YA (30 minutos):

```typescript
// En page.tsx, reemplazar el ProcesadorImagen por:
{tareaSeleccionada ? (
  <Card>
    <CardHeader>
      <div className="flex justify-between">
        <CardTitle>
          {tareas.find(t => t.id === Number(tareaSeleccionada))?.code} - 
          {tareas.find(t => t.id === Number(tareaSeleccionada))?.titulo}
        </CardTitle>
        <Button variant="ghost" onClick={() => setTareaSeleccionada("")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Volver
        </Button>
      </div>
    </CardHeader>
    <CardContent>
      <Tabs defaultValue="gastos">
        <TabsList>
          <TabsTrigger value="gastos">💰 Gastos</TabsTrigger>
          <TabsTrigger value="registrar">➕ Registrar</TabsTrigger>
        </TabsList>
        
        <TabsContent value="gastos">
          <HistorialGastosOCR 
            tareaId={Number(tareaSeleccionada)}
            userRole={usuario?.rol}
            userId={usuario?.id}
          />
        </TabsContent>
        
        <TabsContent value="registrar">
          <ProcesadorImagen 
            tareaId={Number(tareaSeleccionada)}
            tareaCodigo={tareas.find(t => t.id === Number(tareaSeleccionada))?.code}
            tareaTitulo={tareas.find(t => t.id === Number(tareaSeleccionada))?.titulo}
          />
        </TabsContent>
      </Tabs>
    </CardContent>
  </Card>
) : (
  // Vista general actual...
)}
```

Esto te da:
- ✅ Historial de gastos por tarea
- ✅ Descarga de PDF (ya incluida en HistorialGastosOCR)
- ✅ Permisos por rol
- ✅ Tiempo real

**Faltaría solo:**
- ❌ Jornales (requiere componente nuevo)

---

## 💡 **RESUMEN DE SUGERENCIAS:**

### **PRIORIDAD ALTA:**
1. ⭐ Agregar `HistorialGastosOCR` cuando se selecciona tarea
2. ⭐ Usar Tabs para organizar (Gastos / Registrar / Jornales)
3. ⭐ Crear componente `HistorialJornalesTarea`

### **PRIORIDAD MEDIA:**
4. 📝 PDF de jornales
5. 📝 Resumen estadístico de tarea seleccionada
6. 📝 Filtros avanzados por fecha/trabajador

### **PRIORIDAD BAJA:**
7. 📊 Gráficos de gastos vs presupuesto
8. 📊 Calendario visual de partes de trabajo
9. 📊 Exportar a Excel

---

## ✅ **CHECKLIST DE IMPLEMENTACIÓN:**

- [ ] Modificar `gastos/page.tsx` con Tabs
- [ ] Integrar `HistorialGastosOCR`
- [ ] Crear `HistorialJornalesTarea.tsx`
- [ ] Crear `lib/jornales-pdf.ts`
- [ ] Agregar permisos por rol
- [ ] Probar con cada rol (admin, supervisor, trabajador)
- [ ] Responsive design
- [ ] Loading states
- [ ] Error handling
- [ ] Documentar cambios

---

## 🎯 **RESULTADO ESPERADO:**

Una página `/dashboard/trabajadores/gastos` que:

1. ✅ Mantiene vista general con estadísticas
2. ✅ Al seleccionar tarea, muestra detalle completo
3. ✅ Gastos con descarga PDF (usando componente existente)
4. ✅ Jornales con totales y PDF
5. ✅ Permisos correctos por rol
6. ✅ Experiencia similar a `/tareas/[id]`
7. ✅ Todo en una sola página (sin navegación extra)

**Ventaja:** Aprovecha componentes existentes y no duplica código. 🚀

## 🗓️ Registro de avances — 30 Oct 2025

- **Filtros por rol en** `app/dashboard/trabajadores/gastos/page.tsx`:
  - **Supervisor**:
    - Selector de tareas: solo tareas que supervisa y no finalizadas.
    - Gastos (Resumen): propios + de tareas supervisadas (`OR id_usuario = supervisor, id_tarea IN (supervisadas)`).
    - Jornales del Desglose: propios + de tareas supervisadas (`OR id_trabajador = supervisor, id_tarea IN (supervisadas)`), siempre `liquidado = false`.
  - **Admin**:
    - Selector de tareas: todas las activas (no finalizadas).
    - Gastos/Jornales: visión global (según RLS).
  - **Trabajador**: sin cambios (solo propios).

- **Unificación de lógica de jornales** con `components/historial-jornales-global.tsx` para construir el “Desglose por Tarea” en la pestaña Resumen.

- **Impacto funcional**:
  - Supervisor ahora ve gastos y jornales de su equipo en `Resumen` y en el “Desglose por Tarea”.
  - El flujo “Registrar Gasto” muestra solo tareas permitidas por rol.

- **Pendiente**:
  - Verificar RLS para `supervisores_tareas`, `vista_gastos_tarea_completa` y `vista_partes_trabajo_completa`.
  - Desplegar en Vercel y validar diferencias por rol en producción.
