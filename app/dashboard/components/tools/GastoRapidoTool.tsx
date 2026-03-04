"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { ProcesadorImagen } from "@/components/procesador-imagen"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useRouter } from "next/navigation"

export interface GastoRapidoToolProps {
    tareaId: number | string;
    codeTarea: string;
    tituloTarea: string; // Nuevo prop para mostrar el titulo en el tool
    marginLibre: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function GastoRapidoTool({ tareaId, codeTarea, tituloTarea, marginLibre, open, onOpenChange, onSuccess }: GastoRapidoToolProps) {
    const router = useRouter();

    const handleSuccess = () => {
        onOpenChange(false);
        if (onSuccess) onSuccess();
        router.refresh();
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="h-[95vh] sm:h-[90vh] sm:max-w-2xl mx-auto rounded-t-[2.5rem] bg-background border-t border-border p-0 flex flex-col overflow-hidden shadow-2xl">
                <div className="p-6 pb-4 border-b border-border bg-muted/30">
                    <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full mx-auto mb-6" />
                    <SheetHeader>
                        <SheetTitle className="text-2xl font-black flex items-center justify-between tracking-tight">
                            Añadir Gasto Rápido
                        </SheetTitle>
                        <SheetDescription className="text-muted-foreground font-medium">
                            Carga de comprobante para <span className="text-foreground font-bold">{codeTarea}</span>
                        </SheetDescription>
                    </SheetHeader>

                    {/* Foco de Rentabilidad Platinum */}
                    <div className="mt-4 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-emerald-500 font-black uppercase tracking-[0.15em]">Salud del Margen</span>
                            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                                ${marginLibre.toLocaleString()}
                            </span>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        </div>
                    </div>
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-4 sm:p-6 pb-12">
                        <ProcesadorImagen
                            tareaId={Number(tareaId)}
                            tareaCodigo={codeTarea}
                            tareaTitulo={tituloTarea}
                            onSuccess={handleSuccess}
                        />
                    </div>
                </ScrollArea>

                <div className="p-4 safe-area-bottom bg-background border-t border-border">
                    <Button variant="ghost" className="w-full h-12 font-bold text-muted-foreground" onClick={() => onOpenChange(false)}>
                        Cerrar Tool
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    )
}
