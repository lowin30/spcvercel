"use client"

import { LucideIcon } from "lucide-react"

export type ToolGastoMode = 'compact' | 'full' | 'wizard';

export interface GastoEvent {
    event_id: number;
    fecha: string;
    id_usuario: string;
    id_tarea: number;
    tipo_evento: 'GASTO' | 'JORNAL';
    detalle_tipo: string;
    monto: number;
    liquidado: boolean;
    id_liquidacion: number | null;
    descripcion: string;
    created_at: string;
    comprobante_url: string | null;
    imagen_procesada_url: string | null;
    email_usuario: string;
    nombre_usuario: string;
    titulo_tarea: string;
    codigo_tarea: string;
    nombre_edificio: string;
    direccion_edificio: string;
    ui_metadata: {
        color_perfil: string;
        icon: string;
        status_color: string;
    };
}

export interface ToolGastoPlatinumProps {
    tareaId?: number;
    initialData?: GastoEvent[];
    mode?: ToolGastoMode;
    userRole?: 'admin' | 'supervisor' | 'trabajador';
    userId?: string;
    onSuccess?: () => void;
    showRegistryDefault?: boolean;
    editData?: GastoEvent | null;
}
