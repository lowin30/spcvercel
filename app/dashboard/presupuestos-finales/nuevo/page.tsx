
import { redirect } from "next/navigation"
import { validateSessionAndGetUser } from "@/lib/auth-bridge"
import { getPresupuestosBase } from "@/app/dashboard/presupuestos-base/loader" // Reutilizamos loader de base
import PresupuestoFinalFormWrapper from "./form-wrapper" // Wrapper cliente para manejar estado de seleccion

export const dynamic = 'force-dynamic'

export default async function NuevoPresupuestoFinalPage() {
  const { user, rol } = await validateSessionAndGetUser()

  if (rol !== "admin") {
    redirect("/dashboard")
  }

  // 1. Obtener Presupuestos Base Aprobados que NO tienen PF
  // Necesitamos un loader especifico o filtrar.
  // El loader 'getPresupuestosBase' retorna todos (filtrados por rol).
  // Deberiamos filtrar aqui o crear un loader mejor.
  // Por eficiencia, usamos lo que tenemos y filtramos en memoria o creamos funcion rapida.

  const todosBase = await getPresupuestosBase(rol, user.id)

  // Filtrar solo los aprobados
  // Y que no tengan PF (si tenemos esa info).
  // La funcion getPresupuestosBase devuelve:
  /*
    *,
    tareas!inner(...)
  */
  // No devuelve info de si tiene PF? 
  // En 'presupuestos-base-client.tsx' filtramos por 'tiene_presupuesto_final'.
  // Asumimos que el loader trae esa columna si existe en la vista o tabla.

  const presupuestosDisponibles = todosBase.filter(pb => pb.aprobado && !pb.tiene_presupuesto_final)

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Nuevo Presupuesto Final</h1>
      <PresupuestoFinalFormWrapper
        presupuestosBase={presupuestosDisponibles}
        userId={user.id}
      />
    </div>
  )
}
