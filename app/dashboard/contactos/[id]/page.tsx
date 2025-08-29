import { createServerClient } from "@/lib/supabase-server"
import { notFound, redirect } from "next/navigation"
import { Suspense } from "react"
import ContactoDetailClient from "./contacto-detail-client"
import { Loader2 } from "lucide-react"



// Helper component for loading state
function LoadingSpinner() {
  return (
    <div className="flex h-[80vh] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Cargando detalle del contacto...</p>
      </div>
    </div>
  )
}

export default async function ContactoDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerClient()

  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData.session) {
    return redirect("/login")
  }

  const { data: userDetails } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", sessionData.session.user.id)
    .single()

  if (!userDetails) {
    return redirect("/login") // Or a more appropriate page
  }

  // Fetch all data in parallel
  const [contactoRes, tareasRes, adminsRes, edificiosRes, departamentosRes] = await Promise.all([
    supabase.from("contactos").select("*, id_padre(*)").eq("id", params.id).single(),
    supabase.from("tareas").select("id, titulo").eq("contacto_id", params.id),
    supabase.from("usuarios").select("id, nombre").eq("rol", "admin"),
    supabase.from("edificios").select("id, nombre"),
    supabase.from("departamentos").select("id, nombre"),
  ])

  // If the main contact is not found, show 404
  if (contactoRes.error || !contactoRes.data) {
    notFound()
  }

  const initialData = {
    contacto: contactoRes.data,
    tareas: tareasRes.data || [],
    admins: adminsRes.data || [],
    edificios: edificiosRes.data || [],
    departamentos: departamentosRes.data || [],
    userDetails,
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ContactoDetailClient initialData={initialData} />
    </Suspense>
  )
}
