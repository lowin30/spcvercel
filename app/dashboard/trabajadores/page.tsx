import { redirect } from "next/navigation"

export default function TrabajadoresPage() {
  // Redirigir a la página de configuración con la pestaña de trabajadores seleccionada
  redirect("/dashboard/configuracion?tab=trabajadores")
}
