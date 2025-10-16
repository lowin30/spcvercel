"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus, Loader2, Trash2 } from "lucide-react"
import { formatDate } from "@/lib/date-utils"
import { formatCurrency } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { getPresupuestosBase, deletePresupuestoBase } from "./actions"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

interface PresupuestosBaseClientProps {
  initialData: any[]
  userRole: string
  userId: string
}

export function PresupuestosBaseClient({ initialData, userRole, userId }: PresupuestosBaseClientProps) {
  const router = useRouter()
  const [presupuestosBase, setPresupuestosBase] = useState<any[]>(initialData)
  const [filtroAprobacion, setFiltroAprobacion] = useState<'todos' | 'aprobados' | 'pendientes'>('todos')
  const [filtroLiquidacion, setFiltroLiquidacion] = useState<'todos' | 'liquidados' | 'por_liquidar'>('por_liquidar')
  const [isLoading, setIsLoading] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const [isPending, startTransition] = useTransition()

  // Función para normalizar texto (búsqueda inteligente)
  const normalizarTexto = (texto: string): string => {
    if (!texto) return ''
    
    return texto
      .toLowerCase()
      // Remover acentos
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      // s y z son equivalentes
      .replace(/[sz]/g, 's')
      // i e y son equivalentes
      .replace(/[iy]/g, 'i')
  }

  // Filtrar presupuestos según término de búsqueda
  const presupuestosFiltrados = presupuestosBase.filter(presupuesto => {
    // Si hay un término de búsqueda, filtrar por coincidencias en código, nota_pb, o título de tarea
    if (busqueda) {
      const terminoBusqueda = normalizarTexto(busqueda)
      return (
        (normalizarTexto(presupuesto.code || '').includes(terminoBusqueda)) ||
        (normalizarTexto(presupuesto.nota_pb || '').includes(terminoBusqueda)) ||
        (normalizarTexto(presupuesto.tareas?.titulo || '').includes(terminoBusqueda))
      )
    }
    return true
  })

  // Cargar presupuestos según filtros seleccionados
  const cargarPresupuestos = async (
    filtroApro: 'todos' | 'aprobados' | 'pendientes',
    filtroLiq: 'todos' | 'liquidados' | 'por_liquidar'
  ) => {
    setIsLoading(true)
    try {
      const result = await getPresupuestosBase(filtroApro, filtroLiq)
      if (result.success) {
        setPresupuestosBase(result.data)
      } else {
        console.error("Error al cargar presupuestos:", result.message)
      }
    } catch (error) {
      console.error("Error inesperado:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Actualizar filtro de aprobación y cargar datos
  const cambiarFiltroAprobacion = (nuevoFiltro: 'todos' | 'aprobados' | 'pendientes') => {
    setFiltroAprobacion(nuevoFiltro)
    cargarPresupuestos(nuevoFiltro, filtroLiquidacion)
  }

  // Actualizar filtro de liquidación y cargar datos
  const cambiarFiltroLiquidacion = (nuevoFiltro: 'todos' | 'liquidados' | 'por_liquidar') => {
    setFiltroLiquidacion(nuevoFiltro)
    cargarPresupuestos(filtroAprobacion, nuevoFiltro)
  }

  // Eliminar presupuesto base
  const handleDelete = async (e: React.MouseEvent, id: number, aprobado: boolean) => {
    e.preventDefault() // Evitar navegación del Link
    e.stopPropagation()
    
    if (aprobado) {
      toast.error("No se pueden eliminar presupuestos aprobados")
      return
    }
    
    if (!confirm("¿Estás seguro de que deseas eliminar este presupuesto base? Esta acción no se puede deshacer.")) {
      return
    }
    
    startTransition(async () => {
      const result = await deletePresupuestoBase(id)
      
      if (result.success) {
        toast.success(result.message)
        // Actualizar lista local
        setPresupuestosBase(prev => prev.filter(p => p.id !== id))
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Presupuestos Base</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Plantillas de presupuesto que se pueden reutilizar.
          </p>
        </div>
        <Link href="/dashboard/presupuestos-base/nuevo" className="self-start sm:self-auto">
          <Button size="sm" className="w-full sm:w-auto text-sm">
            <Plus className="mr-1 h-4 w-4" />
            <span className="sm:inline">Nuevo</span>
            <span className="hidden sm:inline"> Presupuesto Base</span>
          </Button>
        </Link>
      </div>

      {/* Filtros y búsqueda */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 pt-2 pb-4 border-b">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          {/* Filtros por aprobación */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Aprobación:</div>
            <div className="flex gap-2 flex-wrap">
              <Button 
                variant={filtroAprobacion === 'todos' ? "default" : "outline"}
                size="sm"
                onClick={() => cambiarFiltroAprobacion('todos')}
                disabled={isLoading}
              >
                Todos
              </Button>
              <Button 
                variant={filtroAprobacion === 'pendientes' ? "default" : "outline"}
                size="sm"
                onClick={() => cambiarFiltroAprobacion('pendientes')}
                disabled={isLoading}
              >
                Pendientes
              </Button>
              <Button 
                variant={filtroAprobacion === 'aprobados' ? "default" : "outline"}
                size="sm"
                onClick={() => cambiarFiltroAprobacion('aprobados')}
                disabled={isLoading}
              >
                Aprobados
              </Button>
            </div>

            <div className="text-xs font-medium text-muted-foreground mt-3">Liquidación:</div>
            <div className="flex gap-2 flex-wrap">
              <Button 
                variant={filtroLiquidacion === 'todos' ? "default" : "outline"}
                size="sm"
                onClick={() => cambiarFiltroLiquidacion('todos')}
                disabled={isLoading}
              >
                Todos
              </Button>
              <Button 
                variant={filtroLiquidacion === 'por_liquidar' ? "default" : "outline"}
                size="sm"
                onClick={() => cambiarFiltroLiquidacion('por_liquidar')}
                disabled={isLoading}
              >
                Por liquidar
              </Button>
              <Button 
                variant={filtroLiquidacion === 'liquidados' ? "default" : "outline"}
                size="sm"
                onClick={() => cambiarFiltroLiquidacion('liquidados')}
                disabled={isLoading}
              >
                Liquidados
              </Button>
            </div>
          </div>

          {/* Campo de búsqueda */}
          <div className="flex-1 max-w-xs">
            <Input
              placeholder="Buscar (código, nota, tarea)..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="text-sm"
              title="Búsqueda inteligente: ignora acentos, mayúsculas y diferencias entre s/z, i/y"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-[40vh]">
          <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin" />
          <span className="ml-2 text-sm sm:text-base">Cargando presupuestos base...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {presupuestosFiltrados.length > 0 ? (
            presupuestosFiltrados.map((presupuesto) => (
              <div key={presupuesto.id} className="relative">
                <Link href={`/dashboard/presupuestos-base/${presupuesto.id}`}>
                  <Card className="cursor-pointer transition-all hover:bg-muted/50 max-w-full overflow-hidden h-full">
                    <CardHeader className="pb-1 sm:pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg sm:text-xl truncate">
                          {presupuesto.code || "Sin código"}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge className={presupuesto.aprobado ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                            {presupuesto.aprobado ? "Aprobado" : "Pendiente"}
                          </Badge>
                          {/* Botón eliminar (solo admin y no aprobados) */}
                          {userRole === "admin" && !presupuesto.aprobado && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={(e) => handleDelete(e, presupuesto.id, presupuesto.aprobado)}
                              disabled={isPending}
                              title="Eliminar presupuesto"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  <CardContent>
                    <div className="text-xs sm:text-sm text-muted-foreground space-y-1">
                      <p className="truncate">Creado: {formatDate(presupuesto.created_at)}</p>
                      
                      {presupuesto.tareas?.titulo && (
                        <p className="truncate">Tarea: {presupuesto.tareas.titulo}</p>
                      )}

                      <div className="mt-2 pt-1 border-t border-muted">
                        <div className="grid grid-cols-2 gap-1">
                          <p>Materiales:</p>
                          <p className="text-right font-medium">{formatCurrency(presupuesto.materiales || 0)}</p>
                          
                          <p>Mano de obra:</p>
                          <p className="text-right font-medium">{formatCurrency(presupuesto.mano_obra || 0)}</p>
                          
                          <p className="font-medium">Total:</p>
                          <p className="text-right font-semibold">{formatCurrency(presupuesto.total || 0)}</p>
                        </div>
                      </div>

                      {presupuesto.nota_pb && (
                        <p className="mt-2 truncate text-xs">Nota: {presupuesto.nota_pb}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-10">
              <p className="text-muted-foreground">No hay presupuestos base disponibles.</p>
            </div>
          )}
        </div>
      )}

      {/* Versión móvil del botón flotante para nuevo presupuesto */}
      <div className="sm:hidden fixed right-4 bottom-4">
        <Button size="icon" className="h-14 w-14 rounded-full shadow-lg" asChild>
          <Link href="/dashboard/presupuestos-base/nuevo">
            <Plus className="h-6 w-6" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
