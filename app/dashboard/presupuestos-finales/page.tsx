import { Suspense } from "react"
import { getPresupuestosFinales, getKpisAdmin, getAdministradores, getEstadosPresupuestos, getPresupuestosCounts } from "./loader"
import { validateSessionAndGetUser } from "@/lib/auth-bridge"
import { redirect } from "next/navigation"
import PresupuestosFinalesClient from "./presupuestos-finales-client"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Presupuestos Finales | Panel Admin",
}

export default async function PresupuestosFinalesPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams
  // 1. Seguridad: Solo Admin/Supervisor (Bridge Protocol)
  const user = await validateSessionAndGetUser()
  const { rol } = user

  if (rol !== 'admin' && rol !== 'supervisor') {
    redirect("/dashboard")
  }

  // Preparar filtros desde la URL
  const filters = {
    search: searchParams.query as string,
    adminId: searchParams.adminId as string,
    edificioId: searchParams.edificioId as string,
    estado: searchParams.tab as string || 'todos',
  }

  // 2. Obtención de Datos Segura (Server-Side)
  // Se ejecuta en paralelo para máxima velocidad
  const [presupuestos, kpisData, administradores, estadosLookup, tabCounts] = await Promise.all([
    getPresupuestosFinales(rol, user.id, filters),
    getKpisAdmin(rol),
    getAdministradores(rol),
    getEstadosPresupuestos(),
    getPresupuestosCounts(rol, user.id, {
      search: filters.search,
      adminId: filters.adminId,
      edificioId: filters.edificioId,
    })
  ])

  // 3. Renderizado
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex-1 flex-col space-y-8 flex">
        <Suspense fallback={
          <div className="flex items-center justify-center p-12">
            <div className="text-muted-foreground animate-pulse">Cargando gestión de presupuestos...</div>
          </div>
        }>
          {/* Pasamos los datos seguros al cliente */}
          <PresupuestosFinalesClient
            initialData={presupuestos}
            kpisData={kpisData}
            administradores={administradores}
            estadosLookup={estadosLookup}
            tabCounts={tabCounts}
            userRol={rol}
            userDetails={user}
          />
        </Suspense>
      </div>
    </div>
  )
}
