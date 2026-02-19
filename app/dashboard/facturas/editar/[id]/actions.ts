"use server"

import { createSsrServerClient } from '@/lib/ssr-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { validateSessionAndGetUser } from '@/lib/auth-bridge';
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
  // SECURITY SHIELD v2.0: Usar el Bridge Protocol de Descope
  const user = await validateSessionAndGetUser();

  if (user.rol !== 'admin') {
    throw new Error('No autorizado: Operación permitida solo para administradores');
  }

  const supabase = await createSsrServerClient();

  try {
    // 1. CREAR O EDITAR FACTURA
    let facturaId: number;

    if (facturaIdToEdit) {
      facturaId = facturaIdToEdit;

      const updatePayload: any = {
        total: data.total
      };

      if (typeof data.id_presupuesto === 'string' && data.id_presupuesto.trim() !== '') {
        const bdId = Number(data.id_presupuesto);
        updatePayload.id_presupuesto = bdId;
        updatePayload.id_presupuesto_final = bdId; // Sincronización Protocolo v112.1
      }

      const { error: updateError } = await supabaseAdmin
        .from('facturas')
        .update(updatePayload)
        .eq('id', facturaId);
      if (updateError) {
        throw updateError;
      }
    } else {
      if (!data.id_presupuesto) {
        throw new Error('Debe seleccionar un presupuesto para crear la factura.');
      }

      // Obtener id_empresa_asignada navegando PF -> PB -> tareas -> edificios
      const presResp = await supabase
        .from('presupuestos_finales')
        .select(`
          id,
          presupuestos_base (
            tareas (
              edificios (
                id_administrador
              )
            )
          )
        `)
        .eq('id', data.id_presupuesto)
        .single();

      if (presResp.error || !presResp.data) {
        throw new Error('Presupuesto no válido o error al buscarlo.');
      }

      const pb: any = Array.isArray((presResp.data as any).presupuestos_base)
        ? (presResp.data as any).presupuestos_base[0]
        : (presResp.data as any).presupuestos_base;
      const tarea: any = pb ? (Array.isArray(pb.tareas) ? pb.tareas[0] : pb.tareas) : null;
      const edificio: any = tarea ? (Array.isArray(tarea.edificios) ? tarea.edificios[0] : tarea.edificios) : null;

      if (!edificio?.id_administrador) {
        throw new Error('El presupuesto seleccionado no tiene una empresa asignada.');
      }
      const idEmpresaAsignada = edificio.id_administrador;

      const dataToInsert = {
        id_presupuesto: Number(data.id_presupuesto),
        id_presupuesto_final: Number(data.id_presupuesto), // Sincronización Protocolo v112.1
        total: data.total,
        pagada: false,
        id_empresa_asignada: idEmpresaAsignada,
      };
      const { data: newFactura, error } = await supabaseAdmin
        .from('facturas')
        .insert(dataToInsert)
        .select('id')
        .single();
      if (error || !newFactura) throw error || new Error('No se pudo crear la factura.');
      facturaId = newFactura.id;
    }

    // 2. GESTIONAR ITEMS
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
      const { error: deleteError } = await supabaseAdmin
        .from('items_factura')
        .delete()
        .in('id', idsToDelete);
      if (deleteError) throw deleteError;
    }

    // Actualizar o insertar items
    if (items.length > 0) {
      const itemsToUpsert = items.map(item => {
        const obj: any = {
          id_factura: facturaId,
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          subtotal_item: item.subtotal_item,
          es_material: false, // Integridad Protocolo v112.1
        };
        if (item.id) obj.id = item.id;
        return obj;
      });
      const { error: upsertError } = await supabaseAdmin
        .from('items_factura')
        .upsert(itemsToUpsert);
      if (upsertError) throw upsertError;
    }

    return { success: true, message: 'Factura guardada con éxito.' };

  } catch (error: any) {
    console.error('Error en Server Action saveInvoice:', error);
    return { success: false, message: `Error al guardar la factura: ${error.message}` };
  }
}
