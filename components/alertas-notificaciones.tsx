"use client"

import { useState, useEffect } from "react"
import { useSupabase } from "@/lib/supabase-provider"
import { Bell, Check, AlertTriangle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import type { Alerta } from "@/types/alerta"

interface AlertasNotificacionesProps {
  userId: string
}

export function AlertasNotificaciones({ userId }: AlertasNotificacionesProps) {
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const { supabase } = useSupabase()
  const { toast } = useToast()

  // Cargar alertas
  const cargarAlertas = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("alertas_sistema")
        .select("*")
        .eq("id_usuario_destino", userId)
        .order("fecha_creacion", { ascending: false })
        .limit(10)

      if (error) throw error
      setAlertas(data || [])
    } catch (error: any) {
      console.error("Error al cargar alertas:", error.message)
    } finally {
      setLoading(false)
    }
  }

  // Marcar alerta como leída
  const marcarComoLeida = async (id: number) => {
    try {
      const { error } = await supabase.from("alertas_sistema").update({ leida: true }).eq("id", id)

      if (error) throw error

      // Actualizar estado local
      setAlertas(alertas.map((alerta) => (alerta.id === id ? { ...alerta, leida: true } : alerta)))

      toast({
        title: "Alerta marcada como leída",
        duration: 2000,
      })
    } catch (error: any) {
      console.error("Error al marcar alerta como leída:", error.message)
      toast({
        title: "Error",
        description: "No se pudo marcar la alerta como leída",
        variant: "destructive",
      })
    }
  }

  // Marcar todas como leídas
  const marcarTodasComoLeidas = async () => {
    try {
      const alertasSinLeer = alertas.filter((a) => !a.leida).map((a) => a.id)
      if (alertasSinLeer.length === 0) return

      const { error } = await supabase.from("alertas_sistema").update({ leida: true }).in("id", alertasSinLeer)

      if (error) throw error

      // Actualizar estado local
      setAlertas(alertas.map((alerta) => ({ ...alerta, leida: true })))

      toast({
        title: "Todas las alertas marcadas como leídas",
        duration: 2000,
      })
    } catch (error: any) {
      console.error("Error al marcar todas las alertas como leídas:", error.message)
      toast({
        title: "Error",
        description: "No se pudieron marcar todas las alertas como leídas",
        variant: "destructive",
      })
    }
  }

  // Suscribirse a nuevas alertas
  useEffect(() => {
    cargarAlertas()

    // Suscribirse a cambios en la tabla de alertas
    const channel = supabase
      .channel("alertas_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "alertas_sistema",
          filter: `id_usuario_destino=eq.${userId}`,
        },
        (payload) => {
          // Añadir la nueva alerta al estado
          setAlertas((prev) => [payload.new as Alerta, ...prev])

          // Mostrar notificación
          toast({
            title: "Nueva alerta",
            description: (payload.new as Alerta).mensaje,
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, userId, toast])

  // Contar alertas no leídas
  const alertasSinLeer = alertas.filter((a) => !a.leida).length

  // Renderizar icono según tipo de alerta
  const renderIconoAlerta = (tipo: string) => {
    switch (tipo) {
      case "sobrecosto":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {alertasSinLeer > 0 && (
            <Badge
              className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500"
              variant="destructive"
            >
              {alertasSinLeer}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-medium">Notificaciones</h3>
          {alertasSinLeer > 0 && (
            <Button variant="ghost" size="sm" onClick={marcarTodasComoLeidas} className="h-8 text-xs">
              Marcar todas como leídas
            </Button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Cargando alertas...</div>
          ) : alertas.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">No tienes notificaciones</div>
          ) : (
            <div>
              {alertas.map((alerta) => (
                <div key={alerta.id} className={`p-3 border-b last:border-b-0 ${!alerta.leida ? "bg-blue-50" : ""}`}>
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">{renderIconoAlerta(alerta.tipo_alerta)}</div>
                    <div className="flex-1">
                      <p className="text-sm">{alerta.mensaje}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(alerta.fecha_creacion).toLocaleString()}
                      </p>
                    </div>
                    {!alerta.leida && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => marcarComoLeida(alerta.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
