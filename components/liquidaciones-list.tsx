"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createBrowserSupabaseClient } from "@/lib/supabase-client"
import { formatDate } from "@/lib/date-utils"
import { Plus, Calendar, DollarSign, Clock, FileText, Briefcase, Users } from "lucide-react"
import { GenerarLiquidacionDialog } from "./generar-liquidacion-dialog"
import { useRouter } from "next/navigation"

interface Usuario {
  id: string
  nombre: string
  email: string
}

interface Liquidacion {
  id: number
  id_trabajador: string
  semana_inicio: string
  semana_fin: string
  total_dias: number
  salario_base: number
  plus_manual: number
  gastos_reembolsados: number
  total_pagar: number
  estado: string
  observaciones: string | null
  created_at: string
}

interface LiquidacionesListProps {
  userId: string
  userRole: string
}

// Interfaces para los resúmenes por rol
interface ResumenTrabajador {
  total_pendiente_partes: number;
  total_pendiente_gastos: number;
  partes_pendientes: number;
}

interface ResumenSupervisor {
  total_pendiente_partes: number;
  total_pendiente_gastos: number;
  trabajadores_pendientes: number;
}

interface ResumenAdmin {
  total_pendiente_partes: number;
  total_pendiente_gastos: number;
  liquidaciones_pendientes: number;
}

export function LiquidacionesList({ userId, userRole }: LiquidacionesListProps) {
  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([])
  const [trabajadores, setTrabajadores] = useState<Record<string, Usuario>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showGenerarDialog, setShowGenerarDialog] = useState(false)
  const [resumenTrabajador, setResumenTrabajador] = useState<ResumenTrabajador | null>(null)
  const [resumenSupervisor, setResumenSupervisor] = useState<ResumenSupervisor | null>(null)
  const [resumenAdmin, setResumenAdmin] = useState<ResumenAdmin | null>(null)
  const supabase = createBrowserSupabaseClient()
  const router = useRouter()

  // Cargamos los datos al montar el componente o cuando cambia userId/userRole
  useEffect(() => {
    cargarDatos()
    cargarResumenPorRol()
  }, [userId, userRole])

  // Función para cargar los datos de liquidaciones y trabajadores
  const cargarDatos = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // 1. Cargar liquidaciones - utilizamos un enfoque más seguro para la consulta
      // Usamos format ISO para las fechas para evitar problemas de formato
      let liquidacionesData = [];
      let liquidacionesError = null;

      try {
        if (userRole === "trabajador") {
          // Si es trabajador, consulta específica
          const { data, error } = await supabase
            .from("liquidaciones_trabajadores")
            .select("*")
            .eq("id_trabajador", userId)
            .order("semana_inicio", { ascending: false });
            
          liquidacionesData = data || [];
          liquidacionesError = error;
        } else {
          // Si no es trabajador, consulta general
          const { data, error } = await supabase
            .from("liquidaciones_trabajadores")
            .select("*")
            .order("semana_inicio", { ascending: false });
            
          liquidacionesData = data || [];
          liquidacionesError = error;
        }
      } catch (e) {
        console.error("Error al consultar liquidaciones_trabajadores:", e);
        liquidacionesError = e as any;
      }

      if (liquidacionesError) {
        console.error("Error al cargar liquidaciones:", liquidacionesError)
        setError("No se pudieron cargar las liquidaciones")
        return
      }
      
      // Guardar liquidaciones
      setLiquidaciones(liquidacionesData || [])
      
      if (!liquidacionesData || liquidacionesData.length === 0) {
        setIsLoading(false)
        return
      }
      
      // 2. Extraer IDs únicos de trabajadores
      const trabajadorIds = [...new Set(liquidacionesData.map((l: Liquidacion) => l.id_trabajador))]
      
      // 3. Cargar datos de trabajadores
      const { data: usuariosData, error: usuariosError } = await supabase
        .from("usuarios")
        .select("id, nombre, email")
        .in("id", trabajadorIds)
      
      if (usuariosError) {
        console.error("Error al cargar usuarios:", usuariosError)
        // No bloqueamos la carga por este error
      }
      
      // 4. Convertir array de usuarios a un objeto indexado por id
      const trabajadoresMap: Record<string, Usuario> = {}
      if (usuariosData) {
        usuariosData.forEach((user: Usuario) => {
          trabajadoresMap[user.id] = user
        })
      }
      
      setTrabajadores(trabajadoresMap)
    } catch (err) {
      console.error("Error inesperado:", err)
      setError("Ocurrió un error inesperado")
    } finally {
      setIsLoading(false)
    }
  }

  const formatMonto = (monto: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(monto)
  }

  const getEstadoColor = (estado: string) => {
    return estado === "pagado" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
  }

  // Función para cargar el resumen según el rol del usuario
  const cargarResumenPorRol = async () => {
    try {
      // Basado en el rol, llamamos a la función RPC correspondiente
      if (userRole === "trabajador") {
        const { data, error } = await supabase
          .rpc('calcular_pendiente_trabajador', { p_id_trabajador: userId })
        
        if (error) {
          console.error("Error al cargar resumen de trabajador:", error)
        } else if (data && data.length > 0) {
          setResumenTrabajador(data[0])
        }
      } 
      else if (userRole === "supervisor") {
        const { data, error } = await supabase
          .rpc('calcular_pendiente_supervisor', { p_id_supervisor: userId })
        
        if (error) {
          console.error("Error al cargar resumen de supervisor:", error)
        } else if (data && data.length > 0) {
          setResumenSupervisor(data[0])
        }
      } 
      else if (userRole === "admin") {
        const { data, error } = await supabase
          .rpc('calcular_pendiente_global_v2')
        
        if (error) {
          console.error("Error al cargar resumen global:", error)
        } else if (data && data.length > 0) {
          console.log('Datos resumen admin:', data[0]);
          setResumenAdmin(data[0])
        }
      }
    } catch (err) {
      console.error("Error al cargar resumen por rol:", err)
    }
  }

  const totalPendiente = liquidaciones
    .filter((l) => l.estado === "pendiente")
    .reduce((sum, l) => sum + l.total_pagar, 0)

  const totalPagado = liquidaciones.filter((l) => l.estado === "pagado").reduce((sum, l) => sum + l.total_pagar, 0)

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-center items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
            <span>Cargando liquidaciones...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Mensaje de error */}
      {error && (
        <div className="p-4 border rounded-md bg-destructive/10 text-destructive">
          <p>{error}</p>
        </div>
      )}

      {/* Estadísticas personalizadas por rol */}
      <div className="grid gap-4 md:grid-cols-3">
        {userRole === "trabajador" && resumenTrabajador && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Por Cobrar</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatMonto(resumenTrabajador.total_pendiente_partes + resumenTrabajador.total_pendiente_gastos)}</div>
                <p className="text-xs text-muted-foreground">Partes y gastos pendientes</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Cobrado</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatMonto(totalPagado)}</div>
                <p className="text-xs text-muted-foreground">Liquidaciones pagadas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Partes Pendientes</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{resumenTrabajador.partes_pendientes}</div>
                <p className="text-xs text-muted-foreground">Sin liquidar</p>
              </CardContent>
            </Card>
          </>
        )}

        {userRole === "supervisor" && resumenSupervisor && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Por Pagar (Mis Tareas)</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatMonto(resumenSupervisor.total_pendiente_partes + resumenSupervisor.total_pendiente_gastos)}</div>
                <p className="text-xs text-muted-foreground">Partes y gastos pendientes</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pagado (Mis Tareas)</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatMonto(totalPagado)}</div>
                <p className="text-xs text-muted-foreground">Liquidaciones pagadas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Trabajadores Pendientes</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{resumenSupervisor.trabajadores_pendientes}</div>
                <p className="text-xs text-muted-foreground">Con trabajo sin liquidar</p>
              </CardContent>
            </Card>
          </>
        )}

        {userRole === "admin" && resumenAdmin && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pendiente Global</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatMonto(resumenAdmin.total_pendiente_partes + resumenAdmin.total_pendiente_gastos)}</div>
                <p className="text-xs text-muted-foreground">Por liquidar en todo el sistema</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pagado Global</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatMonto(totalPagado)}</div>
                <p className="text-xs text-muted-foreground">Liquidaciones pagadas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Liquidaciones Pendientes</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{resumenAdmin.liquidaciones_pendientes}</div>
                <p className="text-xs text-muted-foreground">Por generar</p>
              </CardContent>
            </Card>
          </>
        )}

        {/* Mostrar tarjetas predeterminadas si no hay datos de resumen específico */}
        {(!resumenTrabajador && !resumenSupervisor && !resumenAdmin) && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pendiente</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatMonto(totalPendiente)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pagado</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatMonto(totalPagado)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Liquidaciones</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{liquidaciones.length}</div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Acciones */}
      {(userRole === "admin" || userRole === "supervisor") && (
        <div>
          <Button onClick={() => setShowGenerarDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Generar Liquidación
          </Button>
        </div>
      )}

      {/* Listado de liquidaciones */}
      <div className="space-y-4">
        {liquidaciones.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center">No se encontraron liquidaciones</div>
            </CardContent>
          </Card>
        ) : (
          liquidaciones.map((liquidacion) => (
            <Card 
              key={liquidacion.id} 
              className="hover:bg-slate-50 border-b cursor-pointer transition-colors"
              onClick={() => router.push(`/dashboard/trabajadores/liquidaciones/${liquidacion.id}`)}
            >
              <CardContent className="p-3">
                <div className="flex flex-col">
                  <div className="flex justify-between items-center">
                    <div>
                      {/* Primera línea: Trabajador y fecha */}
                      <div className="flex items-center gap-2">
                        <Badge className={`${getEstadoColor(liquidacion.estado)} text-xs px-1.5 py-0`}>
                          {liquidacion.estado === "pagado" ? "Pagado" : "Pendiente"}
                        </Badge>
                        <span className="text-sm font-medium">{trabajadores[liquidacion.id_trabajador]?.nombre || "Trabajador"}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(liquidacion.semana_inicio)} - {formatDate(liquidacion.semana_fin)}
                        </span>
                      </div>

                      {/* Segunda línea: Detalles numéricos */}
                      <div className="flex gap-4 mt-1.5">
                        <div className="text-xs">
                          <span className="text-muted-foreground mr-1">Días: </span>
                          <span className="font-medium">{liquidacion.total_dias}</span>
                        </div>
                        <div className="text-xs">
                          <span className="text-muted-foreground mr-1">Base: </span>
                          <span className="font-medium">{formatMonto(liquidacion.salario_base)}</span>
                        </div>
                        <div className="text-xs">
                          <span className="text-muted-foreground mr-1">Plus: </span>
                          <span className="font-medium">{formatMonto(liquidacion.plus_manual)}</span>
                        </div>
                        <div className="text-xs">
                          <span className="text-muted-foreground mr-1">Gastos: </span>
                          <span className="font-medium">{formatMonto(liquidacion.gastos_reembolsados)}</span>
                        </div>
                      </div>
                      
                      {/* Observaciones (si existen) */}
                      {liquidacion.observaciones && (
                        <p className="text-xs text-muted-foreground mt-1 truncate max-w-md">
                          {liquidacion.observaciones}
                        </p>
                      )}
                    </div>
                    
                    {/* Columna derecha - solo total */}
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatMonto(liquidacion.total_pagar)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Diálogo para generar liquidación */}
      {showGenerarDialog && (
        <GenerarLiquidacionDialog
          open={showGenerarDialog}
          onOpenChange={setShowGenerarDialog}
          onSuccess={cargarDatos}
        />
      )}
    </div>
  )
}
