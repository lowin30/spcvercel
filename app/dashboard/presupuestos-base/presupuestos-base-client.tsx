"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { Plus, Eye, Search } from "lucide-react"
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
  const tabActual = searchParams.get('tab') || 'todas'

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

  // calcular estadisticas
  const stats = {
    todas: presupuestos.length,
    pendientes: presupuestos.filter(p => !p.aprobado).length,
    activas: presupuestos.filter(p => p.aprobado && !p.esta_liquidado).length,
    pagada: presupuestos.filter(p => p.esta_liquidado).length,
  }

  // obtener badge de estado
  const getEstadoBadge = (pb: PresupuestoBase) => {
    if (pb.esta_liquidado) {
      return <Badge className="bg-green-600 hover:bg-green-700 text-white">liquidado</Badge>
    }
    if (pb.aprobado && pb.tiene_liquidacion) {
      return <Badge className="bg-blue-600 hover:bg-blue-700 text-white">en liquidacion</Badge>
    }
    if (pb.aprobado) {
      return <Badge className="bg-purple-600 hover:bg-purple-700 text-white">activo</Badge>
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

        {/* tabs */}
        <Tabs value={tabActual} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-auto">
            <TabsTrigger value="todas" className="text-xs sm:text-sm px-2">
              todas ({stats.todas})
            </TabsTrigger>
            <TabsTrigger value="pendientes" className="text-xs sm:text-sm px-2">
              pendientes ({stats.pendientes})
            </TabsTrigger>
            <TabsTrigger value="activas" className="text-xs sm:text-sm px-2">
              activas ({stats.activas})
            </TabsTrigger>
            <TabsTrigger value="pagada" className="text-xs sm:text-sm px-2">
              pagada ({stats.pagada})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* grid de cards */}
      {presupuestos.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {presupuestos.map((pb) => (
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

                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">total</span>
                    <span className="text-lg font-bold">{formatCurrency(pb.total)}</span>
                  </div>
                </div>

                <Link href={`/dashboard/presupuestos-base/${pb.id}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    <Eye className="mr-2 h-4 w-4" />
                    ver detalle
                  </Button>
                </Link>
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
