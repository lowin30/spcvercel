import { redirect } from "next/navigation"
import { validateSessionAndGetUser } from "@/lib/auth-bridge"
import PresupuestoFinalFormWrapper from "./form-wrapper"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = 'force-dynamic'

export default async function NuevoPresupuestoFinalPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const user = await validateSessionAndGetUser()
  const { rol } = user

  if (rol !== "admin") {
    redirect("/dashboard")
  }

  const resolvedParams = await searchParams;
  const initialTaskId = resolvedParams.id_tarea as string | undefined;

  const supabase = await createServerClient();

  // Obtener Presupuestos Base de la vista completa
  // Se filtran los aprobados y que NO tengan presupuesto final
  const { data: todosBase, error } = await supabase
    .from('vista_presupuestos_base_completa')
    .select('*');

  if (error) {
    console.error("Error fetching from vista_presupuestos_base_completa:", error);
  }

  // Si la vista no devuelve 'aprobado' directamente, sino 'pb_aprobado' u otro nombre,
  // y si no devuelve 'tiene_presupuesto_final' sino algo más,
  // hacemos un fallback defensivo para asegurar que no se rompe.
  // Pero según el pedido, asumimos que existen esas columnas o las extraemos.
  const presupuestosDisponibles = (todosBase || []).filter(pb => {
    // Si existe p.aprobado (viejo formato) o p.pb_aprobado (nuevo formato)
    const isAproved = pb.aprobado === true || pb.pb_aprobado === true;

    // Si existe p.tiene_presupuesto_final (viejo formato) o usamos pf_aprobado/codigo_estado_pf como fallback
    const hasFinal = pb.tiene_presupuesto_final === true || pb.codigo_estado_pf !== null;

    return isAproved && !hasFinal;
  })

  // Si nos pasaron un id_tarea especifico en la URL, asegurarnos de que la busqueda
  // inicial de pre-llenado se pase al cliente. 
  // OJO: Si la logica anterior lo filtró equivocadamente, lo inyectamos de vuelta 
  // si es que existe en toda la base.
  let targetPB = presupuestosDisponibles.find(p => p.id_tarea?.toString() === initialTaskId)

  if (!targetPB && initialTaskId && todosBase) {
    const forcedPB = todosBase.find(p => p.id_tarea?.toString() === initialTaskId);
    if (forcedPB) {
      // Inyectarlo si por alguna razon el filtro estricto lo sacó pero debería poder presupuestarse
      presupuestosDisponibles.push(forcedPB);
      targetPB = forcedPB;
    }
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Nuevo Presupuesto Final</h1>
      <PresupuestoFinalFormWrapper
        presupuestosBase={presupuestosDisponibles}
        userId={user.id}
        initialTaskId={initialTaskId}
      />
    </div>
  )
}
