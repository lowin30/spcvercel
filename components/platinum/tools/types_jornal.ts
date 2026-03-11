import { TareaConTrabajadores } from "@/lib/tools/partes/types"
export type { TareaConTrabajadores }

export interface ToolJornalPlatinumProps {
    tareaId?: number
    trabajadorId?: string
    initialData?: JornalEvent[]
    userRole?: string
    userId?: string
    tareas?: TareaConTrabajadores[]
    onSuccess?: () => void
}

export interface JornalEvent {
    event_id: string | number
    id_tarea: number
    id_usuario: string
    fecha: string
    detalle_tipo: 'dia_completo' | 'medio_dia'
    codigo_tarea: string
    titulo_tarea: string
    nombre_edificio: string
    nombre_usuario: string
    id_registrador?: string
    estado: 'proyectado' | 'confirmado'
}
