"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Search, X, Filter, Calendar } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"

type PagosFilterBarProps = {
    administradores: { id: number; nombre: string }[]
    edificios: { id: number; nombre: string; id_administrador: number }[]
    modalidades: string[]
}

export function PagosFilterBar({ administradores, edificios, modalidades }: PagosFilterBarProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    // Estados locales sincronizados con URL
    const [q, setQ] = useState(searchParams.get('q') || '')
    const [adm, setAdm] = useState(searchParams.get('adm') || 'all')
    const [edificio, setEdificio] = useState(searchParams.get('edificio') || 'all')
    const [mod, setMod] = useState(searchParams.get('mod') || 'all')
    const [desde, setDesde] = useState(searchParams.get('desde') || '')
    const [hasta, setHasta] = useState(searchParams.get('hasta') || '')
    const [sort, setSort] = useState(searchParams.get('sort') || 'fecha_desc')

    // Debounce para busqueda por texto
    useEffect(() => {
        const timer = setTimeout(() => {
            updateURL({ q })
        }, 500)
        return () => clearTimeout(timer)
    }, [q])

    const updateURL = (params: Record<string, string | null>) => {
        const current = new URLSearchParams(Array.from(searchParams.entries()))

        Object.entries(params).forEach(([key, value]) => {
            if (value && value !== 'all') {
                current.set(key, value)
            } else {
                current.delete(key)
            }
        })

        const query = current.toString()
        router.replace(`${pathname}${query ? `?${query}` : ''}`)
    }

    const resetFilters = () => {
        setQ('')
        setAdm('all')
        setEdificio('all')
        setMod('all')
        setDesde('')
        setHasta('')
        setSort('fecha_desc')
        router.replace(pathname)
    }

    // Filtrar edificios segun administrador seleccionado (Cascada)
    const edificiosFiltrados = adm !== 'all'
        ? edificios.filter(e => e.id_administrador.toString() === adm)
        : edificios

    return (
        <Card className="mb-6 border-2 border-primary/10 shadow-sm bg-muted/5">
            <CardContent className="p-4 md:p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <Filter className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm uppercase tracking-wider">panel de filtros</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Busqueda General / CUIT */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">busqueda / cuit</label>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="buscar por edificio, cuit o factura..."
                                className="pl-9 h-10 text-sm focus-visible:ring-primary"
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Administrador */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">administrador</label>
                        <Select value={adm} onValueChange={(val) => { setAdm(val); setEdificio('all'); updateURL({ adm: val, edificio: 'all' }) }}>
                            <SelectTrigger className="h-10 text-sm">
                                <SelectValue placeholder="todos" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">todos los administradores</SelectItem>
                                {administradores.map(a => (
                                    <SelectItem key={a.id} value={a.id.toString()}>{a.nombre.toLowerCase()}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Edificio */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">edificio</label>
                        <Select value={edificio} onValueChange={(val) => { setEdificio(val); updateURL({ edificio: val }) }}>
                            <SelectTrigger className="h-10 text-sm">
                                <SelectValue placeholder="todos" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">todos los edificios</SelectItem>
                                {edificiosFiltrados.map(e => (
                                    <SelectItem key={e.id} value={e.id.toString()}>{e.nombre.toLowerCase()}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Modalidad */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">modalidad</label>
                        <Select value={mod} onValueChange={(val) => { setMod(val); updateURL({ mod: val }) }}>
                            <SelectTrigger className="h-10 text-sm">
                                <SelectValue placeholder="todas" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">todas las modalidades</SelectItem>
                                {modalidades.map(m => (
                                    <SelectItem key={m} value={m}>{m.toLowerCase()}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
                    {/* Fechas */}
                    <div className="md:col-span-2 flex flex-col md:flex-row gap-4">
                        <div className="flex-1 space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">desde</label>
                            <Input type="date" value={desde} onChange={(e) => { setDesde(e.target.value); updateURL({ desde: e.target.value }) }} className="h-10 text-sm" />
                        </div>
                        <div className="flex-1 space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">hasta</label>
                            <Input type="date" value={hasta} onChange={(e) => { setHasta(e.target.value); updateURL({ hasta: e.target.value }) }} className="h-10 text-sm" />
                        </div>
                    </div>

                    {/* Orden y Reset */}
                    <div className="flex gap-2 items-end">
                        <div className="flex-1 space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">ordenar por</label>
                            <Select value={sort} onValueChange={(val) => { setSort(val); updateURL({ sort: val }) }}>
                                <SelectTrigger className="h-10 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="fecha_desc">mas reciente</SelectItem>
                                    <SelectItem value="fecha_asc">mas antiguo</SelectItem>
                                    <SelectItem value="monto_desc">mayor monto</SelectItem>
                                    <SelectItem value="monto_asc">menor monto</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button variant="outline" size="icon" className="h-10 w-10 text-red-500 hover:bg-red-50 hover:text-red-600" onClick={resetFilters} title="limpiar filtros">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
