"use client"

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
// Ya no usamos pestañas
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase-client"
import { ArrowLeft } from "lucide-react"
import { DescargarLiquidacionTrabajadorPdfButton } from "@/app/dashboard/trabajadores/liquidaciones/[id]/descargar-liquidacion-trabajador-pdf-button"

// Definir interfaces para los tipos de datos
interface Tarea {
  id: number
  nombre: string
  id_proyecto: number
}

interface Proyecto {
  id: number
  nombre: string
}

interface ParteDeTrabajo {
  id: number
  id_trabajador: string
  id_tarea: number
  fecha: string
  tipo_jornada: 'dia_completo' | 'medio_dia'
  liquidado: boolean
  titulo_tarea?: string
  code_tarea?: string
  nombre_edificio?: string
  comentarios?: string
}

interface Gasto {
  id: number
  id_usuario: string
  id_tarea: number
  fecha_gasto: string
  descripcion: string
  tipo_gasto?: string
  monto: number
  liquidado: boolean
  titulo_tarea?: string
  code_tarea?: string
  nombre_edificio?: string
}

interface Liquidacion {
  id: number
  id_trabajador: string
  fecha_inicio: string
  fecha_fin: string
  semana_inicio?: string
  semana_fin?: string
  total_horas: number
  total_monto: number
  total_dias?: number
  salario_base?: number
  plus_manual?: number
  gastos_reembolsados?: number
  total_pagar?: number
  fecha_creacion: string
  estado: string
  observaciones?: string
  trabajador?: {
    id: string
    nombre: string
    email: string
  }
}

// Función para formatear montos en COP
const formatMonto = (monto: number | undefined) => {
  if (monto === undefined) return "N/A"
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(monto)
}

// Función para formatear fechas
const formatFecha = (fechaStr: string | undefined) => {
  if (!fechaStr) return "N/A"
  const fecha = new Date(fechaStr)
  return fecha.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

// Componente para mostrar un dato con título y valor
const InfoCard = ({ titulo, valor }: { titulo: string; valor: string | number | undefined }) => (
  <div className="bg-slate-50 p-3 rounded">
    <div className="text-sm text-muted-foreground">{titulo}</div>
    <div className="text-lg font-semibold">{valor}</div>
  </div>
)

export default function DetalleDeUnaLiquidacion() {
  // Usar useParams para obtener los parámetros de la URL
  const params = useParams()
  const [detalle, setDetalle] = useState<Liquidacion | null>(null)
  const [partesTrabajo, setPartesTrabajo] = useState<ParteDeTrabajo[]>([])
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const cargarDetalleLiquidacion = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Validar que tengamos un ID válido
        const liquidacionId = params.id
        if (!liquidacionId) {
          setError("ID de liquidación no válido")
          return
        }

        // Verificar sesión
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push("/login")
          return
        }

        // Obtener información del usuario actual
        const { data: userData, error: userError } = await supabase
          .from("usuarios")
          .select("id, rol")
          .eq("id", session.user.id)
          .single()

        if (userError) {
          setError("Error al obtener información de usuario")
          console.error(userError)
          return
        }

        // Obtener detalles de la liquidación - volvemos a la tabla original
        console.log("Intentando cargar liquidación con ID:", params.id);
        const { data: liquidacion, error: liquidacionError } = await supabase
          .from("liquidaciones_trabajadores")
          .select(`
            *,
            trabajador:id_trabajador(id, nombre, email)
          `)
          .eq("id", params.id)
          .single()

        if (liquidacionError) {
          setError("No se pudo cargar la liquidación")
          console.error("Error al cargar liquidación:", liquidacionError)
          return
        }

        console.log("Liquidación cargada:", liquidacion);

        // Verificar permisos: si es trabajador, solo puede ver sus propias liquidaciones
        if (userData.rol === "trabajador" && liquidacion.id_trabajador !== userData.id) {
          setError("No tienes permiso para ver esta liquidación")
          return
        }

        // Obtener partes de trabajo asociados por rango de fechas
        const fechaInicio = liquidacion.semana_inicio || liquidacion.fecha_inicio;
        const fechaFin = liquidacion.semana_fin || liquidacion.fecha_fin;
        
        // Log para depuración
        console.log(`Buscando partes de trabajo entre ${fechaInicio} y ${fechaFin} para trabajador ${liquidacion.id_trabajador}`);
        
        const { data: todosPartesTrabajo, error: parteError } = await supabase
          .from("vista_partes_trabajo_completa")
          .select(`
            id,
            id_trabajador,
            id_tarea,
            fecha,
            tipo_jornada,
            liquidado,
            titulo_tarea,
            code_tarea,
            nombre_edificio,
            comentarios
          `)
          .eq("id_trabajador", liquidacion.id_trabajador)
          .gte("fecha", fechaInicio) // Mayor o igual que fecha inicio
          .lte("fecha", fechaFin)    // Menor o igual que fecha fin

        if (parteError) {
          console.error("Error al cargar partes de trabajo:", parteError)
        } else {
          console.log("Partes de trabajo cargados:", todosPartesTrabajo);
        }

        // Los partes de trabajo ya están filtrados por fecha y contienen la información necesaria
        let partes_trabajo = todosPartesTrabajo || [];
        
        // Ya no es necesario obtener datos adicionales de tareas o proyectos
        // porque la vista vista_partes_trabajo_completa ya incluye esta información

        // Obtener gastos asociados por rango de fechas
        console.log(`Buscando gastos entre ${fechaInicio} y ${fechaFin} para usuario ${liquidacion.id_trabajador}`);
        
        const { data: todosGastos, error: gastosError } = await supabase
          .from("vista_gastos_tarea_completa")
          .select(`
            id,
            id_usuario,
            id_tarea,
            fecha_gasto,
            descripcion,
            tipo_gasto,
            monto,
            liquidado,
            titulo_tarea,
            code_tarea,
            nombre_edificio
          `)
          .eq("id_usuario", liquidacion.id_trabajador)
          .gte("fecha_gasto", fechaInicio) // Mayor o igual que fecha inicio
          .lte("fecha_gasto", fechaFin)    // Menor o igual que fecha fin

        if (gastosError) {
          console.error("Error al cargar gastos:", gastosError)
        } else {
          console.log("Gastos cargados:", todosGastos);
        }
          
        // Los gastos ya están filtrados por fecha y contienen la información necesaria
        const gastos = todosGastos || [];
        
        // Ya no es necesario obtener datos adicionales de tareas o proyectos
        // porque la vista vista_gastos_tarea_completa ya incluye esta información

        // Actualizar los estados separados
        setDetalle(liquidacion)
        setPartesTrabajo(partes_trabajo || [])
        setGastos(gastos || [])
      } catch (err) {
        console.error("Error al cargar detalle:", err)
        setError("Ocurrió un error inesperado")
      } finally {
        setLoading(false)
      }
    }

    cargarDetalleLiquidacion()
  }, [params.id, router])
  
  // Calcular totales
  const totalHoras = partesTrabajo.reduce((total: number, parte: ParteDeTrabajo) => 
    total + (parte.tipo_jornada === 'dia_completo' ? 1 : parte.tipo_jornada === 'medio_dia' ? 0.5 : 0), 0)
    
  const totalGastos = gastos.reduce((total: number, gasto: Gasto) => 
    total + (gasto.monto || 0), 0)

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive p-4 rounded-md">
        <p>{error}</p>
      </div>
    )
  }

  if (!detalle) {
    return (
      <div className="bg-yellow-100 text-yellow-800 p-4 rounded-md">
        <p>No se pudo encontrar la información de esta liquidación</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 print:p-0">
      {/* Cabecera con botón de imprimir y botón para volver atrás */}
      <div className="flex justify-between items-center print:hidden">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Detalle de Liquidación</h1>
            <p className="text-muted-foreground">
              Liquidación #{detalle.id} - {formatFecha(detalle.semana_inicio)} al {formatFecha(detalle.semana_fin)}
            </p>
          </div>
        </div>
        <DescargarLiquidacionTrabajadorPdfButton liquidacionId={detalle.id} />
      </div>

      {/* Contenido principal - Este será lo que se imprima */}
      <Card className="p-6 bg-white print:shadow-none print:border-none">
        {/* Cabecera para impresión */}
        <div className="hidden print:block mb-6">
          <h1 className="text-2xl font-bold text-center">LIQUIDACIÓN SEMANAL</h1>
          <p className="text-center text-muted-foreground">
            Período: {formatFecha(detalle.semana_inicio)} al {formatFecha(detalle.semana_fin)}
          </p>
        </div>

        {/* Información del trabajador y resumen - diseño minimalista */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <h2 className="text-base font-semibold mb-0 leading-tight">{detalle.trabajador?.nombre}</h2>
            <p className="text-xs text-muted-foreground">{detalle.trabajador?.email}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground mb-0">Período: {formatFecha(detalle.semana_inicio)} al {formatFecha(detalle.semana_fin)}</p>
            <p className="text-sm font-medium">Liquidación #{detalle.id}</p>
          </div>
        </div>

        <Separator className="my-2" />

        {/* Resumen de valores - formato compacto */}
        <div className="grid grid-cols-2 gap-1 mb-3 text-sm">
          <div className="flex justify-between border-b border-slate-100 py-1">
            <span className="text-muted-foreground">Días trabajados:</span> 
            <span className="font-medium">{detalle.total_dias}</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 py-1">
            <span className="text-muted-foreground">Salario base:</span> 
            <span className="font-medium">{formatMonto(detalle.salario_base)}</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 py-1">
            <span className="text-muted-foreground">Plus manual:</span> 
            <span className="font-medium">{formatMonto(detalle.plus_manual)}</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 py-1">
            <span className="text-muted-foreground">Gastos reembolsados:</span> 
            <span className="font-medium">{formatMonto(detalle.gastos_reembolsados)}</span>
          </div>
          <div className="col-span-2 flex justify-between bg-primary-50 p-2 rounded-md mt-1">
            <span className="font-medium">Total a pagar:</span>
            <span className="font-bold">{formatMonto(detalle.total_pagar)}</span>
          </div>
        </div>
        
        <Separator className="my-2" />

        {/* Sección principal con toda la información */}
          
          {/* En impresión, mostrar ambas secciones */}
          <div className="hidden print:block mb-4">
            <h3 className="text-lg font-medium mb-2">Partes de trabajo</h3>
          </div>
          
          {/* Partes de trabajo - Diseño minimalista */}
          <div className="mb-2">
            <h3 className="text-sm font-medium mb-1">Partes de Trabajo</h3>
            {partesTrabajo?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-1.5 text-left">Fecha</th>
                      <th className="py-1.5 text-left">Tarea</th>
                      <th className="py-1.5 text-right">Jornada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partesTrabajo.map((parte: ParteDeTrabajo) => (
                      <tr key={parte.id} className="border-b hover:bg-slate-50">
                        <td className="py-1.5">{formatFecha(parte.fecha)}</td>
                        <td className="py-1.5">{parte.titulo_tarea || "-"}</td>
                        <td className="py-1.5 text-right">{parte.tipo_jornada === 'dia_completo' ? 'Día completo' : parte.tipo_jornada === 'medio_dia' ? 'Medio día' : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t">
                      <td className="py-1.5 font-semibold" colSpan={2}>Total días trabajados</td>
                      <td className="py-1.5 text-right font-semibold">{totalHoras}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="text-center py-2 text-muted-foreground text-sm">
                No hay partes de trabajo registrados para este período
              </div>
            )}
          </div>

          {/* Gastos - Diseño minimalista */}
          <div>
            <h3 className="text-sm font-medium mb-1">Gastos Reembolsados</h3>
            {gastos?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-1.5 text-left">Fecha</th>
                      <th className="py-1.5 text-left">Tipo de Gasto</th>
                      <th className="py-1.5 text-left">Tarea</th>
                      <th className="py-1.5 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gastos.map((gasto: Gasto) => (
                      <tr key={gasto.id} className="border-b hover:bg-slate-50">
                        <td className="py-1.5">{formatFecha(gasto.fecha_gasto)}</td>
                        <td className="py-1.5">{gasto.tipo_gasto || gasto.descripcion || "-"}</td>
                        <td className="py-1.5">{gasto.titulo_tarea || "-"}</td>
                        <td className="py-1.5 text-right">{formatMonto(gasto.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t">
                      <td className="py-1.5 font-semibold" colSpan={3}>Total gastos</td>
                      <td className="py-1.5 text-right font-semibold">{formatMonto(totalGastos)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="text-center py-2 text-muted-foreground text-sm">
                No hay gastos registrados para este período
              </div>
            )}
          </div>
        
        {/* Observaciones - solo si existen */}
        {detalle?.observaciones && (
          <div className="mt-2 p-2 bg-slate-50 rounded-md">
            <h4 className="text-xs font-medium mb-0.5">Observaciones</h4>
            <p className="text-xs text-muted-foreground">{detalle.observaciones}</p>
          </div>
        )}
      </Card>
    </div>
  )
}
