"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Send } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { marcarPresupuestoComoEnviado } from "@/app/dashboard/presupuestos-finales/actions"

interface PresupuestoDetailProps {
    presupuesto: any
    userDetails: any
}

export function PresupuestoDetail({ presupuesto, userDetails }: PresupuestoDetailProps) {
    const router = useRouter()
    const [enviandoPresupuesto, setEnviandoPresupuesto] = useState(false)

    const esFinal = presupuesto.tipo === "final"
    const estaAprobado = presupuesto.estados_presupuestos?.codigo === "aceptado" ||
        presupuesto.estados_presupuestos?.codigo === "facturado"

    const handleMarcarComoEnviado = async () => {
        if (!confirm("¿Marcar este presupuesto como enviado?")) {
            return
        }

        setEnviandoPresupuesto(true)
        try {
            const result = await marcarPresupuestoComoEnviado(Number(presupuesto.id))
            if (result.success) {
                toast.success(result.message || "Presupuesto marcado como enviado")
                router.refresh()
            } else {
                toast.error(result.message || "No se pudo marcar como enviado")
            }
        } catch (error) {
            toast.error("Ocurrió un error inesperado")
        } finally {
            setEnviandoPresupuesto(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight">
                        Presupuesto {esFinal ? "Final" : "Base"}
                    </h1>
                    <p className="text-gray-500">
                        Código: {presupuesto.code || "Sin código"}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {esFinal && presupuesto.estados_presupuestos && (
                        <Badge
                            style={{
                                backgroundColor: presupuesto.estados_presupuestos.color || "#888",
                                color: "white"
                            }}
                        >
                            {presupuesto.estados_presupuestos.nombre}
                        </Badge>
                    )}

                    {esFinal &&
                        presupuesto.estados_presupuestos?.codigo !== 'enviado' &&
                        presupuesto.estados_presupuestos?.codigo !== 'facturado' &&
                        presupuesto.estados_presupuestos?.codigo !== 'rechazado' &&
                        (userDetails?.rol === "admin" || userDetails?.rol === "supervisor") && (
                            <Button
                                variant="outline"
                                onClick={handleMarcarComoEnviado}
                                disabled={enviandoPresupuesto}
                                className="text-indigo-600 hover:text-indigo-800"
                            >
                                {enviandoPresupuesto ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        <Send className="h-4 w-4 mr-2" />
                                        Marcar como Enviado
                                    </>
                                )}
                            </Button>
                        )}

                    {(userDetails?.rol === "admin" || userDetails?.rol === "supervisor") && !estaAprobado && (
                        <Button
                            variant="outline"
                            onClick={() => router.push(`/dashboard/presupuestos-finales/editar/${presupuesto.id}`)} // Replaced legacy multi-path edit
                        >
                            Editar
                        </Button>
                    )}
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{esFinal ? "Detalles del Presupuesto Final" : "Detalles del Presupuesto Base"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {presupuesto.tareas && (
                        <div>
                            <h3 className="font-medium mb-1">Tarea asociada</h3>
                            <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                                <p className="font-medium">{presupuesto.tareas.titulo}</p>
                                <p className="text-sm text-gray-600">{presupuesto.tareas.descripcion}</p>
                                {presupuesto.tareas.edificios && (
                                    <p className="text-sm text-gray-500 mt-1">Edificio: {presupuesto.tareas.edificios.nombre}</p>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <h3 className="text-sm font-medium text-gray-500">Materiales</h3>
                            <p className="text-lg font-semibold">{formatCurrency(presupuesto.materiales || 0)}</p>
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-gray-500">Mano de Obra</h3>
                            <p className="text-lg font-semibold">{formatCurrency(presupuesto.mano_obra || 0)}</p>
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-gray-500">Total</h3>
                            <p className="text-lg font-semibold">{formatCurrency(presupuesto.total || 0)}</p>
                        </div>
                    </div>

                    {presupuesto.id_padre && esFinal && (
                        <div className="mt-2">
                            <h3 className="font-medium mb-1">Presupuesto Base</h3>
                            <Button
                                variant="link"
                                className="p-0"
                                onClick={() => router.push(`/dashboard/presupuestos-base/${presupuesto.id_padre}`)} // Redirect to Base if it's parent 
                            >
                                Ver presupuesto base asociado
                            </Button>
                        </div>
                    )}

                    {presupuesto.observaciones && (
                        <div>
                            <h3 className="font-medium mb-1">Observaciones</h3>
                            <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                                <p className="text-sm whitespace-pre-wrap">{presupuesto.observaciones}</p>
                            </div>
                        </div>
                    )}

                    {presupuesto.tipo === "base" && presupuesto.nota_pb && (
                        <div>
                            <h3 className="font-medium mb-1">Notas Internas</h3>
                            <div className="p-3 bg-yellow-50 rounded-md border border-yellow-200">
                                <p className="text-sm">{presupuesto.nota_pb}</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="flex justify-start">
                <Button
                    variant="outline"
                    onClick={() => router.push("/dashboard/presupuestos-finales")}
                >
                    Volver a Presupuestos
                </Button>
            </div>
        </div>
    )
}
