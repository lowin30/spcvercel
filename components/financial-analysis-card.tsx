"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, CheckCircle2 } from "lucide-react"

// Esquema de análisis financiero (debe coincidir con structured output de IA)
export interface FinancialAnalysis {
    metrica: string
    tarea_id?: number
    presupuesto_final?: number
    gastos_reales?: number
    ganancia_neta?: number
    ganancia_bruta?: number
    rentabilidad_porcentaje: number
    roi_porcentaje?: number
    margen_porcentaje?: number
    analisis: 'muy_rentable' | 'rentable' | 'aceptable' | 'bajo' | 'perdida' | 'inicial'
    desviacion_porcentaje?: number
    alerta: boolean
    recomendacion: string
}

// Componente para estadística individual
function Stat({ label, value, icon: Icon, trending }: {
    label: string
    value: string | number
    icon?: any
    trending?: 'up' | 'down' | 'neutral'
}) {
    return (
        <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
                {Icon && <Icon className="h-4 w-4" />}
                {label}
            </p>
            <p className="text-2xl font-bold flex items-center gap-2">
                {value}
                {trending === 'up' && <TrendingUp className="h-5 w-5 text-green-500" />}
                {trending === 'down' && <TrendingDown className="h-5 w-5 text-red-500" />}
            </p>
        </div>
    )
}

// Componente principal para análisis financiero
export function FinancialAnalysisCard({ data }: { data: FinancialAnalysis }) {
    const getBadgeVariant = (analisis: string) => {
        switch (analisis) {
            case 'muy_rentable':
                return 'default' // Verde
            case 'rentable':
                return 'secondary' // Azul
            case 'aceptable':
                return 'outline' // Gris
            case 'bajo':
            case 'perdida':
                return 'destructive' // Rojo
            default:
                return 'outline'
        }
    }

    const getBadgeIcon = (analisis: string) => {
        if (analisis === 'muy_rentable' || analisis === 'rentable') {
            return CheckCircle2
        }
        if (analisis === 'bajo' || analisis === 'perdida') {
            return AlertTriangle
        }
        return null
    }

    const Icon = getBadgeIcon(data.analisis)

    return (
        <Card className="border-2 shadow-lg">
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5" />
                            Análisis Financiero
                            {data.tarea_id && (
                                <span className="text-sm text-muted-foreground">
                                    (Tarea #{data.tarea_id})
                                </span>
                            )}
                        </CardTitle>
                        <CardDescription className="mt-1">
                            {data.metrica.replace(/_/g, ' ')}
                        </CardDescription>
                    </div>
                    <Badge variant={getBadgeVariant(data.analisis)} className="flex items-center gap-1">
                        {Icon && <Icon className="h-3 w-3" />}
                        {data.analisis.replace(/_/g, ' ').toUpperCase()}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-4">
                    {data.presupuesto_final !== undefined && (
                        <Stat
                            label="Presupuesto Final"
                            value={`$${data.presupuesto_final.toLocaleString()}`}
                        />
                    )}
                    {data.gastos_reales !== undefined && (
                        <Stat
                            label="Gastos Reales"
                            value={`$${data.gastos_reales.toLocaleString()}`}
                        />
                    )}
                    {data.ganancia_neta !== undefined && (
                        <Stat
                            label="Ganancia Neta"
                            value={`$${data.ganancia_neta.toLocaleString()}`}
                            trending={data.ganancia_neta > 0 ? 'up' : 'down'}
                        />
                    )}
                    {(data.rentabilidad_porcentaje !== undefined || data.roi_porcentaje !== undefined) && (
                        <Stat
                            label="ROI"
                            value={`${(data.roi_porcentaje || data.rentabilidad_porcentaje).toFixed(1)}%`}
                            trending={
                                (data.roi_porcentaje || data.rentabilidad_porcentaje) > 20
                                    ? 'up'
                                    : (data.roi_porcentaje || data.rentabilidad_porcentaje) < 10
                                        ? 'down'
                                        : 'neutral'
                            }
                        />
                    )}
                </div>

                {data.desviacion_porcentaje !== undefined && data.desviacion_porcentaje !== 0 && (
                    <div className="mb-4 p-3 bg-muted rounded-lg">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Desviación del presupuesto</span>
                            <Badge variant={data.desviacion_porcentaje > 0 ? 'destructive' : 'default'}>
                                {data.desviacion_porcentaje > 0 ? '+' : ''}
                                {data.desviacion_porcentaje.toFixed(1)}%
                            </Badge>
                        </div>
                    </div>
                )}

                {data.alerta && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            <strong>Alerta: </strong>
                            {data.recomendacion}
                        </AlertDescription>
                    </Alert>
                )}

                {!data.alerta && data.recomendacion && (
                    <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800 dark:text-green-200">
                            <strong>Recomendación: </strong>
                            {data.recomendacion}
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    )
}

// Función helper para extraer JSON del mensaje de IA
export function extractFinancialJSON(message: string): FinancialAnalysis | null {
    try {
        // Buscar bloque JSON en markdown
        const jsonMatch = message.match(/```json\n([\s\S]*?)\n```/)
        if (!jsonMatch) return null

        const jsonStr = jsonMatch[1]
        const parsed = JSON.parse(jsonStr)

        // Validar que tenga campos mínimos requeridos
        if (parsed.analisis && parsed.rentabilidad_porcentaje !== undefined) {
            return parsed as FinancialAnalysis
        }

        return null
    } catch (error) {
        console.error('[FinancialAnalysisCard] Error parsing JSON:', error)
        return null
    }
}
