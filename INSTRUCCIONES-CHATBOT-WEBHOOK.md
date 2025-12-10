# 🤖 CHATBOT IA - VERSIÓN WEBHOOK (COMPATIBLE)

## ✅ **NUEVO WORKFLOW CREADO**

**Archivo:** `WORKFLOW-CHATBOT-IA-WEBHOOK.json`

**Por qué este en lugar del anterior:**
- ✅ Compatible con tu versión de n8n
- ✅ Usa Webhook (ya probado funcionando)
- ✅ Más simple, sin dependencias de nodos especiales
- ✅ Respuestas inteligentes basadas en reglas
- ✅ Guarda todo en `ai_system`

---

## 📥 **PASO 1: IMPORTAR (2 min)**

1. **Cierra/elimina** el workflow anterior (el que daba error)
2. Click **"+"** (nuevo workflow)
3. Click **"..."** → **"Import from File"**
4. Selecciona: **`WORKFLOW-CHATBOT-IA-WEBHOOK.json`**
5. Click **"Import"**

---

## 🔧 **PASO 2: CONECTAR CREDENCIALES (2 min)**

Solo necesitas conectar **UNA credencial** en **4 nodos**:

**Nodos que necesitan "mcp supabase":**
1. ✅ "Crear Conversación"
2. ✅ "Consultar Tareas"  
3. ✅ "Guardar Mensaje Usuario"
4. ✅ "Guardar Respuesta IA"

**Para cada uno:**
- Click en el nodo
- Panel derecho → "Credential to connect with"
- Selecciona: **"mcp supabase"**

---

## 💾 **PASO 3: ACTIVAR (1 min)**

1. Click **"Save"**
2. Nombre: `SPC Chatbot IA - Webhook`
3. Click **"Activate"** (toggle debe estar verde ✅)

---

## 🧪 **PASO 4: PROBAR (2 min)**

### **Obtener Webhook URL:**
1. Click nodo **"Webhook Chatbot"** (el primero)
2. Panel derecho → Busca **"Webhook URLs"**
3. Copia la URL **"Production"**
4. Será algo como: `https://n8n1-ma6y.onrender.com/webhook/spc-chatbot`

### **Probar desde PowerShell:**

```powershell
# Test 1: Saludo
Invoke-RestMethod -Uri "https://n8n1-ma6y.onrender.com/webhook/spc-chatbot" -Method Post -ContentType "application/json" -Body '{"message":"hola","sessionId":"test-1"}' | ConvertTo-Json

# Test 2: Preguntar por tareas
Invoke-RestMethod -Uri "https://n8n1-ma6y.onrender.com/webhook/spc-chatbot" -Method Post -ContentType "application/json" -Body '{"message":"cuantas tareas pendientes tengo","sessionId":"test-1"}' | ConvertTo-Json

# Test 3: Resumen
Invoke-RestMethod -Uri "https://n8n1-ma6y.onrender.com/webhook/spc-chatbot" -Method Post -ContentType "application/json" -Body '{"message":"dame un resumen","sessionId":"test-1"}' | ConvertTo-Json
```

### **Respuestas esperadas:**

**Test 1 (Hola):**
```json
{
  "response": "¡Hola Usuario Demo! Soy el asistente IA de SPC...",
  "tareas_pendientes": 25,
  "timestamp": "2025-12-05T..."
}
```

**Test 2 (Tareas):**
```json
{
  "response": "📋 Tienes 25 tareas pendientes.\n\nEstas son las tareas que supervisas.",
  "tareas_pendientes": 25,
  "timestamp": "2025-12-05T..."
}
```

---

## 🎯 **PASO 5: CAMBIAR ROL DE PRUEBA**

### **Por defecto usa rol "supervisor"**

Para probar con diferentes roles:

1. Click nodo **"Obtener Contexto Usuario"**
2. Encuentra línea 9:
   ```javascript
   const userRole = body.userRole || 'supervisor';
   ```
3. Cambia a:
   - `'admin'` → Para probar como admin
   - `'trabajador'` → Para probar como trabajador
4. **Save**
5. Prueba de nuevo

**O envía el rol en el body:**
```powershell
Invoke-RestMethod -Uri "URL" -Method Post -ContentType "application/json" -Body '{"message":"hola","sessionId":"test","userRole":"admin"}' | ConvertTo-Json
```

---

## 💡 **CÓMO FUNCIONA:**

### **Flujo:**
```
Usuario envía POST → /webhook/spc-chatbot
    ↓
Extrae: mensaje, sesión, rol
    ↓
Crea conversación en ai_system
    ↓
Consulta tareas según rol (con RLS)
    ↓
Genera respuesta inteligente
    ↓
Guarda mensaje usuario y respuesta IA
    ↓
Responde JSON con respuesta
```

### **Respuestas Inteligentes:**

El chatbot detecta palabras clave:

- **"hola", "hey"** → Saludo + menú de opciones
- **"tarea", "pendiente"** → Cuenta tareas según rol
- **"resumen"** → Resumen completo
- **Cualquier otra cosa** → Respuesta genérica + info tareas

### **Seguridad RLS:**

```javascript
// Supervisor: solo VE sus tareas
WHERE EXISTS (
  SELECT 1 FROM supervisores_tareas 
  WHERE id_tarea = tareas.id 
    AND id_supervisor = userId
)

// Trabajador: solo VE donde está asignado
WHERE EXISTS (
  SELECT 1 FROM trabajadores_tareas 
  WHERE id_tarea = tareas.id 
    AND id_trabajador = userId
)

// Admin: VE TODO (sin filtro)
```

---

## 📊 **VER LOGS EN SUPABASE:**

```sql
-- Ver conversaciones
SELECT * FROM ai_system.chat_conversations 
ORDER BY created_at DESC LIMIT 10;

-- Ver mensajes
SELECT 
  conversation_id,
  role,
  content,
  created_at
FROM ai_system.chat_messages
ORDER BY created_at DESC 
LIMIT 20;
```

---

## 🚀 **INTEGRAR EN REACT (Siguiente paso):**

```typescript
// En tu componente React
const sendMessage = async (message: string) => {
  const response = await fetch('https://n8n1-ma6y.onrender.com/webhook/spc-chatbot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: message,
      sessionId: sessionId,
      userId: user.id,
      userName: user.nombre,
      userRole: user.rol
    })
  });
  
  const data = await response.json();
  console.log(data.response); // Mostrar en UI
};
```

---

## ⚡ **VENTAJAS DE ESTA VERSIÓN:**

| Característica | Estado |
|----------------|--------|
| **Compatible** | ✅ Sin nodos especiales |
| **Webhook probado** | ✅ Ya funciona |
| **RLS por rol** | ✅ Validado en query |
| **Memoria persistente** | ✅ En ai_system |
| **Respuestas inteligentes** | ✅ Basadas en reglas |
| **Logs completos** | ✅ Todo guardado |
| **Integrable React** | ✅ Simple POST |

---

## 🎯 **DIFERENCIAS CON EL ANTERIOR:**

### **Workflow Anterior (no compatible):**
- ❌ Usaba Chat Trigger (no disponible)
- ❌ Groq AI Agent (complejo)
- ❌ Múltiples tools

### **Workflow Nuevo (este):**
- ✅ Usa Webhook (disponible)
- ✅ Lógica en Code nodes (simple)
- ✅ Respuestas por reglas (rápido)

**Resultado:** Mismo objetivo, implementación compatible.

---

## 🔄 **PRÓXIMA EVOLUCIÓN:**

Cuando necesites IA más avanzada:
1. Agregar nodo HTTP Request a Groq
2. Enviar mensaje + contexto
3. Procesar respuesta
4. Mantener el resto igual

**Por ahora:** Esto funciona y aprende de tus usuarios.

---

## ✅ **CHECKLIST FINAL:**

- [ ] Workflow importado
- [ ] 4 credenciales conectadas
- [ ] Workflow activado (verde)
- [ ] Webhook URL copiada
- [ ] Probado desde PowerShell
- [ ] Responde correctamente
- [ ] Logs en Supabase funcionan

---

## 🚀 **AHORA TÚ:**

1. **Importa** `WORKFLOW-CHATBOT-IA-WEBHOOK.json`
2. **Conecta** las 4 credenciales
3. **Activa** el workflow
4. **Copia** webhook URL
5. **Prueba** con PowerShell
6. **Dime** qué tal funciona

**Tiempo total: 5 minutos** ⏱️

---

**¿Listo para importar este workflow compatible?** 🚀
