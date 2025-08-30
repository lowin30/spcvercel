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
