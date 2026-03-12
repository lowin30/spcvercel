// Tool Registry for Chat Integration (SPC Protocol v6.7)
// All 23 components mapped for dynamic rendering

export const TOOL_REGISTRY = {
    // Already Integrated
    crear_edificio: { component: 'BuildingToolWrapper', roles: ['admin', 'supervisor'], label: 'Nuevo Edificio', icon: '🏢' },
    crear_tarea: { component: 'TaskFormChatWrapper', roles: ['admin', 'supervisor'], label: 'Nueva Tarea', icon: '➕' },
    registrar_parte: { component: 'RegistroParteTrabajoForm', roles: ['admin', 'supervisor', 'trabajador'], label: 'Registrar Día', icon: '⏱️' },
    registrar_gasto: { component: 'ProcesadorImagen', roles: ['admin', 'supervisor', 'trabajador'], label: 'Nuevo Gasto', icon: '💰' },
    crear_presupuesto_base: { component: 'PresupuestoBaseForm', roles: ['admin', 'supervisor'], label: 'Presup. Base', icon: '💼' },

    // Finance (Admin Priority)
    crear_factura: { component: 'InvoiceForm', roles: ['admin'], label: 'Nueva Factura', icon: '📄', priority: 'critical' },
    registrar_pago: { component: 'PaymentForm', roles: ['admin', 'supervisor'], label: 'Registrar Pago', icon: '💵', priority: 'high' },
    generar_liquidacion: { component: 'GenerarLiquidacionDialog', roles: ['admin'], label: 'Liquidación', icon: '💰', priority: 'high' },

    // Operations
    finalizar_tarea: { component: 'FinalizarTareaDialog', roles: ['admin', 'supervisor', 'trabajador'], label: 'Cerrar Tarea', icon: '✅', priority: 'critical' },
    asignar_trabajador: { component: 'AssignWorkersForm', roles: ['admin', 'supervisor'], label: 'Asignar Personal', icon: '👷', priority: 'high' },
    asignar_supervisor: { component: 'AssignSupervisorForm', roles: ['admin'], label: 'Asignar Supervisor', icon: '👔', priority: 'medium' },

    // Inventory & Structure
    crear_producto: { component: 'ProductoForm', roles: ['admin', 'supervisor'], label: 'Nuevo Producto', icon: '📦', priority: 'high' },
    crear_departamento: { component: 'DepartamentoForm', roles: ['admin'], label: 'Nuevo Depto', icon: '🏗️', priority: 'medium' },
    crear_contacto: { component: 'ContactoForm', roles: ['admin', 'supervisor', 'trabajador'], label: 'Nuevo Contacto', icon: '📇', priority: 'low' },

    // HR (RRHH)
    crear_trabajador: { component: 'ConfigurarTrabajadorForm', roles: ['admin'], label: 'Alta Personal', icon: '👤', priority: 'high' },
    editar_trabajador: { component: 'EditarTrabajadorForm', roles: ['admin'], label: 'Editar Personal', icon: '✏️', priority: 'medium' },

    // Admin & Config
    crear_admin: { component: 'AdminForm', roles: ['admin'], label: 'Nuevo Admin', icon: '👨‍💼', priority: 'high' },
    configurar_afip: { component: 'DatosAfipForm', roles: ['admin'], label: 'Config. AFIP', icon: '🏛️', priority: 'medium' },
    ajustes_sistema: { component: 'SystemSettings', roles: ['admin'], label: 'Ajustes', icon: '⚙️', priority: 'low' },

    // Comments & Interaction
    agregar_comentario: { component: 'CommentForm', roles: ['admin', 'supervisor', 'trabajador'], label: 'Comentario', icon: '💬', priority: 'low' },

    // Budget & Estimation
    editar_presupuesto: { component: 'BudgetFormNormalizado', roles: ['admin', 'supervisor'], label: 'Editar Presupuesto', icon: '📊', priority: 'medium' },

    // Advanced Operations
    generar_ajustes: { component: 'GenerarAjustesDialog', roles: ['admin'], label: 'Ajustes Factura', icon: '🔧', priority: 'medium' },
    cambiar_estado_tarea: { component: 'CambiarEstado', roles: ['admin', 'supervisor'], label: 'Cambiar Estado', icon: '🔄', priority: 'medium' },
}

export type ToolName = keyof typeof TOOL_REGISTRY
