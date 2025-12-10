# 🔧 ARREGLAR CREDENCIAL "mcp supabase"

## ⚠️ **PROBLEMA DETECTADO:**

El error **"No columns found in Postgres"** significa que la credencial **"mcp supabase"** NO puede conectarse correctamente a la base de datos.

---

## ✅ **SOLUCIÓN: VERIFICAR/RECREAR CREDENCIAL**

### **PASO 1: Verificar credencial actual**

1. En n8n, click **Settings** (⚙️ arriba derecha)
2. Click **Credentials**
3. Busca **"mcp supabase"**
4. Click para **editar**
5. **VERIFICA ESTOS VALORES EXACTOS:**

---

## 📋 **CONFIGURACIÓN EXACTA (Copia y pega):**

```
Name: mcp supabase
Type: Postgres

Host: db.fodyzgjwoccpsjmfinvm.supabase.co
        ↑ IMPORTANTE: Empieza con "db."
        
Database: postgres

User: postgres

Password: (tu Service Role Key de Supabase)
         Formato: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Port: 5432

SSL Mode: require  (o "Enable" si es checkbox)
```

---

## ⚠️ **ERRORES COMUNES:**

| ❌ INCORRECTO | ✅ CORRECTO |
|--------------|-------------|
| `fodyzgjwoccpsjmfinvm.supabase.co` | `db.fodyzgjwoccpsjmfinvm.supabase.co` |
| `https://...` | Sin https, solo el host |
| Anon Key | Service Role Key |
| Port 443 | Port 5432 |

---

## 🎯 **PASO 2: TEST CONNECTION**

1. Después de configurar los valores arriba
2. Scroll abajo en la credencial
3. Click **"Test Connection"**
4. ¿Qué sale?
   - ✅ **"Connection successful"** → ¡Perfecto! Guarda
   - ❌ **Error** → Copia el mensaje de error completo

---

## 🔑 **DÓNDE OBTENER SERVICE ROLE KEY:**

1. Ve a: https://supabase.com/dashboard/project/fodyzgjwoccpsjmfinvm
2. Click **Settings** (⚙️ barra izquierda)
3. Click **API**
4. Busca sección **"Project API keys"**
5. Copia la key que dice **"service_role"** (NO la "anon")
   - Empieza con: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - Es MUY LARGA (varios cientos de caracteres)

---

## 🚀 **PASO 3: DESPUÉS DE ARREGLAR**

1. Guarda la credencial (click **Save**)
2. Vuelve al workflow
3. En cada nodo de Postgres:
   - Selecciona la credencial **"mcp supabase"**
   - Schema: `ai_system`
   - Table: (según corresponda)
4. El error **"No columns found"** debe desaparecer

---

## 💡 **MÉTODO ALTERNATIVO: CREAR CREDENCIAL NUEVA**

Si no encuentras la credencial o sigue fallando:

1. En n8n → **Settings** → **Credentials**
2. Click **"Add Credential"**
3. Busca y selecciona **"Postgres"**
4. Nombre: `supabase-postgres-nuevo`
5. Configura con los valores de arriba
6. **Test Connection**
7. Si funciona, guarda
8. Vuelve al workflow
9. Cambia todos los nodos para usar esta nueva credencial

---

## 🧪 **TEST RÁPIDO EN POWERSHELL:**

Para verificar que el host es correcto:

```powershell
Test-NetConnection -ComputerName db.fodyzgjwoccpsjmfinvm.supabase.co -Port 5432
```

**Resultado esperado:**
```
TcpTestSucceeded : True
```

Si dice **False**, hay problema de red/firewall.

---

## 📊 **RESUMEN DE VALORES:**

```
┌─────────────────────────────────────────────┐
│  CREDENCIAL SUPABASE POSTGRES               │
├─────────────────────────────────────────────┤
│  Host:     db.fodyzgjwoccpsjmfinvm.supabase.co
│  Database: postgres                         │
│  User:     postgres                         │
│  Password: [Service Role Key]              │
│  Port:     5432                            │
│  SSL:      require/Enable                  │
└─────────────────────────────────────────────┘
```

---

## 🎯 **SIGUIENTE PASO:**

1. **Verifica la credencial con los valores de arriba**
2. **Test Connection debe dar ✅**
3. **Avísame qué resultado te da**

Si Test Connection falla, **copia el mensaje de error completo** y te ayudo a arreglarlo.

---

**¿La credencial ya existía o la creaste nueva?** 
**¿Test Connection da verde o error?**
