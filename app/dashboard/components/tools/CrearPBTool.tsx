"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"

export interface CrearPBToolProps {
    tareaId: number | string;
    codeTarea: string;
    diasInactivo: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function CrearPBTool({ tareaId, codeTarea, diasInactivo, open, onOpenChange, onSuccess }: CrearPBToolProps) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="h-[90vh] sm:h-[85vh] sm:max-w-md mx-auto rounded-t-3xl bg-slate-950 border-slate-800 p-0 flex flex-col">
                <div className="p-6 pb-2 border-b border-slate-800">
                    <SheetHeader>
                        <SheetTitle className="text-xl sm:text-2xl font-bold flex items-center justify-between text-slate-100">
                            Crear Presupuesto
                        </SheetTitle>
                        <SheetDescription className="text-slate-400">
                            Tarea: <strong className="text-slate-200">{codeTarea}</strong>
                        </SheetDescription>
                    </SheetHeader>

                    {/* Foco de Tensión Operativa */}
                    {diasInactivo > 3 && (
                        <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 flex flex-col">
                            <span className="text-xs text-rose-400 font-medium uppercase tracking-wider">Atención - Tarea Frenada</span>
                            <span className="text-lg font-bold text-rose-500 flex items-center gap-1">
                                Lleva {diasInactivo} días sin avanzar
                            </span>
                        </div>
                    )}
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    {/* TODO: Aquí inyectaremos GastoWizard Component en 'Modo Presupuesto' o PresupuestoBaseForm */}
                    <div className="flex flex-col gap-4 text-center items-center justify-center h-40 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                        <span>[ Formulario Completo de PB ]</span>
                        <span className="text-xs max-w-[200px]">El supervisor armará el PB directamente desde aquí sin salir de su "radar".</span>
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
