"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { formatDate } from "@/lib/date-utils"

interface PresupuestosFinalesClientProps {
    initialData: any[]
    userRol: string
}

export default function PresupuestosFinalesClient({
    initialData,
    userRol
}: PresupuestosFinalesClientProps) {
    const [searchTerm, setSearchTerm] = useState("")

    const filteredData = initialData.filter((presupuesto) => {
        const searchLower = searchTerm.toLowerCase()
        return (
            presupuesto.code?.toLowerCase().includes(searchLower) ||
            presupuesto.titulo_tarea?.toLowerCase().includes(searchLower) ||
            presupuesto.nombre_edificio?.toLowerCase().includes(searchLower) ||
            presupuesto.code_tarea?.toLowerCase().includes(searchLower)
        )
    })

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar por código, tarea o edificio..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid gap-4">
                {filteredData.length === 0 ? (
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center text-muted-foreground">
                                No se encontraron presupuestos finales.
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    filteredData.map((presupuesto) => (
                        <Link
                            href={`/dashboard/presupuestos-finales/${presupuesto.id}`}
                            key={presupuesto.id}
                            className="block hover:no-underline"
                        >
                            <Card className="hover:bg-accent/5 transition-colors">
                                <CardContent className="p-6">
                                    <div className="flex flex-col md:flex-row justify-between gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-medium text-lg text-primary">{presupuesto.code}</h3>
                                                <Badge variant={presupuesto.aprobado ? "default" : presupuesto.rechazado ? "destructive" : "outline"}>
                                                    {presupuesto.aprobado ? "Aprobado" : presupuesto.rechazado ? "Rechazado" : "Pendiente"}
                                                </Badge>
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-sm font-semibold text-foreground">
                                                    {presupuesto.nombre_edificio || "Edificio N/A"}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    Tarea: <span className="font-medium text-foreground">{presupuesto.titulo_tarea || "N/A"}</span> ({presupuesto.code_tarea || "N/A"})
                                                </p>
                                                <p className="text-xs text-muted-foreground italic">
                                                    Documento Base: {presupuesto.code_presupuesto_base || "N/A"}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col justify-between items-end">
                                            <div className="text-sm text-muted-foreground">
                                                {formatDate(presupuesto.created_at)}
                                            </div>
                                            <div className="text-2xl font-bold text-primary">
                                                ${presupuesto.total?.toLocaleString() || "0"}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))
                )}
            </div>
        </div>
    )
}
