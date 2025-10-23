'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'

interface DesgloseGastosProps {
  idTarea: number
  totalGastos: number | null
}

interface DetalleGasto {
  id: number
  fecha: string
  descripcion?: string
  monto: number
  comprobante_url?: string
  id_trabajador?: string
  tipo_jornada?: string
  salario_diario?: number
  monto_calculado?: number
}

interface CategoriaGastos {
  categoria: string
  cantidad_registros: number
  monto_total: number
  detalle: DetalleGasto[]
}

export function DesgloseGastosReales({ idTarea, totalGastos }: DesgloseGastosProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [desglose, setDesglose] = useState<CategoriaGastos[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDesglose() {
      try {
        setLoading(true)
        setError(null)

        const { data, error: rpcError } = await supabase.rpc(
          'obtener_desglose_gastos_para_liquidacion',
          { p_id_tarea: idTarea }
        )

        if (rpcError) throw rpcError

        setDesglose(data || [])
      } catch (err: any) {
        console.error('Error al obtener desglose:', err)
        setError(err.message || 'Error al cargar desglose')
      } finally {
        setLoading(false)
      }
    }

    if (idTarea) {
      fetchDesglose()
    }
  }, [idTarea, supabase])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>💰 Desglose de Gastos Reales</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Cargando desglose...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>💰 Desglose de Gastos Reales</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-500">Error: {error}</p>
        </CardContent>
      </Card>
    )
  }

  const totalCalculado = desglose.reduce((sum, cat) => sum + cat.monto_total, 0)
  const materiales = desglose.find(d => d.categoria === 'materiales')
  const jornales = desglose.find(d => d.categoria === 'jornales')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>💰 Desglose de Gastos Reales</span>
          <Badge variant="outline" className="text-base font-mono">
            Total: ${totalCalculado.toLocaleString('es-AR')}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* MATERIALES */}
        {materiales && materiales.cantidad_registros > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-blue-700 flex items-center gap-2">
                📦 MATERIALES
                <Badge variant="secondary" className="text-xs">
                  {materiales.cantidad_registros} comprobante{materiales.cantidad_registros !== 1 ? 's' : ''}
                </Badge>
              </h3>
              <span className="text-sm font-mono font-bold text-blue-700">
                ${materiales.monto_total.toLocaleString('es-AR')}
              </span>
            </div>
            
            <div className="space-y-2">
              {materiales.detalle.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-200 hover:bg-blue-100 transition-colors"
                >
                  <div className="flex-1">
                    <span className="text-xs text-blue-600 font-medium">#{idx + 1}</span>
                    <span className="text-sm ml-2">{item.descripcion || 'Sin descripción'}</span>
                    {item.fecha && (
                      <span className="text-xs text-muted-foreground ml-2">
                        ({new Date(item.fecha).toLocaleDateString('es-AR')})
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-mono font-semibold text-blue-700">
                    ${item.monto.toLocaleString('es-AR')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* JORNALES */}
        {jornales && jornales.cantidad_registros > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-orange-700 flex items-center gap-2">
                💼 JORNALES DE PERSONAL
                <Badge variant="secondary" className="text-xs">
                  {jornales.cantidad_registros} jornada{jornales.cantidad_registros !== 1 ? 's' : ''}
                </Badge>
              </h3>
              <span className="text-sm font-mono font-bold text-orange-700">
                ${jornales.monto_total.toLocaleString('es-AR')}
              </span>
            </div>
            
            <div className="space-y-2">
              {jornales.detalle.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 bg-orange-50 rounded border border-orange-200 hover:bg-orange-100 transition-colors"
                >
                  <div className="flex-1">
                    <span className="text-xs text-orange-600 font-medium">#{idx + 1}</span>
                    <span className="text-sm ml-2">
                      {item.fecha ? new Date(item.fecha).toLocaleDateString('es-AR') : 'Fecha desconocida'}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({item.tipo_jornada === 'dia_completo' ? 'Día completo' : 'Medio día'})
                    </span>
                    {item.salario_diario && (
                      <span className="text-xs text-muted-foreground ml-2">
                        - ${item.salario_diario.toLocaleString('es-AR')}/día × {item.tipo_jornada === 'dia_completo' ? '1.0' : '0.5'}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-mono font-semibold text-orange-700">
                    ${item.monto_calculado?.toLocaleString('es-AR')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TOTAL */}
        <div className="pt-4 border-t-2 border-primary">
          <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
            <span className="font-semibold text-base">💰 TOTAL GASTOS REALES:</span>
            <span className="text-lg font-mono font-bold text-primary">
              ${totalCalculado.toLocaleString('es-AR')}
            </span>
          </div>
        </div>

        {/* Nota informativa */}
        <p className="text-xs text-muted-foreground text-center italic">
          * El supervisor debe recibir este monto para cubrir los gastos que pagó durante la ejecución de la tarea
        </p>
      </CardContent>
    </Card>
  )
}
