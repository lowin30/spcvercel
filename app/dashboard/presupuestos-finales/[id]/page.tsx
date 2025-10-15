"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { ArrowLeft, ExternalLink, Loader2, PlusCircle, Send, MoreVertical, FileText, Edit } from "lucide-react"
import { formatDate } from "@/lib/date-utils"
import { createClient } from "@/lib/supabase-client"
import { formatCurrency } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"
import { ExportPresupuestoButton } from "@/components/export-presupuesto-button"
import { AprobadoCheckbox } from "./aprobado-checkbox"
import { marcarPresupuestoComoEnviado } from "@/app/dashboard/presupuestos/actions-envio"
import { toast as sonnerToast } from "sonner"

interface PresupuestoFinalItem {
  id: number
  id_presupuesto: number // Corrected to match 'items' table schema
  descripcion: string
  cantidad: number
  precio: number
  // Consider adding es_producto and producto_id if they are used by the component
  es_producto?: boolean 
  es_material?: boolean
  producto_id?: string 
}

interface PresupuestoFinalPageProps {
  params: Promise<{ id: string }>
}

export default function PresupuestoFinalPage({ params: paramsPromise }: PresupuestoFinalPageProps) {
  const { id } = use(paramsPromise);
  const [presupuesto, setPresupuesto] = useState<any>(null)
  const [items, setItems] = useState<PresupuestoFinalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const supabase = createClient()
        if (!supabase) {
          throw new Error("No se pudo inicializar el cliente de Supabase")
        }

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        if (sessionError || !sessionData.session) {
          router.push("/login")
          return
        }

        const { data: userData, error: userError } = await supabase
          .from("usuarios")
          .select("rol")
          .eq("id", sessionData.session.user.id)
          .single()
        if (userError) throw userError
        if (userData?.rol !== "admin") {
          toast({ title: "Acceso denegado", description: "Solo los administradores pueden ver esta página.", variant: "destructive" })
          router.push("/dashboard")
          return
        }

        const { data, error: presupuestoError } = await supabase
          .from("vista_presupuestos_finales_completa")
          .select("*")
          .eq("id", id)
          .single()
        if (presupuestoError) {
          console.error("Supabase error raw object (presupuestoError):", presupuestoError);
          console.error("Supabase error details (JSON):", JSON.stringify(presupuestoError, null, 2));
          let detailedMessage = "Error al cargar el presupuesto final desde Supabase.";
          const specificError = presupuestoError as any; // Castear a any para acceder a propiedades dinámicas
          if (specificError.message) {
            detailedMessage = `Error Supabase: ${specificError.message}`;
            if (specificError.details) detailedMessage += ` Detalles: ${specificError.details}`;
            if (specificError.hint) detailedMessage += ` Pista: ${specificError.hint}`;
            if (specificError.code) detailedMessage += ` (Código: ${specificError.code})`;
          }
          throw new Error(detailedMessage);
        }
        if (!data) { // Esto se ejecutará si presupuestoError fue nulo pero data también es nulo
          const errorMessage = "No se pudo cargar el presupuesto final solicitado (no se encontraron datos y no hubo error explícito de Supabase).";
          console.error(errorMessage);
          throw new Error(errorMessage);
        }
        
        // Obtener estado del presupuesto
        const { data: presupuestoConEstado, error: estadoError } = await supabase
          .from("presupuestos_finales")
          .select(`
            id, id_estado,
            estados_presupuestos:id_estado (id, nombre, codigo, color)
          `)
          .eq("id", id)
          .single()
        
        if (presupuestoConEstado && !estadoError) {
          data.estados_presupuestos = presupuestoConEstado.estados_presupuestos
          data.id_estado = presupuestoConEstado.id_estado
        }
        // Obtener información adicional del edificio (incluido CUIT)
        if (data.id_edificio) {
          const { data: edificioData, error: edificioError } = await supabase
            .from("vista_edificios_completa")
            .select("*")
            .eq("id", data.id_edificio)
            .single()
            
          if (!edificioError && edificioData) {
            // Agregar los datos del edificio al objeto del presupuesto
            data.edificio_info = edificioData
          }
        }
        
        setPresupuesto(data)

        const { data: itemsData, error: itemsError } = await supabase
          .from("items")
          .select("*") // Quitamos el tipo genérico que causa error de linting
          .eq("id_presupuesto", data!.id)
          .order("id", { ascending: true })
        setItems(itemsData || [])

      } catch (err) {
        console.error("Error detallado al cargar datos:", err);
        if (err instanceof Error) {
          setError(err.message);
        } else if (typeof err === 'string') {
          setError(err);
        } else {
          setError("Ocurrió un error inesperado al cargar los datos.");
        }
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id, router]) // 'id' here now refers to the unwrapped id from use(paramsPromise)

  if (loading) {
    return (
      <div className="flex flex-col items-end gap-2 justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !presupuesto) {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" className="mr-2" onClick={() => router.push('/dashboard/presupuestos-finales')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Presupuesto no encontrado</h1>
        </div>
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-lg font-semibold text-red-600">{error || "El presupuesto que buscas no existe."}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  console.log('Estructura completa del presupuesto:', JSON.stringify(presupuesto, null, 2));
  
  // Función para marcar como enviado
  const handleMarcarComoEnviado = async () => {
    if (!confirm('¿Estás seguro de marcar este presupuesto como enviado?')) {
      return
    }
    
    setEnviando(true)
    try {
      const result = await marcarPresupuestoComoEnviado(presupuesto.id)
      
      if (result.success) {
        sonnerToast.success(result.message)
        // Recargar la página para ver los cambios
        router.refresh()
        window.location.reload()
      } else {
        sonnerToast.error(result.message || 'Error al marcar como enviado')
      }
    } catch (error: any) {
      sonnerToast.error(error.message || 'Error inesperado')
    } finally {
      setEnviando(false)
    }
  }
  
  const datosParaPDF = {
    presupuestoId: presupuesto.id,
    codigo: presupuesto.code,
    fecha: new Date(presupuesto.created_at),
    referencia: '', // Eliminamos la referencia como solicitaste
    cliente: {
      nombre: presupuesto.nombre_edificio || 'N/A',
      cuit: presupuesto.edificio_info?.cuit || '',
      tarea: presupuesto.titulo_tarea || ''
    },
    items: items.map((item) => ({
      id: item.id,
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      tarifa: item.precio,
      total: item.cantidad * item.precio,
    })),
    totalPresupuesto: presupuesto.total,
  };

  return (
    <div className="space-y-6">
      <div className="encabezado-responsive">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Button variant="outline" size="icon" asChild className="flex-shrink-0">
              <Link href="/dashboard/presupuestos-finales">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold tracking-tight truncate">
                {presupuesto.titulo_tarea || 'Sin título'}
              </h1>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <span className="text-xs sm:text-sm text-muted-foreground font-mono">
                  {presupuesto.code}
                </span>
                {/* Badges de estado */}
                {presupuesto.estados_presupuestos && (
                  <Badge 
                    style={{
                      backgroundColor: presupuesto.estados_presupuestos.color || "#888",
                      color: "white"
                    }}
                    className="border-0 text-xs"
                  >
                    {presupuesto.estados_presupuestos.nombre}
                  </Badge>
                )}
                {presupuesto.aprobado && (
                  <Badge className="bg-green-600 text-white border-0 text-xs">
                    Aprobado ✓
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Checkbox Aprobado - Siempre visible */}
          <AprobadoCheckbox 
            presupuestoId={presupuesto.id} 
            initialValue={presupuesto.aprobado || false}
          />
          
          {/* Botón Marcar como Enviado - Responsive */}
          {presupuesto.estados_presupuestos?.codigo !== 'enviado' && 
           presupuesto.estados_presupuestos?.codigo !== 'facturado' && 
           presupuesto.estados_presupuestos?.codigo !== 'rechazado' && (
            <Button
              variant="outline"
              onClick={handleMarcarComoEnviado}
              disabled={enviando}
              size="sm"
              className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
            >
              {enviando ? (
                <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 sm:mr-2" />
              )}
              <span className="hidden sm:inline">
                {enviando ? 'Enviando...' : 'Marcar como Enviado'}
              </span>
            </Button>
          )}
          
          {/* Botón Crear Factura - Responsive */}
          <Button asChild size="sm">
            <Link href={`/dashboard/facturas/nueva?presupuesto_final_id=${presupuesto.id}`}>
              <PlusCircle className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Crear Factura</span>
            </Link>
          </Button>
          
          {/* Botones secundarios - Desktop: visibles, Móvil: menú desplegable */}
          <div className="hidden md:flex gap-2">
            <ExportPresupuestoButton {...datosParaPDF} />
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/presupuestos-finales/editar/${presupuesto.id}`}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Link>
            </Button>
          </div>
          
          {/* Menú "Más acciones" - Solo en móvil/tablet */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild className="md:hidden">
              <Button variant="outline" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                // Trigger export button
                document.querySelector('[data-export-button]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
              }}>
                <FileText className="h-4 w-4 mr-2" />
                Exportar PDF
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/presupuestos-finales/editar/${presupuesto.id}`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Presupuesto
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Card de Resumen - Ancho completo */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Cliente</dt>
              <dd className="text-base font-medium">{presupuesto.nombre_edificio || 'N/A'}</dd>
              {presupuesto.edificio_info?.cuit && (
                <dd className="text-xs text-muted-foreground">CUIT: {presupuesto.edificio_info.cuit}</dd>
              )}
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Tarea</dt>
              <dd className="text-base font-medium">{presupuesto.titulo_tarea || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Código</dt>
              <dd className="text-base font-mono">{presupuesto.code}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Estado</dt>
              <dd className="flex gap-2 flex-wrap">
                {presupuesto.estados_presupuestos && (
                  <Badge 
                    style={{
                      backgroundColor: presupuesto.estados_presupuestos.color || "#888",
                      color: "white"
                    }}
                    className="border-0"
                  >
                    {presupuesto.estados_presupuestos.nombre}
                  </Badge>
                )}
                {presupuesto.aprobado && (
                  <Badge className="bg-green-600 text-white border-0">
                    Aprobado ✓
                  </Badge>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Total Presupuesto</dt>
              <dd className="text-xl font-bold text-primary">{formatCurrency(presupuesto.total)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Fecha de Creación</dt>
              <dd className="text-base">{formatDate(presupuesto.created_at)}</dd>
            </div>
            {presupuesto.fecha_aprobacion && (
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Fecha de Aprobación</dt>
                <dd className="text-base">{formatDate(presupuesto.fecha_aprobacion)}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      <div className="grid-responsive">
        {/* Card de Montos */}
        <Card>
          <CardHeader>
            <CardTitle>Desglose de Montos</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Mano de Obra</dt>
                <dd className="text-base">{formatCurrency(presupuesto.mano_obra || 0)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Materiales</dt>
                <dd className="text-base">{formatCurrency(presupuesto.materiales || 0)}</dd>
              </div>
              <div className="pt-2 border-t">
                <dt className="text-sm font-medium text-muted-foreground">Total</dt>
                <dd className="text-xl font-bold">{formatCurrency(presupuesto.total)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Card de Comparación con Presupuesto Base */}
        <Card>
          <CardHeader>
            <CardTitle>Comparación con Base</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Presupuesto Base</dt>
                <dd className="text-base">{formatCurrency(presupuesto.presupuestos_base?.total || 0)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Presupuesto Final</dt>
                <dd className="text-base font-semibold">{formatCurrency(presupuesto.total)}</dd>
              </div>
              <div className="pt-2 border-t">
                <dt className="text-sm font-medium text-muted-foreground">Ajuste</dt>
                <dd className={`text-lg font-bold ${
                  (presupuesto.total || 0) - (presupuesto.presupuestos_base?.total || 0) > 0 
                    ? 'text-red-600' 
                    : (presupuesto.total || 0) - (presupuesto.presupuestos_base?.total || 0) < 0
                    ? 'text-green-600'
                    : 'text-gray-600'
                }`}>
                  {(presupuesto.total || 0) - (presupuesto.presupuestos_base?.total || 0) > 0 ? '+' : ''}
                  {formatCurrency((presupuesto.total || 0) - (presupuesto.presupuestos_base?.total || 0))}
                  {presupuesto.presupuestos_base?.total && presupuesto.presupuestos_base.total > 0 && (
                    <span className="text-xs ml-2">
                      ({(((presupuesto.total || 0) - (presupuesto.presupuestos_base?.total || 0)) / presupuesto.presupuestos_base.total * 100).toFixed(1)}%)
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {(items && items.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Items del Presupuesto ({items.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Tabla para Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-primary/20 bg-muted/50">
                    <th className="text-left p-3 font-semibold text-sm uppercase tracking-wide text-muted-foreground">Descripción</th>
                    <th className="text-center p-3 font-semibold text-sm uppercase tracking-wide text-muted-foreground w-24">Material</th>
                    <th className="text-right p-3 font-semibold text-sm uppercase tracking-wide text-muted-foreground w-24">Cantidad</th>
                    <th className="text-right p-3 font-semibold text-sm uppercase tracking-wide text-muted-foreground w-32">Precio Unit.</th>
                    <th className="text-right p-3 font-semibold text-sm uppercase tracking-wide text-muted-foreground w-32">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: PresupuestoFinalItem, idx: number) => (
                    <tr key={item.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <div className="flex items-start gap-2">
                          <span className="text-muted-foreground font-medium text-sm mt-0.5">{idx+1}.</span>
                          <span>{item.descripcion}</span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        {item.es_material ? (
                          <Badge variant="default" className="bg-blue-600">Sí</Badge>
                        ) : (
                          <Badge variant="outline">No</Badge>
                        )}
                      </td>
                      <td className="p-3 text-right tabular-nums">{item.cantidad}</td>
                      <td className="p-3 text-right tabular-nums">{formatCurrency(item.precio)}</td>
                      <td className="p-3 text-right font-semibold tabular-nums">
                        {formatCurrency(item.cantidad * (item.precio || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-primary bg-primary/5">
                    <td colSpan={4} className="p-3 text-right font-semibold text-base">Total:</td>
                    <td className="p-3 text-right text-lg font-bold text-primary tabular-nums">
                      {formatCurrency(presupuesto.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Cards para Móvil */}
            <div className="md:hidden space-y-3">
              {items.map((item: PresupuestoFinalItem, idx: number) => (
                <div key={item.id} className="border rounded-lg p-4 bg-card hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <span className="text-primary font-semibold text-sm flex-shrink-0">{idx + 1}.</span>
                        <p className="font-medium leading-snug">{item.descripcion}</p>
                      </div>
                      <div className="mt-2">
                        {item.es_material ? (
                          <Badge variant="default" className="bg-blue-600 text-xs">Material</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Mano de obra</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t">
                    <div className="text-sm text-muted-foreground">
                      <span className="tabular-nums">{item.cantidad}</span>
                      <span className="mx-1">×</span>
                      <span className="tabular-nums">{formatCurrency(item.precio)}</span>
                    </div>
                    <div className="font-bold text-lg text-primary tabular-nums">
                      {formatCurrency(item.cantidad * (item.precio || 0))}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Total en Móvil */}
              <div className="border-t-2 border-primary pt-4 mt-4 flex justify-between items-center bg-primary/5 -mx-4 px-4 py-4 rounded-lg">
                <span className="font-semibold text-base">Total:</span>
                <span className="text-2xl font-bold text-primary tabular-nums">
                  {formatCurrency(presupuesto.total)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {presupuesto.observaciones_admin && (
        <Card>
          <CardHeader>
            <CardTitle>Observaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{presupuesto.observaciones_admin}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
