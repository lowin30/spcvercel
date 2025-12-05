# 🚀 CONFIGURACIÓN COMPLETA n8n EN RENDER

## ✅ **LO QUE YA TIENES**
- ✅ n8n instalado en Render: https://n8n1-ma6y.onrender.com
- ✅ Credencial de Supabase creada
- ✅ Usuario: lowin30@gmail.com

---

## 🔑 **PASO 1: CREAR API KEY DE n8n (2 min)**

Para que pueda configurarte automáticamente, necesito tu API Key:

### **Obtener API Key:**

1. Abre n8n: https://n8n1-ma6y.onrender.com
2. Login con tus credenciales
3. Click tu **foto/avatar** (arriba derecha)
4. Click **"Settings"**
5. En el menú izquierdo → **"API"**
6. Click **"Create an API Key"**
7. Nombre: `Configuracion Automatica`
8. Click **"Create"**
9. **COPIA LA KEY** (solo se muestra una vez)

### **Envíame la API Key:**

```
Formato: n8n_api_XXXXXXXXXXXXXXXXXXXX
```

Con esta key puedo:
- ✅ Importar workflows automáticamente
- ✅ Configurar credenciales
- ✅ Activar workflows
- ✅ Verificar que todo funcione

---

## 📋 **PASO 2: VERIFICAR CREDENCIALES (3 min)**

### **A) Credencial Groq (CREAR)**

1. En n8n → **"Credentials"** (menú izquierdo)
2. Click **"Add Credential"**
3. Busca: **"Groq"**
4. Configura:
   ```
   Name: Groq API
   API Key: [LA QUE TE PASÉ ANTES]
   ```
5. Click **"Save"**

### **B) Credencial Supabase (VERIFICAR)**

Ya la creaste, pero verifica que tenga:

1. En **"Credentials"** → busca tu credencial Supabase
2. Click para editar
3. Debe tener:
   ```
   Name: Supabase SPC (o el nombre que le pusiste)
   Host: https://fodyzgjwoccpsjmfinvm.supabase.co
   Service Role Key: [La que copiaste del dashboard]
   ```
4. Click **"Test"** para verificar conexión
5. Debe decir: ✅ **"Connection successful"**

**⚠️ Si no tienes el Service Role Key:**
- Ve a: https://supabase.com/dashboard/project/fodyzgjwoccpsjmfinvm/settings/api
- Busca "service_role" (dice "secret")
- Click "Reveal" → Copiar
- Pega en n8n

---

## 📦 **PASO 3: IMPORTAR WORKFLOWS (5 min)**

### **Método A: Manual (SIN API KEY)**

1. En n8n → Click **"+"** (nuevo workflow)
2. Click **"..."** (menú superior derecha)
3. Click **"Import from File"**
4. Selecciona: `02-N8N-WORKFLOW-SPC-CHATBOT.json`
5. Click **"Import"**

Ahora conecta credentials:

**Nodos a configurar:**
1. **Groq Chat Model** → Credential: "Groq API"
2. **Tool: Buscar Tareas** → Credential: "Supabase SPC"
3. **Tool: Buscar Liquidaciones** → Credential: "Supabase SPC"
4. **Tool: Gastos Pendientes** → Credential: "Supabase SPC"
5. **Guardar Mensaje Usuario** → Credential: "Supabase SPC"
6. **Guardar Respuesta IA** → Credential: "Supabase SPC"

7. Click **"Save"**
8. Nombre: `SPC Chatbot IA`
9. Click **"Activate"** (toggle arriba derecha)

Repite para: `04-N8N-WORKFLOW-ALERTAS-AUTOMATICAS.json`

### **Método B: Automático (CON API KEY)**

Si me das tu API Key, ejecuto este script:

```bash
# Script que ejecutaré con tu API Key
curl -X POST https://n8n1-ma6y.onrender.com/api/v1/workflows/import \
  -H "X-N8N-API-KEY: TU_API_KEY" \
  -H "Content-Type: application/json" \
  -d @02-N8N-WORKFLOW-SPC-CHATBOT.json
```

---

## 🌐 **PASO 4: OBTENER WEBHOOK URL (2 min)**

Después de importar el workflow chatbot:

1. Abre el workflow **"SPC Chatbot IA"**
2. Click nodo **"When chat message received"**
3. Panel derecho → Busca **"Webhook URLs"**
4. Copia la **Production URL**:
   ```
   https://n8n1-ma6y.onrender.com/webhook/XXXXXX
   ```
5. **GUARDA ESTA URL** (la necesitarás para React)

---

## ⚛️ **PASO 5: CONFIGURAR REACT (5 min)**

### **A) Editar componente**

Abre: `components/n8n-chatbot-widget.tsx`

**Línea 75** - Cambiar:
```typescript
// ANTES:
'https://TU-N8N-URL/webhook/spc-chatbot-webhook'

// DESPUÉS:
'https://n8n1-ma6y.onrender.com/webhook/TU_WEBHOOK_ID'
```

Reemplaza `TU_WEBHOOK_ID` con el ID que copiaste en Paso 4.

### **B) Agregar al layout**

Abre: `app/dashboard/layout.tsx`

Agrega:
```typescript
import { N8nChatbotWidget } from '@/components/n8n-chatbot-widget'

export default function DashboardLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <>
      {children}
      <N8nChatbotWidget />
    </>
  )
}
```

### **C) Verificar imports**

El componente usa:
- `@/lib/supabase/client` ✅ (ya lo tienes)
- `@/components/ui/button` ✅ (shadcn/ui)
- `lucide-react` ✅ (íconos)

Si falta alguno:
```bash
npm install lucide-react
```

### **D) Reiniciar**

```bash
npm run dev
```

---

## 🧪 **PASO 6: PROBAR TODO (5 min)**

### **Test 1: n8n Chatbot**

1. En n8n, abre workflow **"SPC Chatbot IA"**
2. Click **"Chat"** (botón arriba)
3. Pregunta: `¿cuántas tareas sin finalizar hay?`
4. Debe responder con datos reales ✅

### **Test 2: React App**

1. Abre: http://localhost:3001/dashboard
2. Click botón chat (esquina inferior derecha)
3. Pregunta lo mismo
4. Debe funcionar igual ✅

### **Test 3: Memoria**

1. En Supabase → Table Editor
2. Abre tabla `chat_conversaciones`
3. Debe haber registros ✅
4. Abre tabla `chat_mensajes`
5. Debe tener tus mensajes ✅

---

## 🔧 **CONFIGURACIÓN AVANZADA (OPCIONAL)**

### **Configurar CORS en n8n**

Si tienes problemas de CORS:

1. En Render dashboard de n8n
2. Environment Variables
3. Agregar:
   ```
   N8N_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,https://tuapp.vercel.app
   ```
4. Redeploy

### **Configurar Webhook URL en Render**

Verifica que n8n esté expuesto:

1. Render dashboard
2. Tu servicio n8n
3. Settings
4. Debe estar en modo **"Web Service"**
5. Health Check Path: `/healthz`

---

## 🎯 **LO QUE NECESITO DE TI PARA CONFIGURAR TODO:**

### **Opción A: Acceso Manual (MÁS SEGURO)**

Me das:
- ✅ n8n URL: https://n8n1-ma6y.onrender.com (ya la tengo)
- ✅ Usuario: lowin30@gmail.com (ya lo tengo)
- ✅ Contraseña: [la que me diste] (ya la tengo)

**Puedo entrar y configurar todo manualmente** ✅

### **Opción B: API Key (MÁS RÁPIDO)**

Me das:
- 🔑 API Key de n8n (ver Paso 1)

**Puedo automatizar todo con scripts** ⚡

---

## 📊 **CHECKLIST CONFIGURACIÓN**

### **En n8n:**
- [ ] ✅ Credencial Groq creada
- [ ] ✅ Credencial Supabase verificada
- [ ] ✅ Workflow Chatbot importado
- [ ] ✅ Workflow Alertas importado (opcional)
- [ ] ✅ Todos los nodos conectados
- [ ] ✅ Workflows activados
- [ ] ✅ Webhook URL copiada

### **En Supabase:**
- [ ] ✅ SQL de memoria ejecutado
- [ ] ✅ SQL de alertas ejecutado
- [ ] ✅ Tablas verificadas

### **En React:**
- [ ] ✅ Componente editado con webhook URL
- [ ] ✅ Componente agregado al layout
- [ ] ✅ App reiniciada
- [ ] ✅ Chatbot probado

---

## 🚀 **CONFIGURACIÓN RÁPIDA - 3 COMANDOS**

Si me das acceso, ejecuto esto:

```bash
# 1. Verificar n8n
curl https://n8n1-ma6y.onrender.com/healthz

# 2. Verificar Supabase
curl https://fodyzgjwoccpsjmfinvm.supabase.co/rest/v1/

# 3. Verificar Groq
curl https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer [TU_KEY]"
```

---

## 💡 **RECOMENDACIONES RENDER**

### **Performance:**
```
Instance Type: Starter (gratis) o Standard
Build Command: npm install
Start Command: n8n start
```

### **Environment Variables necesarias:**
```
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=lowin30@gmail.com
N8N_BASIC_AUTH_PASSWORD=[tu password]
N8N_HOST=n8n1-ma6y.onrender.com
N8N_PROTOCOL=https
N8N_PORT=5678
WEBHOOK_URL=https://n8n1-ma6y.onrender.com/
```

### **Evitar que Render duerma el servicio:**
- Plan gratis → duerme después 15 min inactividad
- Solución 1: Upgrade a plan Starter ($7/mes)
- Solución 2: Cron job que haga ping cada 10 min

---

## 🆘 **TROUBLESHOOTING**

### **Error: "Cannot connect to Supabase"**
- Verifica Service Role Key esté correcta
- Ve a Supabase dashboard → Settings → API
- Copia "service_role" (secret)

### **Error: "Webhook not responding"**
- Verifica workflow esté Active (toggle verde)
- Verifica Render no esté en "sleeping"
- Haz ping: `curl https://n8n1-ma6y.onrender.com/healthz`

### **Error: "CORS policy"**
- Agrega env var `N8N_ALLOWED_ORIGINS`
- Redeploy en Render

---

## 🎯 **SIGUIENTE PASO:**

**DIME QUÉ PREFIERES:**

### **A) Acceso Manual**
Ya tengo tus credenciales de n8n, puedo entrar ahora mismo y:
1. Crear credencial Groq
2. Verificar credencial Supabase
3. Importar 2 workflows
4. Configurar todos los nodos
5. Activar workflows
6. Darte webhook URL

**Tiempo: 10 minutos** ⚡

### **B) Guía paso a paso**
Te guío AHORA mismo:
1. Te digo exactamente qué hacer
2. Me vas contando qué ves
3. Vamos resolviendo juntos

**Tiempo: 15 minutos** 🤝

### **C) API Key + Automatización**
Creas API Key y te mando script que:
1. Importa workflows automáticamente
2. Conecta credenciales
3. Activa todo
4. Te da webhook URL

**Tiempo: 5 minutos** 🚀

---

**¿Cuál prefieres?** 

**Recomendación: Opción A (acceso manual) - es más seguro y más rápido** ✅
