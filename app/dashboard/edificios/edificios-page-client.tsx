"use client"

import { useState, useCallback } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { BuildingList } from "@/components/building-list"
import Link from "next/link"
import { Plus, Search, Filter, X, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useDebouncedCallback } from "use-debounce"

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
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const currentSearch = searchParams.get('search') || ''
    const currentAdmin = searchParams.get('id_administrador') || ''

    // Helper para actualizar query string
    const createQueryString = useCallback(
        (deltas: Record<string, string | null>) => {
            const params = new URLSearchParams(searchParams.toString())
            for (const [key, value] of Object.entries(deltas)) {
                if (value === null || value === '_todos_' || value === '') {
                    params.delete(key)
                } else {
                    params.set(key, value)
                }
            }
            return params.toString()
        },
        [searchParams]
    )

    const handleSearch = useDebouncedCallback((term: string) => {
        const query = createQueryString({ search: term })
        router.replace(pathname + '?' + query)
    }, 300)

    const updateFilter = (key: string, value: string | null) => {
        const query = createQueryString({ [key]: value })
        router.push(pathname + '?' + query)
    }

    // Filtrar por estado de los devueltos del servidor
    const edificiosActivos = initialEdificios.filter(
        (edificio) => edificio.estado === "activo" || edificio.estado === "en_obra"
    )
    const edificiosInactivos = initialEdificios.filter(
        (edificio) => edificio.estado === "finalizado"
    )

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
                        defaultValue={currentSearch}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </div>
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
                                value={currentAdmin || '_todos_'}
                                onValueChange={(value) => updateFilter('id_administrador', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos los administradores" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="_todos_">Todos los administradores</SelectItem>
                                    {initialAdministradores
                                        .sort((a, b) => a.nombre.localeCompare(b.nombre))
                                        .map(admin => (
                                            <SelectItem key={admin.id} value={admin.id.toString()}>
                                                {admin.nombre}
                                            </SelectItem>
                                        ))
                                    }
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Botón para limpiar filtros */}
                    {(currentAdmin || currentSearch) && (
                        <div className="mt-4 flex justify-end">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(pathname)}
                                className="flex items-center gap-2"
                            >
                                <RefreshCw className="h-4 w-4" />
                                Limpiar filtros
                            </Button>
                        </div>
                    )}

                    {/* Mostrar filtros activos */}
                    {(currentAdmin || currentSearch) && (
                        <div className="flex flex-wrap gap-2 mt-4 border-t pt-4">
                            <p className="text-sm font-medium mr-2">Filtros activos:</p>
                            {currentSearch && (
                                <Badge variant="outline" className="flex items-center gap-1">
                                    Búsqueda: {currentSearch}
                                    <button
                                        onClick={() => updateFilter('search', null)}
                                        className="ml-1 rounded-full hover:bg-gray-200 p-0.5"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            )}
                            {currentAdmin && (
                                <Badge variant="outline" className="flex items-center gap-1">
                                    Administrador: {initialAdministradores.find(a => a.id.toString() === currentAdmin)?.nombre || 'Desconocido'}
                                    <button
                                        onClick={() => updateFilter('id_administrador', null)}
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
