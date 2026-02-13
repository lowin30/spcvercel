"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus, Trash2, Eye, ExternalLink } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { deletePresupuestoBase } from "./actions"
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
  // Usamos initialData como fuente de verdad inicial
  const [presupuestosBase, setPresupuestosBase] = useState<any[]>(initialData)
  const [filtroActivo, setFiltroActivo] = useState<string>(
    userRole === 'supervisor' ? 'activos' : 'requiere_accion'
  )
  const [busqueda, setBusqueda] = useState("")
  const [isPending, startTransition] = useTransition()

  // Usamos todosData para los filtros client-side si está disponible, sino initialData
  const todosLosPB = todosData || initialData

  // Función para normalizar texto (búsqueda inteligente)
  const normalizarTexto = (texto: string): string => {
    if (!texto) return ''

    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[sz]/g, 's')
      .replace(/[iy]/g, 'i')
  }

  // Calcular estadísticas
  const estadisticas = userRole === 'supervisor' ? {
    activos: todosLosPB.filter(pb => pb.aprobado && !pb.esta_liquidado && !pb.tiene_pf_pausado).length,
    en_pausa: todosLosPB.filter(pb => !pb.esta_liquidado && pb.tiene_pf_pausado).length,
    liquidados: todosLosPB.filter(pb => pb.esta_liquidado).length,
    total: todosLosPB.length
  } : userRole === 'admin' ? {
    requiere_accion: todosLosPB.filter(pb => pb.aprobado && !pb.tiene_presupuesto_final && !pb.esta_liquidado).length,
    aprobados: todosLosPB.filter(pb => pb.aprobado && !pb.esta_liquidado).length,
    pendientes: todosLosPB.filter(pb => !pb.aprobado).length,
    liquidados: todosLosPB.filter(pb => pb.esta_liquidado).length,
    total: todosLosPB.length
  } : null

  // Filtrado
  const presupuestosFiltrados = todosLosPB.filter(presupuesto => {
    // Búsqueda
    if (busqueda) {
      const terminoBusqueda = normalizarTexto(busqueda)
      const coincide = (
        (normalizarTexto(presupuesto.code || '').includes(terminoBusqueda)) ||
        (normalizarTexto(presupuesto.nota_pb || '').includes(terminoBusqueda)) ||
        (normalizarTexto(presupuesto.titulo_tarea || '').includes(terminoBusqueda))
      )
      if (!coincide) return false
    }

    // Filtros por tabs
    if (userRole === 'supervisor') {
      if (filtroActivo === 'activos') return presupuesto.aprobado && !presupuesto.esta_liquidado && !presupuesto.tiene_pf_pausado
      if (filtroActivo === 'pendientes') return !presupuesto.aprobado
      if (filtroActivo === 'en_pausa') return !presupuesto.esta_liquidado && presupuesto.tiene_pf_pausado
      if (filtroActivo === 'liquidados') return presupuesto.esta_liquidado
      if (filtroActivo === 'todos') return true
    } else {
      // Admin
      if (filtroActivo === 'requiere_accion') return presupuesto.aprobado && !presupuesto.tiene_presupuesto_final && !presupuesto.esta_liquidado
      if (filtroActivo === 'aprobados') return presupuesto.aprobado && !presupuesto.esta_liquidado
      if (filtroActivo === 'pendientes') return !presupuesto.aprobado
      if (filtroActivo === 'liquidados') return presupuesto.esta_liquidado
      if (filtroActivo === 'todos') return true
    }
    return true
  })

  const handleDelete = async (e: React.MouseEvent, id: number, aprobado: boolean) => {
    e.preventDefault()
    e.stopPropagation()

    if (aprobado) {
      toast.error("No se pueden eliminar presupuestos aprobados")
      return
    }

    if (!confirm("¿Estás seguro de quitar este presupuesto?")) return

    startTransition(async () => {
      const result = await deletePresupuestoBase(id)
      if (result.success) {
        toast.success("Presupuesto eliminado")
        router.refresh()
      } else {
        toast.error(result.error || "Error al eliminar")
      }
    })
  }

  // Helpers de UI (Badges, Acciones) simplificados
  const getBadges = (pb: any) => (
    <>
      <Badge className={pb.aprobado ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
        {pb.aprobado ? "Enviado" : "Pendiente"}
      </Badge>
      {userRole === 'admin' && pb.tiene_presupuesto_final && (
        <Badge className="bg-blue-100 text-blue-800 text-xs">PF ✓</Badge>
      )}
      {pb.esta_liquidado && (
        <Badge className="bg-purple-100 text-purple-800 text-xs">Liquidado</Badge>
      )}
    </>
  )

  const getAcciones = (pb: any) => (
    <div className="flex items-center justify-center gap-1 flex-wrap">
      <Button variant="ghost" size="sm" asChild className="h-8 px-2">
        <Link href={`/dashboard/presupuestos-base/${pb.id}`}>
          <Eye className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Ver</span>
        </Link>
      </Button>

      {pb.id_tarea && (
        <Button variant="ghost" size="sm" asChild className="h-8 px-2">
          <Link href={`/dashboard/tareas/${pb.id_tarea}`}>
            <ExternalLink className="h-4 w-4" />
          </Link>
        </Button>
      )}

      {userRole === 'admin' && !pb.aprobado && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={(e) => handleDelete(e, pb.id, pb.aprobado)}
          disabled={isPending}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  )

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Presupuestos Base</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gestión de presupuestos preliminares (Cabeceras).
          </p>
        </div>
        <Link href="/dashboard/presupuestos-base/nuevo" className="self-start sm:self-auto">
          <Button size="sm" className="w-full sm:w-auto text-sm">
            <Plus className="mr-1 h-4 w-4" />
            <span className="sm:inline">Nuevo Presupuesto Base</span>
          </Button>
        </Link>
      </div>

      {/* Filtros minimalistas */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 pt-2 pb-4 border-b">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <Input
            placeholder="Buscar..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full sm:w-64 text-sm"
          />
          <Tabs value={filtroActivo} onValueChange={setFiltroActivo} className="w-full sm:w-auto">
            <TabsList className="grid w-full grid-cols-4 sm:w-auto">
              {userRole === 'supervisor' ? (
                <>
                  <TabsTrigger value="activos" className="text-xs">Activos ({estadisticas?.activos})</TabsTrigger>
                  <TabsTrigger value="pendientes" className="text-xs">Pendientes ({estadisticas?.en_pausa})</TabsTrigger>
                  <TabsTrigger value="todos" className="text-xs">Todos ({estadisticas?.total})</TabsTrigger>
                </>
              ) : (
                <>
                  <TabsTrigger value="requiere_accion" className="text-xs">Acción ({estadisticas?.requiere_accion})</TabsTrigger>
                  <TabsTrigger value="aprobados" className="text-xs">Enviados ({estadisticas?.aprobados})</TabsTrigger>
                  <TabsTrigger value="todos" className="text-xs">Todos ({estadisticas?.total})</TabsTrigger>
                </>
              )}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {presupuestosFiltrados.length > 0 ? (
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
                    <div className="font-medium text-sm">
                      {pb.titulo_tarea || `Tarea #${pb.id_tarea}`}
                    </div>
                    {pb.nombre_edificio && (
                      <div className="text-xs text-muted-foreground">{pb.nombre_edificio}</div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{pb.code}</TableCell>
                  <TableCell><div className="flex gap-1">{getBadges(pb)}</div></TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatCurrency(pb.total || 0)}
                  </TableCell>
                  <TableCell>{getAcciones(pb)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-10 text-muted-foreground">No hay presupuestos.</div>
      )}
    </div>
  )
}
