import { TaskWizard } from "@/components/tasks/task-wizard"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { getCatalogsForWizard } from "../loader"

export default async function NuevaTareaPage(props: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await props.searchParams
  const returnTo = typeof params?.returnTo === 'string' ? params.returnTo : undefined

  const { administradores, supervisores, trabajadores, currentUserRol, currentUserId } = await getCatalogsForWizard()

  // Note: Server Components don't have router.push. We use Link or client-side navigation in children.
  // The Wizard uses client-side router for success redirect.

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" size="sm" className="mr-2" asChild>
          <Link href={returnTo || "/dashboard/tareas"}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Nueva Tarea</h1>
      </div>

      <TaskWizard
        returnTo={returnTo}
        administradores={administradores}
        supervisores={supervisores}
        trabajadores={trabajadores}
        currentUserRol={currentUserRol || undefined}
        currentUserId={currentUserId || undefined}
      // onSuccess handled by Wizard default or we can pass a redirect action if needed (but Wizard uses router).
      />
    </div>
  )
}