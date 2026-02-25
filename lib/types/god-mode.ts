/**
 * GOD MODE TYPES v109.0
 * Definiciones centralizadas para la Súper Vista Maestra de Actividad.
 */

export type TipoEventoActividad = 'JORNAL' | 'GASTO';

export interface UIMetadataActividad {
    color_perfil: string | null;
    icon: 'calendar' | 'receipt';
    status_color: string;
}

export interface ActividadMaestra {
    event_id: number;
    fecha: string;
    id_usuario: string;
    id_tarea: number;
    tipo_evento: TipoEventoActividad;
    detalle_tipo: string;
    monto: number;
    liquidado: boolean;
    id_liquidacion: number | null;
    descripcion: string | null;
    created_at: string;
    email_usuario: string;
    nombre_usuario: string | null;
    rol_usuario: string;
    titulo_tarea: string;
    codigo_tarea: string;
    nombre_edificio: string;
    direccion_edificio: string | null;
    id_supervisor: string | null;
    ui_metadata: UIMetadataActividad;
}

// Interfaz para la respuesta de la DB (Supabase)
export interface DBActividadMaestra extends Omit<ActividadMaestra, 'ui_metadata'> {
    ui_metadata: any; // Se castea en el loader
}
