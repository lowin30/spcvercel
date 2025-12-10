# 🔍 DEBUG: Workflow Responde Vacío

## ⚠️ **SITUACIÓN ACTUAL:**

El webhook responde con HTTP 200 pero sin contenido.

**Esto significa:** El workflow se ejecuta pero no devuelve la respuesta.

---

## 🎯 **OPCIÓN A: Revisar Executions en n8n** ⭐ (PRIMERO)

### **¿Qué hacer?**

1. En n8n → **"Executions"** (icono de lista, panel izquierdo)
2. Verás las ejecuciones recientes del workflow
3. **Dime qué ves:**
   - ¿Hay ejecuciones listadas?
   - ¿De qué color son? (verde/rojo/gris)
   - Si hay rojas, click en una y dime qué error muestra

**Con esta info puedo saber exactamente qué falla.**

---

## 🎯 **OPCIÓN B: Probar workflow super simple**

Para descartar que sea problema de n8n:

### **PASO 1: Importar workflow de prueba**

1. En n8n → **"+"** → **"Import from File"**
2. Archivo: `WORKFLOW-TEST-SIMPLE.json`
3. **Import** → **Save** → **Activate**

### **PASO 2: Probar**

```powershell
Invoke-RestMethod -Uri "https://n8n1-ma6y.onrender.com/webhook/test-simple" -Method Post -ContentType "application/json" -Body '{"test":true}' | ConvertTo-Json
```

**Resultado esperado:**
```json
{
  "success": true,
  "message": "Hola! El webhook funciona correctamente",
  "timestamp": "2025-12-05T..."
}
```

**Si esto funciona:**
→ n8n está OK, el problema es el workflow complejo

**Si esto NO funciona:**
→ Hay problema con n8n en Render

---

## 🎯 **OPCIÓN C: Ver error específico con Listen for event**

1. En n8n, abre el workflow "SPC Chatbot Pro - HTTP API"
2. Click en nodo **"Webhook"** (el primero)
3. Panel derecho → Click **"Listen for test event"**
4. n8n esperará...
5. En PowerShell ejecuta:
   ```powershell
   Invoke-RestMethod -Uri "https://n8n1-ma6y.onrender.com/webhook/spc-chatbot" -Method Post -ContentType "application/json" -Body '{"message":"test"}'
   ```
6. En n8n verás la ejecución EN VIVO
7. **Verás exactamente qué nodo falla y por qué**
8. Dime qué error muestra

---

## 💡 **LO MÁS PROBABLE:**

Basado en los síntomas, probablemente uno de estos:

### **1. Nodo "Contar Tareas" falla**
**Por:** Función RPC no responde correctamente

**Fix:** Cambiar ese nodo por uno más simple

### **2. Nodo "Guardar Mensaje" falla**  
**Por:** Tabla `chat_messages` no accesible vía REST API

**Fix:** Usar path completo `/rest/v1/ai_system.chat_messages`

### **3. Nodo "Responder" no está conectado**
**Por:** Conexión se perdió al importar

**Fix:** Reconectar el último nodo

---

## 📊 **RESUMEN DE OPCIONES:**

| Opción | Tiempo | Objetivo |
|--------|--------|----------|
| **A** | 1 min | Ver qué error específico hay |
| **B** | 2 min | Verificar que n8n funciona |
| **C** | 2 min | Debug en tiempo real |

**Mi recomendación: Opción C** - Es la más rápida para ver el error exacto.

---

## 🚀 **¿QUÉ PREFIERES?**

**A)** Dime qué ves en Executions de n8n
**B)** Prueba el workflow simple primero
**C)** Usa "Listen for test event" y dime qué error sale

---

**Una vez que sepa el error exacto, lo arreglo en 1 minuto** ✅
