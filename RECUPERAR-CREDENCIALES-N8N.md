# 🔑 RECUPERAR CREDENCIALES DE N8N

## 📍 **TU INSTANCIA N8N:**
```
URL: https://n8n1-ma6y.onrender.com
```

---

## ✅ **MÉTODO 1: Ver en Render Dashboard** ⭐ (MÁS FÁCIL)

### **PASO 1: Acceder a Render**
1. Ve a: https://dashboard.render.com
2. Login con tu cuenta de Render

### **PASO 2: Encontrar tu servicio n8n**
1. En el Dashboard verás tus servicios
2. Busca el servicio llamado algo como:
   - `n8n1-ma6y` 
   - `n8n`
   - O similar

### **PASO 3: Ver variables de entorno**
1. Click en el servicio n8n
2. En el menú lateral → **"Environment"**
3. Busca estas variables:
   ```
   N8N_BASIC_AUTH_USER = [tu usuario]
   N8N_BASIC_AUTH_PASSWORD = [tu contraseña]
   ```

**¡Esas son tus credenciales!** 🎯

---

## ✅ **MÉTODO 2: Resetear contraseña**

Si prefieres crear una nueva contraseña:

### **PASO 1: Editar variables en Render**
1. Render Dashboard → Tu servicio n8n
2. Environment → Edit
3. Cambia el valor de `N8N_BASIC_AUTH_PASSWORD` a una nueva contraseña
4. Ejemplo: `N8N_BASIC_AUTH_PASSWORD=MiNuevaPassword123!`

### **PASO 2: Redeploy**
1. Click en **"Manual Deploy"** → **"Deploy latest commit"**
2. Espera 2-3 minutos
3. Accede con tu nuevo password

---

## ✅ **MÉTODO 3: Usar la API Key que YA TIENES**

**BUENA NOTICIA:** Ya tienes acceso por API, así que puedes:

### **Importar workflow sin necesidad de login web:**

```powershell
# Este comando ya funciona (lo usamos ayer)
$headers = @{'X-N8N-API-KEY' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwYjY1OWQ1OS01NzRjLTQ0NzgtYjE3NC04YjM2NmMzYzRmZjUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY0ODk5NzM2fQ.jDBj_o0xi8f53tka--moUXNkWbbU0hFBD7BbH0XL4j4'}

# Importar workflow
$workflow = Get-Content 'WORKFLOW-CHATBOT-HTTP-PROFESIONAL.json' -Raw
Invoke-RestMethod -Uri 'https://n8n1-ma6y.onrender.com/api/v1/workflows' `
    -Method Post `
    -Headers $headers `
    -ContentType 'application/json' `
    -Body $workflow
```

**Esto significa que NO NECESITAS el login web para trabajar con los workflows** ✅

---

## 🎯 **LO QUE PUEDES HACER SIN LOGIN WEB:**

Con la API Key que tienes:

✅ **Importar workflows**
```powershell
Invoke-RestMethod -Uri 'https://n8n1-ma6y.onrender.com/api/v1/workflows' -Method Post -Headers $headers -ContentType 'application/json' -Body $workflow
```

✅ **Activar workflows**
```powershell
Invoke-RestMethod -Uri "https://n8n1-ma6y.onrender.com/api/v1/workflows/[ID]/activate" -Method Post -Headers $headers
```

✅ **Ver workflows**
```powershell
Invoke-RestMethod -Uri 'https://n8n1-ma6y.onrender.com/api/v1/workflows' -Headers $headers
```

✅ **Ejecutar workflows**
```powershell
Invoke-RestMethod -Uri 'https://n8n1-ma6y.onrender.com/webhook/spc-chatbot' -Method Post -Body '{"message":"hola"}'
```

---

## 💡 **RECOMENDACIÓN:**

### **Para trabajar HOY mismo:**

**Opción A: Usar API (sin login web)**
```powershell
# Ya tenemos todo listo
# Solo ejecuta los scripts de PowerShell
cd "c:\Users\Central 1\Downloads\spc7\spc\spc"

# Importar workflow
$headers = @{'X-N8N-API-KEY' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwYjY1OWQ1OS01NzRjLTQ0NzgtYjE3NC04YjM2NmMzYzRmZjUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY0ODk5NzM2fQ.jDBj_o0xi8f53tka--moUXNkWbbU0hFBD7BbH0XL4j4'}
$workflow = Get-Content 'WORKFLOW-CHATBOT-HTTP-PROFESIONAL.json' -Raw
$newWf = Invoke-RestMethod -Uri 'https://n8n1-ma6y.onrender.com/api/v1/workflows' -Method Post -Headers $headers -ContentType 'application/json' -Body $workflow
Invoke-RestMethod -Uri "https://n8n1-ma6y.onrender.com/api/v1/workflows/$($newWf.id)/activate" -Method Post -Headers $headers

# Probar
Invoke-RestMethod -Uri "https://n8n1-ma6y.onrender.com/webhook/spc-chatbot" -Method Post -Body '{"message":"hola"}'
```

**Opción B: Recuperar password de Render**
1. https://dashboard.render.com
2. Tu servicio n8n
3. Environment
4. Copia N8N_BASIC_AUTH_USER y N8N_BASIC_AUTH_PASSWORD

---

## 🔐 **GUARDA ESTAS CREDENCIALES:**

Una vez que las recuperes de Render, guárdalas aquí:

```
Usuario n8n: _______________
Contraseña n8n: _______________
URL: https://n8n1-ma6y.onrender.com
API Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwYjY1OWQ1OS01NzRjLTQ0NzgtYjE3NC04YjM2NmMzYzRmZjUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY0ODk5NzM2fQ.jDBj_o0xi8f53tka--moUXNkWbbU0hFBD7BbH0XL4j4
```

---

## 🚀 **CONTINUAR EL TRABAJO:**

Todo lo que hicimos ayer está guardado:

✅ **Workflows:**
- WORKFLOW-CHATBOT-HTTP-PROFESIONAL.json

✅ **Base de datos:**
- Schema ai_system en Supabase
- Función count_tareas_pendientes()
- Tablas de memoria conversacional

✅ **Scripts:**
- test-chatbot-profesional.ps1

✅ **Documentación:**
- RESUMEN-SESION-COMPLETO.md
- ARQUITECTURA-IA-PROFESIONAL.md
- Y 15+ archivos más

**Todo está listo para continuar** ✅

---

## ⏰ **SIGUIENTE PASO:**

1. **Recupera las credenciales de Render** (5 min)
2. **O usa la API directamente** (ya funciona)
3. **Continuamos debuggeando el workflow** (15 min)

**¿Prefieres la Opción A (API) u Opción B (Recuperar de Render)?**
