"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
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
import { ToolPBWrapper } from "@/components/platinum/tools/pb/ToolPBWrapper"
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
    <div className="space-y-6 p-4 sm:p-6 pb-20">
      {/* Header Platinum con KPIs */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 p-1">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-foreground sm:text-5xl">
            Presupuestos <span className="text-violet-600">Base</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-1">
            Gestión inteligente de estimaciones y pre-proyectos.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-row gap-3">
          <KPICard
            label="Total Activos"
            value={stats.activa}
            icon={Plus}
            color="text-violet-500"
            bg="bg-violet-500/10"
          />
          <KPICard
            label="Pendientes"
            value={stats.pendiente}
            icon={Search}
            color="text-amber-500"
            bg="bg-amber-500/10"
          />
          <Button
            size="lg"
            className="h-auto py-3 px-6 font-black rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all border-b-4 border-primary/50 active:border-b-0 active:translate-y-1"
            onClick={() => updateUrl('action', 'crear-pb')}
          >
            <Plus className="mr-2 h-5 w-5" />
            NUEVO PB
          </Button>
        </div>
      </div>

      {/* área de búsqueda y filtros Platinum */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-xl z-20 pb-4 space-y-4 pt-2 -mx-4 px-4 sm:-mx-6 sm:px-6">
        <form onSubmit={handleBusqueda} className="flex gap-2">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-violet-600 transition-colors" />
            <Input
              placeholder="Buscar por título, edificio o administrador..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-12 h-12 bg-muted/30 border-border/50 rounded-xl focus:ring-violet-600 focus:border-violet-600 transition-all text-base"
            />
          </div>
          <Button type="submit" variant="secondary" className="h-12 px-6 rounded-xl font-bold">BUSCAR</Button>
        </form>

        <Tabs value={tabActual} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-muted/30 p-1 rounded-2xl h-12 border border-border/50">
            <TabsTrigger value="activa" className="rounded-xl text-xs sm:text-sm data-[state=active]:bg-violet-600 data-[state=active]:text-white font-bold transition-all">
              ACTIVOS ({stats.activa})
            </TabsTrigger>
            <TabsTrigger value="pendiente" className="rounded-xl text-xs sm:text-sm data-[state=active]:bg-violet-600 data-[state=active]:text-white font-bold transition-all">
              PENDIENTES ({stats.pendiente})
            </TabsTrigger>
            <TabsTrigger value="pagada" className="rounded-xl text-xs sm:text-sm data-[state=active]:bg-violet-600 data-[state=active]:text-white font-bold transition-all">
              PAGADOS ({stats.pagada})
            </TabsTrigger>
            <TabsTrigger value="todas" className="rounded-xl text-xs sm:text-sm data-[state=active]:bg-violet-600 data-[state=active]:text-white font-bold transition-all">
              TODOS ({stats.todas})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>


      {/* grid de cards Platinum */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tabActual}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {presupuestosMostrados.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {presupuestosMostrados.map((pb) => (
                <Card key={pb.id} className="group hover:shadow-2xl transition-all duration-300 border-border/50 bg-background/50 backdrop-blur-sm overflow-hidden hover:border-violet-500/30">
                  <CardHeader className="pb-3 relative">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base sm:text-lg font-bold leading-tight line-clamp-2">
                        {pb.titulo_tarea || `Tarea #${pb.id_tarea}`}
                      </CardTitle>
                      {getEstadoBadge(pb)}
                    </div>
                    <CardDescription className="text-[10px] font-mono tracking-wider uppercase opacity-70">
                      {pb.code}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                        <span className="text-muted-foreground text-xs uppercase font-bold">Edificio</span>
                        <span className="font-semibold text-foreground truncate max-w-[150px]">{pb.nombre_edificio}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                        <span className="text-muted-foreground text-xs uppercase font-bold">Admin</span>
                        <span className="font-semibold text-foreground">{pb.nombre_administrador}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border/50 flex flex-col gap-3">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs text-muted-foreground uppercase font-black">Inversión Estimada</span>
                        <span className="text-xl font-black text-violet-600 font-mono italic">
                          {formatCurrency(pb.total)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Link href={`/dashboard/presupuestos-base/${pb.id}`} className="col-span-2">
                          <Button variant="outline" size="sm" className="w-full h-10 font-bold border-violet-500/20 hover:bg-violet-500/10 hover:text-violet-600 transition-all rounded-xl">
                            <Eye className="mr-2 h-4 w-4" />
                            DETALLES PB
                          </Button>
                        </Link>

                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-10 font-bold rounded-xl"
                          disabled={userRole === 'supervisor' && pb.estado_operativo !== 'pendiente'}
                          onClick={() => updateUrl('edit-pb', pb.id.toString())}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          EDITAR
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-10 font-bold text-destructive hover:bg-destructive/10 rounded-xl"
                              disabled={userRole === 'supervisor' && pb.estado_operativo !== 'pendiente'}
                              onClick={() => setIsDeleting(pb.id)}
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              BORRAR
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-2xl border-2 border-destructive/20 shadow-2xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-2xl font-black tracking-tight text-destructive">¿ELIMINAR ESTIMACIÓN?</AlertDialogTitle>
                              <AlertDialogDescription className="text-base">
                                Esta acción es irreversible. El presupuesto <strong className="text-foreground">{pb.code}</strong> será removido del sistema operativo.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="gap-2">
                              <AlertDialogCancel className="rounded-xl font-bold" onClick={() => setIsDeleting(null)}>CANCELAR</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleEliminar}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-bold"
                              >
                                CONFIRMAR ELIMINACIÓN
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
            <Card className="p-20 bg-muted/20 border-dashed border-2 flex flex-col items-center justify-center text-center rounded-3xl">
              <div className="bg-muted p-4 rounded-full mb-4">
                <Search className="h-10 w-10 text-muted-foreground opacity-20" />
              </div>
              <p className="text-xl font-black text-muted-foreground opacity-40 uppercase tracking-widest">Dimensión Vacía</p>
              <p className="text-sm text-muted-foreground max-w-xs mt-2">
                No hay presupuestos en este estado. Intenta ajustar tu filtro o busca por edificio.
              </p>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      <ToolPBWrapper />
    </div>
  )
}

function KPICard({ label, value, icon: Icon, color, bg }: { label: string, value: number, icon: any, color: string, bg: string }) {
  return (
    <div className="p-3 sm:p-4 rounded-2xl bg-card border border-border/50 shadow-sm flex items-center gap-3 transition-all hover:border-violet-500/30">
      <div className={`p-2 rounded-xl ${bg} ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-xl font-black">{value}</p>
      </div>
    </div>
  )
}

