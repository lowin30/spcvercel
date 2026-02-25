import { validateSessionAndGetUser } from "@/lib/auth-bridge"
import { redirect } from "next/navigation"
import { getConfiguracionData } from "./loader"
import ConfiguracionPageClient from "./configuracion-page-client"

/**
 * CONFIGURACIÓN PAGE v106.0 (Server-Side Data Loading)
 * Server Component que:
 * 1. Valida la sesión (Gatekeeper de Descope)
 * 2. Precarga TODOS los datos con supabaseAdmin (bypasea RLS)
 * 3. Pasa los datos precargados al Client Component
 */
export default async function ConfiguracionPage() {
  // 1. EL GATEKEEPER (Bridge Protocol)
  const user = await validateSessionAndGetUser()

  // 2. RECHAZO INMEDIATO
  if (user.rol !== 'admin') {
    console.warn(`[GATEKEEPER] Acceso denegado a Configuración para ${user.email} (Rol: ${user.rol})`)
    redirect("/dashboard?error=acceso_denegado_configuracion")
  }

  // 3. PRECARGA DE DATOS (Server-Side con Service Role)
  const {
    trabajadores,
    combinedUsers,
    productos,
    categorias,
    administradores,
    estadosTareas,
    estadosPresupuestos,
    estadosFacturas,
  } = await getConfiguracionData()

  // 4. PASE VIP con datos precargados
  return (
    <ConfiguracionPageClient
      user={user}
      trabajadores={trabajadores}
      combinedUsers={combinedUsers}
      productos={productos}
      categorias={categorias}
      administradores={administradores}
      estadosTareas={estadosTareas}
      estadosPresupuestos={estadosPresupuestos}
      estadosFacturas={estadosFacturas}
    />
  )
}
