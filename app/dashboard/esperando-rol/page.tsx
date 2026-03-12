export const dynamic = 'force-dynamic';

import { getvaliduser, createServerClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { LogOut } from "lucide-react"

export default async function EsperandoRolPage() {
  const { user } = await getvaliduser()

  if (!user) {
    redirect("/login")
  }

  const supabase = await createServerClient()

  // verificar si el usuario ya tiene un rol asignado
  const { data: userDetails } = await supabase.from("usuarios").select("rol").eq("id", user.id).single()

  // si el usuario ya tiene un rol diferente a "sin_rol", redirigir al dashboard
  if (userDetails && userDetails.rol !== "sin_rol") {
    redirect("/dashboard")
  }

  // funcion para cerrar sesion (se ejecutara en el cliente)
  async function handleSignOut() {
    "use server"
    const supabase = await createServerClient()
    await supabase.auth.signOut()
    redirect("/login")
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">esperando asignacion de rol</CardTitle>
          <CardDescription>
            tu cuenta ha sido creada correctamente, pero aun no tienes un rol asignado en el sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            por favor, contacta al administrador del sistema para que te asigne un rol. una vez que tengas un rol
            asignado, podras acceder al sistema.
          </p>
        </CardContent>
        <CardFooter>
          <form action={handleSignOut}>
            <Button type="submit" variant="outline" className="w-full">
              <LogOut className="mr-2 h-4 w-4" />
              cerrar sesion
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  )
}
