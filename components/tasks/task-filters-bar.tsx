"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useCallback, useMemo } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"
import { useDebouncedCallback } from "use-debounce"

type Props = {
    administradores: { id: number, nombre: string }[]
    edificios: { id: number, nombre: string, id_administrador: number }[]
    supervisores: { id: number, email: string, nombre?: string, code?: string }[]
    estados: { id: number, nombre: string, codigo: string }[]
    userRole?: string
}

export function TaskFiltersBar({ administradores, edificios, supervisores, estados, userRole }: Props) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    // Get current values
    const currentAdmin = searchParams.get('id_administrador')
    const currentEdificio = searchParams.get('id_edificio')
    const currentEstado = searchParams.get('estado')
    const currentSupervisor = searchParams.get('id_supervisor')
    const currentSearch = searchParams.get('search')

    // Helper to update URL
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

    const updateFilter = (key: string, value: string | null) => {
        // Lógica de cascada
        let deltas: Record<string, string | null> = { [key]: value }

        // Si cambiamos admin, reseteamos edificio si no pertenece
        if (key === 'id_administrador') {
            if (value && value !== '_todos_') {
                // Check if current edificio belongs to new admin directly? 
                // Better just reset to avoid confusion, or keep if valid.
                // Simple approach: Reset edificio when admin changes
                deltas['id_edificio'] = null
            }
        }

        const query = createQueryString(deltas)
        router.push(pathname + '?' + query)
    }

    const handleSearch = useDebouncedCallback((term: string) => {
        const query = createQueryString({ search: term })
        router.replace(pathname + '?' + query)
    }, 300)

    // Filter Logic for Dropdowns
    const edificiosFiltrados = useMemo(() => {
        if (!currentAdmin || currentAdmin === '_todos_') return edificios
        return edificios.filter(e => {
            if (!e.id_administrador) return false
            return String(e.id_administrador) === currentAdmin
        })
    }, [edificios, currentAdmin])


    const isAdminOrSupervisor = userRole === 'admin' || userRole === 'supervisor'

    return (
        <div className="bg-white dark:bg-gray-950 p-4 rounded-lg border mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                {/* 1. Buscador Texto */}
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="buscar por titulo, codigo..."
                        defaultValue={currentSearch || ''}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="pl-8 lowercase"
                    />
                </div>

                {/* 2. Admin Filter (Solo si user tiene permiso de ver varios) */}
                {isAdminOrSupervisor && (
                    <Select value={currentAdmin || '_todos_'} onValueChange={(v) => updateFilter('id_administrador', v)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Administrador" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="_todos_">Todos los Administradores</SelectItem>
                            {administradores.map(a => (
                                <SelectItem key={a.id} value={a.id.toString()}>{a.nombre}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}

                {/* 3. Edificio Filter (Cascada) */}
                {(isAdminOrSupervisor || true) && (
                    <Select value={currentEdificio || '_todos_'} onValueChange={(v) => updateFilter('id_edificio', v)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Edificio" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="_todos_">Todos los Edificios</SelectItem>
                            {edificiosFiltrados.map(e => (
                                <SelectItem key={e.id} value={e.id.toString()}>{e.nombre}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}

                {/* 4. Estado Filter */}
                <Select value={currentEstado || '_todos_'} onValueChange={(v) => updateFilter('estado', v)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="_todos_">todos los estados</SelectItem>
                        {estados.map(e => (
                            <SelectItem key={e.id} value={e.id.toString()}>{e.nombre.toLowerCase()}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* 5. Supervisor Filter */}
                {userRole === 'admin' && (
                    <Select value={currentSupervisor || '_todos_'} onValueChange={(v) => updateFilter('id_supervisor', v)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Supervisor" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="_todos_">Todos los Supervisores</SelectItem>
                            {supervisores.map(s => (
                                <SelectItem key={s.id} value={s.id.toString()}>
                                    {s.nombre || s.email}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>

            {/* Clear Filters Button (v88.1 clean) */}
            {(currentAdmin || currentEdificio || currentEstado || currentSupervisor || currentSearch) && (
                <div className="flex justify-end">
                    <Button variant="ghost" size="sm" onClick={() => router.push(pathname + '?view=activas')} className="text-muted-foreground hover:text-red-500 lowercase">
                        <X className="mr-2 h-4 w-4" /> limpiar filtros
                    </Button>
                </div>
            )}
        </div>
    )
}
