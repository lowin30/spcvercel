import { validateSessionAndGetUser } from "@/lib/auth-bridge"
import { redirect } from "next/navigation"
import { getPresupuestosBase } from "./loader"
import { PresupuestosBaseClient } from "./presupuestos-base-client"

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function PresupuestosBasePage({ searchParams }: PageProps) {
  // validacion de sesion (bridge protocol)
  const user = await validateSessionAndGetUser()

  // solo supervisores y admins pueden acceder
  if (user.rol !== 'supervisor' && user.rol !== 'admin') {
    redirect('/dashboard')
  }

  // obtener searchParams
  const params = await searchParams
  const q = typeof params.q === 'string' ? params.q : undefined
  const tab = typeof params.tab === 'string' ? params.tab : 'todas'

  // fetch data server-side
  const presupuestos = await getPresupuestosBase({
    rol: user.rol,
    userId: user.id,
    q,
    tab
  })

  return (
    <PresupuestosBaseClient
      presupuestos={presupuestos}
      userRole={user.rol}
      userId={user.id}
    />
  )
}
