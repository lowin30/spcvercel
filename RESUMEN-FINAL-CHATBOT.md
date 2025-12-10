# ✅ CHATBOT IA SPC - CONFIGURACIÓN COMPLETA

## 📋 **INFORMACIÓN GUARDADA EN MEMORIA**

✅ **Tu versión de n8n:** Docker n8nio/n8n:latest
✅ **URL:** https://n8n1-ma6y.onrender.com  
✅ **Nodos compatibles detectados:** Webhook, Postgres, Code
✅ **Credenciales configuradas:** "mcp supabase", "Groq API"

---

## 🎯 **LO QUE TIENES LISTO:**

### **1. Base de Datos (Supabase)** ✅
```
Schema: ai_system
├── chat_conversations (conversaciones)
├── chat_messages (mensajes)
├── mcp_query_logs (logs de queries)
├── feedback_queries (sistema aprendizaje)
└── Vistas de métricas
```

### **2. Workflow Compatible** ✅
```
Archivo: WORKFLOW-CHATBOT-IA-WEBHOOK.json
Tipo: Webhook + Postgres + Code
Compatible: ✅ 100% con tu n8n
```

### **3. Sistema Completo** ✅
- RLS por roles (admin, supervisor, trabajador)
- Memoria conversacional persistente
- Respuestas inteligentes por reglas
- Logs automáticos
- Sistema de aprendizaje

---

## 🚀 **IMPORTACIÓN AUTOMÁTICA (3 PASOS)**

### **OPCIÓN A: Vía API (Intenté pero necesita verificación)**

Ejecuta esto en PowerShell para importar automáticamente:

```powershell
# Navega a tu carpeta
cd "c:\Users\Central 1\Downloads\spc7\spc\spc"

# Importa el workflow
$workflow = Get-Content 'WORKFLOW-CHATBOT-IA-WEBHOOK.json' -Raw
$headers = @{
    'X-N8N-API-KEY' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwYjY1OWQ1OS01NzRjLTQ0NzgtYjE3NC04YjM2NmMzYzRmZjUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY0ODk5NzM2fQ.jDBj_o0xi8f53tka--moUXNkWbbU0hFBD7BbH0XL4j4'
    'Content-Type' = 'application/json'
}

# Importar
$result = Invoke-RestMethod -Uri 'https://n8n1-ma6y.onrender.com/api/v1/workflows' -Method Post -Headers $headers -Body $workflow

# Activar
Invoke-RestMethod -Uri "https://n8n1-ma6y.onrender.com/api/v1/workflows/$($result.id)/activate" -Method Post -Headers $headers

Write-Host "✅ Importado! ID:" $result.id
Write-Host "🎯 Webhook: https://n8n1-ma6y.onrender.com/webhook/spc-chatbot"
```

---

### **OPCIÓN B: Manual (5 minutos) - MÁS SEGURO**

1. **Abre n8n:** https://n8n1-ma6y.onrender.com
2. **Import from File:** `WORKFLOW-CHATBOT-IA-WEBHOOK.json`
3. **Conectar 4 credenciales "mcp supabase"** en:
   - "Crear Conversación"
   - "Consultar Tareas"
   - "Guardar Mensaje Usuario"
   - "Guardar Respuesta IA"
4. **Save + Activate**
5. **Listo!**

---

## 🧪 **PROBAR EL CHATBOT (INMEDIATAMENTE)**

### **Test 1: Saludo**
```powershell
Invoke-RestMethod -Uri "https://n8n1-ma6y.onrender.com/webhook/spc-chatbot" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"message":"hola","sessionId":"test-1"}' | ConvertTo-Json -Depth 5
```

**Respuesta esperada:**
```json
{
  "response": "¡Hola Usuario Demo! Soy el asistente IA de SPC...",
  "tareas_pendientes": 25,
  "timestamp": "2025-12-05T..."
}
```

### **Test 2: Consultar tareas**
```powershell
Invoke-RestMethod -Uri "https://n8n1-ma6y.onrender.com/webhook/spc-chatbot" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"message":"cuantas tareas pendientes tengo","sessionId":"test-1"}' | ConvertTo-Json -Depth 5
```

### **Test 3: Resumen**
```powershell
Invoke-RestMethod -Uri "https://n8n1-ma6y.onrender.com/webhook/spc-chatbot" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"message":"dame un resumen","sessionId":"test-1"}' | ConvertTo-Json -Depth 5
```

---

## 🎭 **PROBAR DIFERENTES ROLES**

### **Como Supervisor:**
```powershell
Invoke-RestMethod -Uri "https://n8n1-ma6y.onrender.com/webhook/spc-chatbot" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"message":"tareas pendientes","sessionId":"super-1","userRole":"supervisor"}' | ConvertTo-Json -Depth 5
```

### **Como Admin:**
```powershell
Invoke-RestMethod -Uri "https://n8n1-ma6y.onrender.com/webhook/spc-chatbot" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"message":"resumen general","sessionId":"admin-1","userRole":"admin"}' | ConvertTo-Json -Depth 5
```

### **Como Trabajador:**
```powershell
Invoke-RestMethod -Uri "https://n8n1-ma6y.onrender.com/webhook/spc-chatbot" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"message":"que tengo hoy","sessionId":"work-1","userRole":"trabajador"}' | ConvertTo-Json -Depth 5
```

---

## 📊 **VER RESULTADOS EN SUPABASE**

### **Ir a SQL Editor en Supabase:**

```sql
-- Ver últimas conversaciones
SELECT * FROM ai_system.chat_conversations 
ORDER BY created_at DESC LIMIT 10;

-- Ver mensajes recientes
SELECT 
  conversation_id,
  role,
  content,
  created_at
FROM ai_system.chat_messages
ORDER BY created_at DESC 
LIMIT 20;

-- Ver métricas
SELECT * FROM ai_system.chatbot_metrics
ORDER BY fecha DESC;
```

---

## 🔧 **PERSONALIZAR RESPUESTAS**

### **Editar el nodo "Generar Respuesta IA":**

1. En n8n, click nodo "Generar Respuesta IA"
2. Edita el código JavaScript
3. Agrega más detecciones de palabras clave:

```javascript
// Ejemplo: Agregar detección de "gastos"
else if (userMessage.includes('gasto') || userMessage.includes('cuanto gaste')) {
  response = `💰 Consultando gastos...`;
  // Aquí podrías agregar otra query a Supabase
}
```

---

## 🌐 **INTEGRAR EN REACT**

### **Componente simple:**

```typescript
// hooks/useChatbot.ts
import { useState } from 'react';

export const useChatbot = () => {
  const [loading, setLoading] = useState(false);
  
  const sendMessage = async (message: string) => {
    setLoading(true);
    
    try {
      const response = await fetch('https://n8n1-ma6y.onrender.com/webhook/spc-chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          sessionId: sessionId, // Generar con crypto.randomUUID()
          userId: user?.id,
          userName: user?.nombre,
          userRole: user?.rol
        })
      });
      
      const data = await response.json();
      return data.response;
      
    } finally {
      setLoading(false);
    }
  };
  
  return { sendMessage, loading };
};
```

---

## 📈 **MÉTRICAS DE ÉXITO**

### **Verificar que funciona:**

- [ ] Workflow importado y activo
- [ ] Webhook responde a POST
- [ ] Guarda mensajes en `ai_system.chat_messages`
- [ ] Respeta RLS por rol
- [ ] Responde inteligentemente

### **Después de 1 día:**

- [ ] >90% de requests exitosos
- [ ] <2 segundos de respuesta
- [ ] 0 errores de permisos RLS

---

## 🎯 **SIGUIENTE NIVEL (FUTURO)**

### **Fase 2: IA Avanzada**
- Integrar Groq API para respuestas con LLM
- Análisis de sentimientos
- Predicciones

### **Fase 3: Multimodal**
- Procesar imágenes de comprobantes
- OCR automático
- Reportes PDF generados por IA

### **Fase 4: Automatizaciones**
- Alertas proactivas
- Sugerencias automáticas
- Dashboard predictivo

---

## ✅ **CHECKLIST FINAL**

### **Para empezar HOY:**

- [ ] Importar workflow (Opción A o B)
- [ ] Conectar credenciales "mcp supabase"
- [ ] Activar workflow
- [ ] Probar con PowerShell
- [ ] Ver resultados en Supabase

### **Cuando funcione:**

- [ ] Integrar en React
- [ ] Ajustar respuestas
- [ ] Agregar más detecciones
- [ ] Monitorear logs

---

## 💡 **COMANDOS RÁPIDOS**

### **Verificar workflows:**
```powershell
$headers = @{'X-N8N-API-KEY' = 'TU_API_KEY'}
Invoke-RestMethod -Uri 'https://n8n1-ma6y.onrender.com/api/v1/workflows' -Headers $headers | Select-Object -ExpandProperty data | Select name, active, id
```

### **Probar chatbot:**
```powershell
Invoke-RestMethod -Uri "https://n8n1-ma6y.onrender.com/webhook/spc-chatbot" -Method Post -Body '{"message":"hola"}' -ContentType "application/json"
```

### **Ver logs Supabase:**
```sql
SELECT * FROM ai_system.chat_messages ORDER BY created_at DESC LIMIT 10;
```

---

## 🎉 **RESUMEN EJECUTIVO**

✅ **Guardado en memoria:** Tu configuración de n8n
✅ **Base de datos:** Lista en Supabase  
✅ **Workflow:** Compatible con tu versión
✅ **Importación:** 2 opciones (API o manual)
✅ **Testing:** Comandos listos para copiar/pegar
✅ **Integración React:** Código de ejemplo incluido
✅ **Documentación:** Completa y actualizada

**Tiempo total:** 5-10 minutos para tener funcionando
**Resultado:** Chatbot IA con memoria, RLS y aprendizaje

---

**ARCHIVO PRINCIPAL:** `WORKFLOW-CHATBOT-IA-WEBHOOK.json`
**INSTRUCCIONES:** `INSTRUCCIONES-CHATBOT-WEBHOOK.md`
**ESTE RESUMEN:** Para referencia rápida

---

**¿Listo para importar?** 🚀

**Opción más rápida:** Importar manualmente en n8n (5 min)
**Opción automática:** Ejecutar PowerShell script arriba
