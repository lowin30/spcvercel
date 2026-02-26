"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Check, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { aprobarPresupuestoAction } from "@/app/dashboard/tareas/actions"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

interface BudgetApproveActionProps {
    budgetId: number
    tipo: "base" | "final"
    tareaId: number
    userRol: string
    onSuccess?: () => void
    variant?: "default" | "outline" | "ghost" | "icon"
    className?: string
    disabled?: boolean
    budgetCode?: string
}

export function BudgetApproveAction({
    budgetId,
    tipo,
    tareaId,
    userRol,
    onSuccess,
    variant = "default",
    className = "",
    disabled = false,
    budgetCode
}: BudgetApproveActionProps) {
    const [isPending, setIsPending] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)

    const handleApprove = async () => {
        if (userRol !== "admin") {
            toast.error("Solo los administradores pueden aprobar presupuestos.")
            return
        }

        setIsPending(true)
        try {
            const result = await aprobarPresupuestoAction(budgetId, tipo, tareaId)

            if (result.success) {
                toast.success(
                    tipo === "final"
                        ? "Presupuesto aprobado y facturas generadas correctamente."
                        : "Presupuesto base aprobado."
                )
                if (onSuccess) onSuccess()
                setShowConfirm(false)
            } else {
                toast.error(result.message || "Error al aprobar el presupuesto.")
            }
        } catch (error) {
            console.error("Error in BudgetApproveAction:", error)
            toast.error("Ocurrió un error inesperado.")
        } finally {
            setIsPending(false)
        }
    }

    if (userRol !== "admin") return null

    const isIcon = variant === "icon"

    return (
        <>
            <Button
                variant={isIcon ? "outline" : variant}
                size={isIcon ? "icon" : "sm"}
                className={`${className} ${!isIcon && variant === "default"
                        ? "bg-green-600 hover:bg-green-700 text-white border-none shadow-sm"
                        : ""
                    }`}
                onClick={() => setShowConfirm(true)}
                disabled={disabled || isPending}
                title="Aprobar presupuesto"
            >
                {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <>
                        <Check className={`${!isIcon ? "mr-2" : ""} h-4 w-4`} />
                        {!isIcon && "Aprobar"}
                    </>
                )}
            </Button>

            <ConfirmDialog
                open={showConfirm}
                onOpenChange={setShowConfirm}
                onConfirm={handleApprove}
                isPending={isPending}
                tipo={tipo}
                budgetCode={budgetCode}
            />
        </>
    )
}

function ConfirmDialog({ open, onOpenChange, onConfirm, isPending, tipo, budgetCode }: any) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Confirmar Aprobación</DialogTitle>
                    <DialogDescription>
                        {tipo === "final"
                            ? `¿Estás seguro de que deseas aprobar el presupuesto final ${budgetCode || ""}? Esto generará automáticamente las facturas correspondientes.`
                            : `¿Estás seguro de que deseas aprobar el presupuesto base ${budgetCode || ""}?`
                        }
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-4 gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                        Cancelar
                    </Button>
                    <Button
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={onConfirm}
                        disabled={isPending}
                    >
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirmar Aprobación
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
