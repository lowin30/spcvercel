"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"

export default function ActivarTrabajadorPage() {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  
  const activarTrabajador = async () => {
    setLoading(true)
    setMessage('Verificando trabajador...')
    
    try {
      const supabase = createClientComponentClient()
      
      // 1. Verificar si el usuario existe en la tabla usuarios
      const { data: usuario, error: errorUsuario } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', 'miretendencia@gmail.com')
        .single()
        
      if (errorUsuario || !usuario) {
        setMessage('Error: Usuario no encontrado con email miretendencia@gmail.com')
        setSuccess(false)
        return
      }
      
      setMessage(`Usuario encontrado: ${usuario.email} (ID: ${usuario.id})`)
      
      // 2. Verificar si existe una configuración para este trabajador
      const { data: configExistente, error: errorConfig } = await supabase
        .from('configuracion_trabajadores')
        .select('*')
        .eq('id_trabajador', usuario.id)
        .maybeSingle()
      
      // 3. Actualizar o crear la configuración
      if (configExistente) {
        // Actualizar configuración existente
        const { error: errorUpdate } = await supabase
          .from('configuracion_trabajadores')
          .update({ activo: true })
          .eq('id_trabajador', usuario.id)
          
        if (errorUpdate) {
          setMessage(`Error al activar trabajador: ${errorUpdate.message}`)
          setSuccess(false)
          return
        }
        
        setMessage(`¡Éxito! Trabajador ${usuario.email} activado correctamente. Ya existía configuración.`)
        setSuccess(true)
      } else {
        // Crear nueva configuración
        const { error: errorInsert } = await supabase
          .from('configuracion_trabajadores')
          .insert({
            id_trabajador: usuario.id,
            salario_diario: 35000, // Valor por defecto
            activo: true
          })
          
        if (errorInsert) {
          setMessage(`Error al crear configuración: ${errorInsert.message}`)
          setSuccess(false)
          return
        }
        
        setMessage(`¡Éxito! Trabajador ${usuario.email} activado con nueva configuración.`)
        setSuccess(true)
      }
    } catch (error) {
      setMessage(`Error inesperado: ${error instanceof Error ? error.message : String(error)}`)
      setSuccess(false)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Activar Trabajador</h1>
        <p className="text-muted-foreground">Herramienta para activar trabajadores con problemas</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Activar Trabajador: miretendencia@gmail.com</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>Esta herramienta activará al trabajador con email: <strong>miretendencia@gmail.com</strong></p>
          <p>El problema ocurre porque este trabajador no tiene registro en la tabla <code>configuracion_trabajadores</code> o está marcado como inactivo.</p>
          
          <div className="flex gap-2">
            <Button 
              onClick={activarTrabajador}
              disabled={loading || success}
            >
              {loading ? "Activando..." : success ? "Activado" : "Activar Trabajador"}
            </Button>
            
            {success && (
              <Button variant="outline" onClick={() => router.push('/dashboard/trabajadores')}>
                Volver a Trabajadores
              </Button>
            )}
          </div>
          
          {message && (
            <div className={`p-4 mt-4 rounded-md ${success ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
              {message}
            </div>
          )}
          
          {success && (
            <div className="bg-green-100 p-4 rounded-md text-green-800">
              <p className="font-bold">¡Trabajador activado correctamente!</p>
              <p>Ahora el trabajador debería aparecer como "Activo" y estar disponible para asignación en tareas.</p>
              <p className="text-sm mt-2">Nota: Si el problema persiste, puede haber un problema adicional de permisos en Supabase RLS.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
