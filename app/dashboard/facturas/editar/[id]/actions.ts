"use server"

import { createSsrServerClient } from '@/lib/ssr-server';
import { z } from 'zod';

// Esquema de validación para los datos que vienen del formulario
const invoiceFormSchema = z.object({
  id_presupuesto: z.string().optional(),
  total: z.coerce.number(),
});

const itemSchema = z.object({
  id: z.number().optional(),
  descripcion: z.string(),
  cantidad: z.coerce.number(),
  precio_unitario: z.coerce.number(),
  subtotal_item: z.coerce.number(),
});

export async function saveInvoice(
  data: z.infer<typeof invoiceFormSchema>,
  items: z.infer<typeof itemSchema>[],
  facturaIdToEdit?: number
) {
  const supabase = await createSsrServerClient();

  try {
    // 1. OBTENER DATOS DE LA EMPRESA
    const selectedPresupuestoResponse = await supabase
      .from('presupuestos_finales')
      .select('edificios!inner(id_administrador)')
      .eq('id', data.id_presupuesto)
      .single();

    if (selectedPresupuestoResponse.error || !selectedPresupuestoResponse.data) {
      throw new Error('Presupuesto no válido o error al buscarlo.');
    }

    const edificioData = selectedPresupuestoResponse.data.edificios;
    const edificio = Array.isArray(edificioData) ? edificioData[0] : edificioData;

    if (!edificio?.id_administrador) {
      throw new Error('El presupuesto seleccionado no tiene una empresa asignada.');
    }
    
    const idEmpresaAsignada = edificio.id_administrador;

    // 2. PREPARAR Y GUARDAR DATOS DE FACTURA
    const dataForDb = {
      id_presupuesto: data.id_presupuesto ? Number(data.id_presupuesto) : null,
      total: data.total,
    };

    let facturaId: number;

    if (facturaIdToEdit) {
      facturaId = facturaIdToEdit;
      const { error } = await supabase.from('facturas').update(dataForDb).eq('id', facturaId);
      if (error) throw error;
    } else {
      const dataToInsert = { ...dataForDb, pagada: false, id_empresa_asignada: idEmpresaAsignada };
      const { data: newFactura, error } = await supabase.from('facturas').insert(dataToInsert).select('id').single();
      if (error || !newFactura) throw error || new Error('No se pudo crear la factura.');
      facturaId = newFactura.id;
    }

    // 3. GESTIONAR ITEMS
    // Obtener los IDs de los items iniciales si estamos editando
    let initialItemIds = new Set<number>();
    if (facturaIdToEdit) {
        const { data: initialItemsData } = await supabase.from('items_factura').select('id').eq('id_factura', facturaIdToEdit);
        initialItemIds = new Set(initialItemsData?.map(i => i.id) || []);
    }
    
    const currentItemIds = new Set(items.map(item => item.id).filter((id): id is number => id !== undefined));

    // Eliminar items que ya no están
    const idsToDelete = [...initialItemIds].filter(id => !currentItemIds.has(id));
    if (idsToDelete.length > 0) {
      const { error: deleteError } = await supabase.from('items_factura').delete().in('id', idsToDelete);
      if (deleteError) throw deleteError;
    }

    // Actualizar o insertar items
    if (items.length > 0) {
      const itemsToUpsert = items.map(item => ({
        id: item.id,
        id_factura: facturaId,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal_item: item.subtotal_item,
      }));
      const { error: upsertError } = await supabase.from('items_factura').upsert(itemsToUpsert);
      if (upsertError) throw upsertError;
    }

    return { success: true, message: 'Factura guardada con éxito.' };

  } catch (error: any) {
    console.error('Error en Server Action saveInvoice:', error);
    return { success: false, message: `Error al guardar la factura: ${error.message}` };
  }
}
