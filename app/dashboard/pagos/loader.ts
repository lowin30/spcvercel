import "server-only"
import { supabaseAdmin } from "@/lib/supabase-admin"

export type PagosFilterParams = {
    q?: string
    desde?: string
    hasta?: string
    adm?: string
    edificio?: string
    mod?: string
    sort?: string
}

export type PagoEnriquecido = {
    id_pago: number
    id_factura: number
    id_tarea: number
    fecha_pago: string
    monto_pago: number
    modalidad: string
    administrador_id: number
    administrador_nombre: string
    edificio_id: number
    edificio_nombre: string
    edificio_cuit: string
    tarea_titulo: string
    tarea_codigo: string
    presupuesto_total_aprobado: number
    nro_factura: string
    created_at: string
}

/**
 * Obtiene el listado de pagos enriquecidos desde la vista SQL.
 * Implementa filtros de servidor precisos y ordenamiento.
 */
export async function getPagos(filters?: PagosFilterParams): Promise<PagoEnriquecido[]> {
    try {
        let query = supabaseAdmin
            .from('vista_pagos_completa')
            .select('*');

        if (filters) {
            // 1. Busqueda amplia (q) incluyendo CUIT y Nro Factura
            if (filters.q) {
                const term = filters.q;
                query = query.or(`administrador_nombre.ilike.%${term}%,edificio_nombre.ilike.%${term}%,tarea_titulo.ilike.%${term}%,tarea_codigo.ilike.%${term}%,nro_factura.ilike.%${term}%,edificio_cuit.ilike.%${term}%`);
            }

            // 2. Filtros exactos por ID y Modalidad
            if (filters.adm && filters.adm !== 'all') {
                query = query.eq('administrador_id', filters.adm);
            }
            if (filters.edificio && filters.edificio !== 'all') {
                query = query.eq('edificio_id', filters.edificio);
            }
            if (filters.mod && filters.mod !== 'all') {
                query = query.eq('modalidad', filters.mod);
            }

            // 3. Rango de fechas
            if (filters.desde) {
                query = query.gte('fecha_pago', filters.desde);
            }
            if (filters.hasta) {
                query = query.lte('fecha_pago', filters.hasta);
            }

            // 4. Ordenamiento (server-side)
            const sort = filters.sort || 'fecha_desc';
            switch (sort) {
                case 'fecha_asc':
                    query = query.order('fecha_pago', { ascending: true }).order('id_pago', { ascending: true });
                    break;
                case 'monto_desc':
                    query = query.order('monto_pago', { ascending: false });
                    break;
                case 'monto_asc':
                    query = query.order('monto_pago', { ascending: true });
                    break;
                case 'fecha_desc':
                default:
                    query = query.order('fecha_pago', { ascending: false }).order('id_pago', { ascending: false });
                    break;
            }
        } else {
            // Default sort if no filters
            query = query.order('fecha_pago', { ascending: false }).order('id_pago', { ascending: false });
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

/**
 * Obtiene datos auxiliares para los selectores de filtros
 */
export async function getFiltrosMetadata() {
    const [adminsRes, edificiosRes] = await Promise.all([
        supabaseAdmin.from('administradores').select('id, nombre').order('nombre'),
        supabaseAdmin.from('edificios').select('id, nombre, id_administrador').order('nombre')
    ]);

    return {
        administradores: adminsRes.data || [],
        edificios: edificiosRes.data || []
    };
}
