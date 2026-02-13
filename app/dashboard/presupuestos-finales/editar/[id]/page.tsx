
import { validateSessionAndGetUser } from "@/lib/auth-bridge"
import { getPresupuestoFinalConItems } from "../../loader"
import PresupuestoFinalForm from "@/components/presupuesto-final-form"
import { redirect } from "next/navigation"

export const dynamic = 'force-dynamic'

interface Props {
  params: {
    id: string
  }
}

export default async function EditarPresupuestoFinalPage({ params }: Props) {
  const user = await validateSessionAndGetUser()
  const { rol } = user
  const id = parseInt(params.id)

  if (isNaN(id)) {
    return <div>ID inválido</div>
  }

  if (rol !== 'admin') {
    // Solo Admin edita segun reglas nuevas, aunque loader permite supervisor ver.
    // Pero el form permite editar. Supervisor solo deberia ver detalle?
    // Asumimos que editar es solo admin.
    redirect("/dashboard")
  }

  const presupuestoFinal = await getPresupuestoFinalConItems(id)

  if (!presupuestoFinal) {
    return <div>Presupuesto no encontrado o no autorizado.</div>
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Editar Presupuesto Final: {presupuestoFinal.code}</h1>
      <PresupuestoFinalForm
        presupuestoFinal={presupuestoFinal}
        userId={user.id}
      />
    </div>
  )
}
