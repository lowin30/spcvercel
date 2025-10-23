'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { hasPermission } from '@/lib/permissions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { DesgloseGastosReales } from '@/components/desglose-gastos-reales'

// Tipos
interface PresupuestoFinal {
  id: number
  code: string
  id_tarea: number
  total: number
  total_base: number
  id_estado: number
  aprobado: boolean
  rechazado: boolean
  observaciones_admin: string | null
  id_supervisor: string | null
  email_supervisor: string | null
  tareas: {
    titulo: string
    id: number
  }
  presupuestos_base: {
    id: number
    total: number
  }
  supervisores_tareas: {
    id_supervisor: string
    usuarios: {
      email: string
    }
  }
}

type Calculos = {
  gananciaNeta: number
  gananciaSupervisor: number
  gananciaAdmin: number
  totalSupervisor: number  // ✅ NUEVO: Total a pagar al supervisor (ganancia + gastos)
  sobrecosto: boolean
  montoSobrecosto: number
  sobrecostoSupervisor: number
  sobrecostoAdmin: number
}

// Función auxiliar para mostrar valores monetarios con color basado en signo
const MontoFormateado = ({ valor }: { valor: number }) => {
  const esNegativo = valor < 0
  return (
    <span className={`font-mono ${esNegativo ? 'text-red-500' : ''}`}>
      ${valor.toLocaleString('es-AR')}
    </span>
  )
}

export default function NuevaLiquidacionSupervisorPage () {
  const supabase = createClient()
  const router = useRouter()

  // Estados de autorización y carga
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Estados de datos
  const [presupuestos, setPresupuestos] = useState<PresupuestoFinal[]>([])
  const [selectedPresupuestoId, setSelectedPresupuestoId] = useState<string>('')
  const [gastosReales, setGastosReales] = useState<number | null>(null)
  const [ajusteAdmin, setAjusteAdmin] = useState<number>(0)

  // Estados de filtros
  const [filtroEstado, setFiltroEstado] = useState<number[]>([3, 4]) // Aceptados y Facturados por defecto
  const [filtroSupervisor, setFiltroSupervisor] = useState(true) // Solo con supervisor por defecto
  const [busquedaTexto, setBusquedaTexto] = useState("")

  // Efecto para verificar permisos al cargar la página
  useEffect(() => {
    const checkAuthorization = async () => {
      const canCreate = await hasPermission('crear_liquidaciones_supervisor')
      setIsAuthorized(canCreate)
      setIsCheckingAuth(false)
      if (!canCreate) {
        toast.error('No tienes permiso para crear liquidaciones de supervisor.')
        router.push('/dashboard/liquidaciones')
      }
    }
    checkAuthorization()
  }, [router])

  // Función para obtener los presupuestos finales que no tienen liquidación
  const fetchPresupuestosSinLiquidar = async () => {
    setLoading(true)

    try {
      // 1. Obtenemos los presupuestos finales sin liquidación
      let query = supabase
        .from('presupuestos_finales')
        .select(`
          id,
          code,
          id_tarea,
          total,
          total_base,
          id_estado,
          aprobado,
          rechazado,
          observaciones_admin,
          tareas (id, titulo),
          presupuestos_base (id, total)
        `)
        .is('id_liquidacion_supervisor', null)

      // Aplicar filtros
      if (filtroEstado && filtroEstado.length > 0) {
        query = query.in('id_estado', filtroEstado)
      }

      // Aplicar búsqueda si hay texto
      if (busquedaTexto) {
        query = query.ilike('tareas.titulo', `%${busquedaTexto}%`)
      }

      const { data: presupuestosData, error: presupuestosError } = await query.order('total_base', { ascending: false })

      if (presupuestosError) {
        throw presupuestosError
      }

      if (!presupuestosData || presupuestosData.length === 0) {
        setPresupuestos([])
        setLoading(false)
        return
      }

      // 2. Para cada presupuesto, obtenemos el supervisor de la tarea asociada
      const presupuestosConSupervisores = await Promise.all(presupuestosData.map(async (presupuesto: any) => {
        const idTarea = presupuesto.id_tarea

        if (!idTarea) {
          return {
            ...presupuesto,
            id_supervisor: null,
            email_supervisor: null
          }
        }

        // Buscamos en supervisores_tareas el supervisor asignado a esta tarea
        const { data: supervisorData, error: supervisorError } = await supabase
          .from('supervisores_tareas')
          .select('id_supervisor, usuarios (email)')
          .eq('id_tarea', idTarea)
          .limit(1)
          .maybeSingle()

        if (supervisorError) {
          console.error('Error al obtener supervisor:', supervisorError)
        }

        return {
          ...presupuesto,
          id_supervisor: supervisorData?.id_supervisor || null,
          email_supervisor: supervisorData?.usuarios?.email || null  // ✅ CORREGIDO: usuarios es objeto, no array
        }
      }))

      // 3. Filtrar por supervisor si está activo el filtro
      let presupuestosFiltrados = presupuestosConSupervisores
      if (filtroSupervisor) {
        presupuestosFiltrados = presupuestosConSupervisores.filter(p => p.id_supervisor !== null)
      }

      setPresupuestos(presupuestosFiltrados as PresupuestoFinal[])
    } catch (error) {
      toast.error('Error al cargar los presupuestos.')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // Cargar presupuestos al inicio si el usuario está autorizado
  useEffect(() => {
    if (isAuthorized) {
      fetchPresupuestosSinLiquidar()
    }
  }, [isAuthorized, filtroEstado, filtroSupervisor])

  // Presupuesto seleccionado
  const selectedPresupuesto = useMemo(() => {
    return presupuestos.find(p => p.id.toString() === selectedPresupuestoId)
  }, [selectedPresupuestoId, presupuestos])

  // Efecto para obtener los gastos reales cuando se selecciona un presupuesto
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

  // Memo para calcular las ganancias
  const calculos = useMemo((): Calculos | null => {
    if (!selectedPresupuesto || !selectedPresupuesto.presupuestos_base || gastosReales === null) return null

    const totalBase = selectedPresupuesto.presupuestos_base.total
    const haySobrecosto = gastosReales > totalBase
    
    // Calcular la ganancia neta (positiva o negativa)
    const gananciaNeta = totalBase - gastosReales
    
    // Distribuir la ganancia/pérdida entre supervisor y administración
    const gananciaSupervisor = gananciaNeta * 0.50
    const gananciaAdmin = gananciaNeta * 0.50
    
    // Calcular el sobrecosto (para mantener el campo sobrecosto)
    const montoSobrecosto = haySobrecosto ? Math.abs(gananciaNeta) : 0
    const sobrecostoSupervisor = haySobrecosto ? Math.abs(gananciaSupervisor) : 0
    const sobrecostoAdmin = haySobrecosto ? Math.abs(gananciaAdmin) : 0
    
    // ✅ NUEVO: Total que recibe el supervisor (ganancia + gastos reales para pagarlos)
    const totalSupervisor = gananciaSupervisor + gastosReales

    return {
      gananciaNeta, 
      gananciaSupervisor, 
      gananciaAdmin,
      totalSupervisor,  // ✅ NUEVO
      sobrecosto: haySobrecosto,
      montoSobrecosto,
      sobrecostoSupervisor,
      sobrecostoAdmin
    }
  }, [selectedPresupuesto, gastosReales])

  // Manejador para crear la liquidación
  const handleCreateLiquidacion = async () => {
    if (!selectedPresupuesto || !calculos || !selectedPresupuesto.id_supervisor) {
      toast.error('Faltan datos para crear la liquidación. Asegúrese de que la tarea tenga un supervisor asignado.')
      return
    }

    setIsSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('No se pudo obtener el usuario. Por favor, inicie sesión de nuevo.')
        setIsSubmitting(false)
        return
      }
      
      // Buscar la factura asociada al presupuesto final seleccionado
      const { data: facturaData, error: facturaError } = await supabase
        .from('facturas')
        .select('id')
        .eq('id_presupuesto_final', selectedPresupuesto.id)
        .maybeSingle()
        
      if (facturaError) {
        console.error('Error al buscar la factura:', facturaError)
        // Continuamos sin factura, pero registramos el error
      }

      // Datos para la nueva liquidación
      const adminId = user.id
      const supervisorId = selectedPresupuesto.id_supervisor

      // Generar un código único para la liquidación
      const timestamp = new Date().getTime()
      const randomSuffix = Math.floor(Math.random() * 1000)
      const code = `LIQ-${timestamp}-${randomSuffix}`
      
      const { data: liquidacionData, error: liquidacionError } = await supabase
        .from('liquidaciones_nuevas')
        .insert({
          id_presupuesto_final: selectedPresupuesto.id,
          id_presupuesto_base: selectedPresupuesto.presupuestos_base.id, // Añadimos el id del presupuesto base
          id_tarea: selectedPresupuesto.id_tarea, // ID de la tarea
          id_usuario_admin: adminId,
          id_usuario_supervisor: supervisorId,
          gastos_reales: gastosReales,
          ganancia_neta: calculos.gananciaNeta,
          ganancia_supervisor: calculos.gananciaSupervisor,
          ganancia_admin: calculos.gananciaAdmin,
          total_supervisor: calculos.totalSupervisor, // ✅ NUEVO: Total que recibe el supervisor
          code: code, // Código único generado
          total_base: selectedPresupuesto.total_base, // Total base del presupuesto
          ajuste_admin: ajusteAdmin, // Ajuste administrativo
          id_factura: facturaData?.id || null, // Relación con la factura si existe
          sobrecosto: calculos.sobrecosto, // Indicador de sobrecosto
          monto_sobrecosto: calculos.montoSobrecosto, // Monto total del sobrecosto
          sobrecosto_supervisor: calculos.sobrecostoSupervisor, // Parte del sobrecosto del supervisor
          sobrecosto_admin: calculos.sobrecostoAdmin // Parte del sobrecosto del administrador
        })
        .select('id')
        .single()

      if (liquidacionError) {
        throw liquidacionError
      }

      // Actualizar el presupuesto final para marcarlo como liquidado
      const { error: updateError } = await supabase
        .from('presupuestos_finales')
        .update({ id_liquidacion_supervisor: liquidacionData.id })
        .eq('id', selectedPresupuesto.id)

      if (updateError) {
        // Opcional: manejar el caso donde la liquidación se creó pero la actualización falló
        toast.error('La liquidación se creó, pero falló al actualizar el presupuesto.')
        console.error('Error al actualizar presupuesto_final:', updateError)
      } else {
        toast.success('Liquidación creada con éxito!')
      }

      // Resetear estado
      setSelectedPresupuestoId('')
      setGastosReales(null)
      setAjusteAdmin(0)
      // Refrescar la lista de presupuestos
      // Reusamos la función fetchPresupuestosSinLiquidar para mantener consistencia
      await fetchPresupuestosSinLiquidar()
    } catch (error: any) {
      toast.error('Error al crear la liquidación.')
      console.error('Error detallado:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Renderizado condicional
  if (isCheckingAuth || !isAuthorized) {
    return (
      <div className="flex justify-center items-center h-full">
        <p>Verificando permisos...</p>
      </div>
    )
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
                  variant={filtroEstado.length === 2 && filtroEstado.includes(3) && filtroEstado.includes(4) ? "default" : "outline"}
                  onClick={() => setFiltroEstado([3, 4])}
                  size="sm"
                >
                  Aceptados/Facturados
                </Button>
                <Button
                  variant={filtroEstado.length === 0 ? "default" : "outline"}
                  onClick={() => setFiltroEstado([])}
                  size="sm"
                >
                  Todos
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filtroSupervisor ? "default" : "outline"}
                  onClick={() => setFiltroSupervisor(!filtroSupervisor)}
                  size="sm"
                >
                  {filtroSupervisor ? "Con Supervisor" : "Todas"}
                </Button>
              </div>
              <Input
                placeholder="Buscar por título de tarea..."
                value={busquedaTexto}
                onChange={(e) => setBusquedaTexto(e.target.value)}
              />
              <Button
                onClick={fetchPresupuestosSinLiquidar}
                disabled={loading}
                size="sm"
              >
                Aplicar Filtros
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>1. Seleccionar Tarea a Liquidar</CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="presupuesto-select">Tarea (Presupuesto Final)</Label>
              <Select
                value={selectedPresupuestoId}
                onValueChange={setSelectedPresupuestoId}
                disabled={loading || isSubmitting}
              >
                <SelectTrigger id="presupuesto-select">
                  <SelectValue placeholder={loading ? 'Cargando tareas...' : 'Selecciona una tarea'} />
                </SelectTrigger>
                <SelectContent>
                  {presupuestos.map(p => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      <div className="flex flex-col gap-1 py-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{p.tareas?.titulo || 'Tarea sin título'}</span>
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            {p.id_estado === 3 ? 'Aceptado' : p.id_estado === 4 ? 'Facturado' : 'Otro'}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground flex flex-col sm:flex-row sm:gap-3">
                          <span>Base: ${p.presupuestos_base?.total?.toLocaleString() || 'N/A'}</span>
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
                <h3 className="font-semibold text-lg">{selectedPresupuesto.tareas?.titulo || 'Tarea sin título'}</h3>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monto Presupuesto Base:</span>
                  <span className="font-mono">${selectedPresupuesto.presupuestos_base?.total.toLocaleString('es-AR') ?? 'N/A'}</span>
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
                      
                      {/* ✅ NUEVO: Mostrar total para supervisor */}
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
          
          {/* ✅ NUEVO: Desglose de Gastos Reales */}
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