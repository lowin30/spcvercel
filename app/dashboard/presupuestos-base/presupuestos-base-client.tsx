"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { Plus, Search, Eye, Pencil, Trash } from "lucide-react"
import { toast } from "sonner"
import { deletePresupuestoBase } from "./actions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog"
import { formatCurrency } from "@/lib/utils"
import type { PresupuestoBase } from "./loader"

interface PresupuestosBaseClientProps {
  presupuestos: PresupuestoBase[]
  userRole: string
  userId: string
}

export function PresupuestosBaseClient({ presupuestos, userRole, userId }: PresupuestosBaseClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [busqueda, setBusqueda] = useState(searchParams.get('q') || '')
  const [isDeleting, setIsDeleting] = useState<number | null>(null)
  const tabActual = searchParams.get('tab') || 'activa'

  // actualizar url con searchParams
  const updateUrl = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`?${params.toString()}`)
  }

  const handleBusqueda = (e: React.FormEvent) => {
    e.preventDefault()
    updateUrl('q', busqueda)
  }

  const handleTabChange = (tab: string) => {
    updateUrl('tab', tab)
  }

  const handleEliminar = async () => {
    if (isDeleting === null) return

    try {
      const result = await deletePresupuestoBase(isDeleting)
      if (result.success) {
        toast.success("Presupuesto eliminado correctamente")
        router.refresh()
      } else {
        toast.error(result.error || "Ocurrió un error al eliminar")
      }
    } catch (error) {
      console.error("Error al eliminar:", error)
      toast.error("Error inesperado al eliminar")
    } finally {
      setIsDeleting(null)
    }
  }

  // calcular estadisticas inteligentes (siempre sobre el total para que los círculos no desaparezcan)
  const stats = {
    todas: presupuestos.length,
    pendiente: presupuestos.filter(p => p.estado_operativo === 'pendiente').length,
    activa: presupuestos.filter(p => p.estado_operativo === 'activa').length,
    pagada: presupuestos.filter(p => p.estado_operativo === 'pagada').length,
  }

  // filtrar datos para mostrar segun la solapa actual
  const presupuestosMostrados = hubaraLocalFiltrar(presupuestos, tabActual)

  function hubaraLocalFiltrar(data: PresupuestoBase[], tab: string) {
    if (tab === 'todas') return data
    // El tab actual debe coincidir exactamente con el estado_operativo (pendiente, activa, pagada)
    return data.filter(p => p.estado_operativo === tab)
  }

  // obtener badge de estado inteligente
  const getEstadoBadge = (pb: PresupuestoBase) => {
    if (pb.esta_liquidado) {
      return <Badge className="bg-green-600 hover:bg-green-700 text-white">liquidado</Badge>
    }
    if (pb.codigo_estado_pf === 'facturado') {
      return <Badge className="bg-blue-600 hover:bg-blue-700 text-white">facturado</Badge>
    }
    if (pb.estado_operativo === 'activa') {
      return <Badge className="bg-purple-600 hover:bg-purple-700 text-white">activo</Badge>
    }
    if (pb.estado_operativo === 'rechazada') {
      return <Badge variant="destructive">rechazado</Badge>
    }
    return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">pendiente</Badge>
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">presupuestos base</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            gestion de presupuestos preliminares
          </p>
        </div>
        <Link href="/dashboard/presupuestos-base/nuevo">
          <Button size="sm" className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            nuevo presupuesto
          </Button>
        </Link>
      </div>

      {/* filtros */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 pb-4 space-y-4">
        {/* buscador */}
        <form onSubmit={handleBusqueda} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="buscar por titulo, edificio o administrador..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" variant="secondary">buscar</Button>
        </form>

        {/* tabs inteligentes */}
        <Tabs value={tabActual} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-auto">
            <TabsTrigger value="activa" className="text-xs sm:text-sm px-2">
              activos ({stats.activa})
            </TabsTrigger>
            <TabsTrigger value="pendiente" className="text-xs sm:text-sm px-2">
              pendientes ({stats.pendiente})
            </TabsTrigger>
            <TabsTrigger value="pagada" className="text-xs sm:text-sm px-2">
              pagados ({stats.pagada})
            </TabsTrigger>
            <TabsTrigger value="todas" className="text-xs sm:text-sm px-2">
              todos ({stats.todas})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* grid de cards */}
      {presupuestosMostrados.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {presupuestosMostrados.map((pb) => (
            <Card key={pb.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base sm:text-lg line-clamp-2">
                    {pb.titulo_tarea || `tarea #${pb.id_tarea}`}
                  </CardTitle>
                  {getEstadoBadge(pb)}
                </div>
                <CardDescription className="text-xs">
                  {pb.code}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">edificio:</span>
                    <span className="font-medium">{pb.nombre_edificio}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">admin:</span>
                    <span className="font-medium">{pb.nombre_administrador}</span>
                  </div>
                </div>

                <div className="pt-3 border-t flex flex-col gap-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">total</span>
                    <span className="text-lg font-bold">{formatCurrency(pb.total)}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Link href={`/dashboard/presupuestos-base/${pb.id}`} className="col-span-2">
                      <Button variant="outline" size="sm" className="w-full">
                        <Eye className="mr-2 h-4 w-4" />
                        ver detalle
                      </Button>
                    </Link>

                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={userRole === 'supervisor' && pb.estado_operativo !== 'pendiente'}
                      asChild
                    >
                      <Link href={`/dashboard/presupuestos-base/${pb.id}/editar`}>
                        <Pencil className="mr-2 h-4 w-4" />
                        editar
                      </Link>
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={userRole === 'supervisor' && pb.estado_operativo !== 'pendiente'}
                          onClick={() => setIsDeleting(pb.id)}
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          eliminar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará permanentemente el
                            presupuesto <strong>{pb.code}</strong> y todos sus datos asociados.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setIsDeleting(null)}>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleEliminar}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center space-y-2">
            <p className="text-lg text-muted-foreground">no hay presupuestos para mostrar</p>
            <p className="text-sm text-muted-foreground">
              {busqueda && "intenta ajustar tu busqueda"}
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}
