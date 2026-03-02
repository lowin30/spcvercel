"use client"

import React, { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Search,
    Filter,
    Image as ImageIcon,
    ImageOff,
    UserCircle,
    HardHat,
    X,
    ChevronDown
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuCheckboxItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface SuperFiltroInteligenteProps {
    onSearch: (value: string) => void
    onFilterFoto: (value: "todos" | "con" | "sin") => void
    onFilterRol: (value: "todos" | "supervisor" | "trabajador") => void
    onFilterMonto: (value: number) => void
}

export function SuperFiltroInteligente({
    onSearch,
    onFilterFoto,
    onFilterRol,
    onFilterMonto
}: SuperFiltroInteligenteProps) {
    const [searchValue, setSearchValue] = useState("")
    const [fotoFilter, setFotoFilter] = useState<"todos" | "con" | "sin">("todos")
    const [rolFilter, setRolFilter] = useState<"todos" | "supervisor" | "trabajador">("todos")

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        setSearchValue(val)
        onSearch(val)
    }

    const clearFilters = () => {
        setSearchValue("")
        setFotoFilter("todos")
        setRolFilter("todos")
        onSearch("")
        onFilterFoto("todos")
        onFilterRol("todos")
        onFilterMonto(0)
    }

    return (
        <div className="space-y-3">
            {/* Barra de Búsqueda Universal */}
            <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por edificio, tarea, usuario o descripción..."
                        className="pl-10 h-11 bg-white border-slate-200/80 shadow-sm focus:ring-primary/20"
                        value={searchValue}
                        onChange={handleSearch}
                    />
                    {searchValue && (
                        <button
                            onClick={() => { setSearchValue(""); onSearch(""); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 hover:bg-slate-100 p-1 rounded-full"
                        >
                            <X className="h-4 w-4 text-slate-400" />
                        </button>
                    )}
                </div>

                {/* Action Buttons / Filter Triggers */}
                <div className="flex gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="h-11 border-slate-200/80 bg-white">
                                <Filter className="mr-2 h-4 w-4" />
                                Filtros Avanzados
                                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[240px]">
                            <DropdownMenuLabel>Estado del Comprobante</DropdownMenuLabel>
                            <DropdownMenuCheckboxItem
                                checked={fotoFilter === "con"}
                                onCheckedChange={() => { const n = fotoFilter === "con" ? "todos" : "con"; setFotoFilter(n); onFilterFoto(n); }}
                            >
                                <ImageIcon className="mr-2 h-4 w-4" />
                                Solo con Foto
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={fotoFilter === "sin"}
                                onCheckedChange={() => { const n = fotoFilter === "sin" ? "todos" : "sin"; setFotoFilter(n); onFilterFoto(n); }}
                            >
                                <ImageOff className="mr-2 h-4 w-4" />
                                Sin Foto (Faltantes)
                            </DropdownMenuCheckboxItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuLabel>Filtrar por Emisor</DropdownMenuLabel>
                            <DropdownMenuCheckboxItem
                                checked={rolFilter === "supervisor"}
                                onCheckedChange={() => { const n = rolFilter === "supervisor" ? "todos" : "supervisor"; setRolFilter(n); onFilterRol(n); }}
                            >
                                <UserCircle className="mr-2 h-4 w-4" />
                                Supervisores
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={rolFilter === "trabajador"}
                                onCheckedChange={() => { const n = rolFilter === "trabajador" ? "todos" : "trabajador"; setRolFilter(n); onFilterRol(n); }}
                            >
                                <HardHat className="mr-2 h-4 w-4" />
                                Trabajadores
                            </DropdownMenuCheckboxItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                        variant="ghost"
                        className="h-11 text-slate-500 hover:text-slate-800"
                        onClick={clearFilters}
                    >
                        Limpiar
                    </Button>
                </div>
            </div>

            {/* Pills de Filtrado Rápido (Didáctico) */}
            <div className="flex flex-wrap gap-2">
                <Badge
                    variant="secondary"
                    className={cn(
                        "cursor-pointer hover:bg-slate-200 transition-colors py-1 px-3 border border-slate-200/50",
                        fotoFilter === "sin" && "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                    )}
                    onClick={() => { const n = fotoFilter === "sin" ? "todos" : "sin"; setFotoFilter(n); onFilterFoto(n); }}
                >
                    {fotoFilter === "sin" && <X className="mr-1 h-3 w-3" />}
                    Falta Comprobante
                </Badge>

                <Badge
                    variant="secondary"
                    className="cursor-pointer hover:bg-slate-200 transition-colors py-1 px-3 border border-slate-200/50"
                    onClick={() => onFilterMonto(50000)}
                >
                    Monto {">"} $50.000
                </Badge>

                <Badge
                    variant="secondary"
                    className="cursor-pointer hover:bg-slate-200 transition-colors py-1 px-3 border border-slate-200/50"
                    onClick={() => { const n = rolFilter === "supervisor" ? "todos" : "supervisor"; setRolFilter(n); onFilterRol(n); }}
                >
                    Rendición Supervisores
                </Badge>
            </div>
        </div>
    )
}
