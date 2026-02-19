"use client"

import { BuildingWizard } from "@/components/buildings/building-wizard"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

interface NuevoEdificioClientProps {
    administradores: any[]
}

export default function NuevoEdificioClient({ administradores }: NuevoEdificioClientProps) {
    return (
        <div className="space-y-6 pb-24">
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <Button variant="ghost" size="sm" asChild className="mr-2">
                        <Link href="/dashboard/edificios">
                            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
                        </Link>
                    </Button>
                    <h1 className="text-2xl font-bold tracking-tight">Nuevo Edificio</h1>
                </div>
            </div>

            <BuildingWizard administradores={administradores} mode="create" />
        </div>
    )
}
