# Guía Definitiva de Diagnóstico y Solución de Errores en Next.js y Supabase (SPC)

## Introducción

Este documento es una guía de referencia consolidada que unifica el conocimiento adquirido durante la resolución de problemas complejos en la aplicación SPC. Su propósito es servir como un manual práctico para diagnosticar y solucionar errores comunes y avanzados relacionados con Next.js (App Router), la gestión de estado, y la interacción con Supabase.

--- 

## Sección 1: Errores de Renderizado y Acceso a Datos en Componentes

### 1.1. Error Crítico: `params` debe ser esperado (`await`) en Rutas Dinámicas

- **Síntoma**: Al navegar a una página dinámica (ej. `/facturas/[id]`), la aplicación falla con un error en el servidor:
  ```
  Server Error: Route "/dashboard/facturas/[id]" used `params.id`. `params` should be awaited before using its properties.
  ```
- **Causa Raíz**: Desde Next.js 13.4, en los **Componentes de Servidor (`async function`)**, el objeto `params` que contiene los segmentos dinámicos de la URL ya no es un objeto síncrono, sino una `Promise`. Acceder a sus propiedades directamente (`params.id`) sin usar `await` causa un error.
- **Solución**: Siempre se debe usar `await` sobre el objeto `params` antes de acceder a sus propiedades.

  **Código Incorrecto ❌**
  ```typescript
  // en app/dashboard/facturas/[id]/page.tsx
  export default async function InvoicePage({ params }: { params: { id: string } }) {
    const facturaId = params.id; // ¡ERROR! Acceso síncrono
    // ...resto del código
  }
  ```

  **Código Correcto ✅**
  ```typescript
  // en app/dashboard/facturas/[id]/page.tsx
  export default async function InvoicePage({ params }: { params: { id: string } }) {
    const resolvedParams = await params; // Espera a que la Promise se resuelva
    const facturaId = resolvedParams.id;

    if (!facturaId) {
      notFound();
    }
    // ...resto del código
  }
  ```

### 1.2. Problema: Redirección Inesperada o Error en el Orden de los Hooks

- **Síntoma**: Una página falla al cargar, redirige inesperadamente, o muestra el error `"React has detected a change in the order of Hooks called"`.
- **Causa Raíz**: Generalmente ocurre por una mala conversión de un Componente de Servidor a Cliente. La lógica de redirección (`redirect()`) se ejecuta antes de que el cliente pueda renderizar, o los hooks de React (`useEffect`, `useState`) se llaman dentro de condiciones, violando las reglas de los Hooks.
- **Solución**: Adoptar un patrón de **Componente de Cliente moderno y robusto**.
  1.  **Declarar como Cliente**: `"use client"` al inicio del archivo.
  2.  **Usar Hooks de Navegación**: `useRouter` para navegar y `useParams` para obtener parámetros de la URL.
  3.  **Centralizar Lógica**: Mover toda la lógica de obtención de datos, validación y manejo de errores a un único `useEffect` para asegurar un orden de ejecución predecible.
  4.  **Gestionar Estados**: Usar `useState` para `loading`, `error` y los `data`.

--- 

## Sección 2: Problemas con el Cliente de Supabase

### 2.1. Warning: `Multiple GoTrueClient instances detected`

- **Síntoma**: La consola del navegador muestra una advertencia sobre múltiples instancias de `GoTrueClient`.
- **Causa Raíz**: Diferentes partes de la aplicación (componentes, helpers) crean su propia instancia del cliente de Supabase en el navegador, en lugar de compartir una única.
- **Solución (Patrón Singleton)**: Implementar un patrón singleton que garantice que solo se cree una instancia del cliente de Supabase en el contexto del navegador. 

  ```typescript
  // en lib/supabase-client.ts (o similar)
  import { createClient } from '@supabase/supabase-js'

  // Declarar una variable global para almacenar la instancia
  declare global {
    var __supabaseClient: SupabaseClientType | undefined
  }

  export function getSupabaseClient() {
    if (typeof window === 'undefined') {
      // En servidor, siempre crear una nueva instancia sin persistencia
      return createClient(...)
    }

    // En navegador, usar el singleton
    if (!globalThis.__supabaseClient) {
      globalThis.__supabaseClient = createClient(...)
    }
    return globalThis.__supabaseClient
  }
  ```
  Todos los componentes cliente deben usar `getSupabaseClient()` para obtener la instancia compartida.

### 2.2. Error Crítico: `Failed to parse cookie string` y Múltiples Instancias en Formularios

- **Síntoma**: Este error, junto con el warning de `GoTrueClient`, aparece frecuentemente en páginas con formularios que realizan mutaciones (crear/actualizar/eliminar datos).
- **Causa Raíz**: Un componente de formulario (`<InvoiceForm />`) crea su propia instancia de cliente Supabase en el navegador para enviar los datos. Esto entra en conflicto con la gestión de sesión y cookies del servidor, causando errores.
- **Solución Definitiva (Server Actions)**: Refactorizar el formulario para delegar toda la lógica de mutación a una **Server Action**. Esto elimina por completo la necesidad de un cliente Supabase en el navegador para operaciones de escritura.

  **Paso 1: Crear la Server Action**
  - En un archivo `actions.ts` junto a la página, crea una función asíncrona con la directiva `"use server"`.
  - Esta función recibe los datos del formulario, crea un **cliente de Supabase del lado del servidor** (`createSsrServerClient`), realiza las operaciones en la base de datos y devuelve un resultado.

    ```typescript
    // en app/dashboard/facturas/editar/[id]/actions.ts
    "use server"

    import { createSsrServerClient } from '@/lib/ssr-server';

---

## Sección 3: Resolución de Fallos Críticos de Build y Despliegue en Vercel

**Fecha:** 30 de Agosto, 2025

### 3.1. Resumen del Problema

La aplicación presentaba un fallo crítico y persistente: mientras que el comando `npm run build` se completaba con éxito en el entorno de desarrollo local, el despliegue en Vercel fallaba consistentemente. Los errores eran variados, desde `Module not found` hasta registros de error truncados e incomprensibles, lo que dificultaba enormemente el diagnóstico.

### 3.2. Proceso de Diagnóstico y Solución (Paso a Paso)

El camino hacia la solución no fue directo. Se exploraron varias hipótesis, algunas incorrectas, hasta dar con la causa raíz.

#### Etapa 1: Hipótesis Incorrecta - Problema de Alias de Ruta (`@/`)

- **Síntoma Inicial**: El `build` en Vercel arrojaba errores claros de `Module not found` para importaciones que utilizaban un alias, como `@/components/ui/button`.
- **Teoría**: Se pensó que el sistema de `build` de Vercel era incapaz de resolver las rutas con alias, a pesar de que funcionaban localmente.
- **Acción Tomada (Parche Incorrecto)**: Se procedió a modificar manualmente múltiples archivos, reemplazando cada alias de importación por su ruta relativa correspondiente (ej. `../../../../components/ui/button`).
  - **Archivos Modificados**: `app/dashboard/administradores/[id]/page.tsx`, `app/dashboard-bridge/page.tsx`, `app/dashboard/administradores/nuevo/page.tsx`, `app/dashboard/administradores/page.tsx`.
- **Resultado**: Este enfoque fracasó. Los errores persistieron y se volvieron más crípticos. Esto demostró que estábamos tratando un síntoma y no la enfermedad.

#### Etapa 2: Hipótesis Correcta - Configuración de Proyecto Incompleta

- **Descubrimiento Clave**: Se analizó por qué algunas páginas (como `contactos`) sí funcionaban con alias. La diferencia no estaba en los archivos, sino en la configuración del proyecto. El archivo `tsconfig.json` estaba correctamente configurado, lo que permitía que TypeScript y el editor de código (VS Code) resolvieran los alias. Sin embargo, **el empaquetador de Next.js (webpack) no lee este archivo para el `build`**.
- **Causa Raíz Verdadera**: El archivo de configuración de Next.js, `next.config.mjs`, carecía de la directiva para indicarle a webpack cómo resolver el alias `@/`.
- **Acción Tomada (Solución Definitiva)**:
  1.  **Modificar `next.config.mjs`**: Se añadió una configuración específica para `webpack` que mapea el alias `@` a la carpeta raíz del proyecto (`./`).
      ```javascript
      // en next.config.mjs
      import path from 'path';

      const nextConfig = {
        // ...otras configuraciones
        webpack: (config) => {
          config.resolve.alias['@'] = path.resolve('./');
          return config;
        },
      }
      ```
  2.  **Limpieza de Código**: Se revirtieron todos los cambios de rutas relativas realizados en la Etapa 1, restaurando el uso de alias en toda la aplicación para mantener un código limpio y consistente.
- **Resultado**: Tras estos cambios, el comando `npm run build` se ejecutó con éxito en el entorno local.

#### Etapa 3: Error Final de Despliegue - Dependencia Faltante en Vercel

- **Síntoma**: A pesar del éxito local, el nuevo despliegue en Vercel falló con un error diferente pero muy claro:
  ```
  It looks like you're trying to use TypeScript but do not have the required package(s) installed. Please install @types/node
  ```
- **Causa Raíz**: El paquete `@types/node`, esencial para proyectos TypeScript, no estaba listado como una dependencia en el archivo `package.json`. Aunque estuviera instalado en la máquina local, el entorno de `build` limpio de Vercel no lo incluía.
- **Acción Tomada (Ajuste Final)**: Se ejecutó el comando `pnpm install --save-dev @types/node`. Esto añadió el paquete a las `devDependencies` en `package.json`, asegurando que Vercel lo instale antes de ejecutar el `build`.
- **Resultado Final**: Un último `git push` a GitHub activó el despliegue final en Vercel, que se completó con éxito, sincronizando perfectamente el entorno de producción con el local.

### 3.3. Lecciones Aprendidas

1.  **Configuración Dual**: Un proyecto Next.js con TypeScript requiere que los alias de ruta se configuren en **dos lugares**: `tsconfig.json` (para el editor y el chequeo de tipos) y `next.config.mjs` (para el `build` de webpack).
2.  **No Confiar en el Build Local**: Un `build` local exitoso no garantiza un despliegue exitoso. Los entornos de producción como Vercel son limpios y solo instalan lo que está explícitamente definido en `package.json`.
3.  **Leer los Logs de Vercel**: Aunque a veces crípticos, los registros de `build` de Vercel son la fuente de verdad más importante para diagnosticar problemas de despliegue.
4.  **Atacar la Raíz, no el Síntoma**: Modificar archivos individualmente fue una pérdida de tiempo. La solución real siempre estuvo en el archivo de configuración central.

---

## Sección 4: Resolución de Problemas de Prerenderizado con Supabase en Vercel

**Fecha:** 9 de Septiembre, 2025

### 4.1. Resumen del Problema

La aplicación SPC utiliza Supabase para autenticación y acceso a datos, lo que genera un conflicto fundamental durante el despliegue en Vercel: Next.js intenta prerenderizar (generar estáticamente) páginas durante la compilación, pero estas páginas requieren acceso a Supabase y cookies que solo están disponibles en tiempo de ejecución.

**Síntomas observados:**

```
Error occurred prerendering page "/dashboard/liquidaciones".
Error: @supabase/ssr: Your project's URL and API key are required to create a Supabase client!
```

**Otros errores relacionados:**

```
Error: Dynamic server usage: Route /dashboard/esperando-rol couldn't be rendered statically because it used `cookies`.
Error: Invalid revalidate value "function(){...}" on "/dashboard", must be a non-negative number or false.
```

### 4.2. Diagnóstico Detallado del Problema

El proceso de build de Vercel y Next.js funciona en dos fases:

1. **Fase de compilación**: Next.js intenta prerenderizar todas las páginas posibles para generar HTML estático, lo que mejora el rendimiento y SEO.

2. **Fase de ejecución**: Cuando un usuario accede a la aplicación desplegada, se sirven las páginas prerenderizadas o se generan dinámicamente según sea necesario.

El conflicto ocurre porque:

- Las páginas del dashboard utilizan `createBrowserClient()` o `createServerClient()` de Supabase durante la fase de compilación.
- Estas funciones requieren las variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Aunque las variables estén configuradas en Vercel, no están disponibles durante la fase de compilación estática.
- Algunas rutas usan `cookies()` de Next.js, que tampoco está disponible durante la generación estática.

---

## Sección 5: Solución Definitiva para Operaciones Autenticadas en Server Actions (Pagos)

**Fecha:** 11 de Septiembre, 2025

### 5.1. Resumen del Problema Crítico

La funcionalidad para registrar pagos presentaba una serie de errores en cascada que impedían su funcionamiento y afectaban la integridad de los datos:

1.  **Violación de Políticas de Seguridad (RLS)**: El error más grave era `new row violates row-level security policy for table "pagos_facturas"`. Esto ocurría porque la Server Action se ejecutaba con la clave anónima (`anon_key`) de Supabase, actuando como un usuario anónimo sin permisos para escribir en la tabla, en lugar de hacerlo en nombre del usuario `admin` que había iniciado sesión.

2.  **Errores de Compilación y Sintaxis**: Los intentos de solucionar el problema principal introdujeron errores de sintaxis en `actions.ts`, como `Return statement is not allowed here`, que impedían que la aplicación compilara.

3.  **Mala Experiencia de Usuario (UX)**: Una vez que se logró registrar el pago, la redirección (`redirect()`) desde el servidor era abrupta, impidiendo mostrar un mensaje de éxito (`toast`) y creando una experiencia de usuario confusa.

4.  **Lógica de Negocio Incompleta**: El sistema permitía pagar facturas que ya estaban saldadas y, al realizar un pago, no actualizaba el `saldo_pendiente` ni el estado de la factura principal.

### 5.2. Proceso de Diagnóstico y Solución (Arquitectura Robusta)

La solución no fue un simple parche, sino una refactorización completa para adoptar el patrón arquitectónico correcto y recomendado por Supabase y Next.js para aplicaciones modernas.

#### Etapa 1: Implementación del Cliente de Servidor Autenticado con `@supabase/ssr`

-   **Causa Raíz Identificada**: El problema fundamental era la falta de un cliente de Supabase en el servidor que fuera consciente de la sesión del usuario.
-   **Acción Tomada (La Solución Correcta)**:
    1.  Se creó un nuevo archivo en **`lib/supabase/server.ts`**. Este archivo exporta una función `createSupabaseServerClient`.
    2.  Esta función utiliza `createServerClient` de la librería `@supabase/ssr` y `cookies` de `next/headers` para construir un cliente de Supabase que **hereda la sesión de autenticación del usuario que realiza la petición**.

    ```typescript
    // en lib/supabase/server.ts
    import { createServerClient } from '@supabase/ssr';
    import { cookies } from 'next/headers';

    export const createSupabaseServerClient = async () => {
      const cookieStore = await cookies();
      // ...lógica para pasar las cookies al cliente
      return createServerClient(...);
    };
    ```

#### Etapa 2: Refactorización de las Server Actions

-   **Acción Tomada**: Se crearon archivos de acción dedicados y se refactorizó la lógica para usar el nuevo cliente de servidor.
    1.  **Creación de Pagos (`crear-pago.ts`)**: La función `createPayment` ahora llama a `await createSupabaseServerClient()`. Esto le otorga un cliente Supabase que actúa como el usuario `admin` logueado. Como resultado, la inserción en `pagos_facturas` ahora cumple con las políticas de RLS y se ejecuta con éxito.
    2.  **Eliminación de Pagos (`borrar-pago.ts`)**: Se creó una nueva acción `deletePayment` que también utiliza este cliente autenticado, permitiendo eliminar pagos de forma segura.

#### Etapa 3: Mejora de la Experiencia de Usuario (UX)

-   **Acción Tomada**: Se modificó el flujo de comunicación entre el servidor y el cliente.
    1.  **Se eliminó `redirect()` de la Server Action**: En lugar de una redirección abrupta, la acción `createPayment` ahora devuelve un objeto de estado de éxito, como `{ success: true, message: 'Pago registrado...' }`.
    2.  **Se actualizó el Componente Cliente (`PaymentForm.tsx`)**: El `useEffect` en el formulario ahora escucha este estado de `success`. Al recibirlo, muestra un `toast` de éxito y, después de un breve retraso, utiliza el `router` del cliente para redirigir suavemente al usuario a `/dashboard/facturas`.

#### Etapa 4: Implementación de la Lógica de Negocio Faltante

-   **Acción Tomada**: Se completó la funcionalidad para que el sistema sea robusto.
    1.  **Actualización de Facturas**: Dentro de `createPayment`, después de registrar el pago, se añadió lógica para recalcular el `total_pagado` y `saldo_pendiente` de la factura y actualizar su estado a "Parcialmente Pagado" o "Pagado".
    2.  **Prevención de Pagos Excesivos**: Se añadió una validación al inicio de `createPayment` que comprueba si el `saldo_pendiente` de la factura ya es cero. Si es así, la acción se detiene y devuelve un error, impidiendo pagos innecesarios.

### 5.3. Lecciones Aprendidas y Estado Final

1.  **La Autenticación en Server Actions es Clave**: Cualquier operación de escritura (INSERT, UPDATE, DELETE) en una Server Action debe realizarse con un cliente de Supabase que represente al usuario autenticado, no con la clave anónima. La librería `@supabase/ssr` es la herramienta canónica para lograr esto.
2.  **La UX es Responsabilidad del Cliente**: Las redirecciones y notificaciones al usuario deben gestionarse en el componente cliente para una experiencia fluida. El servidor debe limitarse a realizar la operación y devolver un estado claro (éxito o error).
3.  **Las Acciones Deben Ser Atómicas**: Una acción como "crear pago" debe ser responsable de todo el ciclo de vida de la operación, incluyendo la actualización de tablas relacionadas (como el saldo de la factura).

**Estado Final**: El sistema de pagos ahora es seguro, robusto y ofrece una experiencia de usuario profesional. Cumple con las políticas de RLS, previene errores de datos y proporciona feedback claro al usuario.

### 4.3. Soluciones Implementadas

#### Solución 1: Asegurar Valores Predeterminados para Cliente Supabase

```typescript
// lib/supabase-singleton.ts
function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || supabaseAnonKey
  );
}
```

Esta solución utiliza los valores hardcodeados cuando las variables de entorno no están disponibles, pero no resuelve completamente el problema porque la generación estática sigue intentándose.

#### Solución 2: Deshabilitar la Generación Estática en Next.js (SOLUCIÓN DEFINITIVA)

```javascript
// next.config.mjs
const nextConfig = {
  // Otras configuraciones...
  output: 'standalone',
  // Deshabilitar la generación estática
  experimental: {
    // Configuraciones existentes
    externalDir: true,
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
  }
}
```

#### Solución 3: Configurar .npmrc para Compatibilidad

Para evitar problemas adicionales con paquetes que requieren versiones específicas de Node.js:

```
# .npmrc
engine-strict=false
auto-install-peers=true
legacy-peer-deps=true
```

### 4.4. Estrategia Recomendada para Futuros Desarrollos

Para mantener compatibilidad entre desarrollo local y Vercel, se recomienda seguir estos pasos cuando se creen nuevas páginas:

1. **Para páginas públicas** (sin autenticación, sin acceso a Supabase):
   - No requieren configuración especial.
   - Se beneficiarán de la generación estática automáticamente.

2. **Para páginas del dashboard** (con autenticación, con acceso a Supabase):
   - Añadir la directiva específica en cada página:
     ```typescript
     // Al inicio del archivo page.tsx
     export const dynamic = "force-dynamic";
     ```

3. **Para el proyecto completo** (preferido, ya implementado):
   - Mantener la configuración en `next.config.mjs` como está.
   - Esta opción es más mantenible y menos propensa a errores.

### 4.5. Verificación y Solución de Problemas

Si vuelven a aparecer errores de prerenderizado, verificar:

1. **Variables de entorno**: Confirmar que están configuradas en Vercel.

2. **Versión de Next.js**: Las soluciones pueden variar entre versiones. La solución actual está optimizada para Next.js 15.x.

3. **Paquetes incompatibles**: Remover o actualizar paquetes como `@capacitor/cli` que pueden causar problemas de compatibilidad con Node.js 18.x.

4. **Errores de `isrMemoryCacheSize`**: Si aparecen advertencias sobre esta propiedad, puede ser removida sin afectar la funcionalidad principal.

Recuerda que esta configuración prioriza la estabilidad y compatibilidad sobre la optimización de rendimiento mediante generación estática. Para sitios con mucho tráfico, podría ser beneficioso implementar una estrategia más granular en el futuro.

    export async function saveInvoice(data, items, facturaIdToEdit) {
      const supabase = await createSsrServerClient();
      try {
        // ...lógica para actualizar/insertar en la DB...
        return { success: true, message: 'Factura guardada.' };
      } catch (error) {
        return { success: false, message: `Error: ${error.message}` };
      }
    }
    ```

  **Paso 2: Refactorizar el Componente del Formulario**
  - Elimina cualquier creación de cliente Supabase del componente.
  - Modifica el componente para que reciba la Server Action como una prop (ej. `onSave`).
  - El manejador `onSubmit` ahora solo llama a esta prop.

    ```typescript
    // en components/invoice-form.tsx
    export function InvoiceForm({ onSave, ... }) {
      async function onSubmit(data) {
        const result = await onSave(data, items, factura?.id);
        if (result.success) toast.success(result.message);
        else toast.error(result.message);
      }
      // ...
    }
    ```

  **Paso 3: Conectar la Página, el Formulario y la Acción**
  - En el componente de la página (`page.tsx`), importa la Server Action y pásala como prop al formulario.

    ```typescript
    // en app/dashboard/facturas/editar/[id]/page.tsx
    import { InvoiceForm } from '@/components/invoice-form';
    import { saveInvoice } from './actions'; // Importar la Server Action

    export default async function EditarFacturaPage({ params }) {
      // ...obtener datos para el formulario...
      return <InvoiceForm onSave={saveInvoice} ... />

---

## Sección 4: Depuración de Funciones RPC de Supabase (Caso Práctico)

**Fecha:** 2025-09-02

### 4.1. Resumen del Problema

La página de Tareas, cuando se accedía con el filtro para "Crear Presupuesto Final" (`/dashboard/tareas?crear_presupuesto=true`), no funcionaba. El objetivo era mostrar únicamente las tareas que aún no tenían un presupuesto final asociado, pero el filtro fallaba y la página a veces se rompía.

### 4.2. Proceso de Diagnóstico y Solución en Cascada

Este fue un caso de estudio perfecto sobre cómo un error puede ocultar otro, requiriendo una depuración metódica desde el frontend (Next.js) hasta el backend (Supabase). La estrategia clave fue delegar la lógica de negocio a la base de datos mediante una función RPC y refinarla paso a paso.

#### Etapa 1: Ineficiencia y Error Lógico en el Frontend

- **Síntoma Inicial**: El filtro no funcionaba correctamente.
- **Causa Raíz**: La aplicación traía todas las tareas y luego intentaba filtrarlas en el código del cliente. Esto era ineficiente, lento y propenso a errores.
- **Solución Estratégica**: Se decidió crear una función en PostgreSQL (`get_tareas_sin_presupuesto_final`) para que la base de datos realizara el filtrado de forma nativa y devolviera solo los datos necesarios.

#### Etapa 2: Error de Renderizado en Frontend - `Cannot read properties of undefined`

- **Síntoma**: Después de implementar la llamada a la función RPC, la página crasheaba.
- **Causa Raíz**: La primera versión de la función RPC devolvía datos directamente de la tabla `tareas`, pero el componente de React esperaba campos de tablas relacionadas (como el nombre del estado en `tarea.estado.nombre`). Al no existir estos datos en la respuesta, el acceso a ellos (`undefined.nombre`) rompía la aplicación.
- **Solución**: Se mejoró la función SQL para que hiciera un `LEFT JOIN` con las tablas de `estados_tareas` y `edificios`, incluyendo así los nombres necesarios en la respuesta.

#### Etapa 3: Error de Base de Datos - `relation "estados" does not exist`

- **Síntoma**: La llamada a la función RPC fallaba con un error 404 (Not Found) en la red, y la consola del servidor de Vercel mostraba que la tabla `estados` no existía.
- **Causa Raíz**: Un simple pero crítico error de nomenclatura en la función SQL. La tabla correcta era `estados_tareas`, no `estados`.
- **Solución**: Se corrigió el `JOIN` en la función para que apuntara al nombre de tabla correcto.

#### Etapa 4: Error Final y Más Sutil - `structure of query does not match function result type`

- **Síntoma**: La llamada RPC seguía fallando, pero ahora con un error 400 (Bad Request). El mensaje de error detallado era: `Returned type character varying(50) does not match expected type text`.
- **Causa Raíz**: Este es un requisito estricto de PostgreSQL. La definición de nuestra función (`RETURNS TABLE ...`) prometía devolver columnas de tipo `text`, pero las columnas de las tablas originales (`estados_tareas.nombre`, `edificios.nombre`) eran de tipo `character varying(50)`. Para las funciones RPC, los tipos de datos deben coincidir **exactamente**.
- **Solución Definitiva**: Se modificó la consulta `SELECT` dentro de la función para **convertir explícitamente (`cast`)** los tipos de datos al que se esperaba, usando la sintaxis de PostgreSQL: `SELECT et.nombre::text, ed.nombre::text ...`.

### 4.3. Lecciones Aprendidas

1.  **Delegar a la Base de Datos**: Para filtros y operaciones complejas, mover la lógica a una función RPC de Supabase es más eficiente y robusto que manejarlo en el cliente.
2.  **Los Errores RPC son Informativos**: Los errores 400 o 404 de una llamada RPC no son genéricos. Siempre hay que revisar los logs del servidor (Vercel, o la consola de desarrollo local), ya que Supabase reenvía el mensaje de error real de la base de datos, que es muy descriptivo.
3.  **La Exactitud de Tipos en SQL es Crucial**: En las funciones de PostgreSQL, no basta con que los tipos de datos sean "compatibles" (como `varchar` y `text`). Deben ser **idénticos** a los definidos en la signatura `RETURNS TABLE`. El `casting` explícito (`::text`) es la herramienta para resolver esto.
    }
    ```

- **Ventajas de este enfoque**: Es la solución más moderna, segura y eficiente. Elimina errores de cookies, mejora la seguridad al no exponer lógica de DB al cliente, y reduce el código enviado al navegador.

--- 

## Sección 3: Guía de Consultas a la Base de Datos

### 3.1. Error: "Cannot find relationship between tables"

- **Problema**: Supabase falla al intentar hacer un `join` implícito en una consulta.
- **Solución (Patrón "Cargar y Enriquecer")**: En lugar de un `join` complejo, realiza consultas separadas y combina los resultados en tu código. 
  1.  Realiza la consulta a la tabla principal.
  2.  Extrae los IDs de referencia de los resultados.
  3.  Realiza una segunda consulta a la tabla relacionada usando `.in('id', ids)`.
  4.  Combina los dos conjuntos de datos en JavaScript.

### 3.2. Error: "Multiple GoTrueClient instances detected"

- **Problema**: Aparecen warnings en la consola del navegador: "Multiple GoTrueClient instances detected in the same browser context" y errores relacionados con el parseo de cookies ("Failed to parse cookie string: Unexpected token 'b', 'base64-eyJ'...").
- **Causa Raíz**: Crear múltiples instancias del cliente Supabase (`createClientComponentClient()`) en diferentes componentes dentro del mismo contexto del navegador, especialmente cuando hay componentes anidados o se usa el cliente tanto en componentes del servidor como del cliente.
- **Soluciones**:

  **Solución 1 (Pasando cliente como prop)**
  ```typescript
  // Componente padre
  const supabase = createClientComponentClient();
  return <ComponenteHijo supabase={supabase} />
  ```

  **Solución 2 (Usando un contexto)**
  ```typescript
  // Crear un contexto para el cliente Supabase
  const SupabaseContext = createContext(null);
  
  // Proveedor en un componente de alto nivel
  export function SupabaseProvider({ children }) {
    const supabase = createClientComponentClient();
    return (
      <SupabaseContext.Provider value={supabase}>
        {children}
      </SupabaseContext.Provider>
    );
  }
  
  // Hook para usar el cliente
  export function useSupabase() {
    return useContext(SupabaseContext);
  }
  ```

  **Solución 3 (RECOMENDADA: Server Actions)**
  
  Esta es la solución más robusta y evita por completo el problema eliminando la necesidad de crear clientes Supabase en el navegador:

  1. Crea un archivo de acciones del servidor para manejar operaciones de mutación:

  ```typescript
  // datos-afip-action.ts
  "use server"
  
  import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
  import { cookies } from "next/headers"
  import { revalidatePath } from "next/cache"
  
  export async function actualizarDatosAFIP(facturaId: string, nuevosDatos: string) {
    const supabase = createServerActionClient({ cookies })
    
    try {
      const { error } = await supabase
        .from("facturas")
        .update({ datos_afip: nuevosDatos })
        .eq("id", facturaId)
      
      if (error) throw error
      
      // Revalidar la página para actualizar la UI
      revalidatePath(`/dashboard/facturas/${facturaId}`)
      
      return { success: true, message: "Datos actualizados correctamente" }
    } catch (error: any) {
      return { success: false, message: error.message }
    }
  }
  ```

  2. En tu componente cliente, usa la acción del servidor directamente:

  ```typescript
  // componente-cliente.tsx
  "use client"
  
  import { actualizarDatosAFIP } from './datos-afip-action'
  
  export function MiComponente({ facturaId }) {
    const [valor, setValor] = useState("")
    
    const handleSubmit = async () => {
      const result = await actualizarDatosAFIP(facturaId, valor)
      if (result.success) {
        // Manejar éxito
      }
    }
    
    return (
      // ... interfaz de usuario
    )
  }
  ```

  Las ventajas de usar Server Actions incluyen:
  - Eliminación completa de problemas con múltiples clientes
  - Mejor seguridad (autenticación en el servidor)
  - Menos código JavaScript en el cliente
  - Estabilidad en el manejo de cookies y sesiones
