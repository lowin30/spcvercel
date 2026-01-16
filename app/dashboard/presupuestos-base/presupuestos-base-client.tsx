"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus, Loader2, Trash2, Eye, FileText, ExternalLink, Calendar } from "lucide-react"
import { formatDate } from "@/lib/date-utils"
import { formatCurrency } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { getPresupuestosBase, deletePresupuestoBase } from "./actions"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface PresupuestosBaseClientProps {
  initialData: any[]
  todosData?: any[]
  userRole: string
  userId: string
}

export function PresupuestosBaseClient({ initialData, todosData, userRole, userId }: PresupuestosBaseClientProps) {
  const router = useRouter()
  const [presupuestosBase, setPresupuestosBase] = useState<any[]>(initialData)
  const [filtroActivo, setFiltroActivo] = useState<string>(
    userRole === 'supervisor' ? 'activos' : 'requiere_accion'
  )
  const [isLoading, setIsLoading] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const [isPending, startTransition] = useTransition()
  const [todosLosPB, setTodosLosPB] = useState<any[]>(todosData || initialData)

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

  // Calcular estadísticas usando TODOS los PB
  const estadisticas = userRole === 'supervisor' ? {
    // Activos = aprobados, no liquidados, SIN PF pausado
    activos: todosLosPB.filter(pb => 
      pb.aprobado && !pb.esta_liquidado && !pb.tiene_pf_pausado
    ).length,
    // En pausa = CON PF pausado (borrador/enviado), sin importar si PB está aprobado
    en_pausa: todosLosPB.filter(pb => 
      !pb.esta_liquidado && pb.tiene_pf_pausado
    ).length,
    // Liquidados = todos los liquidados
    liquidados: todosLosPB.filter(pb => pb.esta_liquidado).length,
    // Total = todos los PB del supervisor
    total: todosLosPB.length
  } : userRole === 'admin' ? {
    // Requiere Acción = aprobados sin PF y no liquidados
    requiere_accion: todosLosPB.filter(pb => 
      pb.aprobado && !pb.tiene_presupuesto_final && !pb.esta_liquidado
    ).length,
    // Aprobados = aprobados no liquidados
    aprobados: todosLosPB.filter(pb => 
      pb.aprobado && !pb.esta_liquidado
    ).length,
    // Pendientes = sin aprobar
    pendientes: todosLosPB.filter(pb => !pb.aprobado).length,
    // Liquidados = todos los liquidados
    liquidados: todosLosPB.filter(pb => pb.esta_liquidado).length,
    // Total = todos los PB
    total: todosLosPB.length
  } : null

  // Decidir qué datos usar según el filtro
  // Siempre usar todosLosPB para poder filtrar por cualquier estado
  const datosParaFiltrar = todosLosPB

  // Filtrar presupuestos según término de búsqueda Y filtro activo
  const presupuestosFiltrados = datosParaFiltrar.filter(presupuesto => {
    // Aplicar búsqueda
    if (busqueda) {
      const terminoBusqueda = normalizarTexto(busqueda)
      const coincide = (
        (normalizarTexto(presupuesto.code || '').includes(terminoBusqueda)) ||
        (normalizarTexto(presupuesto.nota_pb || '').includes(terminoBusqueda)) ||
        (normalizarTexto(presupuesto.titulo_tarea || '').includes(terminoBusqueda))
      )
      if (!coincide) return false
    }

    // Aplicar filtro por tabs o cards
    if (userRole === 'supervisor') {
      if (filtroActivo === 'activos') {
        return presupuesto.aprobado && !presupuesto.esta_liquidado && !presupuesto.tiene_pf_pausado
      } else if (filtroActivo === 'pendientes') {
        return !presupuesto.aprobado
      } else if (filtroActivo === 'en_pausa') {
        return !presupuesto.esta_liquidado && presupuesto.tiene_pf_pausado
      } else if (filtroActivo === 'liquidados') {
        return presupuesto.esta_liquidado
      } else if (filtroActivo === 'todos') {
        return true // Mostrar todos sin filtros
      }
    } else {
      // Admin
      if (filtroActivo === 'requiere_accion') {
        return presupuesto.aprobado && !presupuesto.tiene_presupuesto_final && !presupuesto.esta_liquidado
      } else if (filtroActivo === 'aprobados') {
        return presupuesto.aprobado && !presupuesto.esta_liquidado
      } else if (filtroActivo === 'pendientes') {
        return !presupuesto.aprobado
      } else if (filtroActivo === 'liquidados') {
        return presupuesto.esta_liquidado
      }
    }
    return true
  })

  // Obtener badges según rol y estado
  const getBadges = (pb: any) => {
    const badges = []
    
    // Badge principal de aprobación
    badges.push(
      <Badge key="aprobado" className={pb.aprobado ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
        {pb.aprobado ? "Aprobado" : "Pendiente"}
      </Badge>
    )

    // Solo admin ve badges de PF
    if (userRole === 'admin') {
      if (pb.tiene_presupuesto_final) {
        badges.push(
          <Badge key="pf" className="bg-blue-100 text-blue-800 text-xs">
            PF ✓
          </Badge>
        )
      }
    }

    // Badge de liquidado (ambos roles)
    if (pb.esta_liquidado) {
      badges.push(
        <Badge key="liquidado" className="bg-purple-100 text-purple-800 text-xs">
          Liquidado
        </Badge>
      )
    }

    return badges
  }

  // Obtener acciones según rol y estado
  const getAcciones = (pb: any) => {
    const acciones = []

    // Ver detalles (siempre)
    acciones.push(
      <Button
        key="ver"
        variant="ghost"
        size="sm"
        asChild
        className="h-8 px-2"
      >
        <Link href={`/dashboard/presupuestos-base/${pb.id}`}>
          <Eye className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Ver</span>
        </Link>
      </Button>
    )

    // Ver tarea (siempre)
    if (pb.id_tarea) {
      acciones.push(
        <Button
          key="tarea"
          variant="ghost"
          size="sm"
          asChild
          className="h-8 px-2"
        >
          <Link href={`/dashboard/tareas/${pb.id_tarea}`}>
            <ExternalLink className="h-4 w-4" />
          </Link>
        </Button>
      )
    }

    // Admin: Crear PF si está aprobado y no tiene PF
    if (userRole === 'admin' && pb.aprobado && !pb.tiene_presupuesto_final && !pb.esta_liquidado) {
      acciones.push(
        <Button
          key="crear-pf"
          variant="default"
          size="sm"
          asChild
          className="h-8 px-2 text-xs"
        >
          <Link href={`/dashboard/presupuestos-finales/nuevo?idTarea=${pb.id_tarea}`}>
            <FileText className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Crear PF</span>
          </Link>
        </Button>
      )
    }

    // Admin: Ver PF si existe
    if (userRole === 'admin' && pb.tiene_presupuesto_final && pb.id_presupuesto_final) {
      acciones.push(
        <Button
          key="ver-pf"
          variant="outline"
          size="sm"
          asChild
          className="h-8 px-2 text-xs"
        >
          <Link href={`/dashboard/presupuestos-finales/${pb.id_presupuesto_final}`}>
            <FileText className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Ver PF</span>
          </Link>
        </Button>
      )
    }

    // Eliminar (solo admin y no aprobados)
    if (userRole === 'admin' && !pb.aprobado) {
      acciones.push(
        <Button
          key="eliminar"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={(e) => {
            e.preventDefault()
            handleDelete(e, pb.id, pb.aprobado)
          }}
          disabled={isPending}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )
    }

    return acciones
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

      {/* Card de estadísticas - CLICABLES */}
      {estadisticas && (
        <Card className="bg-muted/50 border-primary/20">
          <CardContent className="py-3">
            {userRole === 'supervisor' ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <button
                  onClick={() => setFiltroActivo('activos')}
                  className="p-3 rounded-lg hover:bg-primary/10 transition-colors cursor-pointer"
                >
                  <div className="text-xs text-muted-foreground">🔥 Activos</div>
                  <div className="text-2xl font-bold text-primary">{estadisticas.activos}</div>
                </button>
                <button
                  onClick={() => setFiltroActivo('en_pausa')}
                  className="p-3 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-950 transition-colors cursor-pointer"
                >
                  <div className="text-xs text-muted-foreground">⏸️ En pausa</div>
                  <div className="text-2xl font-bold text-orange-600">{estadisticas.en_pausa}</div>
                </button>
                <button
                  onClick={() => setFiltroActivo('liquidados')}
                  className="p-3 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-950 transition-colors cursor-pointer"
                >
                  <div className="text-xs text-muted-foreground">✅ Liquidados</div>
                  <div className="text-2xl font-bold text-purple-600">{estadisticas.liquidados}</div>
                </button>
                <button
                  onClick={() => setFiltroActivo('todos')}
                  className="p-3 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                >
                  <div className="text-xs text-muted-foreground">📊 Total</div>
                  <div className="text-2xl font-bold">{estadisticas.total}</div>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                <button
                  onClick={() => setFiltroActivo('requiere_accion')}
                  className="p-3 rounded-lg hover:bg-red-100 dark:hover:bg-red-950 transition-colors cursor-pointer"
                >
                  <div className="text-xs text-muted-foreground">🚨 Requiere Acción</div>
                  <div className="text-2xl font-bold text-red-600">{estadisticas.requiere_accion}</div>
                </button>
                <button
                  onClick={() => setFiltroActivo('aprobados')}
                  className="p-3 rounded-lg hover:bg-green-100 dark:hover:bg-green-950 transition-colors cursor-pointer"
                >
                  <div className="text-xs text-muted-foreground">✅ Aprobados</div>
                  <div className="text-2xl font-bold text-green-600">{estadisticas.aprobados}</div>
                </button>
                <button
                  onClick={() => setFiltroActivo('pendientes')}
                  className="p-3 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-950 transition-colors cursor-pointer"
                >
                  <div className="text-xs text-muted-foreground">⏳ Pendientes</div>
                  <div className="text-2xl font-bold text-orange-600">{estadisticas.pendientes}</div>
                </button>
                <button
                  onClick={() => setFiltroActivo('liquidados')}
                  className="p-3 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-950 transition-colors cursor-pointer"
                >
                  <div className="text-xs text-muted-foreground">💜 Liquidados</div>
                  <div className="text-2xl font-bold text-purple-600">{estadisticas.liquidados}</div>
                </button>
                <button
                  onClick={() => setFiltroActivo('todos')}
                  className="p-3 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                >
                  <div className="text-xs text-muted-foreground">📊 Total</div>
                  <div className="text-2xl font-bold">{estadisticas.total}</div>
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filtros minimalistas en 1 fila */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 pt-2 pb-4 border-b">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          {/* Búsqueda */}
          <div className="w-full sm:w-64">
            <Input
              placeholder="Buscar..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="text-sm"
              title="Búsqueda inteligente: ignora acentos, mayúsculas y diferencias entre s/z, i/y"
            />
          </div>

          {/* Tabs según rol */}
          <Tabs value={filtroActivo} onValueChange={setFiltroActivo} className="w-full sm:w-auto">
            <TabsList className="grid w-full grid-cols-4 sm:w-auto">
              {userRole === 'supervisor' ? (
                <>
                  <TabsTrigger value="activos" className="text-xs">🔥 Activos</TabsTrigger>
                  <TabsTrigger value="pendientes" className="text-xs">Pendientes</TabsTrigger>
                  <TabsTrigger value="todos" className="text-xs">📚 Todos</TabsTrigger>
                </>
              ) : (
                <>
                  <TabsTrigger value="requiere_accion" className="text-xs">🔥 Acción</TabsTrigger>
                  <TabsTrigger value="aprobados" className="text-xs">Aprobados</TabsTrigger>
                  <TabsTrigger value="pendientes" className="text-xs">Pendientes</TabsTrigger>
                  <TabsTrigger value="liquidados" className="text-xs">Liquidados</TabsTrigger>
                  <TabsTrigger value="todos" className="text-xs">Todos</TabsTrigger>
                </>
              )}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-[40vh]">
          <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin" />
          <span className="ml-2 text-sm sm:text-base">Cargando presupuestos base...</span>
        </div>
      ) : presupuestosFiltrados.length > 0 ? (
        <>
          {/* Vista DESKTOP: Tabla */}
          <div className="hidden md:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">TAREA</TableHead>
                  <TableHead className="font-semibold">CÓDIGO</TableHead>
                  <TableHead className="font-semibold">ESTADO</TableHead>
                  <TableHead className="font-semibold text-right">TOTAL</TableHead>
                  <TableHead className="font-semibold text-center">ACCIONES</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {presupuestosFiltrados.map((pb) => (
                  <TableRow key={pb.id} className="hover:bg-muted/30">
                    <TableCell className="max-w-[300px]">
                      <Link href={`/dashboard/tareas/${pb.id_tarea}`} className="text-primary hover:underline">
                        <div className="line-clamp-2 leading-snug text-sm">
                          {pb.titulo_tarea || pb.code_tarea || `Tarea #${pb.id_tarea}`}
                        </div>
                      </Link>
                      {pb.nombre_edificio && (
                        <div className="text-xs text-muted-foreground truncate">{pb.nombre_edificio}</div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{pb.code || 'S/C'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {getBadges(pb)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatCurrency(pb.total || 0)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        {getAcciones(pb)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Vista MÓVIL: Cards */}
          <div className="md:hidden space-y-3">
            {presupuestosFiltrados.map((pb) => (
              <Card key={pb.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start gap-2">
                    <Link href={`/dashboard/tareas/${pb.id_tarea}`} className="flex-1 min-w-0">
                      <CardTitle className="text-base line-clamp-2 leading-snug text-primary hover:underline">
                        {pb.titulo_tarea || pb.code_tarea || `Tarea #${pb.id_tarea}`}
                      </CardTitle>
                    </Link>
                  </div>
                  {pb.nombre_edificio && (
                    <p className="text-xs text-muted-foreground truncate">{pb.nombre_edificio}</p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {getBadges(pb)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <span className="text-muted-foreground">Código:</span>
                    <span className="font-mono text-right">{pb.code || 'S/C'}</span>
                    
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-semibold text-right">{formatCurrency(pb.total || 0)}</span>
                    
                    <span className="text-muted-foreground">Creado:</span>
                    <span className="text-right">{pb.dias_desde_creacion || 0}d</span>
                  </div>
                  
                  <div className="flex gap-1 pt-2 border-t flex-wrap">
                    {getAcciones(pb)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-10">
          <p className="text-muted-foreground">No hay presupuestos base disponibles.</p>
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
