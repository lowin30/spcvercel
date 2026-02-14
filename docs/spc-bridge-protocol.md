# spc protocol v81.0: the gold standard (bridge protocol)

**estado**: activo / obligatorio
**contexto**: post-mortem refactor financiero (febrero 2026)
**objetivo**: estandarizar el refactor de rutas legacy (edificios, departamentos, liquidaciones) para eliminar inestabilidad de descope + rls.

---

## 1. analisis de fallos (prohibido repetir)

### a. client-side fetching (el error original)
el uso de `useeffect` + `createclient()` en el navegador es la causa raiz de la inestabilidad.
- **falla**: descope y supabase rls no sincronizan tokens instantaneamentes.
- **sintoma**: usuarios validos reciben 403 o datos vacios aleatoriamente.
- **solucion**: el navegador debe **recibir** datos, nunca pedirlos (en carga inicial).

### b. rls-client dependency
depender de la "anon key" para datos criticos es inaceptable en el dashboard administrativo.
- **falla**: las politicas rls son complejas y fragiles ante race conditions de auth.
- **solucion**: usar `supabaseadmin` (service_role) en el servidor. el servidor valida al usuario, luego busca los datos con privilegios totales.

### c. legacy warnings (node 20+)
advertencias como `url.parse()` o `punycode` ensucian los logs y ocultan errores reales.
- **falla**: uso de sdks antiguos (ej. cloudinary v1/v2, pg via orm viejo).
- **solucion**: reemplazar sdks con `fetch` nativo estandar (web api) o actualizar a versiones modernizadas.

---

## 2. protocolo de ejecucion (el proceso)

para cada ruta a refactorizar, seguir estas fases en orden estricto:

### fase 0: auditoria de "cañeria"
identificar el componente enfermo.
- ¿usa `"use client"`?
- ¿usa `useeffect` para traer datos?
- ¿importa `createclient` de `@/lib/supabase-client`?
si si, es objetivo de refactor.

### fase 1: el puente (bridge/loader)
crear `loader.ts` en la misma carpeta de la ruta.
- **tool**: usar `supabaseadmin` del `@/lib/supabase-admin`.
- **input**: recibir ids o parametros necesarios.
- **output**: devolver datos planos y tipados (nada de `data?.data`).
- **try/catch**: manejo de errores robusto en el loader.

### fase 2: seguridad (gatekeeper)
convertir `page.tsx` a **server component**.
- **import**: `validateSessionAndGetUser` de `@/lib/auth-bridge`.
- **check**:
  ```typescript
  const user = await validateSessionAndGetUser()
  if (user.rol !== 'admin') { // o rol autorizado especifico
     redirect('/dashboard')
  }
  ```
- **fetch**: llamar al loader `await getLoaderData(id)`.

### fase 3: limpieza (clean)
- extraer ui a componente cliente (ej. `DetalleCliente.tsx`).
- pasar datos como props iniciales.
- borrar imports de `createclient` y `useEffect` del servidor.
- verificar consola: 0 warnings de deprecacion.

---

## 3. mandamientos tecnicos

1. **minusculas y sin acentos**: en codigo y docs tecnicos.
2. **rigor de dueño**: no dejar "todos", no dejar `any` innecesarios, no dejar logs basura.
3. **service role soberano**: el loader es la unica verdad. el cliente solo renderiza.
4. **fetch nativo**: ante duda de sdk, usar `fetch` estandar.

---

**firmado**: antigravity (ia) & jesus (operador)
**fecha**: febrero 2026
