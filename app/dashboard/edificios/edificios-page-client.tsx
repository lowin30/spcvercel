"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { BuildingList } from "@/components/building-list"
import Link from "next/link"
import { Plus, Search, Loader2, Filter, X, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

interface Permissions {
    canCreateBuilding: boolean;
    canEditBuilding: boolean;
    canManageDepartments: boolean;
}

interface EdificiosPageClientProps {
    initialEdificios: any[]
    initialAdministradores: { id: string; nombre: string }[]
    userRol: string
    permissions: Permissions
}

export default function EdificiosPageClient({
    initialEdificios,
    initialAdministradores,
    userRol,
    permissions
}: EdificiosPageClientProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [administradores] = useState(initialAdministradores)
    const [activeFilters, setActiveFilters] = useState<{
        administrador?: string,
    }>({})

    const router = useRouter()
    const params = useSearchParams()
    const searchQuery = params.get('q') || ''

    // Inicializar búsqueda si viene en la URL
    useEffect(() => {
        if (searchQuery) {
            setSearchTerm(searchQuery)
        }
    }, [searchQuery])

    // Filtrado 100% client-side sobre datos precargados del servidor
    const edificiosFiltrados = useMemo(() => {
        let filtered = [...initialEdificios]

        // Filtro por término de búsqueda
        if (searchTerm) {
            const termLower = searchTerm.toLowerCase()
            filtered = filtered.filter(edificio =>
                edificio.nombre?.toLowerCase().includes(termLower) ||
                edificio.direccion?.toLowerCase().includes(termLower) ||
                edificio.cuit?.toLowerCase().includes(termLower)
            )
        }

        // Filtro por administrador
        if (activeFilters.administrador) {
            const idAdminFiltro = parseInt(activeFilters.administrador, 10)
            filtered = filtered.filter(edificio =>
                edificio.id_administrador === idAdminFiltro
            )
        }

        return filtered
    }, [initialEdificios, searchTerm, activeFilters])

    // Filtrar por estado
    const edificiosActivos = edificiosFiltrados.filter(
        (edificio) => edificio.estado === "activo" || edificio.estado === "en_obra"
    )
    const edificiosInactivos = edificiosFiltrados.filter(
        (edificio) => edificio.estado === "finalizado"
    )

    // Callback para refrescar datos desde el servidor
    const handleBuildingUpdated = () => {
        router.refresh()
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Edificios</h1>
                {userRol === "admin" && (
                    <Button asChild>
                        <Link href="/dashboard/edificios/nuevo">
                            <Plus className="mr-2 h-4 w-4" /> Nuevo Edificio
                        </Link>
                    </Button>
                )}
            </div>

            <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Buscar por nombre, dirección, CUIT..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button variant="outline" size="icon" onClick={() => setActiveFilters(prev => ({ ...prev }))}
                    title="Filtros avanzados">
                    <Filter className="h-4 w-4" />
                </Button>
            </div>

            {/* Filtros avanzados */}
            <Card className="mt-4">
                <CardHeader className="py-4">
                    <CardTitle className="text-lg">Filtros</CardTitle>
                    <CardDescription>Filtra los edificios por administrador</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2">
                        {/* Filtro por administrador */}
                        <div className="space-y-2">
                            <p className="text-sm">Administrador</p>
                            <Select
                                value={activeFilters.administrador || '_todos_'}
                                onValueChange={(value) =>
                                    setActiveFilters(prev => value === '_todos_' ? { ...prev, administrador: undefined } : { ...prev, administrador: value })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos los administradores" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="_todos_">Todos los administradores</SelectItem>
                                    {administradores
                                        .sort((a, b) => a.nombre.localeCompare(b.nombre))
                                        .map(admin => (
                                            <SelectItem key={admin.id} value={admin.id}>
                                                {admin.nombre}
                                            </SelectItem>
                                        ))
                                    }
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Botón para limpiar filtros */}
                    {(activeFilters.administrador !== undefined || searchTerm) && (
                        <div className="mt-4 flex justify-end">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setActiveFilters({})
                                    setSearchTerm('')
                                }}
                                className="flex items-center gap-2"
                            >
                                <RefreshCw className="h-4 w-4" />
                                Limpiar filtros
                            </Button>
                        </div>
                    )}

                    {/* Mostrar filtros activos */}
                    {(activeFilters.administrador !== undefined || searchTerm) && (
                        <div className="flex flex-wrap gap-2 mt-4 border-t pt-4">
                            <p className="text-sm font-medium mr-2">Filtros activos:</p>
                            {searchTerm && (
                                <Badge variant="outline" className="flex items-center gap-1">
                                    Búsqueda: {searchTerm}
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="ml-1 rounded-full hover:bg-gray-200 p-0.5"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            )}
                            {activeFilters.administrador && (
                                <Badge variant="outline" className="flex items-center gap-1">
                                    Administrador: {administradores.find(a => a.id === activeFilters.administrador)?.nombre || 'Desconocido'}
                                    <button
                                        onClick={() => setActiveFilters(prev => ({ ...prev, administrador: undefined }))}
                                        className="ml-1 rounded-full hover:bg-gray-200 p-0.5"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Tabs defaultValue="activos">
                <TabsList className="grid grid-cols-2 md:w-auto w-full">
                    <TabsTrigger value="activos">Activos</TabsTrigger>
                    <TabsTrigger value="inactivos">Inactivos</TabsTrigger>
                </TabsList>
                <TabsContent value="activos" className="mt-4">
                    <BuildingList buildings={edificiosActivos} onBuildingUpdated={handleBuildingUpdated} permissions={permissions} />
                </TabsContent>
                <TabsContent value="inactivos" className="mt-4">
                    <BuildingList buildings={edificiosInactivos} onBuildingUpdated={handleBuildingUpdated} permissions={permissions} />
                </TabsContent>
            </Tabs>
        </div>
    )
}
