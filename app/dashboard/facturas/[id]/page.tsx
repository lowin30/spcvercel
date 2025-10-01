import { redirect, notFound } from 'next/navigation'
import { createSsrServerClient } from '@/lib/ssr-server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDateTime } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, Download, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { EsMaterialCheckbox } from './es-material-checkbox'
import { DatosAFIPEditor } from './datos-afip-editor'
import { MarcarEnviadaButton } from './marcar-enviada-button'

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
      id, code, created_at, id_presupuesto, total, pdf_url, datos_afip, enviada, fecha_envio, id_estado_nuevo,
      estados_facturas:id_estado_nuevo (id, nombre, color, codigo),
      presupuestos_finales!inner (
        id, code, id_tarea, id_edificio,
        tareas (id, titulo, code),
        edificios (id, nombre, direccion)
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

  const itemsToShow: Item[] = (itemsFactura && itemsFactura.length > 0) ? itemsFactura : (items || []);

  return (
    <div className="space-y-6">
      <div className="encabezado-responsive">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="mr-2">
            <Link href="/dashboard/facturas">
              <ArrowLeft className="h-4 w-4 mr-1" /> Volver
            </Link>
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Factura {factura.code}</h1>
          {/* Badge de estado */}
          {factura.estados_facturas && (
            <Badge 
              style={{
                backgroundColor: factura.estados_facturas.color || "#888",
                color: "white"
              }}
            >
              {factura.estados_facturas.nombre}
            </Badge>
          )}
        </div>
        <MarcarEnviadaButton facturaId={factura.id} enviada={factura.enviada} />
      </div>

      <div className="grid-responsive grid-responsive-lg">
        <div className="sm:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Detalles de la Factura</CardTitle>
                <Badge variant="outline">Factura #{factura.code}</Badge>
              </div>
              <CardDescription>Creada el {formatDateTime(factura.created_at)}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="font-medium mb-1">Tarea asociada</h3>
                {tarea ? (
                  <Link href={`/dashboard/tareas/${tarea.id}`} className="text-primary hover:underline">
                    {tarea.titulo} ({tarea.code})
                  </Link>
                ) : <p className="text-muted-foreground">N/A</p>}
              </div>
              <div>
                <h3 className="font-medium mb-1">Edificio</h3>
                <p>
                  {edificio?.nombre || 'Sin edificio'}
                  {edificio?.direccion && ` - ${edificio.direccion}`}
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-1">Presupuesto Final</h3>
                {presupuestoFinal ? (
                  <Link href={`/dashboard/presupuestos-finales/${presupuestoFinal.id}`} className="flex items-center text-primary hover:underline">
                    <FileText className="h-4 w-4 mr-1" />
                    {presupuestoFinal.code}
                  </Link>
                ) : <p className="text-muted-foreground">N/A</p>}
              </div>
              <div>
                {/* Componente cliente para editar datos AFIP */}
                <DatosAFIPEditor facturaId={facturaId} datosIniciales={factura.datos_afip} />
              </div>
              <div className="sm:col-span-2">
                <h3 className="font-medium mb-1">Total</h3>
                <p className="text-2xl font-bold">${factura.total?.toLocaleString('es-AR') || '0'}</p>
              </div>
              {factura.pdf_url && (
                <div className="sm:col-span-2">
                  <h3 className="font-medium mb-1">PDF</h3>
                  <a href={factura.pdf_url} target="_blank" rel="noopener noreferrer" className="flex items-center text-primary hover:underline">
                    <Download className="h-4 w-4 mr-1" />
                    Descargar factura
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {itemsToShow.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Items de la Factura</CardTitle>
                <CardDescription>
                  {itemsFactura && itemsFactura.length > 0 
                    ? "Mostrando items específicos de esta factura." 
                    : "Mostrando items del presupuesto asociado."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="tabla-scroll">
                  <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Precio unitario</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-center">Material</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemsToShow.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.descripcion || 'Sin descripción'}</TableCell>
                        <TableCell className="text-right">{item.cantidad || 1}</TableCell>
                        <TableCell className="text-right">${item.precio_unitario?.toLocaleString('es-AR') || '0'}</TableCell>
                        <TableCell className="text-right">${item.total?.toLocaleString('es-AR') || '0'}</TableCell>
                        <TableCell className="text-center">
                          {itemsFactura && itemsFactura.length > 0 ? (
                            <EsMaterialCheckbox 
                              itemId={item.id} 
                              initialValue={item.es_material !== undefined ? item.es_material : false} 
                            />
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}

                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        <div className="space-y-6">
          {/* Columna derecha para futuras acciones, ahora vacía */}
        </div>
      </div>
    </div>
  )
}