"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon, Filter, X, ChevronDown, SlidersHorizontal } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { useMediaQuery } from "@/hooks/use-media-query"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription
} from "@/components/ui/sheet"
import {
  FixedSheet,
  FixedSheetContent,
  FixedSheetTrigger
} from "@/components/ui/fixed-sheet"

interface Edificio {
  id: number
  nombre: string
}

interface Usuario {
  id: string
  email: string
  rol: string
}

interface AgendaFiltersProps {
  edificios: Edificio[]
  usuarios: Usuario[]
  userRole: string
}

// Función para mostrar texto según cantidad de filtros
function tareasPluralText(count: number): string {
  if (count === 0) return "Mostrando todas las tareas"
  return `${count} filtro${count !== 1 ? 's' : ''} activo${count !== 1 ? 's' : ''}`
}

export function AgendaFilters({ edificios, usuarios, userRole }: AgendaFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isMobile = useMediaQuery("(max-width: 768px)")
  
  // Estado para controlar si los filtros están abiertos en móvil
  const [filtersOpen, setFiltersOpen] = useState(false)
  // Estado para contar filtros activos
  const [activeFilterCount, setActiveFilterCount] = useState(0)

  const [edificioId, setEdificioId] = useState(searchParams.get("edificio") || "0")
  const [estadoTarea, setEstadoTarea] = useState(searchParams.get("estado") || "0")
  const [fechaDesde, setFechaDesde] = useState<Date | undefined>(
    searchParams.get("desde") ? new Date(searchParams.get("desde") as string) : undefined,
  )
  const [fechaHasta, setFechaHasta] = useState<Date | undefined>(
    searchParams.get("hasta") ? new Date(searchParams.get("hasta") as string) : undefined,
  )
  const [asignadoId, setAsignadoId] = useState(searchParams.get("asignado") || "0")
  
  // Contar filtros activos
  useEffect(() => {
    let count = 0
    if (edificioId !== "0") count++
    if (estadoTarea !== "0") count++
    if (fechaDesde) count++
    if (fechaHasta) count++
    if (asignadoId !== "0") count++
    setActiveFilterCount(count)
  }, [edificioId, estadoTarea, fechaDesde, fechaHasta, asignadoId])

  // Aplicar filtros
  const aplicarFiltros = () => {
    const params = new URLSearchParams()

    if (edificioId !== "0") params.set("edificio", edificioId)
    if (estadoTarea !== "0") params.set("estado", estadoTarea)
    if (fechaDesde) params.set("desde", format(fechaDesde, "yyyy-MM-dd"))
    if (fechaHasta) params.set("hasta", format(fechaHasta, "yyyy-MM-dd"))
    if (asignadoId !== "0") params.set("asignado", asignadoId)

    router.push(`/dashboard/agenda?${params.toString()}`)
  }

  // Limpiar filtros
  const limpiarFiltros = () => {
    setEdificioId("0")
    setEstadoTarea("0")
    setFechaDesde(undefined)
    setFechaHasta(undefined)
    setAsignadoId("0")
    router.push("/dashboard/agenda")
  }

  // Verificar si hay filtros activos
  const hayFiltrosActivos = edificioId !== "0" || estadoTarea !== "0" || fechaDesde || fechaHasta || asignadoId !== "0"

  // Componente de filtros para ser reutilizado en ambas versiones (móvil y desktop)
  const FiltersContent = () => (
    <>
      <div className={`grid gap-4 ${isMobile ? '' : 'md:grid-cols-5'}`}>
        <div className="space-y-2">
          <Label htmlFor="edificio">Edificio</Label>
          <Select value={edificioId} onValueChange={setEdificioId}>
            <SelectTrigger id="edificio">
              <SelectValue placeholder="Todos los edificios" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Todos los edificios</SelectItem>
              {edificios.map((edificio) => (
                <SelectItem key={edificio.id} value={edificio.id.toString()}>
                  {edificio.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="estado">Estado</Label>
          <Select value={estadoTarea} onValueChange={setEstadoTarea}>
            <SelectTrigger id="estado">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Todos los estados</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="asignada">Asignada</SelectItem>
              <SelectItem value="completada">Completada</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Desde</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn("w-full justify-start text-left font-normal", !fechaDesde && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {fechaDesde ? format(fechaDesde, "PPP", { locale: es }) : <span>Selecciona una fecha</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={fechaDesde} onSelect={setFechaDesde} initialFocus locale={es} />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>Hasta</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn("w-full justify-start text-left font-normal", !fechaHasta && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {fechaHasta ? format(fechaHasta, "PPP", { locale: es }) : <span>Selecciona una fecha</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={fechaHasta} onSelect={setFechaHasta} initialFocus locale={es} />
            </PopoverContent>
          </Popover>
        </div>

        {userRole !== "trabajador" && (
          <div className="space-y-2">
            <Label htmlFor="asignado">Asignado a</Label>
            <Select value={asignadoId} onValueChange={setAsignadoId}>
              <SelectTrigger id="asignado">
                <SelectValue placeholder="Todos los usuarios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Todos los usuarios</SelectItem>
                {usuarios.map((usuario) => (
                  <SelectItem key={usuario.id} value={usuario.id}>
                    {usuario.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-end space-x-2">
        {hayFiltrosActivos && (
          <Button variant="outline" onClick={limpiarFiltros} className="text-xs sm:text-sm">
            <X className="mr-1 h-4 w-4" />
            {isMobile ? "Limpiar" : "Limpiar filtros"}
          </Button>
        )}
        <Button onClick={aplicarFiltros} className="text-xs sm:text-sm">
          <Filter className="mr-1 h-4 w-4" />
          {isMobile ? "Aplicar" : "Aplicar filtros"}
        </Button>
      </div>
    </>
  )

  // Renderizar versión móvil o desktop según el tamaño de pantalla
  return isMobile ? (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <FixedSheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <FixedSheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <SlidersHorizontal className="h-4 w-4" />
              <span>Filtros</span>
              {activeFilterCount > 0 && (
                <span className="ml-1 rounded-full bg-primary text-primary-foreground w-5 h-5 text-xs flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </FixedSheetTrigger>
          <FixedSheetContent side="bottom" className="h-[85vh]">
            <SheetHeader>
              <SheetTitle>Filtros de Agenda</SheetTitle>
              <SheetDescription>
                Seleccione los filtros para la agenda de tareas
              </SheetDescription>
            </SheetHeader>
            <FiltersContent />
          </FixedSheetContent>
        </FixedSheet>
      </div>
      
      <div className="text-xs text-muted-foreground">
        {tareasPluralText(activeFilterCount)}
      </div>
    </div>
  ) : (
    <Card>
      <CardContent className="p-4">
        <FiltersContent />
      </CardContent>
    </Card>
  )
}
