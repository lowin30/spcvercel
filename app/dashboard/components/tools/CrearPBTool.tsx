"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import PresupuestoBaseForm from "@/components/presupuesto-base-form"
import { createClient } from "@/lib/supabase-client"
import { useRouter } from "next/navigation"
import { ScrollArea } from "@/components/ui/scroll-area"

export interface CrearPBToolProps {
    tareaId: number | string;
    codeTarea: string;
    tituloTarea: string; // Nuevo prop para mostrar el titulo en el form
    diasInactivo: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function CrearPBTool({ tareaId, codeTarea, tituloTarea, diasInactivo, open, onOpenChange, onSuccess }: CrearPBToolProps) {
    const [userId, setUserId] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const getSession = async () => {
            const { data } = await supabase.auth.getSession();
            if (data?.session?.user?.id) {
                setUserId(data.session.user.id);
            }
        };
        getSession();
    }, [supabase]);

    const handleSuccess = () => {
        onOpenChange(false);
        if (onSuccess) onSuccess();
        router.refresh();
    };

    // Mapeamos la tarea actual al formato que espera el Form
    const tareasArray = [{
        id: Number(tareaId),
        titulo: tituloTarea,
        code: codeTarea
    }];

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="h-[95vh] sm:h-[90vh] sm:max-w-2xl mx-auto rounded-t-[2.5rem] bg-background border-t border-border p-0 flex flex-col overflow-hidden shadow-2xl">
                <div className="p-6 pb-4 border-b border-border bg-muted/30">
                    <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full mx-auto mb-6" />
                    <SheetHeader>
                        <SheetTitle className="text-2xl font-black flex items-center justify-between tracking-tight">
                            Crear Presupuesto Base
                        </SheetTitle>
                        <SheetDescription className="text-muted-foreground font-medium">
                            Configuración técnica para la tarea <span className="text-foreground font-bold">{codeTarea}</span>
                        </SheetDescription>
                    </SheetHeader>

                    {/* Foco de Tensión Operativa Platinum */}
                    {diasInactivo > 3 && (
                        <div className="mt-4 p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-rose-500 font-black uppercase tracking-[0.15em]">Urgencia Detectada</span>
                                <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                                    Frenada hace {diasInactivo} días
                                </span>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-rose-500/10 flex items-center justify-center animate-pulse">
                                <span className="h-2 w-2 rounded-full bg-rose-500" />
                            </div>
                        </div>
                    )}
                </div>

                <ScrollArea className="flex-1 p-6">
                    <div className="max-w-xl mx-auto py-4">
                        {userId ? (
                            <PresupuestoBaseForm
                                tareas={tareasArray}
                                userId={userId}
                                initialTareaId={tareaId.toString()}
                                onSuccess={handleSuccess}
                                onCancel={() => onOpenChange(false)}
                            />
                        ) : (
                            <div className="flex items-center justify-center h-40">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <div className="p-4 safe-area-bottom bg-background border-t border-border">
                    <Button variant="ghost" className="w-full h-12 font-bold text-muted-foreground" onClick={() => onOpenChange(false)}>
                        Cerrar sin guardar
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    )
}
