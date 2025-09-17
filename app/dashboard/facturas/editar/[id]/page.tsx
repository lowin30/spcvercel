import { redirect, notFound } from 'next/navigation';
import { InvoiceForm } from '@/components/invoice-form';
import { createRobustServerClient } from './supabase-helper';
import { saveInvoice } from './actions';

// Usando cliente de Supabase robusto para manejar errores de cookies
export default async function EditarFacturaPage({ params }: { params: { id: string } }) {
  // Primero esperar a que params esté disponible siguiendo recomendaciones de Next.js
  const resolvedParams = await params
  const facturaId = resolvedParams?.id ? String(resolvedParams.id) : ''
  
  // Usando el cliente robusto que maneja errores de cookies
  const supabase = await createRobustServerClient()

  // Validamos la sesión del usuario con manejo de errores
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      redirect('/login')
    }
    
    // Si el ID está vacío o no es válido como número
    if (!facturaId || isNaN(parseInt(facturaId, 10))) {
      notFound()
    }
    
    const facturaPromise = supabase
    .from('facturas')
    .select('id, code, created_at, id_presupuesto, total')
    .eq('id', facturaId)
    .single();

  const itemsFacturaPromise = supabase
    .from('items_factura')
    .select('*')
    .eq('id_factura', facturaId)
    .order('id', { ascending: true });

  const presupuestosPromise = supabase
    .from('presupuestos_finales')
    .select(`
      id,
      code,
      total,
      presupuestos_base (
        id,
        tareas (
          id,
          titulo,
          edificios (
            id,
            nombre,
            id_administrador
          )
        )
      )
    `)
    .eq('id_estado', 4); // Asumiendo que 4 es 'Aprobado'

  const [
    { data: factura, error: facturaError },
    { data: itemsFactura, error: itemsError },
    { data: presupuestos, error: presupuestosError },
  ] = await Promise.all([facturaPromise, itemsFacturaPromise, presupuestosPromise]);

  if (facturaError || !factura) {
    console.error(`Error al buscar factura con ID ${facturaId}:`, facturaError);
    notFound();
  }

  if (itemsError) {
    console.error('Error fetching items_factura:', itemsError);
  }

  if (presupuestosError) {
    console.error('Error fetching presupuestos:', presupuestosError);
  }

  const presupuestosParaForm = presupuestos?.map(p => {
    const presupuesto_base = Array.isArray(p.presupuestos_base) ? p.presupuestos_base[0] : p.presupuestos_base;
    const tarea = presupuesto_base ? (Array.isArray(presupuesto_base.tareas) ? presupuesto_base.tareas[0] : presupuesto_base.tareas) : null;
    const edificio = tarea ? (Array.isArray(tarea.edificios) ? tarea.edificios[0] : tarea.edificios) : null;
    
    return {
      id: String(p.id),
      code: p.code,
      titulo: tarea?.titulo || 'Sin título',
      monto_total: p.total,
      edificios: edificio ? { id: edificio.id, nombre: edificio.nombre, id_administrador: edificio.id_administrador } : null,
      estado: 'Aprobado'
    };
  }) || [];

  // Asegurarse de que el presupuesto actual de la factura esté en la lista
  if (factura.id_presupuesto) {
    const isPresupuestoActualEnLista = presupuestosParaForm.some(p => p.id === String(factura.id_presupuesto));

    if (!isPresupuestoActualEnLista) {
      const { data: presupuestoActual } = await supabase
        .from('presupuestos_finales')
        .select(`
          id,
          code,
          total,
          presupuestos_base (
            id,
            tareas (
              id,
              titulo,
              edificios (
                id,
                nombre,
                id_administrador
              )
            )
          )
        `)
        .eq('id', factura.id_presupuesto)
        .single();

      if (presupuestoActual) {
        const presupuesto_base = Array.isArray(presupuestoActual.presupuestos_base) ? presupuestoActual.presupuestos_base[0] : presupuestoActual.presupuestos_base;
        const tarea = presupuesto_base ? (Array.isArray(presupuesto_base.tareas) ? presupuesto_base.tareas[0] : presupuesto_base.tareas) : null;
        const edificio = tarea ? (Array.isArray(tarea.edificios) ? tarea.edificios[0] : tarea.edificios) : null;

        presupuestosParaForm.push({
          id: String(presupuestoActual.id),
          code: presupuestoActual.code,
          titulo: tarea?.titulo || 'Sin título',
          monto_total: presupuestoActual.total,
          edificios: edificio ? { id: edificio.id, nombre: edificio.nombre, id_administrador: edificio.id_administrador } : null,
          estado: 'Actual'
        });
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="encabezado-responsive">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Editar Factura</h1>
          <p className="text-sm text-muted-foreground">Modificando la factura con código: {factura.code || `ID: ${factura.id}`}</p>
        </div>
      </div>
      <InvoiceForm 
        presupuestos={presupuestosParaForm} 
        factura={factura} 
        items={itemsFactura || []} 
        onSave={saveInvoice} 
      />
    </div>
  );
  } catch (error) {
    console.error('Error en la página de edición de factura:', error);
    // Redirigir a una página de error o mostrar un mensaje amigable
    return (
      <div className="p-4 space-y-4">
        <h1 className="text-2xl font-bold text-red-600">Error al cargar la factura</h1>
        <p>Ocurrió un error al intentar cargar la factura. Por favor, intente nuevamente.</p>
        <a href="/dashboard/facturas" className="text-blue-600 hover:underline">Volver a la lista de facturas</a>
      </div>
    );
  }
}