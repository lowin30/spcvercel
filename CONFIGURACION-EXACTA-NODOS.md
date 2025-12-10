# ✅ CONFIGURACIÓN EXACTA DE CADA NODO

## 📊 **TABLAS CONFIRMADAS EN SUPABASE:**

```
✅ ai_system.chat_conversations
✅ ai_system.chat_messages
✅ ai_system.feedback_queries
✅ ai_system.mcp_query_logs
```

---

## 🎯 **CONFIGURACIÓN DE CADA NODO:**

### **NODO 1: "Crear Conversación"**

```
Parameters:
├─ Credential to connect with: mcp supabase
├─ Operation: insert
├─ Schema: ai_system
├─ Table: chat_conversations
├─ Mapping Column Mode: Map Manually
└─ Columns:
   ├─ session_id: {{ $json.sessionId }}
   └─ title: Conversación
```

**⚠️ IMPORTANTE:**
- Schema: `ai_system` (todo minúsculas, con guion bajo)
- Table: `chat_conversations` (plural, con 's')

---

### **NODO 2: "Guardar Mensaje Usuario"**

```
Parameters:
├─ Credential to connect with: mcp supabase
├─ Operation: insert
├─ Schema: ai_system
├─ Table: chat_messages
├─ Mapping Column Mode: Map Manually
└─ Columns:
   ├─ conversation_id: {{ $('Obtener Contexto Usuario').item.json.sessionId }}
   ├─ role: user
   └─ content: {{ $('Obtener Contexto Usuario').item.json.userMessage }}
```

**⚠️ IMPORTANTE:**
- Schema: `ai_system`
- Table: `chat_messages` (plural, con 's')

---

### **NODO 3: "Guardar Respuesta IA"**

```
Parameters:
├─ Credential to connect with: mcp supabase
├─ Operation: insert
├─ Schema: ai_system
├─ Table: chat_messages
├─ Mapping Column Mode: Map Manually
└─ Columns:
   ├─ conversation_id: {{ $('Obtener Contexto Usuario').item.json.sessionId }}
   ├─ role: assistant
   ├─ content: {{ $json.response }}
   └─ model: rule-based-v1
```

**⚠️ IMPORTANTE:**
- Schema: `ai_system`
- Table: `chat_messages` (misma tabla que el nodo 2)

---

### **NODO 4: "Consultar Tareas"**

```
Parameters:
├─ Credential to connect with: mcp supabase
├─ Operation: executeQuery
└─ Query: (tiene una query SQL larga, NO CAMBIAR)
```

**⚠️ ESTE NODO NO USA SCHEMA/TABLE** porque ejecuta query directa.

---

## 🔧 **PASOS PARA ARREGLAR EL ERROR "No columns found":**

### **Método 1: Escribir exactamente**

1. Click en el nodo con error
2. En **Schema**, borra todo y escribe: `ai_system`
3. En **Table**, borra todo y escribe el nombre exacto:
   - `chat_conversations` (para Crear Conversación)
   - `chat_messages` (para Guardar Mensaje Usuario y Guardar Respuesta)
4. Click FUERA del campo Table
5. Espera 2-3 segundos
6. n8n debería cargar las columnas automáticamente
7. Cambia **Mapping Column Mode** a **Map Manually**
8. Verás los campos para configurar

---

### **Método 2: Recrear el nodo (si el Método 1 no funciona)**

1. Elimina el nodo con error
2. Arrastra un nuevo nodo **Postgres** al canvas
3. Configura:
   - Credential: `mcp supabase`
   - Operation: `insert`
   - Schema: `ai_system`
   - Table: (según corresponda)
   - Mapping Column Mode: `Map Manually`
4. Configura los campos según la tabla arriba
5. Reconecta las flechas

---

## ⚠️ **ERRORES COMUNES:**

| ❌ Incorrecto | ✅ Correcto |
|--------------|-----------|
| `Ai_system` | `ai_system` |
| `AI_SYSTEM` | `ai_system` |
| `chat_conversation` (sin 's') | `chat_conversations` |
| `chat_message` (sin 's') | `chat_messages` |
| `chatmessages` (sin guion) | `chat_messages` |

---

## 🎯 **VERIFICACIÓN FINAL:**

Cuando esté bien configurado verás:
- ✅ Check verde en el nodo (credencial conectada)
- ✅ NO hay mensaje rojo "No columns found"
- ✅ En "Mapping Column Mode" → "Map Manually" seleccionado
- ✅ Aparecen los campos para mapear debajo

---

## 💡 **SI TODAVÍA NO FUNCIONA:**

La credencial "mcp supabase" puede estar mal configurada. Verifica:

1. En n8n, ve a **Settings** → **Credentials**
2. Busca "mcp supabase"
3. Click para editar
4. Debe tener:
   - **Host:** fodyzgjwoccpsjmfinvm.supabase.co
   - **Port:** 5432
   - **Database:** postgres
   - **User:** postgres
   - **Password:** (tu service role key)
   - **SSL:** Enable

---

**Empieza por el Método 1** y avísame si sigue dando error ✅
