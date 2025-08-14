"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { formatDate } from "@/lib/date-utils"
import { ClipboardList, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus, Receipt, Calendar } from "lucide-react"

export function WorkerDashboard({ userId }: { userId: string }) {
  const [tareasPendientes, setTareasPendientes] = useState<any[]>([])
  const [horasRegistradas, setHorasRegistradas] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    async function cargarDatos() {
      setIsLoading(true)

      // Cargar tareas asignadas al trabajador usando la vista optimizada
      // Usamos el campo trabajadores_emails de la vista que contiene todos los emails de trabajadores asignados
      const { data: tareas, error: tareasError } = await supabase
        .from("vista_tareas_completa")
        .select(
          `id, titulo, descripcion, estado_tarea, fecha_limite, created_at, trabajadores_emails`
        )
        // Buscamos el email del usuario actual en el array de emails de trabajadores
        // Usamos la función de PostgreSQL para buscar en arrays
        // Con ~ comprobamos si el array contiene el email del usuario actual
        .filter('trabajadores_emails', 'cs', `{${userId}}`)
        .order("created_at", { ascending: false })

      if (tareas && !tareasError) {
        // Filtramos las tareas que no estén completadas 
        // y transformamos los datos para mantener compatibilidad con el resto del componente
        const tareasFormateadas = tareas
          .filter(t => t.estado_tarea !== "completada")
          .map(t => ({
            id: t.id,
            titulo: t.titulo,
            descripcion: t.descripcion,
            estado: t.estado_tarea,
            fecha_limite: t.fecha_limite,
            created_at: t.created_at,
          }))

        setTareasPendientes(tareasFormateadas)
      }

      // Aquí podrías cargar otros datos relevantes para el trabajador
      // como horas registradas, materiales utilizados, etc.

      setIsLoading(false)
    }

    if (userId) {
      cargarDatos()
    }
  }, [userId, supabase])

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Mis Tareas Pendientes</CardTitle>
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando tareas...</p>
          ) : tareasPendientes.length > 0 ? (
            <div className="space-y-4">
              {tareasPendientes.slice(0, 5).map((tarea) => (
                <div key={tarea.id} className="flex items-start space-x-2">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-500"></div>
                  <div>
                    <p className="font-medium text-sm">{tarea.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {tarea.fecha_limite ? `Fecha límite: ${formatDate(tarea.fecha_limite)}` : "Sin fecha límite"}
                    </p>
                  </div>
                </div>
              ))}
              {tareasPendientes.length > 5 && (
                <p className="text-xs text-muted-foreground text-center">+ {tareasPendientes.length - 5} tareas más</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No tienes tareas pendientes</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Acciones Rápidas</CardTitle>
          <Plus className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Button asChild className="w-full justify-start" variant="outline">
              <Link href="/dashboard/trabajadores/registro-dias">
                <Calendar className="mr-2 h-4 w-4" />
                Registrar Días Trabajados
              </Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link href="/dashboard/trabajadores/gastos">
                <Receipt className="mr-2 h-4 w-4" />
                Registrar Gastos
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Mi Liquidación Semanal</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Días trabajados esta semana:</span>
              <span className="font-medium">4.5</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Salario base:</span>
              <span className="font-medium">$157,500</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Gastos reembolsados:</span>
              <span className="font-medium">$23,000</span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between font-medium">
                <span>Total a cobrar:</span>
                <span>$180,500</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
