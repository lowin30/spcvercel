# 🔧 ARREGLO RÁPIDO - 3 PASOS

## ⚠️ **PROBLEMA QUE VI EN TU IMAGEN:**

En los nodos de Postgres, pusiste **"Map Automatically"** (rojo en tu imagen).

**Debe ser:** **"Map Manually"** (Manual)

---

## ✅ **SOLUCIÓN (2 minutos):**

### **PASO 1: Arreglar los 3 nodos de INSERT**

En n8n, para cada uno de estos nodos:

1. **"Crear Conversación"** (arriba)
2. **"Guardar Mensaje Usuario"** (abajo izquierda)
3. **"Guardar Respuesta IA"** (derecha)

**Hacer esto en cada uno:**

```
1. Click en el nodo
2. Busca: "Mapping Column Mode"
3. Cambia a: "Map Manually" (no Automatically)
4. Verás aparecer "Columns" con los campos
5. NO CAMBIES los valores de los campos
6. Click fuera para cerrar
```

### **PASO 2: Guardar**

- Click **"Save"** (arriba derecha)

### **PASO 3: Probar**

**Opción A - Desde n8n (ver errores en tiempo real):**

1. En n8n, click nodo **"Webhook Chatbot"** (el primero)
2. Click **"Listen for test event"** (en panel derecho)
3. n8n esperará...
4. **En PowerShell ejecuta:**
   ```powershell
   Invoke-RestMethod -Uri "https://n8n1-ma6y.onrender.com/webhook/spc-chatbot" -Method Post -ContentType "application/json" -Body '{"message":"prueba","sessionId":"test"}'
   ```
5. Verás la ejecución EN VIVO en n8n
6. Si hay error, lo ves inmediatamente en rojo

**Opción B - Script automático:**

```powershell
cd "c:\Users\Central 1\Downloads\spc7\spc\spc"
.\test-manual-detallado.ps1
```

---

## 🎯 **RESUMEN VISUAL:**

### **Antes (ERROR):**
```
Nodo: Guardar Mensaje Usuario
├─ Mapping Column Mode: "Map Automatically" ❌
└─ No sabe qué campos enviar
```

### **Después (CORRECTO):**
```
Nodo: Guardar Mensaje Usuario
├─ Mapping Column Mode: "Map Manually" ✅
├─ Columns:
│  ├─ conversation_id: {{ $(...) }}
│  ├─ role: "user"
│  └─ content: {{ $(...) }}
└─ Sabe exactamente qué enviar
```

---

## 📸 **VERIFICACIÓN:**

Cuando termines, los 3 nodos deben tener:
- ✅ Check verde (credencial conectada)
- ✅ "Map Manually" seleccionado
- ✅ Campos visibles con sus valores

---

## 💡 **POR QUÉ FALLÓ:**

**"Map Automatically":**
- n8n intenta adivinar qué campos mapear
- No sabe de dónde vienen `conversation_id`, `role`, `content`
- Resultado: campos vacíos o error

**"Map Manually":**
- Tú defines exactamente cada campo
- Usas expresiones `{{ }}` para obtener datos
- Resultado: funciona correctamente

---

## 🚀 **DESPUÉS DE ARREGLAR:**

El workflow guardará:
- ✅ Cada mensaje del usuario en `ai_system.chat_messages`
- ✅ Cada respuesta de la IA
- ✅ La conversación completa
- ✅ Todo con el rol correcto (supervisor/admin/trabajador)

---

**¿Listo? Empieza con el PASO 1** ⬆️

**Avísame cuando termines los 3 pasos y probamos juntos** 🎯
