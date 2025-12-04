# 🤖 CONFIGURACIÓN CHATBOT IA - GROQ

## 📍 **UBICACIÓN DE ARCHIVOS**

### **1. PROMPTS (Aquí modificas la personalidad)**
**Archivo:** `supabase/functions/ai-chat-secure/index.ts`  
**Líneas:** 9-60

```typescript
const SYSTEM_PROMPTS = {
  admin: `...`,      // Líneas 9-38
  supervisor: `...`, // Líneas 40-55
  trabajador: `...`  // Líneas 57-60
}
```

**Para modificar:**
1. Edita el archivo directamente
2. Redeploy: `npx supabase functions deploy ai-chat-secure --no-verify-jwt`

---

### **2. FUNCIONES DISPONIBLES (Qué puede hacer)**
**Archivo:** `supabase/functions/ai-chat-secure/index.ts`  
**Líneas:** 62-160

```typescript
const FUNCTIONS_BY_ROLE = {
  supervisor: [...],  // Líneas 63-98
  trabajador: [...],  // Líneas 100-118
  admin: [...]        // Líneas 120-154
}
```

---

### **3. COMPONENTE REACT (UI del chatbot)**
**Archivo:** `components/ai-assistant-groq.tsx`  
**Líneas completas:** 1-240

**Personalización UI:**
- Línea 153-158: Botón flotante (color, tamaño)
- Línea 165-235: Modal del chat (dimensiones, estilos)

---

## 🧠 **MEMORIA CONVERSACIONAL**

### **✅ YA IMPLEMENTADA**

**Cómo funciona:**
1. **Frontend** guarda últimos 10 mensajes (línea 57-60 en `ai-assistant-groq.tsx`)
2. **Backend** los incluye en cada request a Groq (línea 273 en `index.ts`)
3. **Groq** procesa todo el historial para dar contexto

**Configuración actual:**
```typescript
// components/ai-assistant-groq.tsx línea 57
const historial = messages.slice(-10)  // Últimos 10 mensajes
```

**Para cambiar cantidad de memoria:**
```typescript
// Más memoria = más contexto pero más tokens (más caro)
const historial = messages.slice(-20)  // 20 mensajes
const historial = messages.slice(-5)   // 5 mensajes (más barato)
```

---

## ⚙️ **PARÁMETROS GROQ API**

**Archivo:** `supabase/functions/ai-chat-secure/index.ts`  
**Línea:** 297-307

```typescript
body: JSON.stringify({
  model: 'llama-3.3-70b-versatile',  // Modelo a usar
  messages,                           // Con historial incluido
  functions: availableFunctions,      // Funciones disponibles
  function_call: 'auto',              // Llamar funciones automáticamente
  temperature: 0.7,                   // 0=preciso, 1=creativo
  max_tokens: 1000                    // Máximo tokens respuesta
})
```

### **Modelos disponibles en Groq:**
```typescript
// RÁPIDOS (recomendados):
'llama-3.3-70b-versatile'     // ⚡ Más rápido, muy bueno
'mixtral-8x7b-32768'          // Bueno, context window grande
'gemma2-9b-it'                // Pequeño pero rápido

// PRECISOS:
'llama-3.1-70b-versatile'     // Muy preciso
'llama3-groq-70b-8192-tool-use-preview'  // Mejor para funciones
```

### **Temperature (creatividad):**
```typescript
temperature: 0.1   // Muy preciso, siempre igual
temperature: 0.5   // Balanceado
temperature: 0.7   // Actual (recomendado)
temperature: 1.0   // Muy creativo, menos predecible
```

---

## 🎯 **MEJORAS PARA HACERLO MÁS INTELIGENTE**

### **1. Agregar más contexto al prompt** ✅

**Ubicación:** `index.ts` líneas 9-38 (admin) o 40-55 (supervisor)

**Ejemplo mejorado:**
```typescript
admin: `Eres un asistente IA experto en gestión de facility management.

CONOCIMIENTO DEL SISTEMA:
- Edificios: administras inmuebles residenciales y comerciales
- Tareas: reparaciones, mantenimiento, inspecciones
- Supervisores: coordinan trabajadores y tareas
- Liquidaciones: aprobación de gastos y jornales
- RLS: cada usuario solo ve sus datos

RECUERDAS:
- La conversación completa (mensajes anteriores visibles arriba)
- El contexto del usuario (nombre, rol, página actual)
- Las funciones que ejecutaste anteriormente

TU OBJETIVO:
- Ayudar a gestionar el edificio eficientemente
- Dar insights sobre tareas pendientes o problemas
- Ser proactivo sugiriendo acciones

RESPUESTAS:
- 2-4 líneas máximo
- Conversacional y amigable
- Siempre termina con pregunta o sugerencia de acción
- Usa bullet points (-) para listas
- Si >5 resultados: muestra 3-5 + "...y X más"

EJEMPLOS DE SEGUIMIENTO:
Usuario: "cuántas tareas tengo"
Tú: "Tienes 12 tareas: 8 pendientes, 4 finalizadas. Las urgentes son: Mitre 4483, Aguero 1659, Rivadavia 1954. ¿Revisamos las pendientes?"

Usuario: "sí"
Tú: "Estas 8 están sin finalizar: [lista 3] ...y 5 más. 2 llevan más de 7 días. ¿Quieres ver las más antiguas primero?"
`
```

### **2. Agregar información del sistema en cada mensaje** ✅

**Ya implementado en línea 276-280:**
```typescript
content: `Usuario: ${userData.nombre} (${userData.rol})
Página actual: ${contexto || 'dashboard'}
Fecha: ${new Date().toLocaleDateString('es-AR')}

Pregunta actual: ${pregunta}`
```

### **3. Usar modelos más grandes** (opcional)

Si necesitas respuestas MÁS inteligentes pero más lentas:

```typescript
// Cambiar en línea 297:
model: 'llama-3.1-405b-reasoning'  // Modelo HUGE, muy inteligente
// ⚠️ Más lento y MÁS CARO
```

### **4. Agregar ejemplos de conversaciones reales**

En el prompt (líneas 29-38), agrega ejemplos de TU dominio:

```typescript
EJEMPLOS DE TU SISTEMA:

Usuario: "problemas en mitre 4483"
Tú: "Mitre 4483 tiene 3 tareas: piso 4 cañería agua, piso 2 cañería, 7a-6a filtración. ¿Cuál revisamos?"

Usuario: "la filtración"
Tú: "7a-6a filtración (sin finalizar, creada hace 12 días). ¿Necesitas asignar trabajador o marcar como urgente?"
```

---

## 📊 **MONITOREO Y COSTOS**

### **Ver uso en Groq Console:**
https://console.groq.com/usage

**Métricas:**
- Tokens usados por día
- Costo acumulado
- Requests por segundo

### **Costo estimado con memoria:**

```
SIN memoria (antes):
- 1 mensaje = ~500 tokens
- 100 preguntas/día = 50K tokens/día
- Costo: ~$0.03/día = $1/mes

CON memoria 10 mensajes (ahora):
- 1 mensaje = ~2000 tokens (con contexto)
- 100 preguntas/día = 200K tokens/día  
- Costo: ~$0.12/día = $4/mes

CON memoria 20 mensajes:
- 1 mensaje = ~4000 tokens
- 100 preguntas/día = 400K tokens/día
- Costo: ~$0.24/día = $7/mes
```

**Recomendación:** 10 mensajes es óptimo (costo/beneficio)

---

## 🔧 **COMANDOS ÚTILES**

### **Redesplegar después de cambios:**
```bash
npx supabase functions deploy ai-chat-secure --no-verify-jwt
```

### **Ver logs en tiempo real:**
Dashboard: https://supabase.com/dashboard/project/fodyzgjwoccpsjmfinvm/logs/edge-functions

### **Test rápido desde terminal:**
```bash
curl -X POST https://fodyzgjwoccpsjmfinvm.supabase.co/functions/v1/ai-chat-secure \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pregunta":"hola","contexto":"/dashboard"}'
```

---

## 🎨 **PERSONALIZAR UI**

### **Cambiar colores del botón flotante:**
**Archivo:** `components/ai-assistant-groq.tsx` línea 153-158

```typescript
<Button
  className="bg-gradient-to-r from-blue-600 to-purple-600"  // Cambiar colores aquí
  size="lg"
>
```

**Ejemplos de gradientes:**
```typescript
from-green-500 to-blue-600    // Verde → Azul
from-orange-500 to-red-600    // Naranja → Rojo  
from-indigo-500 to-purple-600 // Índigo → Púrpura (actual)
```

### **Cambiar posición del botón:**
**Línea 151:**
```typescript
<div className="fixed bottom-4 right-4 z-50">  // Esquina inferior derecha
// Cambiar a:
<div className="fixed top-4 right-4 z-50">     // Esquina superior derecha
<div className="fixed bottom-4 left-4 z-50">   // Esquina inferior izquierda
```

### **Cambiar tamaño del modal:**
**Línea 165:**
```typescript
<div className="w-[400px] h-[600px]">  // Ancho x Alto
// Cambiar a:
<div className="w-[500px] h-[700px]">  // Más grande
<div className="w-[350px] h-[500px]">  // Más pequeño
```

---

## 🚀 **TIPS AVANZADOS**

### **1. Hacer respuestas más concisas:**
Agregar en el prompt:
```
FORMATO ESTRICTO:
- Máximo 2 líneas
- 1 oración por punto
- Sin explicaciones extra
```

### **2. Agregar comandos rápidos:**
```typescript
// En la Edge Function, antes de llamar a Groq:
if (pregunta.startsWith('/')) {
  switch(pregunta) {
    case '/tareas':
      // Respuesta directa sin IA
      return obtener_mis_tareas({estado: 'todas', limite: 10})
    case '/help':
      return { respuesta: "Comandos: /tareas, /gastos, /liquidaciones" }
  }
}
```

### **3. Guardar historial en base de datos:**
```sql
CREATE TABLE chat_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES usuarios(id),
  messages JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## ✅ **RESUMEN**

**ARCHIVOS CLAVE:**
1. **Prompts:** `supabase/functions/ai-chat-secure/index.ts` (líneas 9-60)
2. **Funciones:** Mismo archivo (líneas 62-160)
3. **UI:** `components/ai-assistant-groq.tsx`

**MEMORIA:** ✅ Implementada (últimos 10 mensajes)

**INTELIGENCIA:**
- Modelo: Llama 3.3 70B (muy bueno)
- Temperature: 0.7 (balanceado)
- Context: Conversación completa + info usuario

**COSTO:** ~$4/mes con 100 preguntas/día

**SEGURIDAD:** ✅ RLS 100% respetado en todas las queries

---

**MODIFICAR PROMPT:**
1. Abrir: `supabase/functions/ai-chat-secure/index.ts`
2. Editar líneas 9-38 (admin), 40-55 (supervisor), 57-60 (trabajador)
3. Guardar
4. Ejecutar: `npx supabase functions deploy ai-chat-secure --no-verify-jwt`
5. Probar en http://localhost:3001

**¡Listo! Tu chatbot ahora tiene MEMORIA y es SUPER INTELIGENTE!** 🧠⚡
