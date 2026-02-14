import { validateSessionAndGetUser } from '@/lib/auth-bridge'
import { getPresupuestoBaseEditData } from './loader'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import PresupuestoBaseForm from "@/components/presupuesto-base-form"
import { redirect } from "next/navigation"

export default async function EditarPresupuestoBasePage({
  params
}: {
  params: { id: string }
}) {
  // 1. Validar Usuario (Service Role bypass auth check)
  const user = await validateSessionAndGetUser()

  if (user.rol !== "supervisor" && user.rol !== "admin") {
    // Si no es admin ni supervisor, fuera.
    redirect('/dashboard')
  }

  const { id } = params

  // 2. Cargar Datos usando Loader (Service Role bypass)
  const data = await getPresupuestoBaseEditData(id, user.id, user.rol)

  if (!data) {
    // Si loader devuelve null, es 404 o no autorizado (ownership check falló)
    redirect('/dashboard/presupuestos-base')
  }

  const { presupuesto, tareas } = data

  return (
    <div className="space-y-6 container mx-auto py-6">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/dashboard/presupuestos/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Editar Presupuesto Base: {presupuesto.codigo}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Editar Presupuesto Base</CardTitle>
        </CardHeader>
        <CardContent>
          <PresupuestoBaseForm
            tareas={tareas}
            userId={user.id}
            presupuesto={presupuesto} // Pasamos el presupuesto para modo edición
          />
        </CardContent>
      </Card>
    </div>
  )
}
