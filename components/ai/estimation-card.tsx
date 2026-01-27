"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Sparkles, TrendingUp, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react"

interface EstimationData {
    descripcion: string
    tipo_trabajo: string
    materiales_estimados: number
    mano_obra_estimada: number
    presupuesto_base_total: number
    confianza: 'alta' | 'media' | 'baja'
    nota: string
    proyectos_similares: number
    source: string
}

interface EstimationCardProps {
    data: EstimationData
    onUseValues?: (data: EstimationData) => void
}

export function EstimationCard({ data, onUseValues }: EstimationCardProps) {
    // Calcular porcentajes para visuales (Barra de progreso)
    const total = data.presupuesto_base_total
    const pMateriales = total > 0 ? Math.round((data.materiales_estimados / total) * 100) : 0
    const pManoObra = total > 0 ? Math.round((data.mano_obra_estimada / total) * 100) : 0

    // Cero Monedas: Solo separación de miles, sin símbolo $ (según solicitud)
    const formatearNumero = (valor: number) =>
        valor.toLocaleString('es-AR')

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, type: "spring" }}
            className="w-full max-w-md my-4"
        >
            <Card className="border-l-4 border-l-violet-500 overflow-hidden shadow-lg bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm">

                {/* Header Badge: Vista de Administrador */}
                <div className="bg-gray-100 dark:bg-gray-900 px-4 py-1 flex justify-between items-center border-b dark:border-gray-800">
                    <span className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">
                        Vista de Administrador
                    </span>
                    <span className="text-[10px] text-gray-400">
                        Origen: Base de Datos Interna
                    </span>
                </div>

                <CardHeader className="pb-2 bg-gradient-to-r from-violet-50/50 to-transparent dark:from-violet-950/10">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-full">
                                <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                    Estimación Inteligente
                                </CardTitle>
                                <p className="text-xs text-muted-foreground capitalize">
                                    Categoría: {data.tipo_trabajo}
                                </p>
                            </div>
                        </div>
                        <Badge
                            variant={data.confianza === 'alta' ? 'default' : 'secondary'}
                            className={`${data.confianza === 'alta' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'} font-medium border-0`}
                        >
                            {data.confianza === 'alta' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
                            Confianza {data.confianza.charAt(0).toUpperCase() + data.confianza.slice(1)}
                        </Badge>
                    </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-4">
                    {/* Total Principal */}
                    <div className="text-center py-2">
                        <span className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Estimado Total</span>
                        <div className="text-4xl font-black text-gray-900 dark:text-white tracking-tight mt-1">
                            {formatearNumero(total)}
                        </div>
                        {data.proyectos_similares > 0 && (
                            <div className="flex items-center justify-center gap-1 mt-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
                                <TrendingUp className="w-3 h-3" />
                                Basado en {data.proyectos_similares} proyectos similares
                            </div>
                        )}
                    </div>

                    <Separator className="dark:bg-gray-800" />

                    {/* Desglose Visual */}
                    <div className="space-y-3">
                        {/* Mano de Obra */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-300">👷 Mano de Obra</span>
                                <span className="font-semibold text-gray-900 dark:text-white">{formatearNumero(data.mano_obra_estimada)}</span>
                            </div>
                            <Progress value={pManoObra} className="h-2 bg-gray-100 dark:bg-gray-800 [&>div]:bg-blue-500" />
                        </div>

                        {/* Materiales */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-300">🧱 Materiales</span>
                                <span className="font-semibold text-gray-900 dark:text-white">{formatearNumero(data.materiales_estimados)}</span>
                            </div>
                            <Progress value={pMateriales} className="h-2 bg-gray-100 dark:bg-gray-800 [&>div]:bg-amber-500" />
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-3 bg-gray-50 dark:bg-gray-900/50 p-4 border-t dark:border-gray-800">
                    <p className="text-xs text-muted-foreground italic text-center w-full">
                        "{data.nota}"
                    </p>

                    {/* Botón de Acción SPC */}
                    {onUseValues && (
                        <Button
                            className="w-full bg-violet-600 hover:bg-violet-700 text-white shadow-md transition-all"
                            onClick={() => onUseValues(data)}
                        >
                            Usar Valores para Nueva Tarea
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </motion.div>
    )
}
