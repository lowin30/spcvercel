"use client"

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { DesgloseGastosReales } from '@/components/desglose-gastos-reales'
import { CandidateTaskDTO } from '@/app/dashboard/liquidaciones/nueva/loader'

interface LiquidacionesNuevaFormProps {
    initialCandidates: CandidateTaskDTO[]
    userRole: string
    supervisores: { id: string; email: string }[]
    currentUserId: string
}

type Calculos = {
    gananciaNeta: number
    gananciaSupervisor: number
    gananciaAdmin: number
    totalSupervisor: number
    sobrecosto: boolean
    montoSobrecosto: number
    sobrecostoSupervisor: number
    sobrecostoAdmin: number
}

// Función auxiliar para mostrar valores monetarios
const MontoFormateado = ({ valor }: { valor: number }) => {
    const esNegativo = valor < 0
    return (
        <span className={`font-mono ${esNegativo ? 'text-red-500' : ''}`}>
            ${valor.toLocaleString('es-AR')}
        </span>
    )
}

export function LiquidacionesNuevaForm({ initialCandidates, userRole, supervisores, currentUserId }: LiquidacionesNuevaFormProps) {
    const supabase = createClient()
    const router = useRouter()

    const [loading, setLoading] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Estados de datos
    // Usamos un estado local para permitir filtros CLIENT-SIDE sobre la lista YA SEGURA del servidor
    const [presupuestos, setPresupuestos] = useState<CandidateTaskDTO[]>(initialCandidates)
    const [selectedPresupuestoId, setSelectedPresupuestoId] = useState<string>('')
    const [gastosReales, setGastosReales] = useState<number | null>(null)
    const [ajusteAdmin, setAjusteAdmin] = useState<number>(0)

    // Estados de filtros (Visuales sobre data segura)
    const [filtroSupervisor, setFiltroSupervisor] = useState(true) // Solo con supervisor por defecto
    const [supervisorEmail, setSupervisorEmail] = useState<string | '_todos_' | ''>('_todos_')
    const [busquedaTexto, setBusquedaTexto] = useState("")

    // Aplicar filtros visuales localmente
    useEffect(() => {
        let filtered = [...initialCandidates]

        if (busquedaTexto) {
            filtered = filtered.filter(p => p.titulo_tarea.toLowerCase().includes(busquedaTexto.toLowerCase()))
        }

        if (filtroSupervisor) {
            filtered = filtered.filter(p => p.id_supervisor !== null)
        }

        if (userRole === 'admin' && supervisorEmail && supervisorEmail !== '_todos_') {
            filtered = filtered.filter(p => p.email_supervisor === supervisorEmail)
        }

        setPresupuestos(filtered)
    }, [initialCandidates, busquedaTexto, filtroSupervisor, supervisorEmail, userRole])

    // Presupuesto seleccionado
    const selectedPresupuesto = useMemo(() => {
        return presupuestos.find(p => p.id.toString() === selectedPresupuestoId)
    }, [selectedPresupuestoId, presupuestos])

    // Efecto para obtener los gastos reales cuando se selecciona un presupuesto
    // MANTENEMOS RPC O SERVER ACTION PARA ESTO? 
    // La instrucción dice "QUIRURGICO", no cambiar lógica. Mantener RPC es lo más seguro para no romper nada.
    useEffect(() => {
        const fetchGastosReales = async () => {
            if (!selectedPresupuesto) {
                setGastosReales(null)
                return
            }

            const { data, error } = await supabase.rpc('calcular_gastos_reales_de_tarea', {
                p_id_tarea: selectedPresupuesto.id_tarea
            })

            if (error) {
                toast.error('Error al calcular los gastos reales de la tarea.')
                console.error(error)
                setGastosReales(null)
            } else {
                setGastosReales(data)
            }
        }

        fetchGastosReales()
    }, [selectedPresupuesto])


    // Memo para calcular las ganancias (LOGICA INTACTA)
    const calculos = useMemo((): Calculos | null => {
        if (!selectedPresupuesto || gastosReales === null) return null
        const totalBaseInt = Math.round(selectedPresupuesto.total ?? 0)
        const gastosRealesInt = Math.round(gastosReales)
        const propietario = !!(currentUserId && selectedPresupuesto.id_supervisor && currentUserId === selectedPresupuesto.id_supervisor)

        if (totalBaseInt <= 0) {
            return {
                gananciaNeta: 0,
                gananciaSupervisor: 0,
                gananciaAdmin: 0,
                totalSupervisor: propietario ? 0 : gastosRealesInt,
                sobrecosto: false,
                montoSobrecosto: 0,
                sobrecostoSupervisor: 0,
                sobrecostoAdmin: 0
            }
        }

        const gananciaNetaInt = totalBaseInt - gastosRealesInt

        if (propietario) {
            return {
                gananciaNeta: gananciaNetaInt,
                gananciaSupervisor: 0,
                gananciaAdmin: gananciaNetaInt,
                totalSupervisor: 0,
                sobrecosto: false,
                montoSobrecosto: 0,
                sobrecostoSupervisor: 0,
                sobrecostoAdmin: 0
            }
        }

        const gananciaSupervisorInt = Math.round(gananciaNetaInt * 0.5)
        const gananciaAdminInt = gananciaNetaInt - gananciaSupervisorInt
        const haySobrecosto = gananciaNetaInt < 0
        const montoSobrecostoInt = haySobrecosto ? Math.abs(gananciaNetaInt) : 0
        const sobrecostoSupervisorInt = haySobrecosto ? Math.abs(gananciaSupervisorInt) : 0
        const sobrecostoAdminInt = haySobrecosto ? Math.abs(gananciaAdminInt) : 0
        const totalSupervisorInt = gananciaSupervisorInt + gastosRealesInt

        return {
            gananciaNeta: gananciaNetaInt,
            gananciaSupervisor: gananciaSupervisorInt,
            gananciaAdmin: gananciaAdminInt,
            totalSupervisor: totalSupervisorInt,
            sobrecosto: haySobrecosto,
            montoSobrecosto: montoSobrecostoInt,
            sobrecostoSupervisor: sobrecostoSupervisorInt,
            sobrecostoAdmin: sobrecostoAdminInt
        }
    }, [selectedPresupuesto, gastosReales, currentUserId])

    // Manejador para crear la liquidación (LOGICA INTACTA, EXCEPTO REDIRECT)
    const handleCreateLiquidacion = async () => {
        if (!selectedPresupuesto || !calculos || !selectedPresupuesto.id_supervisor) {
            toast.error('Faltan datos para crear la liquidación. Asegúrese de que la tarea tenga un supervisor asignado.')
            return
        }

        setIsSubmitting(true)

        try {
            // Usar currentUserId prop en lugar de getUser() para consistencia
            const adminId = currentUserId
            const supervisorId = selectedPresupuesto.id_supervisor

            const timestamp = new Date().getTime()
            const randomSuffix = Math.floor(Math.random() * 1000)
            const code = `LIQ-${timestamp}-${randomSuffix}`

            const gastosRealesIntForInsert = Math.round(gastosReales ?? 0)
            const totalBaseIntForInsert = Math.round(selectedPresupuesto.total ?? 0)
            const ajusteAdminIntForInsert = Math.round(ajusteAdmin ?? 0)

            // Re-calculo para insert (redundante pero seguro, copiado de original)
            const propietario = (currentUserId && selectedPresupuesto.id_supervisor && currentUserId === selectedPresupuesto.id_supervisor)
            const gananciaNetaInt = totalBaseIntForInsert > 0 ? (totalBaseIntForInsert - gastosRealesIntForInsert) : 0
            let gananciaSupervisorInt = Math.round(gananciaNetaInt * 0.5)
            let gananciaAdminInt = gananciaNetaInt - gananciaSupervisorInt
            if (propietario) {
                gananciaSupervisorInt = 0
                gananciaAdminInt = gananciaNetaInt
            }
            const totalSupervisorInsert = totalBaseIntForInsert > 0
                ? (propietario ? 0 : (gananciaSupervisorInt + gastosRealesIntForInsert))
                : (propietario ? 0 : gastosRealesIntForInsert)

            const haySobrecostoInsert = (!propietario && totalBaseIntForInsert > 0 && gananciaNetaInt < 0)
            const montoSobrecostoInsert = haySobrecostoInsert ? Math.abs(gananciaNetaInt) : 0
            const sobrecostoSupervisorInsert = haySobrecostoInsert ? Math.abs(Math.round(gananciaNetaInt * 0.5)) : 0
            const sobrecostoAdminInsert = haySobrecostoInsert ? Math.abs(gananciaAdminInt) : 0


            // --- SERVER ACTION MIGRATION (v83.7) ---
            const formData = new FormData()
            formData.append('id_presupuesto_base', selectedPresupuesto.id.toString())
            formData.append('id_tarea', selectedPresupuesto.id_tarea.toString())
            formData.append('id_usuario_admin', adminId)
            formData.append('id_usuario_supervisor', supervisorId)
            formData.append('gastos_reales', gastosRealesIntForInsert.toString())
            formData.append('ganancia_neta', gananciaNetaInt.toString())
            formData.append('ganancia_supervisor', gananciaSupervisorInt.toString())
            formData.append('ganancia_admin', gananciaAdminInt.toString())
            formData.append('total_supervisor', totalSupervisorInsert.toString())
            formData.append('code', code)
            formData.append('total_base', totalBaseIntForInsert.toString())
            formData.append('ajuste_admin', ajusteAdminIntForInsert.toString())
            formData.append('sobrecosto', haySobrecostoInsert.toString())
            formData.append('monto_sobrecosto', montoSobrecostoInsert.toString())
            formData.append('sobrecosto_supervisor', sobrecostoSupervisorInsert.toString())
            formData.append('sobrecosto_admin', sobrecostoAdminInsert.toString())

            // Dynamic Import of Server Action to avoid Client Component issues if not handled
            const { createLiquidacionAction } = await import('@/app/dashboard/liquidaciones/actions')

            const result = await createLiquidacionAction(null, formData)

            if (!result || !result.success) {
                throw new Error(result?.message || "Error desconocido al crear liquidación")
            }

            toast.success('Liquidación creada con éxito!')

            // Reset y Refrescar
            router.refresh()
            setSelectedPresupuestoId('')
            setGastosReales(null)
            setAjusteAdmin(0)
            // Router Push opcional si se quiere redirigir
            // router.push('/dashboard/liquidaciones')

        } catch (error: any) {
            toast.error('Error al crear la liquidación: ' + error.message)
            console.error('Error detallado:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Crear Nueva Liquidación de Supervisor</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Columna de Filtros y Selección */}
                <div className="space-y-6">
                    {/* Filtros */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Filtros</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-2">
                                <Button
                                    variant={filtroSupervisor ? "default" : "outline"}
                                    onClick={() => setFiltroSupervisor(!filtroSupervisor)}
                                    size="sm"
                                >
                                    {filtroSupervisor ? "Con Supervisor" : "Todas"}
                                </Button>
                            </div>
                            {userRole === 'admin' && (
                                <div>
                                    <Select value={supervisorEmail || '_todos_'} onValueChange={(v) => setSupervisorEmail(v)}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Todos los supervisores" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="_todos_">Todos los supervisores</SelectItem>
                                            {supervisores.map(s => (
                                                <SelectItem key={s.id} value={s.email}>{s.email}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            <Input
                                placeholder="Buscar por título de tarea..."
                                value={busquedaTexto}
                                onChange={(e) => setBusquedaTexto(e.target.value)}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>1. Seleccionar Tarea a Liquidar</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Label htmlFor="presupuesto-select">Tarea (Presupuesto Base)</Label>
                            <Select
                                value={selectedPresupuestoId}
                                onValueChange={setSelectedPresupuestoId}
                                disabled={loading || isSubmitting}
                            >
                                <SelectTrigger id="presupuesto-select">
                                    <SelectValue placeholder={presupuestos.length === 0 ? 'No hay tareas disponibles' : 'Selecciona una tarea'} />
                                </SelectTrigger>
                                <SelectContent>
                                    {presupuestos.map(p => (
                                        <SelectItem key={p.id} value={p.id.toString()}>
                                            <div className="flex flex-col gap-1 py-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-medium">{p.titulo_tarea || 'Tarea sin título'}</span>
                                                    <Badge className="bg-green-100 text-green-800 text-xs">
                                                        {p.aprobado ? 'Aprobado' : 'Pendiente'}
                                                    </Badge>
                                                </div>
                                                <div className="text-xs text-muted-foreground flex flex-col sm:flex-row sm:gap-3">
                                                    <span>Base: ${p.total?.toLocaleString() || 'N/A'}</span>
                                                    <span className="hidden sm:inline">•</span>
                                                    <span>Supervisor: {p.email_supervisor || 'Sin asignar'}</span>
                                                </div>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </CardContent>
                    </Card>

                    <Button
                        onClick={handleCreateLiquidacion}
                        disabled={!calculos || isSubmitting}
                        className="w-full"
                    >
                        {isSubmitting ? 'Creando Liquidación...' : 'Crear Liquidación'}
                    </Button>
                </div>

                {/* Columna de Resumen de Cálculo */}
                <div>
                    {selectedPresupuesto && (
                        <Card>
                            <CardHeader>
                                <CardTitle>2. Resumen de Liquidación</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <h3 className="font-semibold text-lg">{selectedPresupuesto.titulo_tarea || 'Tarea sin título'}</h3>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Monto Presupuesto Base:</span>
                                    <span className="font-mono">${selectedPresupuesto.total.toLocaleString('es-AR') ?? 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">(-) Gastos Reales de Tarea:</span>
                                    <span className="font-mono">{gastosReales !== null ? `$${gastosReales.toLocaleString('es-AR')}` : 'Calculando...'}</span>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <Label htmlFor="ajuste-admin">Ajuste Administrativo:</Label>
                                        <span className="font-mono">${ajusteAdmin.toLocaleString('es-AR')}</span>
                                    </div>
                                    <div>
                                        <Input
                                            id="ajuste-admin"
                                            type="number"
                                            value={ajusteAdmin.toString()}
                                            onChange={(e) => setAjusteAdmin(Number(e.target.value) || 0)}
                                            className="w-full"
                                            placeholder="0"
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                </div>
                                <hr />
                                {calculos && (
                                    <>
                                        <div className="flex justify-between font-bold text-lg">
                                            <span>(=) Ganancia Neta:</span>
                                            <span className="font-mono">${calculos.gananciaNeta.toLocaleString('es-AR')}</span>
                                        </div>
                                        <hr />
                                        <div className="text-sm space-y-2 pt-2">
                                            {calculos.sobrecosto ? (
                                                <>
                                                    <p className="text-center font-bold text-red-500">¡ATENCIÓN! HAY SOBRECOSTO</p>
                                                    <div className="flex justify-between">
                                                        <span>Ganancia Neta:</span>
                                                        <MontoFormateado valor={calculos.gananciaNeta} />
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Ganancia Supervisor (50%):</span>
                                                        <MontoFormateado valor={calculos.gananciaSupervisor} />
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Ganancia Administración (50%):</span>
                                                        <MontoFormateado valor={calculos.gananciaAdmin} />
                                                    </div>
                                                    <div className="mt-2 pt-2 border-t border-gray-200">
                                                        <span className="text-xs text-gray-500">Campos de sobrecosto registrados:</span>
                                                        <div className="flex justify-between">
                                                            <span>Monto sobrecosto:</span>
                                                            <MontoFormateado valor={calculos.montoSobrecosto} />
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <p className="text-center text-muted-foreground">Distribución de Ganancias</p>
                                                    <div className="flex justify-between">
                                                        <span>Ganancia Neta:</span>
                                                        <MontoFormateado valor={calculos.gananciaNeta} />
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Ganancia Supervisor (50%):</span>
                                                        <MontoFormateado valor={calculos.gananciaSupervisor} />
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Ganancia Administración (50%):</span>
                                                        <MontoFormateado valor={calculos.gananciaAdmin} />
                                                    </div>
                                                </>
                                            )}

                                            <hr className="my-3" />
                                            <div className="bg-primary/5 p-3 rounded-lg border border-primary/20">
                                                <p className="text-xs text-muted-foreground mb-2 text-center font-medium">LIQUIDACIÓN FINAL - SUPERVISOR</p>
                                                <div className="space-y-1 text-sm">
                                                    <div className="flex justify-between">
                                                        <span>Ganancia del Supervisor:</span>
                                                        <MontoFormateado valor={calculos.gananciaSupervisor} />
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>(+) Gastos Reales (reembolso):</span>
                                                        <span className="font-mono">${gastosReales?.toLocaleString('es-AR')}</span>
                                                    </div>
                                                    <hr className="my-2" />
                                                    <div className="flex justify-between font-bold text-base text-primary">
                                                        <span>TOTAL A PAGAR:</span>
                                                        <span className="font-mono">${calculos.totalSupervisor.toLocaleString('es-AR')}</span>
                                                    </div>
                                                </div>
                                                <p className="text-[10px] text-muted-foreground mt-2 text-center italic">
                                                    * Incluye reembolso de gastos pagados por el supervisor
                                                </p>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {selectedPresupuesto && gastosReales !== null && (
                        <div className="mt-6">
                            <DesgloseGastosReales
                                idTarea={selectedPresupuesto.id_tarea}
                                totalGastos={gastosReales}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
