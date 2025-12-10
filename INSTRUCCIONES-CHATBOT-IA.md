# 🤖 INSTRUCCIONES - CHATBOT IA PROFESIONAL

## ✅ **ARCHIVOS CREADOS:**

1. ✅ `WORKFLOW-CHATBOT-IA-PROFESIONAL.json` - Workflow completo
2. ✅ `ARQUITECTURA-IA-PROFESIONAL.md` - Documentación técnica
3. ✅ `PLAN-IA-COMPLETO.md` - Plan de implementación
4. ✅ Sistema de aprendizaje en Supabase (ya ejecutado)

---

## 📥 **PASO 1: IMPORTAR WORKFLOW (2 min)**

### **En n8n:**
1. Abre: https://n8n1-ma6y.onrender.com
2. Click **"+"** (nuevo workflow)
3. Click **"..."** → **"Import from File"**
4. Selecciona: `WORKFLOW-CHATBOT-IA-PROFESIONAL.json`
5. Click **"Import"**

---

## 🔧 **PASO 2: CONECTAR CREDENCIALES (3 min)**

### **Credenciales necesarias:**

#### **A) Groq API**
- **Nodo:** "Groq Chat Model"
- **Credential:** Groq API
- **Ya la tienes:** Configurada anteriormente

#### **B) Supabase/Postgres (4 nodos)**
Los siguientes nodos necesitan la credencial "mcp supabase":

1. **"Query Schema"** → Credential: "mcp supabase"
2. **"Execute Query"** → Credential: "mcp supabase"
3. **"Guardar Mensaje Usuario"** → Credential: "mcp supabase"
4. **"Guardar Respuesta IA"** → Credential: "mcp supabase"

### **Conectar cada uno:**
- Click en el nodo
- Panel derecho → "Credential to connect with"
- Selecciona: **"mcp supabase"**
- Repite para los 4 nodos

---

## 💾 **PASO 3: GUARDAR Y ACTIVAR (1 min)**

1. Click **"Save"** (arriba derecha)
2. Nombre: `SPC Chatbot IA Profesional`
3. Click **"Activate"** (toggle arriba derecha)
4. Debe quedar **verde** ✅

---

## 💬 **PASO 4: PROBAR EL CHATBOT (2 min)**

### **Opción A: Interface Chat de n8n** ⭐ (RECOMENDADO)

1. En el workflow, busca el botón **"Chat"** (arriba derecha)
2. Click en **"Chat"**
3. Se abre ventana de chat
4. **¡Empieza a conversar!**

**Pruebas sugeridas:**
```
Tú: "¿cuántas tareas pendientes hay?"
Tú: "muéstrame los gastos de esta semana"
Tú: "dame un resumen"
```

### **Opción B: Webhook (para integrar en React)**

1. Click nodo **"When chat message received"**
2. Panel derecho → Busca **"Webhook URLs"**
3. Copia URL **"Production"**
4. Prueba con:
```bash
curl -X POST https://n8n1-ma6y.onrender.com/webhook/chat \
  -H "Content-Type: application/json" \
  -d '{"chatInput": "hola", "sessionId": "test-123"}'
```

---

## 🎯 **PASO 5: CONFIGURAR ROL DE USUARIO (IMPORTANTE)**

### **Por ahora el workflow usa rol de prueba:**

En el nodo **"Obtener Contexto Usuario"** (línea 8-9):
```javascript
const userRole = 'supervisor'; // ← CAMBIAR AQUÍ
```

### **Opciones:**
- `'admin'` → Acceso total
- `'supervisor'` → Solo sus tareas
- `'trabajador'` → Solo donde está asignado

### **En producción:**
Esto se obtendría del JWT/sesión de Supabase automáticamente.

**Por ahora, para probar:**
1. Click nodo "Obtener Contexto Usuario"
2. Cambia `userRole` a lo que quieras probar
3. Save
4. Prueba chat con ese rol

---

## 🧪 **EJEMPLOS DE CONVERSACIÓN:**

### **Como Supervisor:**

```
👤 Tú: "¿cuántas tareas tengo pendientes?"

🤖 IA: "Tienes 8 tareas pendientes. 3 son de alta prioridad 
      y vencen esta semana en los edificios Mitre 4483 y 
      Aguero 1659. ¿Quieres ver más detalles?"

👤 Tú: "sí, muéstrame las urgentes"

🤖 IA: "Tareas urgentes (vencen esta semana):
      1. Reparación cañería - Mitre 4483 - Vence: 6 dic
      2. Revisión eléctrica - Aguero 1659 - Vence: 7 dic
      3. Instalación gas - Mitre 4483 - Vence: 8 dic
      
      ¿Necesitas asignar trabajadores a alguna?"

👤 Tú: "cuánto llevamos gastado este mes"

🤖 IA: "Has gastado $127.500 este mes:
      • Materiales: $45.000 (12 gastos)
      • Transporte: $32.000 (8 viajes)
      • Mano de obra: $50.500 (15 jornales)
      
      Tienes $15.000 en gastos sin comprobante. 
      ¿Quieres que te muestre cuáles?"
```

### **Como Trabajador:**

```
👤 Tú: "qué tengo que hacer hoy"

🤖 IA: "Hoy tienes 2 tareas asignadas:
      
      1. Reparación de cañería
         📍 Mitre 4483 (Piso 3, Dpto A)
         ⚡ Prioridad: Alta
         
      2. Revisión instalación eléctrica  
         📍 Aguero 1659 (Piso 1)
         ⚡ Prioridad: Media
         
      ¿Necesitas la dirección exacta de alguna?"
```

### **Como Admin:**

```
👤 Tú: "dame un resumen ejecutivo"

🤖 IA: "📊 Resumen Ejecutivo SPC
      
      **Tareas**
      • Activas: 25 (18 en proceso, 7 sin iniciar)
      • Completadas este mes: 42
      • Vencidas: 3 ⚠️
      
      **Finanzas**
      • Gastos pendientes: $234.000
      • Liquidaciones pendientes: $567.000
      • Ganancia neta: $1.2M
      
      **Personal**
      • Supervisor más activo: Juan (15 tareas)
      • Trabajadores activos: 12 de 15
      
      ⚠️ Alertas:
      - 3 tareas vencidas >7 días
      - $45k sin comprobante
      - 2 liquidaciones atrasadas >30 días
      
      ¿Profundizo en algún punto?"
```

---

## 🔍 **VERIFICAR QUE FUNCIONA:**

### **Checklist:**

- [ ] Workflow importado ✅
- [ ] 4 credenciales Postgres conectadas ✅
- [ ] Credencial Groq conectada ✅
- [ ] Workflow activado (verde) ✅
- [ ] Botón "Chat" disponible ✅
- [ ] Chat responde ✅

---

## ⚠️ **TROUBLESHOOTING:**

### **Error: "Missing credential"**
→ Verifica que los 5 nodos tengan credencial asignada

### **Error: "Cannot connect to database"**
→ Verifica que "mcp supabase" esté correctamente configurada

### **Error: "Groq API error"**
→ Verifica que la API key de Groq sea válida

### **Chat no responde**
→ Verifica que workflow esté "Active" (toggle verde)

### **Respuestas incorrectas**
→ El rol en "Obtener Contexto Usuario" afecta qué puede ver

---

## 🎨 **PERSONALIZAR EL CHATBOT:**

### **Cambiar el prompt:**
1. Click nodo **"AI Agent"**
2. Edita el campo "text" (prompt completo)
3. Save

### **Cambiar modelo IA:**
1. Click nodo **"Groq Chat Model"**
2. Cambia "model" (opciones: llama-3.3-70b, mixtral-8x7b)
3. Save

### **Ajustar temperatura:**
1. En "Groq Chat Model" → Options → Temperature
2. Más bajo (0.1) = más preciso
3. Más alto (0.9) = más creativo

---

## 📊 **MONITOREAR USO:**

### **Ver logs en Supabase:**

```sql
-- Últimas conversaciones
SELECT * FROM ai_system.chat_conversations 
ORDER BY created_at DESC LIMIT 10;

-- Últimos mensajes
SELECT * FROM ai_system.chat_messages
ORDER BY created_at DESC LIMIT 50;

-- Queries ejecutadas
SELECT * FROM ai_system.mcp_query_logs
ORDER BY created_at DESC LIMIT 20;

-- Métricas diarias
SELECT * FROM ai_system.chatbot_metrics
ORDER BY fecha DESC;
```

---

## 🚀 **PRÓXIMOS PASOS:**

### **Después de probar:**

1. **Ajustar prompt** según lo que necesites
2. **Agregar más tools** si es necesario
3. **Integrar en React** (siguiente fase)
4. **Configurar autenticación real** (JWT)

---

## 💡 **CONSEJOS:**

### **Para probar diferentes roles:**
1. Cambia `userRole` en "Obtener Contexto Usuario"
2. Save workflow
3. Abre chat nuevo (sesión nueva)
4. Prueba qué puede ver cada rol

### **Para mejores respuestas:**
- Sé específico en tus preguntas
- Usa términos del dominio (tareas, gastos, liquidaciones)
- Dale feedback si la respuesta no es correcta

---

## 🎯 **RESUMEN RÁPIDO:**

```
1. Importar JSON ✅
2. Conectar 5 credenciales ✅
3. Activar workflow ✅
4. Click "Chat" ✅
5. ¡Conversar! 💬
```

**Tiempo total: 5 minutos**

---

**¿Listo para probarlo?** 🚀

**Abre n8n e importa el workflow ahora** ✅
