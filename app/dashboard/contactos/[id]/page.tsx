"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileEdit, Phone, Mail, Building, User, Home, FileText, Loader2 } from "lucide-react"
import { DeleteContacto } from "@/components/delete-contacto"
import { createBrowserSupabaseClient } from "@/lib/supabase-client"

export default function ContactoDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userDetails, setUserDetails] = useState<any>(null)
  const [contacto, setContacto] = useState<any>(null)
  const [administradores, setAdministradores] = useState<any[]>([])
  const [edificios, setEdificios] = useState<any[]>([])
  const [departamentos, setDepartamentos] = useState<any[]>([])
  const [tareas, setTareas] = useState<any[]>([])
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Verificar sesión de usuario
        const sessionResponse = await supabase.auth.getSession()
        const session = sessionResponse.data.session
        if (!session) {
          router.push('/login')
          return
        }
        
        // Obtener detalles del usuario
        const userResponse = await supabase
          .from("usuarios")
          .select("*")
          .eq("id", session.user.id)
          .single()
          
        const userData = userResponse.data
        const userError = userResponse.error

        if (userError || !userData) {
          router.push('/login')
          return
        }
        
        setUserDetails(userData)
        
        // Obtener detalles del contacto
        const contactoResponse = await supabase
          .from("contactos")
          .select("*")
          .eq("id", params.id)
          .single()

        const contactoData = contactoResponse.data
        const contactoError = contactoResponse.error

        if (contactoError || !contactoData) {
          console.error("Error fetching contacto:", contactoError)
          setError("No se pudo cargar la información del contacto")
          return
        }
        
        setContacto(contactoData)
        
        // Fetch related data individually para un mejor manejo de tipos
        const admResult = await supabase.from("administradores").select("id, nombre")
        const edifResult = await supabase.from("edificios").select("id, nombre")
        const deptResult = await supabase.from("departamentos").select("id, nombre")
        const tareasResult = await supabase.from("tareas").select("*").eq("id_contacto", params.id)
        
        setAdministradores(admResult.data || [])
        setEdificios(edifResult.data || [])
        setDepartamentos(deptResult.data || [])
        setTareas(tareasResult.data || [])
        
      } catch (err) {
        console.error("Error inesperado:", err)
        setError("Ocurrió un error al cargar la información")
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [params.id, router, supabase])

  // Get parent name based on tipo_padre and id_padre
  const getParentName = (tipo: string, id: number) => {
    switch (tipo) {
      case "administrador":
        return administradores?.find((a) => a.id === id)?.nombre || "Desconocido"
      case "edificio":
        return edificios?.find((e) => e.id === id)?.nombre || "Desconocido"
      case "departamento":
        return departamentos?.find((d) => d.id === id)?.nombre || "Desconocido"
      default:
        return "Desconocido"
    }
  }

  // Get icon based on tipo_padre
  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case "administrador":
        return <User className="h-5 w-5" />
      case "edificio":
        return <Building className="h-5 w-5" />
      case "departamento":
        return <Home className="h-5 w-5" />
      default:
        return <User className="h-5 w-5" />
    }
  }

  const canEdit = userDetails?.rol === "admin" || userDetails?.rol === "supervisor"
  
  if (loading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando detalle del contacto...</p>
        </div>
      </div>
    )
  }
  
  if (error || !contacto) {
    return (
      <div className="container mx-auto py-6">
        <div className="rounded-md bg-destructive/15 p-4 text-center">
          <p className="text-destructive">{error || "No se pudo cargar la información del contacto"}</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push('/dashboard/contactos')}>
            Volver a contactos
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{contacto.nombre}</h1>
          <p className="text-muted-foreground">{contacto.code}</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => router.push('/dashboard/contactos')}>
            Volver
          </Button>
          {canEdit && (
            <>
              <Button onClick={() => router.push(`/dashboard/contactos/${contacto.id}/editar`)}>
                <FileEdit className="mr-2 h-4 w-4" />
                Editar
              </Button>
              <DeleteContacto contactoId={contacto.id} contactoNombre={contacto.nombre} />
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Información de Contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Teléfono:</span>
              <span>{contacto.telefono}</span>
            </div>
            {contacto.email && (
              <div className="flex items-center space-x-2">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Email:</span>
                <span>{contacto.email}</span>
              </div>
            )}
            <div className="flex items-center space-x-2">
              {getTipoIcon(contacto.tipo_padre)}
              <span className="font-medium">Entidad:</span>
              <span>
                {contacto.tipo_padre.charAt(0).toUpperCase() + contacto.tipo_padre.slice(1)}:{" "}
                {getParentName(contacto.tipo_padre, contacto.id_padre)}
              </span>
            </div>
            {contacto.notas && (
              <div className="mt-4">
                <h3 className="mb-2 font-medium">Notas:</h3>
                <p className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">{contacto.notas}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tareas Relacionadas</CardTitle>
            <CardDescription>Tareas asociadas a este contacto</CardDescription>
          </CardHeader>
          <CardContent>
            {tareas && tareas.length > 0 ? (
              <ul className="space-y-2">
                {tareas.map((tarea) => (
                  <li key={tarea.id} className="rounded-md border p-3">
                    <Link
                      href={`/dashboard/tareas/${tarea.id}`}
                      className="flex items-center space-x-2 hover:underline"
                    >
                      <FileText className="h-4 w-4" />
                      <span>{tarea.titulo}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">No hay tareas asociadas a este contacto.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
