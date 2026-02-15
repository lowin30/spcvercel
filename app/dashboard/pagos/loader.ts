import "server-only"
import { supabaseAdmin } from "@/lib/supabase-admin"

export type PagosFilterParams = {
    q?: string
    desde?: string
    hasta?: string
    edificio?: string
}

export type PagoEnriquecido = {
    id_pago: number
    id_factura: number
    id_tarea: number
    fecha_pago: string
    monto_pago: number
    tipo_pago: string
    administrador_nombre: string
    edificio_nombre: string
    tarea_titulo: string
    tarea_codigo: string
    presupuesto_total_aprobado: number
    nro_factura: string
    created_at: string
}

/**
 * Obtiene el listado de pagos enriquecidos desde la vista SQL.
 * Implementa filtros de servidor para busqueda y rangos de fecha.
 */
export async function getPagos(filters?: PagosFilterParams): Promise<PagoEnriquecido[]> {
    try {
        let query = supabaseAdmin
            .from('vista_pagos_completa')
            .select('*')
            .order('fecha_pago', { ascending: false });

        if (filters) {
            // 1. Busqueda por texto (q)
            if (filters.q) {
                const term = filters.q;
                query = query.or(`administrador_nombre.ilike.%${term}%,edificio_nombre.ilike.%${term}%,tarea_titulo.ilike.%${term}%,tarea_codigo.ilike.%${term}%,nro_factura.ilike.%${term}%`);
            }

            // 2. Rango de fechas
            if (filters.desde) {
                query = query.gte('fecha_pago', filters.desde);
            }
            if (filters.hasta) {
                query = query.lte('fecha_pago', filters.hasta);
            }

            // 3. Filtro por edificio especifico
            if (filters.edificio && filters.edificio !== '_todos_') {
                query = query.eq('edificio_nombre', filters.edificio);
            }
        }

        const { data, error } = await query;

        if (error) {
            console.error("Error al cargar pagos desde vista:", error);
            throw new Error("error de base de datos al cargar pagos");
        }

        return (data as PagoEnriquecido[]) || [];

    } catch (err) {
        console.error("error en getPagos loader:", err);
        throw err;
    }
}
