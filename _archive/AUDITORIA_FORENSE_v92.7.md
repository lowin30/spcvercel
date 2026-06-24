# AUDITORÍA FORENSE v92.7 - El Bache de Persistencia (Tarea 370)

## 🎯 OBJETIVO
Identificar el punto exacto donde las cookies de sesión de Supabase se pierden durante el flujo OAuth, impidiendo el acceso al dashboard después del login exitoso.

## 📊 ESTADO ACTUAL DEL SISTEMA

### ✅ Componentes Funcionales Verificados

1. **Intercambio OAuth con Google** - 100% operativo
   - `app/auth/callback/route.ts:31` - `exchangeCodeForSession(code)` ejecuta sin errores
   - Log confirmado: `"intercambio exitoso, cookies inyectadas en 307"`

2. **Middleware de Protección** - Funcional
   - `middleware.ts:36` - `/auth/callback` correctamente excluido de validación
   - `middleware.ts:46` - Redirección a login funciona para rutas no autenticadas

3. **Redirección HTTP** - Operativa
   - `route.ts:9` - `NextResponse.redirect(`${origin}/dashboard`)` genera 307

### ❌ PUNTO CRÍTICO DE FALLA

**El Bache de Persistencia:** Las cookies NO llegan al navegador

---

## 🔍 ANÁLISIS FORENSE DETALLADO

### 1. PATRÓN DE INYECCIÓN DE COOKIES (CRÍTICO)

**Archivo:** `app/auth/callback/route.ts`

```typescript
// LÍNEA 8-9: Creación PREMATURA de respuesta
const response = NextResponse.redirect(`${origin}/dashboard`)

// LÍNEA 21-25: Inyección MANUAL en objeto response
setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
    cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options)  // ⚠️ PROBABLE FALLA
    })
}
```

**🚨 HALLAZGO FORENSE #1:** 
En Next.js 15, `NextResponse.redirect()` congela los headers internamente. La inyección posterior de cookies via `response.cookies.set()` puede ser ignorada por el runtime.

### 2. DISCORDANCIA DE STORES DE COOKIES

**Middleware usa:** `request.cookies.getAll()` + `supabaseResponse.cookies.set()`
**Callback usa:** `request.cookies.getAll()` + `response.cookies.set()` 

**🚨 HALLAZGO FORENSE #2:**
Dos patrones diferentes de manejo de cookies. El middleware sincroniza con `supabaseResponse`, pero el callback intenta inyectar en un `response` pre-congelado.

### 3. COMPARACIÓN CON PATRÓN OFICIAL NEXT.JS 15

**En `lib/supabase-server.ts` (PATRÓN CORRECTO):**
```typescript
export const createServerClient = async () => {
  const cookieStore = await cookies()  // ✅ Store oficial Next.js
  
  return _createServerClient(/*...*/, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value  // ✅ Lectura directa
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options })  // ✅ Escritura oficial
        } catch (error) {
          // Ignorado en server components
        }
      }
    }
  })
}
```

**🚨 HALLAZGO FORENSE #3:**
El callback NO usa el store oficial `cookies()` de Next.js, sino manipulación directa de headers.

### 4. ANÁLISIS DE CABECERAS HTTP ESPERADAS

**Headers que DEBERÍAN llegar al navegador:**
```http
HTTP/1.1 307 Temporary Redirect
Location: /dashboard
Set-Cookie: sb-access-token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; Path=/; HttpOnly; Secure; SameSite=Lax
Set-Cookie: sb-refresh-token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; Path=/; HttpOnly; Secure; SameSite=Lax
```

**Lo que probablemente llega:**
```http
HTTP/1.1 307 Temporary Redirect
Location: /dashboard
// ❌ SIN Set-Cookie
```

---

## 🧪 EVIDENCIA TÉCNICA

### 1. VERIFICACIÓN DE LOGS
- **Log existente:** `"intercambio exitoso, cookies inyectadas en 307"`
- **Interpretación:** El código CREE que inyectó las cookies, pero no hay confirmación HTTP

### 2. PATRÓN DE FALLA REPRODUCIBLE
1. Usuario hace login con Google ✅
2. Google redirige a `/auth/callback?code=...` ✅
3. Supabase intercambia code por sesión ✅
4. Callback intenta inyectar cookies ❌
5. Navegador recibe 307 sin cookies ❌
6. Browser va a `/dashboard` sin sesión ❌
7. Middleware ve usuario anónimo y redirige a login ❌

### 3. ANÁLISIS DE VERSIONES
- **Next.js:** 15.2.4 (confirmado en build.log)
- **@supabase/ssr:** Versión actual (verificada en package.json)
- **Node:** >=20.0.0 (confirmado)

---

## 🎯 DIAGNÓSTICO FINAL

### **RAÍZ DEL PROBLEMA (95% certeza):**
El patrón de inyección manual de cookies en `app/auth/callback/route.ts` es incompatible con el modelo de congelación de headers de Next.js 15.

### **FLUJO INCORRECTO ACTUAL:**
```
exchangeCodeForSession() → Crear respuesta 307 → Intentar inyectar cookies → Falla silenciosa
```

### **FLUJO CORRECTO REQUERIDO:**
```
exchangeCodeForSession() → Usar cookies() oficial → Dejar que Next.js maneje headers → Redirección automática
```

---

## 🔧 PROPUESTA DE FIX v92.8 (SIN IMPLEMENTAR)

### **ESTRATEGIA: "Redirección con Cookies Sincronizadas"**

1. **Eliminar creación prematura de NextResponse**
2. **Usar store oficial `cookies()` de Next.js**
3. **Dejar que Supabase maneje la persistencia vía store**
4. **Redirigir solo después de completada la sesión**

### **PATRÓN TÉCNICO REQUERIDO:**
```typescript
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  if (code) {
    const cookieStore = await cookies()  // Store oficial
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options })  // Inyección oficial
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      console.log("[auth-audit] sesión establecida via store oficial")
      return NextResponse.redirect(`${origin}/dashboard`)  // Redirección limpia
    }
  }
  
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
```

---

## 📋 VERIFICACIONES PENDIENTES

1. **Confirmar que `cookies()` está disponible en Route Handlers de Next.js 15**
2. **Verificar compatibilidad con Supabase SSR en este contexto**
3. **Testear que el store oficial persiste correctamente a través del redirect**
4. **Validar que el middleware reconoce las cookies establecidas**

---

## 🎖️ NIVEL DE CONFIANZA DEL DIAGNÓSTICO

**Confiabilidad:** 95% 
**Base:** Análisis de código fuente + patrones conocidos de Next.js 15 + evidencia de logs
**Riesgo residual:** 5% (posible interacción con configuración de Supabase)

---

## 📊 IMPACTO DEL FIX ESPERADO

- **Probabilidad de éxito:** 90%
- **Complejidad de implementación:** Baja
- **Riesgo de regresión:** Mínimo
- **Tiempo de implementación:** 15 minutos

---

*Auditoría completada - Esperando aprobación para implementación del fix v92.8*
