import { getSession, getUserDetails } from "@/lib/supabase-server"
import { redirect } from "next/navigation"

// Esta página ahora redirige a la sección de configuración de trabajadores
export default async function ConfigurarTrabajadorRedirectPage() {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  const userDetails = await getUserDetails()

  // Solo admin puede configurar trabajadores
  if (userDetails?.rol !== "admin") {
    redirect("/dashboard")
  }
  
  // Redirigir a la nueva ubicación de configuración de trabajadores
  redirect("/dashboard/configuracion?tab=trabajadores")
}
