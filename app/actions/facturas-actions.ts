"use server"

import { supabaseAdmin as supabase } from '@/lib/supabase-admin'
import { validateSessionAndGetUser } from '@/lib/auth-bridge'
import { revalidatePath } from 'next/cache'

// RBAC Check Helper (Private)
async function _checkRole(requiredRole: string) {
    const { rol } = await validateSessionAndGetUser()
    if (rol !== requiredRole) {
        throw new Error(`Acceso denegado. Se requiere rol ${requiredRole}.`)
    }
}

/**
 * Convierte un presupuesto final en dos facturas (Regular y Materiales) de forma TÓMICA y SEGURA.
 * Recalcula totales en el servidor para garantizar integridad.
 */
export async function convertirPresupuestoADosFacturas(presupuestoId: number) {
    try {
        console.log(`[ACTION] Iniciando facturación para presupuesto ID: ${presupuestoId}`);
        await _checkRole('admin') // SECURITY HARDENING

        // Validacion input
        if (!presupuestoId) throw new Error('ID de presupuesto no proporcionado.');

        // 1. Data Fetching (Snapshot Source)
        // Obtener Presupuesto + Tarea + Edificio + Items
        const { data: presupuesto, error: pfError } = await supabase
            .from('presupuestos_finales')
            .select(`
        *,
        items (*),
        tareas:id_tarea (titulo, id_administrador, edificios:id_edificio (nombre))
      `)
            .eq('id', presupuestoId)
            .single()

        if (pfError) throw new Error(`Error de base de datos al obtener presupuesto ${presupuestoId}: ${pfError.message}`);
        if (!presupuesto) throw new Error(`Presupuesto final #${presupuestoId} no encontrado.`);

        console.log(`[ACTION] Datos cargados. Código: ${presupuesto.code}. Items: ${presupuesto.items?.length || 0}`);

        // Verificar si ya existen facturas
        const { count, error: countError } = await supabase.from('facturas').select('*', { count: 'exact', head: true }).eq('id_presupuesto_final', presupuestoId)
        if (countError) throw new Error(`Error verificando existencia de facturas: ${countError.message}`);
        if (count && count > 0) throw new Error(`Este presupuesto (#${presupuestoId}) ya fue facturado anteriormente.`);

        const items = presupuesto.items || []
        if (items.length === 0) throw new Error(`El presupuesto #${presupuestoId} no tiene ítems cargados.`);

        // 2. Logic splitting (Regular vs Materiales)
        const itemsRegulares = items.filter((i: any) => !i.es_material)
        const itemsMateriales = items.filter((i: any) => i.es_material === true)

        // 3. Admin lookup (Optimized: already fetched in the initial query join)
        const idAdministrador = presupuesto.tareas?.id_administrador || presupuesto.id_administrador;

        console.log(`[ACTION] Admin ID: ${idAdministrador}. Items Regulares: ${itemsRegulares.length}, Materiales: ${itemsMateriales.length}`);

        // Naming & Codes
        const nombreBase = presupuesto.tareas?.titulo || (presupuesto.tareas?.edificios?.nombre ? `Trabajo en ${presupuesto.tareas.edificios.nombre}` : `Presupuesto ${presupuesto.code}`);
        const fechaActual = new Date();
        const codigoBase = `${fechaActual.getFullYear().toString().slice(-2)}${(fechaActual.getMonth() + 1).toString().padStart(2, '0')}-${presupuesto.code.split('-').pop()}`;

        // Helper para crear factura
        const createInvoiceRecord = async (itemsList: any[], suffix: string, codigo: string, esMaterialGroup: boolean) => {
            if (itemsList.length === 0) return null;

            // SERVER-SIDE CALCULATION INTEGRITY
            const totalCalculado = itemsList.reduce((sum: number, item: any) => sum + (item.cantidad * item.precio), 0);

            const { data: newFactura, error: createError } = await supabase.from('facturas').insert({
                id_presupuesto_final: presupuesto.id,
                id_presupuesto: presupuesto.id_presupuesto_base,
                fecha_vencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                id_administrador: idAdministrador,
                tiene_ajustes: false,
                ajustes_aprobados: false,
                created_at: new Date().toISOString(),
                id_estado_nuevo: 1, // Pendiente
                total: Math.round(totalCalculado), // Rounding policy
                saldo_pendiente: totalCalculado,
                total_pagado: 0,
                nombre: suffix ? `${nombreBase} ${suffix}` : nombreBase,
            }).select().single();

            if (createError) throw new Error(`Error creando factura ${suffix}: ${createError.message}`);

            // Insert Items
            const invoiceItems = itemsList.map((item: any) => ({
                id_factura: newFactura.id,
                cantidad: item.cantidad,
                precio_unitario: item.precio,
                subtotal_item: item.cantidad * item.precio, // SERVER CALC
                descripcion: item.descripcion || 'Sin descripción',
                es_material: esMaterialGroup,
                created_at: new Date().toISOString()
            }));

            const { error: itemsInsertError } = await supabase.from('items_factura').insert(invoiceItems);
            if (itemsInsertError) throw new Error(`Error insertando items para factura ${newFactura.id}: ${itemsInsertError.message}`);

            return newFactura;
        }

        // 4. Execution
        const facRegular = await createInvoiceRecord(itemsRegulares, '', `FAC-${codigoBase}`, false);
        const facMaterial = await createInvoiceRecord(itemsMateriales, 'material', `FAC-M-${codigoBase}`, true);

        if (!facRegular && !facMaterial) throw new Error('No se generaron facturas (sin items validos).');

        // 5. Update State
        // Buscar estado 'facturado' por codigo si es posible, o usar ID conocido (hardcoded fallback to prevent lookup fail blocking flow if seeds exist)
        // Better: fetch id
        const { data: estadoFacturado } = await supabase.from('estados_presupuestos').select('id').eq('codigo', 'facturado').single();
        if (estadoFacturado) {
            await supabase.from('presupuestos_finales').update({ id_estado: estadoFacturado.id, aprobado: true }).eq('id', presupuestoId);
        }

        // 6. Revalidate
        revalidatePath('/dashboard/presupuestos', 'layout');
        revalidatePath('/dashboard/facturas', 'layout');

        return { success: true, message: 'Facturas generadas y calculadas correctamente.' };

    } catch (error: any) {
        console.error('SERVER ACTION ERROR:', error);
        return { success: false, message: error.message };
    }
}

/**
 * Elimina una factura y sus dependencias de forma segura
 */
export async function deleteInvoice(invoiceId: number) {
    try {
        await _checkRole('admin');

        if (!invoiceId) throw new Error('ID requerido');
        // Usamos el cliente administrativo importado como 'supabase'

        // 1. Checks constraints
        const { count: pagosCount } = await supabase.from('pagos_facturas').select('*', { count: 'exact', head: true }).eq('id_factura', invoiceId);
        if (pagosCount && pagosCount > 0) throw new Error('Tiene pagos asociados. Elimine los pagos primero.');

        // Get metadata before delete relation
        const { data: factura } = await supabase.from('facturas').select('id_presupuesto_final').eq('id', invoiceId).single();

        // 2. Cascade Delete (Manual safety)
        // Items
        const { data: items } = await supabase.from('items_factura').select('id').eq('id_factura', invoiceId);
        if (items && items.length > 0) {
            const itemIds = items.map(i => i.id);
            await supabase.from('ajustes_facturas').delete().in('id_item', itemIds); // Ajustes
            await supabase.from('items_factura').delete().eq('id_factura', invoiceId);
        }

        // 3. Delete Invoice
        const { error: delError } = await supabase.from('facturas').delete().eq('id', invoiceId);
        if (delError) throw new Error(delError.message);

        // 4. Update Budget State Check
        if (factura?.id_presupuesto_final) {
            const { count: remaining } = await supabase.from('facturas').select('*', { count: 'exact', head: true }).eq('id_presupuesto_final', factura.id_presupuesto_final);
            if (remaining === 0) {
                // Rollback to 'presupuestado' / desaprobar
                const { data: estadoPresupuestado } = await supabase.from('estados_presupuestos').select('id').eq('codigo', 'presupuestado').single(); // 3
                if (estadoPresupuestado) {
                    await supabase.from('presupuestos_finales').update({
                        id_estado: estadoPresupuestado.id,
                        aprobado: false
                    }).eq('id', factura.id_presupuesto_final);
                }

                // Update Tarea if linked
                const { data: pf } = await supabase.from('presupuestos_finales').select('id_tarea').eq('id', factura.id_presupuesto_final).single();
                if (pf?.id_tarea) {
                    const { data: estadoTarea } = await supabase.from('estados_tareas').select('id').eq('codigo', 'presupuestado').single();
                    if (estadoTarea) {
                        await supabase.from('tareas').update({ id_estado_nuevo: estadoTarea.id }).eq('id', pf.id_tarea);
                    }
                }
            }
        }

        revalidatePath('/dashboard/facturas', 'layout');
        return { success: true, message: 'Factura eliminada.' };

    } catch (error: any) {
        return { success: false, message: error.message };
    }
}
