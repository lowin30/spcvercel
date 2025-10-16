import { redirect, notFound } from 'next/navigation'
import { createSsrServerClient } from '@/lib/ssr-server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDateTime } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, Download, FileText, Send, Building2, Briefcase, Calendar, CheckCircle2, XCircle, Clock, Receipt } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { EsMaterialCheckbox } from './es-material-checkbox'
import { DatosAFIPEditor } from './datos-afip-editor'
import { MarcarEnviadaButton } from './marcar-enviada-button'
import { HistorialGastosFactura } from '@/components/historial-gastos-factura'

// Definimos un tipo para los items para mayor seguridad
type Item = {
  id: number;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
  es_material?: boolean; // Añadimos el campo es_material como opcional
};

export default async function InvoicePage({ params }: { params: { id: string } }) {
  // Await params to resolve dynamic segments, as per Next.js 13.4+
  const resolvedParams = await params;
  const facturaId = resolvedParams?.id ? String(resolvedParams.id) : '';

  if (!facturaId) {
    console.error('ID de factura no proporcionado en la URL.');
    return notFound();
  }
  const supabase = await createSsrServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: factura, error } = await supabase
    .from('facturas')
    .select(`
      id, code, created_at, id_presupuesto, total, pdf_url, datos_afip, enviada, fecha_envio, pagada, fecha_pago, id_estado_nuevo,
      estados_facturas:id_estado_nuevo (id, nombre, color, codigo),
      presupuestos_finales!inner (
        id, code, id_tarea, id_edificio, total,
        tareas (id, titulo, code),
        edificios (id, nombre, direccion, cuit)
      )
    `)
    .eq('id', facturaId)
    .single()

  if (error || !factura) {
    console.error('Error al cargar la factura:', error?.message)
    notFound()
  }

  const { data: itemsFactura } = await supabase
    .from('items_factura')
    .select('*')
    .eq('id_factura', facturaId)
    .order('id', { ascending: true })
  
  const { data: items } = await supabase
    .from('items')
    .select('id, descripcion, cantidad, precio_unitario, total')
    .eq('id_presupuesto', factura.id_presupuesto)
    .order('id', { ascending: true })

  const presupuestoFinal = Array.isArray(factura.presupuestos_finales) 
    ? factura.presupuestos_finales[0] 
    : factura.presupuestos_finales;
    
  const tarea = Array.isArray(presupuestoFinal?.tareas)
    ? presupuestoFinal?.tareas[0]
    : presupuestoFinal?.tareas;

  const edificio = Array.isArray(presupuestoFinal?.edificios)
    ? presupuestoFinal?.edificios[0]
    : presupuestoFinal?.edificios;

  const estadoFactura = Array.isArray(factura.estados_facturas)
    ? factura.estados_facturas[0]
    : factura.estados_facturas;

  const itemsToShow: Item[] = (itemsFactura && itemsFactura.length > 0) ? itemsFactura : (items || []);

  // Determinar si la factura es de materiales
  // Una factura es "de materiales" si TODOS sus items tienen es_material = true
  const esFacturaMateriales = itemsFactura && itemsFactura.length > 0
    ? itemsFactura.every((item: any) => item.es_material === true)
    : false;

  // Función auxiliar para formatear fechas
  const formatDate = (date: string | null) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  // Función auxiliar para formatear moneda
  const formatCurrency = (amount: number | null) => {
    if (!amount) return '$0'
    return `$${amount.toLocaleString('es-AR')}`
  }

  return (
    <div className="space-y-6">
      {/* HEADER MEJORADO */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/facturas">
                <ArrowLeft className="h-4 w-4 mr-1" /> Volver
              </Link>
            </Button>
          </div>
          
          {/* Título contextual */}
          <div>
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight">
              {tarea?.titulo || 'Sin título'}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-xs sm:text-sm text-muted-foreground font-mono">
                {factura.code}
              </span>
              
              {/* Badge de estado del flujo */}
              {estadoFactura && (
                <Badge 
                  style={{
                    backgroundColor: estadoFactura.color || "#888",
                    color: "white"
                  }}
                >
                  {estadoFactura.nombre}
                </Badge>
              )}
              
              {/* Badge de enviada */}
              {factura.enviada && (
                <Badge variant="secondary" className="bg-indigo-100 text-indigo-800 border-indigo-200">
                  <Send className="h-3 w-3 mr-1" />
                  Enviada
                </Badge>
              )}
              
              {/* Badge de pagada */}
              {factura.pagada && (
                <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Pagada
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        {/* Botones de acción responsive */}
        <div className="flex items-center gap-2 flex-wrap">
          <MarcarEnviadaButton facturaId={factura.id} enviada={factura.enviada} />
          
          {factura.pdf_url && (
            <Button size="sm" variant="outline" asChild>
              <a href={factura.pdf_url} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Descargar PDF</span>
              </a>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6">
        {/* CARD RESUMEN */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Resumen de la Factura
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Cliente/Edificio */}
              <div className="flex flex-col gap-1">
                <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  Cliente
                </dt>
                <dd className="text-sm font-semibold">{edificio?.nombre || 'N/A'}</dd>
                {edificio?.direccion && (
                  <dd className="text-xs text-muted-foreground">{edificio.direccion}</dd>
                )}
                {edificio?.cuit && (
                  <dd className="text-xs text-muted-foreground font-mono">CUIT: {edificio.cuit}</dd>
                )}
              </div>

              {/* Tarea */}
              <div className="flex flex-col gap-1">
                <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Briefcase className="h-4 w-4" />
                  Tarea
                </dt>
                <dd className="text-sm">
                  {tarea ? (
                    <Link href={`/dashboard/tareas/${tarea.id}`} className="text-primary hover:underline font-medium">
                      {tarea.titulo}
                    </Link>
                  ) : 'N/A'}
                </dd>
                {tarea?.code && (
                  <dd className="text-xs text-muted-foreground font-mono">{tarea.code}</dd>
                )}
              </div>

              {/* Código Factura */}
              <div className="flex flex-col gap-1">
                <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  Código Factura
                </dt>
                <dd className="text-sm font-mono font-semibold">{factura.code}</dd>
              </div>

              {/* Estados */}
              <div className="flex flex-col gap-1">
                <dt className="text-sm font-medium text-muted-foreground">Estados</dt>
                <dd className="flex flex-wrap gap-1">
                  {estadoFactura && (
                    <Badge 
                      style={{
                        backgroundColor: estadoFactura.color || "#888",
                        color: "white"
                      }}
                    >
                      {estadoFactura.nombre}
                    </Badge>
                  )}
                  {factura.enviada && (
                    <Badge variant="secondary" className="bg-indigo-100 text-indigo-800">
                      Enviada
                    </Badge>
                  )}
                  {factura.pagada && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Pagada
                    </Badge>
                  )}
                </dd>
              </div>

              {/* Total */}
              <div className="flex flex-col gap-1">
                <dt className="text-sm font-medium text-muted-foreground">Total Factura</dt>
                <dd className="text-xl font-bold text-primary">
                  {formatCurrency(factura.total)}
                </dd>
              </div>

              {/* Presupuesto Final */}
              <div className="flex flex-col gap-1">
                <dt className="text-sm font-medium text-muted-foreground">Presupuesto Final</dt>
                <dd className="text-sm">
                  {presupuestoFinal ? (
                    <Link href={`/dashboard/presupuestos-finales/${presupuestoFinal.id}`} className="flex items-center text-primary hover:underline">
                      <FileText className="h-4 w-4 mr-1" />
                      {presupuestoFinal.code}
                    </Link>
                  ) : 'N/A'}
                </dd>
              </div>

              {/* Fecha Creación */}
              <div className="flex flex-col gap-1">
                <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Fecha Creación
                </dt>
                <dd className="text-sm">{formatDate(factura.created_at)}</dd>
              </div>

              {/* Fecha Envío */}
              {factura.enviada && factura.fecha_envio && (
                <div className="flex flex-col gap-1">
                  <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Send className="h-4 w-4" />
                    Fecha Envío
                  </dt>
                  <dd className="text-sm">{formatDate(factura.fecha_envio)}</dd>
                </div>
              )}

              {/* Fecha Pago */}
              {factura.pagada && factura.fecha_pago && (
                <div className="flex flex-col gap-1">
                  <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    Fecha Pago
                  </dt>
                  <dd className="text-sm">{formatDate(factura.fecha_pago)}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* CARD DATOS AFIP */}
        <Card>
          <CardHeader>
            <CardTitle>Datos AFIP</CardTitle>
            <CardDescription>Información fiscal de la factura</CardDescription>
          </CardHeader>
          <CardContent>
            <DatosAFIPEditor facturaId={facturaId} datosIniciales={factura.datos_afip} />
          </CardContent>
        </Card>

        {/* CARD ITEMS DE LA FACTURA */}
        {itemsToShow.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Items de la Factura ({itemsToShow.length})</CardTitle>
              <CardDescription>
                {itemsFactura && itemsFactura.length > 0 
                  ? "Mostrando items específicos de esta factura." 
                  : "Mostrando items del presupuesto asociado."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Tabla para Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-primary/20 bg-muted/50">
                      <th className="text-left p-3 font-semibold text-sm uppercase tracking-wide text-muted-foreground">Descripción</th>
                      <th className="text-right p-3 font-semibold text-sm uppercase tracking-wide text-muted-foreground w-24">Cantidad</th>
                      <th className="text-right p-3 font-semibold text-sm uppercase tracking-wide text-muted-foreground w-32">Precio Unit.</th>
                      <th className="text-right p-3 font-semibold text-sm uppercase tracking-wide text-muted-foreground w-32">Total</th>
                      <th className="text-center p-3 font-semibold text-sm uppercase tracking-wide text-muted-foreground w-24">Material</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsToShow.map((item, idx) => (
                      <tr key={item.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <div className="flex items-start gap-2">
                            <span className="text-muted-foreground font-medium text-sm mt-0.5">{idx+1}.</span>
                            <span>{item.descripcion || 'Sin descripción'}</span>
                          </div>
                        </td>
                        <td className="p-3 text-right tabular-nums">{item.cantidad || 1}</td>
                        <td className="p-3 text-right tabular-nums">{formatCurrency(item.precio_unitario)}</td>
                        <td className="p-3 text-right font-semibold tabular-nums">
                          {formatCurrency(item.total)}
                        </td>
                        <td className="p-3 text-center">
                          {itemsFactura && itemsFactura.length > 0 ? (
                            <EsMaterialCheckbox 
                              itemId={item.id} 
                              initialValue={item.es_material !== undefined ? item.es_material : false} 
                            />
                          ) : (
                            <span className="text-muted-foreground text-xs">N/A</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-primary bg-primary/5">
                      <td colSpan={3} className="p-3 text-right font-semibold text-base">Total:</td>
                      <td className="p-3 text-right text-lg font-bold text-primary tabular-nums">
                        {formatCurrency(factura.total)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Cards para Móvil */}
              <div className="md:hidden space-y-3">
                {itemsToShow.map((item, idx) => (
                  <div key={item.id} className="border rounded-lg p-4 bg-card hover:shadow-md transition-shadow">
                    {/* Header del item con número y descripción */}
                    <div className="flex items-start gap-2 mb-3">
                      <span className="text-primary font-semibold text-sm flex-shrink-0 mt-0.5">{idx + 1}.</span>
                      <p className="font-medium leading-snug flex-1">{item.descripcion || 'Sin descripción'}</p>
                    </div>
                    
                    {/* Cálculo y Total */}
                    <div className="flex justify-between items-center pt-3 border-t">
                      <div className="text-sm text-muted-foreground">
                        <span className="tabular-nums">{item.cantidad || 1}</span>
                        <span className="mx-1">×</span>
                        <span className="tabular-nums">{formatCurrency(item.precio_unitario)}</span>
                      </div>
                      <div className="font-bold text-lg text-primary tabular-nums">
                        {formatCurrency(item.total)}
                      </div>
                    </div>
                    
                    {/* Checkbox Material (solo para items_factura) */}
                    {itemsFactura && itemsFactura.length > 0 && (
                      <div className="flex items-center gap-2 pt-3 border-t mt-3">
                        <span className="text-sm text-muted-foreground">Material:</span>
                        <EsMaterialCheckbox 
                          itemId={item.id} 
                          initialValue={item.es_material !== undefined ? item.es_material : false} 
                        />
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Total en Móvil */}
                <div className="border-t-2 border-primary pt-4 mt-4 flex justify-between items-center bg-primary/5 -mx-4 px-4 py-4 rounded-lg">
                  <span className="font-semibold text-base">Total:</span>
                  <span className="text-2xl font-bold text-primary tabular-nums">
                    {formatCurrency(factura.total)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* CARD GASTOS RELACIONADOS */}
        {tarea?.id && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Gastos de la Tarea
                  </CardTitle>
                  <CardDescription>
                    {esFacturaMateriales 
                      ? "Comprobantes de gastos de materiales relacionados con esta factura"
                      : "Comprobantes de gastos de mano de obra relacionados con esta factura"}
                  </CardDescription>
                </div>
                
                {/* Badge indicador de tipo de factura */}
                <Badge variant={esFacturaMateriales ? "default" : "secondary"} className="ml-2">
                  {esFacturaMateriales ? "📦 Materiales" : "👷 Mano de Obra"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <HistorialGastosFactura 
                facturaId={Number(factura.id)}
                tareaId={Number(tarea.id)}
                esFacturaMateriales={esFacturaMateriales}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}