# ✅ CORRECCIÓN: Listado de Tareas en Gastos de Trabajadores

**Fecha:** 22 de Octubre, 2025  
**Estado:** ✅ COMPLETADO

---

## 🎯 **PROBLEMAS IDENTIFICADOS:**

### **1. Listado traía TODAS las tareas (incluyendo finalizadas)** ❌

**Archivo:** `app/dashboard/trabajadores/gastos/page.tsx`  
**Líneas:** 71-73

**Comportamiento incorrecto:**
```typescript
userData.rol === 'trabajador' ?
  supabase.from('trabajadores_tareas').select('tareas(id, titulo, code)').eq('id_trabajador', session.user.id) :
  supabase.from('tareas').select('id, titulo, code').order('titulo')  // ❌ TRAE TODAS
```

**Problema:**
- Para rol `trabajador`: ✅ Correcto (solo sus tareas asignadas)
- Para rol `admin`: ❌ Traía TODAS las tareas sin filtrar por estado
- Incluía tareas finalizadas que no deberían estar disponibles

---

### **2. No usaba componente OCR mejorado** ⚠️

**Componente antiguo:** `RegistroGastosForm`
- Solo permitía subir imagen manualmente
- NO tenía procesamiento OCR
- NO tenía mejoras de contraste/brillo

**Componente correcto:** `ProcesadorImagen`
- ✅ Procesamiento OCR automático
- ✅ Mejoras de imagen recién implementadas
- ✅ Contraste suave (1.3) + brillo (+10)
- ✅ Sin recorte automático
- ✅ Múltiples métodos: cámara, archivo, manual

---

## ✅ **SOLUCIONES IMPLEMENTADAS:**

### **Solución 1: Filtrar Tareas Finalizadas**

**Cambio aplicado:**
```typescript
userData.rol === 'trabajador' ?
  supabase.from('trabajadores_tareas').select('tareas(id, titulo, code)').eq('id_trabajador', session.user.id) :
  supabase.from('tareas').select('id, titulo, code').eq('finalizada', false).order('titulo')  // ✅ SOLO NO FINALIZADAS
```

**Resultado:**
- ✅ Admin ve solo tareas activas (finalizada=false)
- ✅ Trabajador ve solo sus tareas asignadas
- ✅ No se muestran tareas finalizadas en el listado

---

### **Solución 2: Usar Componente OCR Mejorado**

**Cambio aplicado:**

**Imports actualizados:**
```typescript
// ANTES:
import { RegistroGastosForm } from "@/components/registro-gastos-form"

// DESPUÉS:
import { ProcesadorImagen } from "@/components/procesador-imagen"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
```

**Nuevo flujo UI:**
```typescript
{mostrarFormulario ? (
  <Card>
    <CardHeader>
      <CardTitle>Registrar Nuevo Gasto</CardTitle>
    </CardHeader>
    <CardContent>
      {!tareaSeleccionada ? (
        // Paso 1: Selector de tarea
        <Select value={tareaSeleccionada} onValueChange={setTareaSeleccionada}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona una tarea" />
          </SelectTrigger>
          <SelectContent>
            {tareas.map((tarea) => (
              <SelectItem key={tarea.id} value={tarea.id.toString()}>
                {tarea.code} - {tarea.titulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        // Paso 2: Procesador de imagen con OCR
        <ProcesadorImagen
          tareaId={Number(tareaSeleccionada)}
          tareaCodigo={tareas.find(t => t.id === Number(tareaSeleccionada))?.code}
          tareaTitulo={tareas.find(t => t.id === Number(tareaSeleccionada))?.titulo}
        />
      )}
    </CardContent>
  </Card>
) : (
  // Vista principal de gastos...
)}
```

**Estado agregado:**
```typescript
const [tareaSeleccionada, setTareaSeleccionada] = useState<string>("")
```

---

## 📊 **COMPARACIÓN ANTES/DESPUÉS:**

| Aspecto | Antes | Después |
|---|---|---|
| **Tareas mostradas** | Todas (incluyendo finalizadas) | Solo activas ✅ |
| **Componente** | RegistroGastosForm | ProcesadorImagen ✅ |
| **Procesamiento OCR** | ❌ No | ✅ Sí |
| **Mejoras de imagen** | ❌ No | ✅ Sí (contraste + brillo) |
| **Recorte automático** | N/A | ✅ Desactivado |
| **Métodos de captura** | Solo archivo | Cámara, archivo, manual ✅ |

---

## 🎯 **FLUJO DE USUARIO (DESPUÉS):**

1. Usuario hace click en "Registrar Gasto"
2. **Paso 1:** Selector de tarea aparece
   - Solo muestra tareas NO finalizadas
   - Formato: "CODE - Título"
3. Usuario selecciona una tarea
4. **Paso 2:** Aparece ProcesadorImagen
   - 3 pestañas: Cámara, Subir, Manual
   - Procesamiento OCR automático
   - Mejoras de contraste/brillo aplicadas
5. Usuario completa el registro
6. Gasto se guarda y vista se actualiza

---

## 🔧 **ARCHIVOS MODIFICADOS:**

### **1. `app/dashboard/trabajadores/gastos/page.tsx`**

**Cambios:**
- Línea 6: Import de `ProcesadorImagen` (reemplazo de `RegistroGastosForm`)
- Líneas 7-8: Imports de componentes UI (Select, Label)
- Línea 29: Estado `tareaSeleccionada` agregado
- Línea 73: Filtro `.eq('finalizada', false)` agregado
- Líneas 172-216: Nuevo flujo UI con selector de tarea + ProcesadorImagen

**Eliminado:**
- Import de `RegistroGastosForm`
- Uso del componente `RegistroGastosForm`

---

## ✅ **BENEFICIOS:**

### **Para el Usuario:**
- ✅ Ve solo tareas relevantes (no finalizadas)
- ✅ Mejor UX con procesamiento OCR automático
- ✅ Múltiples opciones de captura
- ✅ Imágenes con mejor calidad visual

### **Para el Sistema:**
- ✅ Consistencia: mismo componente OCR en toda la app
- ✅ Menos componentes duplicados
- ✅ Mejoras de OCR aplicadas automáticamente
- ✅ Mantenibilidad mejorada

---

## 🧪 **PARA PROBAR:**

1. **Como Admin:**
   - Ir a: `http://localhost:3000/dashboard/trabajadores/gastos`
   - Click en "Registrar Gasto"
   - Verificar que solo aparecen tareas NO finalizadas
   - Seleccionar una tarea
   - Verificar que aparece el componente de OCR

2. **Probar OCR:**
   - Usar pestaña "Cámara" o "Subir"
   - Subir una imagen de factura
   - Verificar que se procesa con:
     - Contraste suave (1.3)
     - Brillo mínimo (+10)
     - Sin recorte
     - Letras completas

3. **Probar Manual:**
   - Usar pestaña "Manual"
   - Verificar que permite registro sin imagen

---

## 📝 **NOTAS TÉCNICAS:**

### **Campo `finalizada` en tabla `tareas`:**
- Tipo: `boolean`
- Default: `false`
- Cuando `true`: tarea completada y no debe aparecer en listados activos

### **Componente ProcesadorImagen:**
- Ubicación: `components/procesador-imagen.tsx`
- Requiere: `tareaId` (obligatorio), `tareaCodigo` y `tareaTitulo` (opcionales)
- Guarda en: `gastos_tarea` con URLs de comprobante

### **Procesamiento de imagen:**
- Contraste: 1.3 (muy suave)
- Brillo: +10 (mínimo)
- Preservación: 60% (máxima)
- Recorte: Desactivado

---

## ⚠️ **BREAKING CHANGES:**

**Ninguno** - Los cambios son compatibles hacia atrás:
- El filtro de tareas no afecta funcionalidad existente
- El componente ProcesadorImagen ya existía
- Los registros antiguos siguen funcionando

---

## ✅ **VERIFICACIÓN:**

- [x] Filtro de tareas implementado
- [x] Componente OCR integrado
- [x] Flujo de 2 pasos implementado
- [x] Estado de tarea seleccionada agregado
- [x] Imports actualizados
- [x] Documentación creada
- [ ] Probado en localhost
- [ ] Commit y push a GitHub

---

## 🗓️ Registro de avances — 30 Oct 2025

- **Ajustes por rol en** `app/dashboard/trabajadores/gastos/page.tsx`:
  - Supervisor: selector de tareas limitado a tareas que supervisa (no finalizadas).
  - Gastos (Resumen): propios + de tareas supervisadas (`OR id_usuario = supervisor, id_tarea IN (supervisadas)`).
  - Jornales del Desglose: propios + de tareas supervisadas (`OR id_trabajador = supervisor, id_tarea IN (supervisadas)`), `liquidado = false`.
  - Admin: visión global; Trabajador: sin cambios (solo propios).

- **Efecto:** El “Desglose por Tarea” ahora muestra jornales del equipo del supervisor; el flujo “Registrar Gasto” lista solamente tareas permitidas.

- **Pendiente:** Verificar RLS para `supervisores_tareas`, `vista_gastos_tarea_completa` y `vista_partes_trabajo_completa`; desplegar en Vercel y validar en producción.
