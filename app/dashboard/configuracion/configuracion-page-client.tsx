"use client"

import { useState } from "react"
import ConfiguracionTabs from "@/components/configuracion-tabs"

interface ConfiguracionPageClientProps {
    trabajadores: any[]
    combinedUsers: any[]
    productos: any[]
    categorias: any[]
    administradores: any[]
    estadosTareas: any[]
    estadosPresupuestos: any[]
    estadosFacturas: any[]
}

export default function ConfiguracionPageClient({
    trabajadores,
    combinedUsers,
    productos,
    categorias,
    administradores,
    estadosTareas,
    estadosPresupuestos,
    estadosFacturas,
}: ConfiguracionPageClientProps) {
    return (
        <div className="container mx-auto py-6 md:py-10 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
                    <p className="text-muted-foreground">
                        Configuración general del sistema y usuarios
                    </p>
                </div>
            </div>

            <ConfiguracionTabs
                trabajadores={trabajadores}
                combinedUsers={combinedUsers}
                productos={productos}
                categorias={categorias}
                administradores={administradores}
                estadosTareas={estadosTareas}
                estadosPresupuestos={estadosPresupuestos}
                estadosFacturas={estadosFacturas}
            />
        </div>
    )
}
