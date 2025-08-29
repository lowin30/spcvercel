"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase-client"
import { formatDateTime } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface HistorialEstadosProps {
  tipoEntidad: "tarea" | "presupuesto" | "factura"
  entidadId: number
  className?: string
}

interface HistorialItem {
  id: number
  estado_nuevo: string
  estado_anterior: string | null
  created_at: string
  id_usuario: string | null
  comentario: string | null
  usuario_email?: string
}

export function HistorialEstados({ tipoEntidad, entidadId, className = "" }: HistorialEstadosProps) {
  // Validar que los parámetros sean válidos
  const isValidEntityId = entidadId !== undefined && entidadId !== null && !isNaN(Number(entidadId));
  const isValidEntityType = tipoEntidad !== undefined && tipoEntidad !== null;
  const [historial, setHistorial] = useState<HistorialItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // Solo consultar cuando tengamos valores válidos
    if (!isValidEntityType || !isValidEntityId) {
      setIsLoading(false)
      return
    }

    const fetchHistorial = async () => {
      setIsLoading(true)
      const supabase = createClient()

      try {
        // Consultar el historial de estados usando el patrón recomendado para mejor inferencia de tipos
        const baseQuery = supabase
          .from("historial_estados")
          .select(`
            id,
            estado_nuevo,
            estado_anterior,
            created_at,
            id_usuario,
            comentario
          `)
        
        // Construir la consulta siguiendo el patrón recomendado para evitar problemas de tipo
        let finalQuery;
        // Primero aplicamos filtro por tipo de entidad
        const typeFilteredQuery = baseQuery.eq("tipo_entidad", tipoEntidad);
        // Luego aplicamos filtro por ID y ordenamos
        finalQuery = typeFilteredQuery
          .eq("id_entidad", entidadId)
          .order("created_at", { ascending: false })
        
        const historialResponse = await finalQuery
        const data = historialResponse.data || []
        const historialError = historialResponse.error

        if (historialError) {
          console.error("Error al obtener el historial de estados:", historialError)
          throw historialError
        }

        // Si tenemos datos, obtener los emails de los usuarios
        if (data && data.length > 0) {
          const historialConUsuarios = await Promise.all(
            data.map(async (item: HistorialItem) => {
              if (item.id_usuario) {
                // Consulta separada para obtener el email del usuario
                const userQuery = supabase
                  .from("usuarios")
                  .select("email")
                  .eq("id", item.id_usuario)
                  .single()
                
                const userResponse = await userQuery
                const userData = userResponse.data
                const userError = userResponse.error

                if (!userError && userData) {
                  return {
                    ...item,
                    usuario_email: userData.email,
                  }
                }
              }
              return {
                ...item,
                usuario_email: "Sistema",
              }
            }),
          )
          setHistorial(historialConUsuarios)
        } else {
          setHistorial([])
        }
      } catch (err) {
        console.error(`Error al obtener el historial de estados:`, err)
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        setIsLoading(false)
      }
    }

    fetchHistorial()
  }, [tipoEntidad, entidadId])

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Historial de estados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Cargando historial...</div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Historial de estados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-red-500">Error al cargar el historial: {error.message}</div>
        </CardContent>
      </Card>
    )
  }

  if (historial.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Historial de estados</CardTitle>
          <CardDescription>Registro de cambios de estado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">No hay cambios de estado registrados</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Historial de estados</CardTitle>
        <CardDescription>Registro de cambios de estado</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {historial.map((item) => (
            <div key={item.id} className="border-b pb-3 last:border-0">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center">
                  <Badge variant="outline" className="mr-2">
                    {item.estado_nuevo}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {item.estado_anterior ? `desde ${item.estado_anterior}` : "estado inicial"}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{formatDateTime(item.created_at)}</span>
              </div>
              <p className="text-sm">
                Por: <span className="font-medium">{item.usuario_email || "Sistema"}</span>
              </p>
              {item.comentario && <p className="text-sm mt-1 text-muted-foreground">{item.comentario}</p>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
