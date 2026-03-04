"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"

export interface GastoRapidoToolProps {
    tareaId: number | string;
    codeTarea: string;
    marginLibre: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function GastoRapidoTool({ tareaId, codeTarea, marginLibre, open, onOpenChange, onSuccess }: GastoRapidoToolProps) {
    // Aquí luego insertaremos el formulario real OCR que ya tienes en el sistema
    // Por ahora dejamos el skeleton/placeholder que confirma la abstracción
    const [loading, setLoading] = useState(false);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            {/* Usamos 'bottom' para simular un Drawer Nativo en Mobile */}
            <SheetContent side="bottom" className="h-[85vh] sm:h-[80vh] sm:max-w-md mx-auto rounded-t-3xl bg-slate-950 border-slate-800 p-0 flex flex-col">
                <div className="p-6 pb-2 border-b border-slate-800">
                    <SheetHeader>
                        <SheetTitle className="text-xl sm:text-2xl font-bold flex items-center justify-between text-slate-100">
                            Añadir Gasto Rápido
                        </SheetTitle>
                        <SheetDescription className="text-slate-400">
                            Operando sobre tarea: <strong className="text-slate-200">{codeTarea}</strong>
                        </SheetDescription>
                    </SheetHeader>
                    {/* Foco de Rentabilidad en el propio Formulario */}
                    <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex flex-col">
                        <span className="text-xs text-emerald-400 font-medium uppercase tracking-wider">Margen Operativo Libre</span>
                        <span className="text-xl font-bold text-emerald-500 flex items-center gap-1">
                            ${marginLibre.toLocaleString()}
                        </span>
                    </div>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    {/* TODO: Aquí inyectaremos el GastoWizard u OCR Components */}
                    <div className="flex flex-col gap-4 text-center items-center justify-center h-40 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                        <span>[ Formulario OCR de Gastos irá aquí ]</span>
                        <span className="text-xs max-w-[200px]">Cargando componente modular desde libreria interna...</span>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-800 bg-slate-950/80 backdrop-blur-md">
                    <Button className="w-full h-12 text-lg font-bold" onClick={() => onOpenChange(false)}>
                        Cerrar Tool
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    )
}
