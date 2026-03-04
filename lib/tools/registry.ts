/**
 * SPC TOOLS: registro de herramientas
 * catalogo centralizado para invocacion desde cualquier lugar
 */

export const TOOL_REGISTRY = {
    registro_rapido: {
        nombre: 'registro rapido',
        descripcion: 'registrar un parte de trabajo confirmado al instante',
        icono: 'Zap',
        requiereRol: ['admin', 'supervisor', 'trabajador'] as const,
    },
    pase_lista: {
        nombre: 'pase de lista',
        descripcion: 'confirmar asistencia del dia de forma masiva',
        icono: 'ClipboardCheck',
        requiereRol: ['admin', 'supervisor'] as const,
    },
    planificador: {
        nombre: 'planificador semanal',
        descripcion: 'sembrar bloques de trabajo para la semana',
        icono: 'CalendarPlus',
        requiereRol: ['admin', 'supervisor'] as const,
    },
} as const

export type ToolKey = keyof typeof TOOL_REGISTRY
