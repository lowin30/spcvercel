"use client"

import { useState, useEffect } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RegistroParteTrabajoForm } from '@/components/registro-parte-trabajo-form'
import { toast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

// Definición simplificada del usuario para esta página
interface UserSessionData {
  id: string
  rol: string
  // Puedes añadir más campos si son necesarios para el formulario
}

export default function RegistroGeneralPartesPage() {
  const [userDetails, setUserDetails] = useState<UserSessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserSupabaseClient()
  const router = useRouter()

  useEffect(() => {
    async function fetchUser() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError

        if (!session) {
          router.push('/login')
          return
        }

        const { data: userData, error: userError } = await supabase
          .from('usuarios')
          .select('id, rol')
          .eq('id', session.user.id)
          .single()

        if (userError) throw userError
        
        setUserDetails(userData)
      } catch (error: any) {
        console.error('Error al cargar datos de usuario:', error)
        toast({ title: 'Error', description: 'No se pudieron cargar los datos del usuario.', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [supabase, router])

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    )
  }

  if (!userDetails) {
    return (
      <div className="text-center p-8">
        <p>No se pudieron cargar los datos del usuario. Intenta recargar la página.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Registro General de Partes</h1>
        <p className="text-muted-foreground">
          Utiliza este formulario para registrar días o medios días de trabajo en cualquier tarea.
        </p>
      </div>

      <Card className="border shadow-md">
        <CardHeader>
          <CardTitle>Nuevo Parte de Trabajo</CardTitle>
        </CardHeader>
        <CardContent>
          <RegistroParteTrabajoForm
            usuarioActual={userDetails}
            onParteRegistrado={() => {
              toast({
                title: 'Éxito',
                description: 'Parte de trabajo registrado correctamente.',
                className: 'bg-green-100 text-green-800',
              })
              // En el futuro, aquí se podría recargar una lista de partes recientes.
            }}
          />
        </CardContent>
      </Card>

      {/*
        Aquí se podría añadir en el futuro un componente de historial 
        que liste los partes de trabajo registrados por el usuario,
        consultando la tabla 'partes_de_trabajo'.

        <Separator className="my-8" />
        <HistorialPartesTrabajo usuario={userDetails} />
      */}
    </div>
  )
}
