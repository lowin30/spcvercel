import { validateSessionAndGetUser } from "@/lib/auth-bridge"
import { redirect } from "next/navigation"

export const dynamic = 'force-dynamic'
// esta pagina ahora redirige a la seccion de configuracion de trabajadores
export default async function ConfigurarTrabajadorRedirectPage() {
  const user = await validateSessionAndGetUser()

  // solo admin puede configurar trabajadores
  if (user.rol !== "admin") {
    redirect("/dashboard")
  }

  // redirigir a la nueva ubicacion de configuracion de trabajadores
  redirect("/dashboard/configuracion?tab=trabajadores")
}
