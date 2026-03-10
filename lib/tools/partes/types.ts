/**
 * SPC TOOLS: partes de trabajo
 * tipos compartidos para la arquitectura de tools modulares
 */

// contexto que recibe cualquier tool de partes
// los campos opcionales permiten pre-llenar la UI segun donde se invoque
export interface ToolContext {
    id_tarea?: number
    id_trabajador?: string
    fecha?: string           // formato YYYY-MM-DD
    estado?: 'proyectado' | 'confirmado'
    titulo_tarea?: string    // para mostrar en la UI sin fetch extra
    nombre_trabajador?: string
}

// resultado estandarizado de cualquier server action de tools
export interface ToolResult {
    ok: boolean
    data?: any
    error?: string
}

// item del pase de lista
export interface PaseListaItem {
    id: number               // id del parte_de_trabajo
    id_tarea: number
    titulo_tarea: string
    codigo_tarea: string
    nombre_edificio: string
    id_trabajador: string
    nombre_trabajador: string
    email_trabajador: string
    color_trabajador: string
    fecha: string
    tipo_jornada: 'dia_completo' | 'medio_dia'
    estado: 'proyectado' | 'confirmado'
}

// bloque del planificador semanal
export interface BloquePlanificador {
    id_trabajador: string
    nombre_trabajador: string
    email_trabajador: string
    color_trabajador: string
    dias: {
        fecha: string
        partes: Array<{
            id?: number          // undefined si es nuevo
            id_tarea: number
            titulo_tarea: string
            tipo_jornada: 'dia_completo' | 'medio_dia'
            estado: 'proyectado' | 'confirmado'
        }>
    }[]
}

// tarea con sus trabajadores asignados (para selectores)
export interface TareaConTrabajadores {
    id: number
    titulo: string
    code: string
    nombre_edificio: string
    trabajadores: Array<{
        id: string
        nombre: string
        email: string
        color_perfil: string
    }>
}

// KPIs del resumen de planificacion
export interface ResumenPlanificacion {
    total_proyectados: number
    total_confirmados: number
    total_pendientes: number
    trabajadores_activos: number
    tareas_con_actividad: number
}

// tipos para la nueva Agenda Platinum
export interface AgendaEvento {
    id: string | number
    tipo: 'visita' | 'proyectado' | 'confirmado' | 'gasto'
    fecha: string            // YYYY-MM-DD
    id_tarea?: number
    titulo: string
    nombre_edificio?: string
    id_usuario?: string
    nombre_usuario?: string
    tipo_jornada?: 'dia_completo' | 'medio_dia'
    id_estado_tarea?: number
    estado_tarea?: string
    prioridad?: string
}

export interface AgendaData {
    eventos: AgendaEvento[]
    resumen: ResumenPlanificacion
    catalogos: {
        edificios: { id: number; nombre: string }[]
        usuarios: { id: string; email: string; nombre: string; rol: string; color_perfil?: string }[]
        estados: { id: number; nombre: string; color: string }[]
        tareas: TareaConTrabajadores[]
    }
}
