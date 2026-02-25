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
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  const user = await validateSessionAndGetUser();

  // 1. Validar Usuario (Service Role bypass auth check)
  if (user.rol !== "supervisor" && user.rol !== "admin") {
    redirect('/dashboard')
  }

  // 2. Cargar Datos usando Loader (Service Role bypass)
  const data = await getPresupuestoBaseEditData(id, user.id, user.rol)

  if (!data) {
    // Si loader devuelve null, es 404 o no autorizado (ownership check falló)
    redirect('/dashboard/presupuestos-base')
  }

  const { presupuesto, tareas } = data

  // 3. Regla de Edición: Solo admin edita todo. Supervisor solo edita si está 'pendiente'.
  const isReadOnly = user.rol === "supervisor" && presupuesto.estado_operativo !== 'pendiente'

  return (
    <div className="space-y-6 container mx-auto py-6">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/dashboard/presupuestos-base`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Editar Presupuesto Base: {presupuesto.code}</h1>
      </div>

      {isReadOnly && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-4">
          <p className="text-yellow-700">
            <strong>Aviso:</strong> Este presupuesto se encuentra en estado <strong>{presupuesto.estado_operativo}</strong> y no puede ser modificado por supervisores.
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Detalles del Presupuesto</CardTitle>
        </CardHeader>
        <CardContent>
          <PresupuestoBaseForm
            tareas={tareas}
            userId={user.id}
            presupuesto={presupuesto}
            isReadOnly={isReadOnly}
          />
        </CardContent>
      </Card>
    </div>
  )
}
