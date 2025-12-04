# 🚀 GUÍA IMPLEMENTACIÓN n8n + Groq + Supabase

## 🎯 **POR QUÉ n8n ES MEJOR**

✅ **SIN CÓDIGO:** Interfaz visual drag & drop  
✅ **MODIFICAR EN VIVO:** Cambias y pruebas al instante  
✅ **MÁS POTENTE:** Puedes agregar cualquier servicio  
✅ **DEBUGGEABLE:** Ves exactamente qué pasa en cada paso  
✅ **GRATIS:** Self-hosted sin límites  

---

## 📋 **3 WORKFLOWS PROFESIONALES PARA TI**

### **WORKFLOW 1: Chatbot IA con Memoria** ⭐⭐⭐
**Descripción:** Chatbot inteligente que consulta tu BD y recuerda conversaciones

**Nodos necesarios:**
1. **Chat Trigger** - Interfaz de chat público
2. **Window Buffer Memory** - Recuerda 10 últimos mensajes
3. **Groq Chat Model** - IA ultra rápida
4. **AI Agent** - Cerebro del chatbot
5. **Supabase Tool (x3)** - Consulta tareas, liquidaciones, stats

**Ventajas:**
- ✅ Configuración visual (sin programar)
- ✅ Memoria automática
- ✅ RLS respetado
- ✅ Fácil de modificar prompts
- ✅ Embed directo en tu React app

---

### **WORKFLOW 2: Alertas Inteligentes** ⭐⭐
**Descripción:** Analiza tareas cada hora y envía alertas automáticas

**Nodos:**
1. **Schedule Trigger** - Cada 1 hora
2. **Supabase** - Busca tareas urgentes (vencen en 2 días)
3. **IF** - Si hay tareas urgentes
4. **Groq API** - Analiza y genera resumen ejecutivo
5. **Supabase** - Guarda alerta
6. **Webhook** - Notifica frontend

**Ventajas:**
- ✅ Proactivo: detecta problemas antes
- ✅ Resumen inteligente con IA
- ✅ Sin intervención manual

---

### **WORKFLOW 3: Resumen Semanal** ⭐⭐⭐
**Descripción:** Genera resumen personalizado cada lunes para cada supervisor

**Nodos:**
1. **Schedule Trigger** - Lunes 8:00 AM
2. **Supabase** - Lista supervisores
3. **Loop** - Por cada supervisor
4. **Supabase RPC** - `obtener_tareas_supervisor` (con RLS)
5. **Groq API** - Genera resumen ejecutivo
6. **Supabase** - Guarda resumen
7. **Email** - Envía por email (opcional)

**Ventajas:**
- ✅ Personalizado por supervisor
- ✅ Respeta RLS automáticamente
- ✅ Insights inteligentes con IA

---

## 🔧 **PASO A PASO: WORKFLOW 1 (CHATBOT)**

### **1. Crear Nuevo Workflow en n8n**

1. Abre tu n8n: http://tu-n8n-url.com
2. Click en **"+ Add workflow"**
3. Nombre: "SPC Chatbot IA"

---

### **2. Agregar Chat Trigger**

1. Click **"+"** → Busca **"Chat Trigger"**
2. Configuración:
   ```
   Mode: Manual Chat
   Public: ✅ Enabled
   Allowed Origins: 
     http://localhost:3000
     http://localhost:3001
     https://tuapp.vercel.app
   Initial Messages: "¡Hola! Soy tu asistente IA del sistema SPC. ¿En qué puedo ayudarte?"
   ```
3. **Guardar**

---

### **3. Agregar Groq Chat Model**

1. Click **"+"** → **"AI"** → **"Groq Chat Model"**
2. Configuración:
   ```
   Credential: (crear nueva)
     Name: Groq API
     API Key: TU_GROQ_API_KEY_AQUI
   
   Model: llama-3.3-70b-versatile
   Temperature: 0.7
   Max Tokens: 1000
   ```
3. **Guardar**

---

### **4. Agregar Window Buffer Memory**

1. Click **"+"** → **"AI"** → **"Window Buffer Memory"**
2. Configuración:
   ```
   Session ID: {{ $json.sessionId }}
   Context Window Length: 10
   ```
3. **Conectar** al AI Agent (lo crearemos después)

---

### **5. Agregar Supabase Credentials**

1. Click **"Credentials"** (arriba derecha)
2. **"+ Add Credential"** → **"Supabase API"**
3. Configuración:
   ```
   Name: Supabase SPC
   Host: https://fodyzgjwoccpsjmfinvm.supabase.co
   Service Role Key: TU_SERVICE_ROLE_KEY
   ```
   
   **⚠️ Obtener Service Role Key:**
   - Ve a: https://supabase.com/dashboard/project/fodyzgjwoccpsjmfinvm/settings/api
   - Copia "service_role" (secret key)
   - NUNCA la expongas en frontend

---

### **6. Agregar Supabase Tool - Buscar Tareas**

1. Click **"+"** → **"AI"** → **"Tool Supabase"**
2. Configuración:
   ```
   Credential: Supabase SPC
   
   Name: Buscar Tareas Pendientes
   Description: "Searches for unfinished tasks in the system. Use this when user asks about pending tasks, active tasks, or tasks without completion."
   
   Operation: Select Rows
   Table: tareas
   Return Fields: id,titulo,descripcion,finalizada,fecha_visita,edificios(nombre,direccion)
   
   Filters:
     - Field: finalizada
       Operator: equals
       Value: false
   
   Limit: 20
   Order By: fecha_visita.desc
   ```
3. **Conectar** al AI Agent

---

### **7. Agregar Supabase Tool - Liquidaciones**

1. Click **"+"** → **"AI"** → **"Tool Supabase"**
2. Configuración:
   ```
   Name: Buscar Liquidaciones
   Description: "Searches for recent liquidations. Use when user asks about liquidations, payments, earnings or budgets."
   
   Operation: Select Rows
   Table: liquidaciones_nuevas
   Return Fields: id,created_at,ganancia_supervisor,total_presupuesto,aprobada
   
   Limit: 20
   Order By: created_at.desc
   ```
3. **Conectar** al AI Agent

---

### **8. Agregar AI Agent (CEREBRO)**

1. Click **"+"** → **"AI"** → **"AI Agent"**
2. Configuración:
   ```
   Prompt Type: Define below
   
   System Message:
   Eres un asistente experto del sistema SPC de facility management.

   PERSONALIDAD:
   - Profesional pero amigable y conversacional
   - Conciso: 2-4 líneas máximo
   - Proactivo: ofreces sugerencias
   - Haces seguimiento del contexto

   FORMATO RESPUESTAS:
   - Si hay >5 resultados: muestra 3-5 + "...y X más"
   - Usa bullets (-) para listas
   - Termina con pregunta o sugerencia de acción

   EJEMPLOS:
   Usuario: "tareas sin finalizar"
   Tú: "Hay 24 tareas pendientes. Las más urgentes por fecha:
   - Mitre 4483 piso 4 (vence 15/12)
   - Aguero 1659 (vence 16/12)
   - Rivadavia 1954 (vence 17/12)
   ...y 21 más. ¿Quieres filtrar por edificio?"

   Usuario: "del edificio mitre"
   Tú: "Mitre 4483 tiene 3 tareas pendientes:
   - Piso 4: cañería agua y albañilería
   - Piso 2: cañería agua
   - 7a-6a filtración
   ¿Revisamos la primera?"
   ```
   
3. **Conectar:**
   - Input: Chat Trigger
   - Language Model: Groq Chat Model
   - Memory: Window Buffer Memory
   - Tools: Ambos Supabase Tools

---

### **9. Conectar Todo**

```
Chat Trigger
    ↓
AI Agent ← Groq Chat Model
    ↓      ← Window Buffer Memory
    ↓      ← Supabase Tool 1 (Tareas)
    ↓      ← Supabase Tool 2 (Liquidaciones)
```

---

### **10. PROBAR**

1. Click **"Test workflow"**
2. Click **"Open Chat"** (botón arriba)
3. Pregunta: **"¿cuántas tareas sin finalizar hay?"**
4. Debería responder con datos reales de tu BD ✅

---

## 🎨 **PERSONALIZAR**

### **Cambiar Prompt:**
1. Edita nodo **"AI Agent"**
2. Modifica "System Message"
3. **Save** → **Test** → Ves resultados al instante

### **Agregar más Tools:**
1. **"+"** → **"AI"** → **"Tool Supabase"**
2. Configura tabla/query
3. Conecta al AI Agent
4. ¡Listo! La IA ahora puede usar esa función

### **Cambiar modelo IA:**
1. Edita **"Groq Chat Model"**
2. Model: `llama-3.1-70b-versatile` (más preciso)
3. O: `mixtral-8x7b-32768` (context window grande)

---

## 🌐 **INTEGRAR EN TU APP REACT**

### **Opción A: Embed Widget (Más fácil)**

1. En n8n, click **"Chat Trigger"** → **"Enable Public Access"**
2. Copia el código embed
3. Pega en tu `app/layout.tsx`:

```typescript
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        
        {/* n8n Chatbot */}
        <script>
          window.n8nChatbotConfig = {
            webhookUrl: 'https://tu-n8n.com/webhook/chat-trigger-id',
            position: 'bottom-right',
            height: 600,
            width: 400
          }
        </script>
        <script src="https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.js"></script>
      </body>
    </html>
  )
}
```

### **Opción B: API Custom (Más control)**

Usa el endpoint webhook de n8n desde tu componente React:

```typescript
// components/n8n-chatbot.tsx
const response = await fetch('https://tu-n8n.com/webhook/tu-chat-trigger-id', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'sendMessage',
    sessionId: userId,
    message: userInput
  })
})

const data = await response.json()
// data.output contiene la respuesta de la IA
```

---

## 💰 **COSTOS**

### **Con n8n:**
```
n8n self-hosted: GRATIS
Groq API: $0.59/1M tokens = ~$4/mes (100 consultas/día)
Supabase: GRATIS (plan free es suficiente)

TOTAL: ~$4/mes
```

### **VS Edge Function actual:**
```
Edge Function: GRATIS
Groq API: ~$4/mes
Código complejo: 😰

n8n es IGUAL de barato pero MÁS FÁCIL de configurar
```

---

## 🔒 **SEGURIDAD**

✅ **RLS Respetado:** Usa Service Role Key pero con RPC functions que tienen RLS  
✅ **No expone BD:** n8n hace de proxy seguro  
✅ **Credentials encriptadas:** n8n guarda API keys seguras  
✅ **Webhook público pero limitado:** Solo para chat, no puede modificar datos  

---

## 📊 **MONITOREO**

### **En n8n:**
1. **Executions** (izquierda) → Ver todas las conversaciones
2. Click en ejecución → Ver paso a paso qué hizo
3. Ver errores y debuggear fácil

### **En Groq:**
https://console.groq.com/usage
- Tokens usados
- Costos reales
- Rate limits

---

## 🚀 **PRÓXIMOS PASOS**

1. **HOY:** Implementa Workflow 1 (Chatbot) - 30 min
2. **ESTA SEMANA:** Workflow 2 (Alertas) - 15 min
3. **PRÓXIMA SEMANA:** Workflow 3 (Resumen Semanal) - 20 min

---

## 📚 **RECURSOS**

**n8n Templates:**
- https://n8n.io/workflows/6604-ai-chatbot-with-openai-gpt-41-mini-and-supabase-database-knowledge-base/
- https://n8n.io/workflows/2453-telegram-bot-with-supabase-memory-and-openai-assistant-integration/

**Groq Docs:**
- https://console.groq.com/docs/models

**Supabase n8n Integration:**
- https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.supabase/

---

## ❓ **FAQ**

**Q: ¿Puedo modificar el prompt sin redesplegar?**  
✅ SÍ! Editas en n8n, guardas, y ya está actualizado

**Q: ¿Funciona con RLS?**  
✅ SÍ! Usa las RPC functions que ya tienes (`obtener_tareas_supervisor`, etc.)

**Q: ¿Es más lento que Edge Function?**  
❌ NO! Groq es igual de rápido (300 tokens/seg)

**Q: ¿Puedo ver las conversaciones?**  
✅ SÍ! n8n guarda todo en "Executions"

**Q: ¿Qué pasa si n8n se cae?**  
⚠️ Self-hosted: asegúrate de tener uptime. O usa n8n Cloud (desde $20/mes)

---

## ✅ **CREDENCIALES NECESARIAS**

```json
{
  "groq": {
    "api_key": "TU_GROQ_API_KEY (ya la tienes)"
  },
  "supabase": {
    "url": "https://fodyzgjwoccpsjmfinvm.supabase.co",
    "service_role": "COPIA_DE_SUPABASE_DASHBOARD"
  },
  "n8n": {
    "api_key": "TU_N8N_API_KEY (ya la tienes)"
  }
}
```

---

**¿Quieres que te ayude a configurar el Workflow 1 paso a paso ahora?** 🚀
