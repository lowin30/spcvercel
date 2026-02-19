"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ProcesadorImagen } from "@/components/procesador-imagen"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { UserSessionData } from "@/lib/types"
import { Plus, Loader2, X, ArrowLeft } from "lucide-react"
import { toast } from "sonner"

interface Tarea {
    id: number
    titulo: string
    code: string
}

interface Liquidacion {
    gastos_reembolsados: number;
    created_at: string;
    total_pagar: number;
}

interface ParteTrabajoConSalario {
    id: number;
    fecha: string;
    tipo_jornada: 'dia_completo' | 'medio_dia';
    id_tarea: number;
    id_trabajador: string;
    liquidado: boolean;
    titulo_tarea: string;
    code_tarea: string;
    nombre_edificio: string;
    salario_diario: number;
}

interface ResumenPorTarea {
    id_tarea: number;
    titulo_tarea: string;
    code_tarea: string;
    gastos_monto: number;
    gastos_count: number;
    jornales_monto: number;
    jornales_dias: number;
    total_tarea: number;
}

interface GastoCompleto {
    id: number
    id_tarea: number
    titulo_tarea: string
    code_tarea: string
    monto: number
    fecha_gasto: string
    liquidado: boolean
    id_usuario: string
    [key: string]: any
}

interface GastosPageClientProps {
    userDetails: UserSessionData
    initialGastos: GastoCompleto[]
    initialJornales: ParteTrabajoConSalario[]
    initialLastLiquidation: Liquidacion | null
    initialTareas: Tarea[]
}

export default function GastosPageClient({
    userDetails,
    initialGastos,
    initialJornales,
    initialLastLiquidation,
    initialTareas,
}: GastosPageClientProps) {
    const [mostrarFormulario, setMostrarFormulario] = useState(false)
    const [tareaSeleccionada, setTareaSeleccionada] = useState<string>("")
    const [historyFilter, setHistoryFilter] = useState<'all' | 'this_week' | 'pending_previous'>('all')
    const [tabActual, setTabActual] = useState('resumen')
    const router = useRouter()

    // Computed: week/pending stats
    const { weekStats, pendingStats, filteredHistory } = useMemo(() => {
        const hoy = new Date()
        const inicioSemana = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - hoy.getDay() + (hoy.getDay() === 0 ? -6 : 1))
        inicioSemana.setHours(0, 0, 0, 0)

        const gastosDeLaSemana = initialGastos.filter(g => new Date(g.fecha_gasto) >= inicioSemana)
        const gastosPendientesAnteriores = initialGastos.filter(g => new Date(g.fecha_gasto) < inicioSemana)

        const week = {
            total: gastosDeLaSemana.reduce((sum, g) => sum + g.monto, 0),
            count: gastosDeLaSemana.length
        }

        const pending = {
            total: gastosPendientesAnteriores.reduce((sum, g) => sum + g.monto, 0),
            count: gastosPendientesAnteriores.length
        }

        let filtered: GastoCompleto[]
        if (historyFilter === 'this_week') {
            filtered = gastosDeLaSemana
        } else if (historyFilter === 'pending_previous') {
            filtered = gastosPendientesAnteriores
        } else {
            filtered = initialGastos
        }

        return { weekStats: week, pendingStats: pending, filteredHistory: filtered }
    }, [initialGastos, historyFilter])

    // Computed: jornales stats
    const { totalJornales, totalDias } = useMemo(() => {
        const totalMonto = initialJornales.reduce((sum, parte) => {
            const monto = parte.tipo_jornada === 'dia_completo' ? parte.salario_diario : parte.salario_diario * 0.5
            return sum + monto
        }, 0)

        const totalD = initialJornales.reduce((sum, parte) => {
            return sum + (parte.tipo_jornada === 'dia_completo' ? 1 : 0.5)
        }, 0)

        return { totalJornales: totalMonto, totalDias: totalD }
    }, [initialJornales])

    // Computed: desglose por tarea
    const desglosePorTarea = useMemo(() => {
        const tareaMap: Record<number, ResumenPorTarea> = {}

        initialGastos.forEach(gasto => {
            if (!tareaMap[gasto.id_tarea]) {
                tareaMap[gasto.id_tarea] = {
                    id_tarea: gasto.id_tarea,
                    titulo_tarea: gasto.titulo_tarea,
                    code_tarea: gasto.code_tarea,
                    gastos_monto: 0, gastos_count: 0,
                    jornales_monto: 0, jornales_dias: 0,
                    total_tarea: 0
                }
            }
            tareaMap[gasto.id_tarea].gastos_monto += gasto.monto
            tareaMap[gasto.id_tarea].gastos_count += 1
        })

        initialJornales.forEach(parte => {
            if (!tareaMap[parte.id_tarea]) {
                tareaMap[parte.id_tarea] = {
                    id_tarea: parte.id_tarea,
                    titulo_tarea: parte.titulo_tarea,
                    code_tarea: parte.code_tarea,
                    gastos_monto: 0, gastos_count: 0,
                    jornales_monto: 0, jornales_dias: 0,
                    total_tarea: 0
                }
            }
            const monto = parte.tipo_jornada === 'dia_completo' ? parte.salario_diario : parte.salario_diario * 0.5
            const dias = parte.tipo_jornada === 'dia_completo' ? 1 : 0.5
            tareaMap[parte.id_tarea].jornales_monto += monto
            tareaMap[parte.id_tarea].jornales_dias += dias
        })

        return Object.values(tareaMap)
            .map(tarea => ({ ...tarea, total_tarea: tarea.gastos_monto + tarea.jornales_monto }))
            .sort((a, b) => b.total_tarea - a.total_tarea)
    }, [initialGastos, initialJornales])

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">{mostrarFormulario ? 'Registrar Nuevo Gasto' : 'Gestión de Gastos'}</h1>
                    {!mostrarFormulario && (
                        <p className="text-muted-foreground mt-1">Registra tus gastos con comprobantes</p>
                    )}
                </div>
                {!mostrarFormulario && (
                    <Button
                        onClick={() => setMostrarFormulario(true)}
                        className="flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Registrar Gasto
                    </Button>
                )}
            </div>

            {mostrarFormulario ? (
                !tareaSeleccionada ? (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Seleccionar Tarea</CardTitle>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setMostrarFormulario(false);
                                        setTareaSeleccionada("");
                                    }}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="tarea">Seleccionar Tarea *</Label>
                                <Select value={tareaSeleccionada} onValueChange={setTareaSeleccionada}>
                                    <SelectTrigger id="tarea">
                                        <SelectValue placeholder="Selecciona una tarea" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {initialTareas.map((tarea) => (
                                            <SelectItem key={tarea.id} value={tarea.id.toString()}>
                                                {tarea.code} - {tarea.titulo}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg font-medium">
                                    {initialTareas.find(t => t.id === Number(tareaSeleccionada))?.titulo}
                                </CardTitle>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setTareaSeleccionada("");
                                    }}
                                >
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Cambiar
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ProcesadorImagen
                                tareaId={Number(tareaSeleccionada)}
                                tareaCodigo={initialTareas.find(t => t.id === Number(tareaSeleccionada))?.code}
                                tareaTitulo={initialTareas.find(t => t.id === Number(tareaSeleccionada))?.titulo}
                                onSuccess={() => {
                                    router.refresh()
                                    toast.success("Gasto registrado correctamente")
                                }}
                            />
                        </CardContent>
                    </Card>
                )
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Bienvenido</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            Haz click en "Registrar Gasto" para comenzar.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
