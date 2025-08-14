import { getSession, createServerSupabase } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { LogOut } from "lucide-react"

export default async function EsperandoRolPage() {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  const supabase = createServerSupabase()

  // Verificar si el usuario ya tiene un rol asignado
  const { data: userDetails } = await supabase.from("usuarios").select("rol").eq("id", session.user.id).single()

  // Si el usuario ya tiene un rol diferente a "sin_rol", redirigir al dashboard
  if (userDetails && userDetails.rol !== "sin_rol") {
    redirect("/dashboard")
  }

  // Función para cerrar sesión (se ejecutará en el cliente)
  async function handleSignOut() {
    "use server"
    const supabase = createServerSupabase()
    await supabase.auth.signOut()
    redirect("/login")
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Esperando asignación de rol</CardTitle>
          <CardDescription>
            Tu cuenta ha sido creada correctamente, pero aún no tienes un rol asignado en el sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Por favor, contacta al administrador del sistema para que te asigne un rol. Una vez que tengas un rol
            asignado, podrás acceder al sistema.
          </p>
        </CardContent>
        <CardFooter>
          <form action={handleSignOut}>
            <Button type="submit" variant="outline" className="w-full">
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  )
}
