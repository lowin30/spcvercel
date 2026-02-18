import { Suspense } from "react"
import { getPresupuestosFinales } from "./loader"
import { validateSessionAndGetUser } from "@/lib/auth-bridge"
import { redirect } from "next/navigation"
import PresupuestosFinalesClient from "./presupuestos-finales-client"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Presupuestos Finales | Panel Admin",
}

export const dynamic = 'force-dynamic'

export default async function PresupuestosFinalesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  // 1. Seguridad: Solo Admin/Supervisor (Bridge Protocol)
  const user = await validateSessionAndGetUser()
  const { rol } = user

  if (rol !== 'admin' && rol !== 'supervisor') {
    redirect("/dashboard")
  }

  // 2. Obtención de Datos Segura (Server-Side)
  // El loader usa supabaseAdmin internamente para saltar RLS
  const queryParams = await searchParams
  const presupuestos = await getPresupuestosFinales(rol, user.id)

  // 3. Renderizado
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Presupuestos Finales</h2>
      </div>

      <div className="flex-1 flex-col space-y-8 flex">
        <Suspense fallback={
          <div className="flex items-center justify-center p-12">
            <div className="text-muted-foreground animate-pulse">Cargando presupuestos...</div>
          </div>
        }>
          {/* Pasamos los datos seguros al cliente */}
          <PresupuestosFinalesClient
            initialData={presupuestos}
            userRol={rol}
          />
        </Suspense>
      </div>
    </div>
  )
}
