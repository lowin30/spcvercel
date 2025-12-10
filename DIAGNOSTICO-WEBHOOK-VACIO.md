# 🔍 DIAGNÓSTICO: Webhook Responde Vacío

## ⚠️ **PROBLEMA ACTUAL:**

```
✅ Webhook URL funciona: https://n8n1-ma6y.onrender.com/webhook/spc-chatbot
✅ Status Code: 200
❌ Content: Vacío (0 bytes)
```

**Conclusión:** El workflow se ejecuta pero no devuelve respuesta.

---

## 🎯 **VERIFICACIÓN EN N8N:**

### **PASO 1: Ver ejecuciones**

1. En n8n, ve a **"Executions"** (panel izquierdo)
2. Deberías ver las ejecuciones recientes
3. ¿Qué color tienen?
   - 🟢 **Verde** = Éxito
   - 🔴 **Rojo** = Error
   - ⚪ **Gris** = No se ejecutó

### **PASO 2: Ver el error (si hay)**

1. Click en una ejecución roja (si la hay)
2. Ve qué nodo falló
3. Lee el mensaje de error

---

## 🔧 **POSIBLES PROBLEMAS Y SOLUCIONES:**

### **Problema 1: Función RPC no existe**

**Síntoma:** Error en nodo "Contar Tareas"

**Mensaje:** `function count_tareas_pendientes does not exist`

**Solución:**
```sql
-- Ejecutar en Supabase SQL Editor
SELECT * FROM count_tareas_pendientes('demo-user', 'supervisor');
```

Si da error, la función no existe. **Dime y la vuelvo a crear.**

---

### **Problema 2: Tabla chat_messages no accesible**

**Síntoma:** Error en nodos "Guardar Mensaje Usuario" o "Guardar Respuesta IA"

**Mensaje:** `relation "chat_messages" does not exist`

**Solución:** La tabla está en schema `ai_system`, necesita path completo.

**Fix:** Cambiar URL en esos nodos:
```
De: /rest/v1/chat_messages
A:  /rest/v1/ai_system.chat_messages
```

O exponer el schema en Supabase Dashboard.

---

### **Problema 3: Service Role Key inválida**

**Síntoma:** Error 401 o 403 en cualquier nodo HTTP

**Mensaje:** `Invalid API key`

**Solución:** Verificar que el Service Role Key sea correcta en nodo "Preparar Contexto".

---

## 📋 **ACCIÓN INMEDIATA:**

### **Opción A: Ver logs en n8n** ⭐ (MEJOR)

1. En n8n → **"Executions"**
2. Click en la ejecución más reciente
3. Ve qué nodo tiene error (rojo)
4. Lee el mensaje de error
5. **Copia el error y dímelo**

### **Opción B: Test con Listen for event**

1. En n8n, abre el workflow
2. Click en nodo **"Webhook"** (el primero)
3. Click **"Listen for test event"**
4. En PowerShell ejecuta:
   ```powershell
   Invoke-RestMethod -Uri "https://n8n1-ma6y.onrender.com/webhook/spc-chatbot" -Method Post -ContentType "application/json" -Body '{"message":"test"}'
   ```
5. Verás la ejecución EN VIVO en n8n
6. **Ve qué nodo falla y qué error muestra**

---

## 💡 **LO MÁS PROBABLE:**

Basado en lo que vimos antes (puerto 5432 bloqueado), probablemente:

**La función RPC `count_tareas_pendientes` no se ejecutó correctamente en Supabase.**

**Solución:** Volver a crear la función o verificar que existe.

---

## 🚀 **SIGUIENTE PASO:**

**Dime:**

1. **¿Ves ejecuciones en n8n → Executions?**
2. **¿De qué color son? (verde/rojo)**
3. **Si son rojas, ¿qué nodo falla?**
4. **¿Cuál es el mensaje de error?**

O simplemente:

**¿Quieres que verifique si la función RPC existe y la vuelva a crear si hace falta?**

---

## 📸 **SI PUEDES:**

Toma screenshot de:
- Executions panel en n8n (mostrando las ejecuciones)
- O del error específico si hay uno

Eso me ayudará a diagnosticar exacto qué pasa.

---

**Mientras tanto, voy a verificar la función RPC en Supabase...**
