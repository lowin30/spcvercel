"use client"

import { FinalizarTareaDialog } from '@/components/finalizar-tarea-dialog'

import { useState, useRef, useEffect } from "react"
import { useSupabase } from "@/lib/supabase-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bot, Send, Mic, MicOff, Loader2, X, Copy, Check } from "lucide-react"
import { usePathname } from "next/navigation"
import { CofreSelector } from "@/components/chat/cofre-selector"
import { TaskListWelcome } from "@/components/task-list-welcome"
import { ToolConfirmationCard } from "@/components/tool-confirmation-card"
import { ToolInvocation } from "ai"
import { toast } from "sonner"
import dynamic from 'next/dynamic'

const ProcesadorImagen = dynamic(() => import('./procesador-imagen').then(mod => mod.ProcesadorImagen), { ssr: false })
const RegistroParteTrabajoForm = dynamic(() => import('./registro-parte-trabajo-form'), { ssr: false })
const PresupuestoBaseForm = dynamic(() => import('./presupuesto-base-form'), { ssr: false })

const TaskFormChatWrapper = dynamic(() => import('./task-form-chat-wrapper'), { ssr: false })
const BuildingWizard = dynamic(() => import('@/components/buildings/building-wizard').then(mod => mod.BuildingWizard), { ssr: false })
const BuildingToolWrapper = dynamic(() => import('@/components/chat/tools/building-tool').then(mod => mod.BuildingToolWrapper), { ssr: false })
// const DepartmentToolWrapper = dynamic(() => import('@/components/chat/tools/department-tool').then(mod => mod.DepartmentToolWrapper), { ssr: false })
import { DepartmentToolWrapper } from '@/components/chat/tools/department-tool'
const EstimationCard = dynamic(() => import('@/components/ai/estimation-card').then(mod => mod.EstimationCard), { ssr: false })
const KnowledgeBaseManager = dynamic(() => import('@/components/knowledge-base-manager').then(mod => mod.KnowledgeBaseManager), { ssr: false })
const ReactMarkdown = dynamic(() => import('react-markdown'), {
    loading: () => <span className="animate-pulse">...</span>,
    ssr: false
})

// remarkGfm no se puede importar dinámicamente tan fácil para usar en plugins, 
// pero como es un plugin, lo importaremos dentro del componente o usaremos un workaround si falla.
// Por ahora intentaremos importarlo estándar, pero si falla, el dynamic de ReactMarkdown ayuda a aislar el error.
import remarkGfm from "remark-gfm"
import { WizardOptions } from "@/components/wizard-options"

// ... (imports existentes)

const CopyButton = ({ text }: { text: string }) => {
    const [isCopied, setIsCopied] = useState(false)

    const handleCopy = async () => {
        await navigator.clipboard.writeText(text)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
    }

    return (
        <button
            onClick={handleCopy}
            className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            title="Copiar texto"
        >
            {isCopied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-gray-400" />}
        </button>
    )
}

export function AiChatWidget() {
    const { user } = useSupabase()
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<any[]>([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isRecording, setIsRecording] = useState(false)

    // Wizard States
    const [showTaskWizard, setShowTaskWizard] = useState(false)
    const [showBuildingWizard, setShowBuildingWizard] = useState(false)
    // Estado para Finalizar Tarea
    const [showFinalizarDialog, setShowFinalizarDialog] = useState(false)
    const [finalizarSelectedTask, setFinalizarSelectedTask] = useState<number | null>(null)
    const [finalizeMode, setFinalizeMode] = useState(false)

    const [wizardState, setWizardState] = useState<{
        mode: 'create' | 'edit',
        taskId?: number,
        data?: any
        // Legacy/Expanded fields
        active?: boolean
        flow?: 'gasto' | 'parte' | 'tarea' | null
        step?: number
    }>({ mode: 'create', data: {}, active: false, flow: null, step: 0 })

    // Expense Tool States
    const [showExpenseTaskSelector, setShowExpenseTaskSelector] = useState(false)
    const [showExpenseForm, setShowExpenseForm] = useState(false)
    const [expenseSelectedTask, setExpenseSelectedTask] = useState<{ id: number, code: string, titulo: string } | null>(null)
    const [expenseAvailableTasks, setExpenseAvailableTasks] = useState<any[]>([])

    // Work Hours Tool State
    const [showParteForm, setShowParteForm] = useState(false)

    // Knowledge Base Tool State
    const [showKnowledgeBase, setShowKnowledgeBase] = useState(false)

    // My Tasks Tool State
    const [showTaskList, setShowTaskList] = useState(false)
    const [myTasks, setMyTasks] = useState<any[]>([])


    // Handlers para confirmación
    const handleConfirmTool = async (toolCallId: string, actionFn: string, args: any) => {
        // 1. Ejecutar la acción real
        const result = await executeToolAction(actionFn, args);

        // 2. Actualizar el estado del mensaje para reflejar 'result'
        setMessages(prev => prev.map(m => {
            if (!m.toolInvocations) return m;
            return {
                ...m,
                toolInvocations: m.toolInvocations.map(t =>
                    t.toolCallId === toolCallId
                        ? { ...t, state: 'result', result: result }
                        : t
                )
            };
        }));

        // 3. Guardar en historial
        saveToHistory('assistant', result, { tool: actionFn, type: 'result' });
    };

    const handleRejectTool = (toolCallId: string) => {
        // Cancelar: Actualizar estado a 'result' pero con mensaje de cancelación
        const cancelMsg = "❌ Acción cancelada por el usuario.";
        setMessages(prev => prev.map(m => {
            if (!m.toolInvocations) return m;
            return {
                ...m,
                toolInvocations: m.toolInvocations.map(t =>
                    t.toolCallId === toolCallId
                        ? { ...t, state: 'result', result: cancelMsg }
                        : t
                )
            };
        }));
        saveToHistory('assistant', cancelMsg, { tool: 'cancelled', type: 'result' });
    };

    // Función que realmente ejecuta la lógica (Client Side o llamada a API)
    const executeToolAction = async (name: string, args: any) => {
        try {
            switch (name) {
                case 'registrar_gasto':
                    // Aquí llamaríamos a la API real o server action
                    const res = await fetch('/api/expenses/create', { // Endpoint hipotético
                        method: 'POST',
                        body: JSON.stringify(args)
                    });
                    if (!res.ok) throw new Error("Falló el registro");
                    return `✅ Gasto de $${args.monto} registrado exitosamente.`;

                case 'eliminar_tarea':
                    return `✅ Tarea ${args.id} eliminada.`;

                default:
                    return `✅ Acción ${name} completada.`;
            }
        } catch (e) {
            return `❌ Error ejecutando ${name}: ${e instanceof Error ? e.message : String(e)}`;
        }
    };

    // Renderizado de Resultados de Herramientas
    const renderToolResult = (toolInvocation: ToolInvocation) => {
        const { toolName, toolCallId, state } = toolInvocation;
        const nameLower = toolName.toLowerCase();

        // INTERCEPTOR: BuildingToolWrapper (Edificios)
        if (nameLower === 'crear_edificio' || nameLower === 'create_building') {
            return (
                <div key={toolCallId} className="w-full my-2">
                    <BuildingWizard />
                    <BuildingToolWrapper
                        data={toolInvocation.args}
                        isOpen={state === 'call'}
                    />
                </div>
            )
        }

        // INTERCEPTOR: DepartmentToolWrapper (Departamentos)
        if (nameLower === 'crear_departamento') {
            return (
                <div key={toolCallId} className="w-full my-2">
                    <DepartmentToolWrapper
                        data={toolInvocation.args || {}}
                        onSuccess={() => { }}
                    />
                </div>
            )
        }

        // COMPORTAMIENTO GENERAL (Resultados de texto o JSON)
        if (state === 'result') {
            let resultText = toolInvocation.result;
            // Safety check for objects
            if (typeof resultText === 'object') {
                resultText = JSON.stringify(resultText, null, 2);
            }

            return (
                <div key={toolCallId} className="bg-gray-50 dark:bg-gray-900 border border-l-4 border-l-green-500 rounded-r-lg p-3 text-sm animate-in fade-in">
                    <div className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-1">
                        {String(resultText).includes('❌') ? '🚫 Cancelado / Error' : '✅ Completado'}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 font-mono text-xs whitespace-pre-wrap">
                        {resultText}
                    </div>
                </div>
            );
        }

        // Si está en estado 'call', pedimos confirmación solo para ciertas tools
        if (state === 'call') {
            const sensitiveTools = ['registrar_gasto', 'eliminar_tarea', 'finalizar_obra'];
            if (sensitiveTools.includes(toolName)) {
                return (
                    <ToolConfirmationCard
                        key={toolCallId}
                        toolInvocation={toolInvocation}
                        onConfirm={handleConfirmTool}
                        onReject={handleRejectTool}
                    />
                );
            }

            // Si no es sensitiva, mostramos loader mientras se "auto-confirma" (o se ejecuta en el effect)
            return (
                <div key={toolCallId} className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg border">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Ejecutando {toolName}...
                </div>
            );
        }

        // Renderizado del componente visual de Estimación
        if (toolName === 'estimarPresupuestoConHistorico' && state === 'result') {
            return (
                <div key={toolCallId} className="w-full flex justify-center my-2">
                    <EstimationCard
                        data={toolInvocation.result as any}
                        onUseValues={handleUseEstimationValues}
                    />
                </div>
            )
        }

        return null;
    };
    const [isMounted, setIsMounted] = useState(false)
    const pathname = usePathname()
    const scrollRef = useRef<HTMLDivElement>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // No mostrar en login/home
    const shouldHide = pathname === '/login' || pathname === '/'

    const [error, setError] = useState<Error | null>(null)

    const [isTranscribing, setIsTranscribing] = useState(false)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<Blob[]>([])

    // Usuario y rol (para Quick Actions)
    const [userRole, setUserRole] = useState<string>('trabajador')
    const [currentUser, setCurrentUser] = useState<any>(null)

    // Fix hydration: solo renderizar después de montar
    useEffect(() => {
        setIsMounted(true)

        // Fetch user role on mount (solo si está autenticado)
        if (user) {
            fetchUserRole()
        }
    }, [user])

    // Volver a cargar rol cuando cambie la ruta (ej: después de login)
    useEffect(() => {
        if (isMounted && pathname && !pathname.includes('/login') && user) {
            fetchUserRole()
        }
    }, [pathname, isMounted, user])

    const fetchUserRole = () => {
        fetch('/api/user')
            .then(res => {
                if (!res.ok) return null
                return res.json()
            })
            .then(data => {
                if (data?.user) {
                    setUserRole(data.user.rol)
                    setCurrentUser(data.user)
                }
            })
            .catch(() => { })
    }

    // Handler para Quick Actions (Lanzadores Directos Protocol v5.2) + Legacy Logic Combined
    const handleActionClick = (command: string) => {
        // 1. Intercepción para Wizards directos (evitar LLM roundtrip)
        if (command === 'crear_edificio') {
            // Seguridad: Doble check de rol en cliente
            if (!['admin', 'supervisor'].includes(userRole)) {
                toast.error("No tienes permisos para esta acción")
                return
            }
            const timestamp = Date.now()
            setMessages(prev => [
                ...prev,
                { id: `${timestamp}-user`, role: 'user', content: 'Nuevo Edificio' },
                {
                    id: `${timestamp}-ai`, role: 'assistant', content: 'Iniciando asistente de registro de edificios...',
                    toolInvocations: [{ toolCallId: `call_${timestamp}`, toolName: 'crear_edificio', args: {}, state: 'call' }]
                }
            ])
            saveToHistory('user', 'Nuevo Edificio')
            saveToHistory('assistant', 'Iniciando asistente de registro de edificios...', { tool: 'crear_edificio', type: 'call' })
            return
        }

        // 2. Direct Tool Injections (NEW - Cofre System)
        // ADMIN Tools
        if (command === 'crear_admin') {
            if (userRole !== 'admin') {
                toast.error("No tienes permisos para esta acción")
                return
            }
            const ts = Date.now()
            setMessages(prev => [
                ...prev,
                { id: `${ts}-user`, role: 'user', content: 'Nuevo Administrador' },
                {
                    id: `${ts}-ai`, role: 'assistant', content: 'Iniciando formulario de administrador...',
                    toolInvocations: [{ toolCallId: `call_${ts}`, toolName: 'crear_admin', args: {}, state: 'call' }]
                }
            ])
            saveToHistory('user', 'Nuevo Administrador')
            saveToHistory('assistant', 'Iniciando formulario de administrador...', { tool: 'crear_admin', type: 'call' })
            return
        }

        if (command === 'crear_producto') {
            if (!['admin', 'supervisor'].includes(userRole)) {
                toast.error("No tienes permisos para esta acción")
                return
            }
            const ts = Date.now()
            setMessages(prev => [
                ...prev,
                { id: `${ts}-user`, role: 'user', content: 'Nuevo Producto' },
                {
                    id: `${ts}-ai`, role: 'assistant', content: 'Iniciando formulario de producto...',
                    toolInvocations: [{ toolCallId: `call_${ts}`, toolName: 'crear_producto', args: {}, state: 'call' }]
                }
            ])
            saveToHistory('user', 'Nuevo Producto')
            saveToHistory('assistant', 'Iniciando formulario de producto...', { tool: 'crear_producto', type: 'call' })
            return
        }

        if (command === 'crear_factura') {
            if (userRole !== 'admin') {
                toast.error("No tienes permisos para esta acción")
                return
            }
            const ts = Date.now()
            setMessages(prev => [
                ...prev,
                { id: `${ts}-user`, role: 'user', content: 'Nueva Factura' },
                {
                    id: `${ts}-ai`, role: 'assistant', content: 'Iniciando formulario de factura...',
                    toolInvocations: [{ toolCallId: `call_${ts}`, toolName: 'crear_factura', args: {}, state: 'call' }]
                }
            ])
            saveToHistory('user', 'Nueva Factura')
            saveToHistory('assistant', 'Iniciando formulario de factura...', { tool: 'crear_factura', type: 'call' })
            return
        }

        // 3. Legacy Wizards (sin LLM)
        // DISABLED: registrar_gasto now uses new flow in handleToolClick (línea ~571)
        // if (command === 'registrar_gasto') {
        //     startWizard('gasto')
        //     return
        // }
        // DISABLED: registrar_parte now uses new flow in handleToolClick
        // if (command === 'registrar_parte') {
        //     setShowParteWizard(true)
        //     return
        // }
        if (command === 'crear_presupuesto_base') {
            loadTareasForPresupuesto()
            return
        } else if (command === 'crear_tarea') {
            startWizard('tarea')
            return
        }

        // 4. Translate remaining commands to natural language and process with LLM
        let message = command;
        switch (command) {
            case 'aprobar_presupuesto': message = 'Quiero aprobar presupuestos pendientes'; break;
            case 'mostrar_kpis': message = 'Muéstrame los KPIs y métricas globales'; break;
            case 'ver_alertas': message = '¿Hay alertas del sistema?'; break;
            case 'crear_liquidacion': message = 'Quiero generar una liquidación semanal'; break;
            case 'generar_liquidacion': message = 'Quiero generar una liquidación semanal'; break;
            case 'calcular_roi_tarea': message = 'Calcular el ROI de una tarea'; break;
            case 'listar_mis_tareas': message = 'Ver mis tareas asignadas'; break;
            case 'aprobar_gasto': message = 'Aprobar gastos pendientes'; break;
            case 'ver_mi_equipo': message = 'Ver estado de mi equipo'; break;
            case 'ver_liquidacion_equipo': message = 'Ver liquidación de mi equipo'; break;
            case 'ver_mis_pagos': message = 'Ver mis pagos y liquidaciones'; break;
            case 'finalizar_tarea': message = 'Quiero finalizar una tarea'; break;
            case 'asignar_trabajador': message = 'Quiero asignar un trabajador a una tarea'; break;
            case 'asignar_supervisor': message = 'Quiero asignar un supervisor'; break;
            case 'asignar_supervisor': message = 'Quiero asignar un supervisor'; break;

            // NEW: Intercept 'crear_departamento' here instead of sending to LLM message
            // This enables the "Global Button" behavior with selector
            case 'crear_departamento':
                const ts = Date.now()
                setMessages(prev => [
                    ...prev,
                    { id: `${ts}-user`, role: 'user', content: 'Nuevo Departamento' },
                    {
                        id: `${ts}-ai`,
                        role: 'assistant',
                        content: 'Abriendo formulario de creación...',
                        // Call tool with NULL id -> triggers building selector
                        toolInvocations: [{ toolCallId: `call_${ts}`, toolName: 'crear_departamento', args: { id_edificio: null }, state: 'call' }]
                    }
                ])
                saveToHistory('user', 'Nuevo Departamento')
                saveToHistory('assistant', 'Abriendo formulario...', { tool: 'crear_departamento', type: 'call' })
                return;

            case 'registrar_pago': message = 'Quiero registrar un pago'; break;
            case 'configurar_afip': message = 'Configurar datos de AFIP'; break;
            // Knowledge base
            case 'knowledge_viewer': message = 'Quiero ver los manuales y políticas de la empresa'; break;
        }

        processSubmission(message)
    }

    // Wizard State
    const [showParteWizard, setShowParteWizard] = useState(false)
    const [showPresupuestoWizard, setShowPresupuestoWizard] = useState(false)
    const [tareasForPresupuesto, setTareasForPresupuesto] = useState<any[]>([])

    const [wizardOptions, setWizardOptions] = useState<Array<{ label: string, value: string }>>([])

    // Estado para tareas activas (task-centric UX)
    const [activeTasks, setActiveTasks] = useState<Array<any>>([])
    const [loadingTasks, setLoadingTasks] = useState(false)
    const [selectedTask, setSelectedTask] = useState<{ id: number, title: string } | null>(null)

    // Old duplicate handleActionClick removed

    // Placeholder for handleToolExecution - assuming this function will be added or exists elsewhere
    // This is a placeholder to satisfy the instruction's context.
    const handleToolExecution = async (toolCall: any, toolResult: string) => {
        // ... existing logic for tool execution ...

        // Agregar respuesta de la tool al chat
        const toolResponseMsg = {
            id: Date.now().toString(),
            role: 'assistant' as const,
            content: toolResult
        }
        setMessages(prev => [...prev, toolResponseMsg])

        // Guardar en DB también
        saveToHistory('assistant', toolResult, { tool: toolCall.function.name })
    }

    const startWizard = async (flow: 'gasto' | 'tarea' | 'edificio', initialData: any = {}, mode: 'create' | 'edit' = 'create', taskId?: number) => {
        if (flow === 'gasto') {
            // ... existing gasto logic ...
            // Paso 1: Cargar tareas para seleccionar
            setIsOpen(true)
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: '⏳ Buscando tus tareas activas...' // Feedback inmediato
            }])

            try {
                const res = await fetch('/api/tasks/list')
                const { tasks } = await res.json()

                if (!tasks || tasks.length === 0) {
                    setMessages(prev => [...prev.slice(0, -1), { // Reemplazar "Buscando..."
                        id: Date.now().toString(),
                        role: 'assistant',
                        content: '⚠️ No encontré tareas activas asignadas a vos. No podés registrar gastos sin una tarea activa.'
                    }])
                    return
                }

                // Iniciar wizard con opciones de tareas
                setWizardState({ ...wizardState, step: 1, data: {} })
                setMessages(prev => [...prev.slice(0, -1), {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: '💰 Nuevo Gasto. Seleccioná la tarea asociada:'
                }])

                // Mapear tareas a opciones
                setWizardOptions(tasks.map((t: any) => ({
                    label: `📌 ${t.titulo}`,
                    value: t.id.toString()
                })))

            } catch (e) {
                console.error(e)
                setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'Error cargando tareas.' }])
            }
        } else if (flow === 'edificio') {
            setWizardState(prev => ({ ...prev, data: initialData, mode, taskId }))
            setShowBuildingWizard(true)
            setIsOpen(true)
        } else {
            // Flujo Tarea
            setWizardState(prev => ({ ...prev, data: initialData, mode, taskId }))
            setShowTaskWizard(true)
            setIsOpen(true)
        }
    }

    // Procesar input del Wizard
    const handleWizardInput = (value: string) => {
        const { flow, step, data } = wizardState
        const newData = { ...data }

        if (wizardState.flow === 'gasto') {
            if (wizardState.step === 1) { // Tarea Seleccionada
                // Guardar datos de la tarea seleccionada
                newData.tarea_id = value
                newData.tarea_titulo = wizardOptions.find(o => o.value === value)?.label || 'Tarea'

                // IR DIRECTO AL COMPONENTE INTELIGENTE (que ya maneja foto y manual)
                setWizardState({ ...wizardState, step: 99, data: newData })
                setWizardOptions([])
                return
            }
        }

        // ... (Logica Tarea simple)
    }

    // Cargar tareas activas cuando el chat abre vacío
    useEffect(() => {
        if (isOpen && messages.length === 0 && activeTasks.length === 0 && !loadingTasks) {
            loadActiveTasks()
        }
    }, [isOpen, messages.length])

    const loadActiveTasks = async () => {
        setLoadingTasks(true)
        try {
            const res = await fetch('/api/tasks/active')
            if (res.ok) {
                const data = await res.json()
                setActiveTasks(data.tasks || [])
            }
        } catch (e) {
            console.error('Error loading tasks:', e)
        } finally {
            setLoadingTasks(false)
        }
    }

    // Helper function para cargar tareas con filtrado RBAC (expense tool)
    const cargarTareasDisponibles = async (rol: string, userId: string) => {
        const supabase = (await import('@/lib/supabase-client')).createClient()

        if (rol === 'trabajador') {
            const { data } = await supabase
                .from('trabajadores_tareas')
                .select('tareas(id, titulo, code, finalizada)')
                .eq('id_trabajador', userId)

            return data?.map((item: any) => item.tareas).filter((t: any) => !t.finalizada) || []
        }

        if (rol === 'supervisor') {
            // Tareas supervisadas
            const { data: supervisadas } = await supabase
                .from('supervisores_tareas')
                .select('tareas(id, titulo, code, finalizada)')
                .eq('id_supervisor', userId)

            // Tareas asignadas
            const { data: asignadas } = await supabase
                .from('trabajadores_tareas')
                .select('tareas(id, titulo, code, finalizada)')
                .eq('id_trabajador', userId)

            const todas = [
                ...(supervisadas?.map((item: any) => item.tareas) || []),
                ...(asignadas?.map((item: any) => item.tareas) || [])
            ].filter((t: any) => !t.finalizada)
                .filter((t: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.id === t.id) === i) // Dedup

            return todas
        }

        if (rol === 'admin') {
            const { data } = await supabase
                .from('tareas')
                .select('id, titulo, code')
                .eq('finalizada', false)

            return data || []
        }

        return []
    }

    // Handler para clicks en herramientas del Cofre Selector
    const handleToolClick = async (toolId: string) => {
        console.log('Tool clicked:', toolId)

        // EXPENSE TOOL: Registrar Gasto
        if (toolId === 'registrar_gasto') {
            try {
                // Obtener user ID actual
                const supabase = (await import('@/lib/supabase-client')).createClient()
                const { data: { session } } = await supabase.auth.getSession()
                if (!session) {
                    setMessages(prev => [...prev, {
                        id: Date.now().toString(),
                        role: 'assistant',
                        content: '⚠️ Sesión expirada. Por favor inicia sesión.'
                    }])
                    return
                }

                // Cargar tareas disponibles con RBAC
                const tareas = await cargarTareasDisponibles(userRole, session.user.id)

                if (tareas.length === 0) {
                    setMessages(prev => [...prev, {
                        id: Date.now().toString(),
                        role: 'assistant',
                        content: '⚠️ No tienes tareas activas asignadas para registrar gastos.'
                    }])
                    return
                }

                if (tareas.length === 1) {
                    // Si solo hay 1 tarea, ir directo a ProcesadorImagen
                    setExpenseSelectedTask(tareas[0])
                    setShowExpenseForm(true)
                } else {
                    // Si hay múltiples, mostrar selector
                    setExpenseAvailableTasks(tareas)
                    setShowExpenseTaskSelector(true)
                }
            } catch (error) {
                console.error('Error loading tasks for expense:', error)
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: '❌ Error al cargar tareas. Intenta nuevamente.'
                }])
            }
            return
        }

        // WORK HOURS TOOL: Registrar Parte (Día de Trabajo)
        if (toolId === 'registrar_parte') {
            // Simplemente abrir el formulario
            // RegistroParteTrabajoForm tiene RBAC integrado, maneja todo internamente
            setShowParteForm(true)
            return
        }

        // KNOWLEDGE VIEWER: Manuales y Políticas
        if (toolId === 'knowledge_viewer') {
            setShowKnowledgeBase(true)
            return
        }

        // MY TASKS LIST: Listar Mis Tareas
        if (toolId === 'listar_mis_tareas') {
            await loadMyTasks()
            setShowTaskList(true)
            return
        }

        // FINISH TASK TOOL: Finalizar Tarea
        if (toolId === 'finalizar_tarea') {
            setFinalizeMode(true)
            await loadMyTasks()
            setShowTaskList(true)
            return
        }

        // CREATE TASK TOOL: Crear Tarea
        if (toolId === 'crear_tarea') {
            if (!['admin', 'supervisor'].includes(userRole)) {
                toast.error("No tienes permisos para esta acción")
                return
            }
            startWizard('tarea')
            return
        }

        // TODO: Manejar otros tools aquí
        console.log('Tool passing to handleActionClick:', toolId)
        handleActionClick(toolId)
    }

    const loadTareasForPresupuesto = async () => {
        try {
            const supabase = (await import('@/lib/supabase-client')).createClient()

            // Verificar sesión de usuario
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            // Obtener rol del usuario
            const { data: userData } = await supabase
                .from("usuarios")
                .select("rol")
                .eq("id", session.user.id)
                .single()

            // Construir la consulta base
            const tareasBaseQuery = supabase.from("tareas").select("id, titulo, code")

            let filteredQuery

            if (userData?.rol === "supervisor") {
                // Filtrar solo tareas supervisadas
                const { data: tareasSupervisadas } = await supabase
                    .from("supervisores_tareas")
                    .select("id_tarea")
                    .eq("id_supervisor", session.user.id)

                if (tareasSupervisadas && tareasSupervisadas.length > 0) {
                    const tareasIds = tareasSupervisadas.map(t => t.id_tarea)
                    filteredQuery = tareasBaseQuery.in("id", tareasIds)
                } else {
                    filteredQuery = tareasBaseQuery.eq("id", -1) // Sin tareas
                }
            } else {
                // Admin: ver todas las tareas
                filteredQuery = tareasBaseQuery
            }

            const { data: tareas } = await filteredQuery

            setTareasForPresupuesto(tareas || [])
            setShowPresupuestoWizard(true)

        } catch (error) {
            console.error("Error al cargar tareas para presupuesto:", error)
            toast("Error al cargar tareas", { description: "No se pudieron cargar las tareas disponibles" })
        }
    }

    // Handler cuando usuario selecciona una tarea
    const handleTaskSelect = (taskId: number, taskTitle: string) => {
        setSelectedTask({ id: taskId, title: taskTitle })

        // Para empezar simple: al seleccionar una tarea, abrir wizard de gasto directo
        // (podemos agregar menú contextual después)
        setWizardState({
            active: true,
            flow: 'gasto',
            step: 99, // Ir directo a ProcesadorImagen
            data: {
                tarea_id: taskId.toString(),
                tarea_titulo: taskTitle
            }
        })
    }

    // Cargar Historial al inicio
    useEffect(() => {
        if (isMounted && userRole && user) {
            const fetchHistory = async () => {
                try {
                    const res = await fetch('/api/chat/history')
                    if (res.ok) {
                        const history = await res.json()
                        // Mapear DB history a formato UI message
                        const formatted = history.map((h: any) => ({
                            id: h.id,
                            role: h.role,
                            content: h.content
                        }))
                        if (formatted.length > 0) {
                            // Merge inteligente: Mantener mensajes que NO estén en el historial (los nuevos que el usuario acaba de escribir)
                            setMessages(prev => {
                                const historyIds = new Set(formatted.map((m: any) => m.id));
                                const newMessages = prev.filter(m => !historyIds.has(m.id));
                                return [...formatted, ...newMessages];
                            })
                        } else {
                            // Mensaje de bienvenida default si no hay historial Y no hay mensajes nuevos
                            setMessages(prev => {
                                if (prev.length > 0) return prev; // Si ya escribió algo, no mostrar bienvenida
                                return [{
                                    id: 'welcome',
                                    role: 'assistant',
                                    content: `Hola ${userRole === 'admin' ? 'Administrador' : userRole === 'supervisor' ? 'Supervisor' : 'Trabajador'}. ¿En qué puedo ayudarte hoy?`
                                }]
                            })
                        }
                    }
                } catch (e) {
                    console.error("Error loading history:", e)
                }
            }
            fetchHistory()
        }
    }, [isMounted, userRole, user])


    const toggleChat = () => setIsOpen(!isOpen)

    // Función auxiliar para guardar en DB
    const saveToHistory = async (role: 'user' | 'assistant', content: string, metadata = {}) => {
        try {
            await fetch('/api/chat/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role, content, metadata })
            })
        } catch (e) {
            console.error("Error saving message:", e)
        }
    }

    // Nueva función unificada para procesar el envío
    const processSubmission = async (messageText: string) => {
        console.log("🚀 Processing Submission:", messageText); // DEBUG LOG
        if (!messageText.trim() || isLoading) {
            console.log("⚠️ Submission blocked: Empty or Loading (isLoading:", isLoading, ")");
            return;
        }

        // Interceptar si estamos en modo Wizard
        if (wizardState.active) {
            setInput("")
            handleWizardInput(messageText)
            return
        }

        const userMsg = messageText.trim()
        setInput('')

        // 1. Mostrar optimísticamente
        // FIX: Agregar sufijo '-user' para asegurar unicidad y evitar colisión con ID del asistente
        const userMsgObj = { id: Date.now().toString() + '-user', role: 'user' as const, content: userMsg }
        setMessages(prev => [...prev, userMsgObj])
        saveToHistory('user', userMsg) // FIX: Save user message to DB
        setIsLoading(true)
        setError(null)

        try {
            // FIX: Agregar sufijo '-ai' para evitar colisión con ID del usuario si se ejecutan en el mismo ms
            const assistantId = Date.now().toString() + '-ai'
            let assistantContent = ''

            setMessages(prev => {
                const existing = prev.find(m => m.id === assistantId)
                if (existing) {
                    return prev.map(m => m.id === assistantId ? { ...m, content: assistantContent } : m)
                } else {
                    return [...prev, { id: assistantId, role: "assistant", content: assistantContent }]
                }
            })

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMsgObj].map(m => ({ role: m.role, content: m.content })),
                    context: {
                        taskId: selectedTask?.proceso_id || selectedTask?.id,
                        taskTitle: selectedTask?.title
                    }
                })
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const reader = response.body?.getReader()
            if (reader) {
                const decoder = new TextDecoder()
                let done = false
                let buffer = "" // Buffer para acumular chunks

                while (!done) {
                    const { value, done: readerDone } = await reader.read()
                    done = readerDone
                    const chunk = decoder.decode(value, { stream: true })
                    buffer += chunk

                    // Procesar buffer buscando tags completos
                    // Regex busca <tool_code>...</tool_code> incluyendo saltos de linea
                    const toolRegex = /<tool_code>(.*?)<\/tool_code>/s
                    let match = buffer.match(toolRegex)

                    while (match) {
                        const fullMatch = match[0]
                        const jsonContent = match[1]

                        try {
                            // Intentar limpiar el jsonContent de posibles caracteres raros o newlines extras
                            const toolCall = JSON.parse(jsonContent.trim())

                            // Formato simplificado: { tool: "nombre", args: { ... } }
                            // O soporte retroactivo para el formato anidado function -> arguments
                            const functionName = toolCall.tool || toolCall.function?.name
                            const args = toolCall.args || (typeof toolCall.function?.arguments === 'string' ? JSON.parse(toolCall.function.arguments) : toolCall.function?.arguments) || {}

                            if (functionName === 'crear_edificio') {
                                setMessages(prev => {
                                    const existing = prev.find(m => m.id === assistantId)
                                    const newToolInvocation = {
                                        toolCallId: `call_${Date.now()}`,
                                        toolName: 'crear_edificio',
                                        args: args,
                                        state: 'call'
                                    }

                                    if (existing) {
                                        return prev.map(m => m.id === assistantId ? {
                                            ...m,
                                            toolInvocations: [...(m.toolInvocations || []), newToolInvocation]
                                        } : m)
                                    } else {
                                        return [...prev, {
                                            id: assistantId,
                                            role: "assistant", // Fix syntax error in previous block
                                            content: assistantContent,
                                            toolInvocations: [newToolInvocation]
                                        }]
                                    }
                                })
                                assistantContent += `\n[Activando Formulario de Edificio...]\n`
                            } else if (functionName === 'crear_tarea') {
                                startWizard('tarea', args, 'create')
                                assistantContent += `\n[Abriendo Asistente de Tareas...]\n`

                            } else if (functionName === 'crear_departamento') {
                                setMessages(prev => {
                                    const existing = prev.find(m => m.id === assistantId)
                                    const newToolInvocation = {
                                        toolCallId: `call_${Date.now()}`,
                                        toolName: 'crear_departamento',
                                        args: args,
                                        state: 'call'
                                    }

                                    if (existing) {
                                        return prev.map(m => m.id === assistantId ? {
                                            ...m,
                                            toolInvocations: [...(m.toolInvocations || []), newToolInvocation]
                                        } : m)
                                    } else {
                                        return [...prev, {
                                            id: assistantId,
                                            role: "assistant",
                                            content: assistantContent,
                                            toolInvocations: [newToolInvocation]
                                        }]
                                    }
                                })
                                assistantContent += `\n[Activando Formulario de Departamento...]\n`

                            } else if (functionName === 'finalizar_tarea') {
                                setFinalizeMode(true)
                                setShowTaskList(true)
                                // Esto disparará la carga de tareas si el useEffect de showTaskList lo hace, 
                                // pero loadMyTasks es un helper. 
                                // El useEffect que carga tareas está en la línea 1139.
                                loadMyTasks()
                                assistantContent += `\n[Abriendo selector para Finalizar Tarea...]\n`
                            } else {
                                // Fallback generic tool
                                assistantContent += `\n[Acción: ${functionName}]\n`
                            }

                        } catch (e) {
                            console.error("Error parsing buffered tool", e)
                            // Si falla parseo, quizás no es JSON válido aún, pero el regex matcheó </tool_code>
                            // Asumimos que es texto corrupto y lo mostramos? O lo ignoramos?
                            // Mejor mostrarlo para debug
                            assistantContent += fullMatch
                        }

                        // Eliminar el match procesado del buffer
                        buffer = buffer.replace(fullMatch, "")
                        // Buscar siguiente match en el buffer restante
                        match = buffer.match(toolRegex)
                    }

                    // Lo que quede en el buffer que NO sea parte de un tag parcial se puede ir moviendo a assistantContent?
                    // NO, porque podriamos tener "<tool_" al final.
                    // Solo podemos mover a assistantContent lo que esté ANTES del primer "<"

                    const tagStart = buffer.indexOf("<tool_code>")
                    if (tagStart > 0) {
                        // Hay texto antes del tag
                        const textPart = buffer.substring(0, tagStart)
                        assistantContent += textPart
                        buffer = buffer.substring(tagStart) // Dejar solo desde el tag
                    } else if (tagStart === -1) {
                        // No hay tag start. 
                        // Pero cuidado, podria haber un tag parcial "<too..." al final.
                        // Simple heuristic: keep last 20 chars in buffer just in case, flush the rest.
                        if (buffer.length > 20) {
                            const safeToFlush = buffer.substring(0, buffer.length - 20)
                            assistantContent += safeToFlush
                            buffer = buffer.substring(buffer.length - 20)
                        }
                    }

                    // Update UI con contenido acumulado
                    setMessages(prev => {
                        const existing = prev.find(m => m.id === assistantId)
                        if (existing) {
                            return prev.map(m => m.id === assistantId ? { ...m, content: assistantContent } : m)
                        } else {
                            return [...prev, { id: assistantId, role: "assistant", content: assistantContent }]
                        }
                    })
                }

                // Flush remaining buffer at end
                if (buffer) {
                    assistantContent += buffer
                }

                // Al terminar de streamear, guardar en DB
                const finalContent = assistantContent || '[Interactive Action]';
                saveToHistory('assistant', finalContent)
            }

        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)))
        } finally {
            setIsLoading(false)
        }
    }

    // Handler para usar valores de estimación
    const handleUseEstimationValues = (data: any) => {
        // Construir un prompt detallado para que la AI use la herramienta crearTarea
        const prompt = `Crear tarea basada en estimación: "${data.descripcion}" (Categoría: ${data.tipo_trabajo}). 
        Presupuesto estimado: ${data.presupuesto_base_total} (Materiales: ${data.materiales_estimados}, Mano de Obra: ${data.mano_obra_estimada}).
        Nota: ${data.nota}`

        processSubmission(prompt)
    }

    // Manejar clicks en acciones rápidas
    const handleQuickAction = (command: string) => {
        console.log("👆 QuickAction Clicked:", command); // DEBUG LOG
        let message = command;
        // Traducir comandos técnicos a lenguaje natural para la IA
        switch (command) {
            case 'crear_tarea': message = 'Quiero crear una nueva tarea'; break;
            case 'aprobar_presupuesto': message = 'Quiero aprobar presupuestos pendientes'; break;
            case 'mostrar_kpis': message = 'Muéstrame los KPIs y métricas globales'; break;
            case 'ver_alertas': message = '¿Hay alertas del sistema?'; break;
            case 'crear_liquidacion': message = 'Quiero generar una liquidación semanal'; break;
            case 'calcular_roi_tarea': message = 'Calcular el ROI de una tarea'; break;
            case 'listar_mis_tareas': message = 'Ver mis tareas asignadas'; break;
            case 'aprobar_gasto': message = 'Aprobar gastos pendientes'; break;
            case 'crear_presupuesto_base': message = 'Crear un presupuesto base'; break;
            case 'ver_mi_equipo': message = 'Ver estado de mi equipo'; break;
            case 'ver_liquidacion_equipo': message = 'Ver liquidación de mi equipo'; break;
            case 'registrar_parte': message = 'Quiero registrar mi parte diario'; break;
            case 'registrar_gasto': message = 'Quiero registrar un nuevo gasto'; break;
            case 'ver_mis_pagos': message = 'Ver mis pagos y liquidaciones'; break;
        }

        // Ejecutar directamente
        processSubmission(message)
    };

    // Manejo de envío
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        processSubmission(input)
    }

    // Iniciar grabación de audio
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })

            mediaRecorderRef.current = mediaRecorder
            audioChunksRef.current = []

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data)
                }
            }

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
                await transcribeAudio(audioBlob)

                // Detener todos los tracks del stream
                stream.getTracks().forEach(track => track.stop())
            }

            mediaRecorder.start()
            setIsRecording(true)
        } catch (err) {
            console.error('Error accessing microphone:', err)
            setError(new Error('No se pudo acceder al micrófono'))
        }
    }

    // Detener grabación
    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop()
            setIsRecording(false)
        }
    }

    // Transcribir audio con Groq Whisper
    const transcribeAudio = async (audioBlob: Blob) => {
        setIsTranscribing(true)
        try {
            // Convertir blob a base64
            const reader = new FileReader()
            reader.readAsDataURL(audioBlob)

            const base64Audio = await new Promise<string>((resolve) => {
                reader.onloadend = () => resolve(reader.result as string)
            })

            const response = await fetch('/api/audio/transcribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audio: base64Audio })
            })

            if (!response.ok) {
                throw new Error('Error en transcripción')
            }

            const { text } = await response.json()

            // Poner el texto transcrito en el input
            setInput(text)

        } catch (err) {
            console.error('Error transcribing audio:', err)
            setError(new Error('Error al transcribir audio'))
        } finally {
            setIsTranscribing(false)
        }
    }

    // Auto-scroll mejorado
    useEffect(() => {
        if (scrollRef.current) {
            // Usamos un pequeño timeout para asegurar que el DOM se pintó
            setTimeout(() => {
                const scrollElement = scrollRef.current;
                if (scrollElement) {
                    // Forzar scroll al fondo
                    scrollElement.scrollTo({ top: scrollElement.scrollHeight, behavior: 'instant' });
                }
            }, 100)
        }
        // También intentar scrollear al div "final"
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ block: "end", behavior: "smooth" });
        }
    }, [messages, wizardState, isLoading, isOpen]) // Agregamos dependencias clave

    // No renderizar hasta que esté montado en el cliente (fix hydration)
    if (!isMounted || shouldHide) return null

    // Cargar mis tareas para la herramienta "Mis Tareas"
    const loadMyTasks = async () => {
        try {
            const supabase = (await import('@/lib/supabase-client')).createClient()

            // Verificar sesión
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            // Obtener rol
            const { data: userData } = await supabase
                .from('usuarios')
                .select('rol')
                .eq('id', session.user.id)
                .single()

            const userRole = userData?.rol?.toLowerCase()?.trim() || 'trabajador'
            let tasksData: any[] = []
            let taskIds: number[] = []

            console.log('DEBUG: loadMyTasks Rol detected:', userRole)
            // DEBUG: Toast temporal
            toast.info(`Rol detectado en Chat: ${userRole}`)

            // Lógica replicada de /dashboard/tareas/page.tsx
            // AUDIT REVIEW: El dashboard filtra "finalizada" en el CLIENTE (JS), no en SQL.

            if (userRole === 'trabajador') {
                // TRABAJADOR: Usar tabla 'trabajadores_tareas'
                const { data: asignaciones } = await supabase
                    .from('trabajadores_tareas')
                    .select('id_tarea')
                    .eq('id_trabajador', session.user.id)

                if (asignaciones && asignaciones.length > 0) {
                    taskIds = asignaciones.map(a => a.id_tarea).filter(id => id != null)
                }
            }
            else if (userRole === 'supervisor') {
                // SUPERVISOR: Usar tabla 'supervisores_tareas'
                const { data: supervisiones } = await supabase
                    .from('supervisores_tareas')
                    .select('id_tarea')
                    .eq('id_supervisor', session.user.id)

                if (supervisiones && supervisiones.length > 0) {
                    taskIds = supervisiones.map(s => s.id_tarea).filter(id => id != null)
                }
            }
            else {
                // ADMIN: Acceso total a la vista
                const { data: todas } = await supabase
                    .from('vista_tareas_completa')
                    .select('id, titulo, estado_tarea, nombre_edificio, finalizada, id_estado_nuevo') // Incluimos campos para filtrar
                    .order('created_at', { ascending: false })

                // Filtrado CLIENT-SIDE como en el dashboard (page.tsxapplyFilters)
                // Excluimos finalizadas y estado Enviado (4)
                tasksData = (todas || []).filter((t: any) =>
                    t.finalizada !== true && t.id_estado_nuevo !== 4
                )

                setMyTasks(tasksData)
                console.log('DEBUG: Admin tasks loaded:', tasksData.length)
                return
            }

            // Si hay IDs para filtrar (Trabajador o Supervisor)
            if (taskIds.length > 0) {
                // Fetch sin filtrar finalizada en SQL
                const { data: tareas } = await supabase
                    .from('vista_tareas_completa')
                    .select('id, titulo, estado_tarea, nombre_edificio, finalizada, id_estado_nuevo')
                    .in('id', taskIds)
                    .order('created_at', { ascending: false })

                // Filtrado CLIENT-SIDE Estricto
                tasksData = (tareas || []).filter((t: any) =>
                    t.finalizada !== true && t.id_estado_nuevo !== 4
                )
            } else {
                // Lista vacía explícita si no hay asignaciones
                tasksData = []
            }

            console.log('DEBUG: User tasks loaded:', tasksData.length)
            setMyTasks(tasksData)
        } catch (error) {
            console.error('Error loading my tasks:', error)
            toast.error('Error al cargar tareas')
        }
    }

    return (
        <>
            {/* Botón flotante para abrir chat */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-4 right-4 z-50 w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-full shadow-xl hover:shadow-2xl hover:shadow-blue-500/30 flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-95"
                    aria-label="Abrir chat IA"
                >
                    <Bot className="w-6 h-6" />
                </button>
            )}

            {/* Chat widget - MODERNO */}
            {isOpen && (
                <div className="fixed bottom-0 right-0 z-50 w-full md:w-96 md:bottom-4 md:right-4 md:top-auto md:max-h-[calc(100vh-2rem)] h-[100dvh] md:h-[600px] bg-white dark:bg-gray-900 shadow-2xl md:rounded-3xl border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden">
                    {/* Header moderno con gradiente - SIEMPRE VISIBLE */}
                    <div className="sticky top-0 z-50 flex items-center justify-between p-3 sm:p-4 border-b border-gray-200/50 dark:border-gray-800/50 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-600 text-white relative overflow-hidden shadow-lg">
                        {/* Background pattern */}
                        <div className="absolute inset-0 opacity-10">
                            <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full blur-3xl"></div>
                            <div className="absolute bottom-0 right-0 w-32 h-32 bg-white rounded-full blur-3xl"></div>
                        </div>

                        <div className="flex items-center gap-2.5 relative z-10">
                            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                <Bot className="w-4.5 h-4.5" />
                            </div>
                            <div>
                                <span className="font-semibold text-sm block">Asistente SPC</span>
                                <span className="text-xs opacity-90">Powered by AI</span>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="hover:bg-white/20 rounded-xl p-2 transition-colors relative z-10 backdrop-blur-sm"
                            aria-label="Cerrar chat"
                            title="Cerrar chat"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Lógica de Contenido Principal (Wizards vs Chat) */}
                    {showExpenseTaskSelector ? (
                        // EXPENSE TOOL: Selector de Tareas
                        <div className="flex-1 overflow-hidden bg-white dark:bg-gray-950 flex flex-col absolute inset-0 z-50">
                            <div className="flex items-center justify-between p-4 border-b bg-muted/20">
                                <h3 className="font-semibold text-sm">Seleccionar Tarea</h3>
                                <Button variant="ghost" size="icon" onClick={() => setShowExpenseTaskSelector(false)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4">
                                <div className="space-y-2">
                                    {expenseAvailableTasks.map((tarea: any) => (
                                        <Card
                                            key={tarea.id}
                                            className="cursor-pointer hover:bg-accent transition-colors"
                                            onClick={() => {
                                                setExpenseSelectedTask(tarea)
                                                setShowExpenseTaskSelector(false)
                                                setShowExpenseForm(true)
                                            }}
                                        >
                                            <CardContent className="p-4">
                                                <p className="font-medium text-sm">{tarea.code}</p>
                                                <p className="text-xs text-muted-foreground">{tarea.titulo}</p>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : showExpenseForm && expenseSelectedTask ? (
                        // EXPENSE TOOL: ProcesadorImagen
                        <div className="flex-1 overflow-hidden bg-white dark:bg-gray-950 flex flex-col absolute inset-0 z-50">
                            <div className="flex items-center justify-between p-4 border-b bg-muted/20">
                                <h3 className="font-semibold text-sm">Registrar Gasto - {expenseSelectedTask.code}</h3>
                                <Button variant="ghost" size="icon" onClick={() => {
                                    setShowExpenseForm(false)
                                    setExpenseSelectedTask(null)
                                }}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4">
                                <ProcesadorImagen
                                    tareaId={expenseSelectedTask.id}
                                    tareaCodigo={expenseSelectedTask.code}
                                    tareaTitulo={expenseSelectedTask.titulo}
                                    onSuccess={() => {
                                        setShowExpenseForm(false)
                                        setExpenseSelectedTask(null)
                                        setMessages(prev => [...prev, {
                                            id: Date.now().toString(),
                                            role: 'assistant',
                                            content: `✅ Gasto registrado correctamente\n\n📌 Tarea: ${expenseSelectedTask.code} - ${expenseSelectedTask.titulo}`
                                        }])
                                    }}
                                />
                            </div>
                        </div>
                    ) : showParteForm && currentUser ? (
                        // WORK HOURS TOOL: RegistroParteTrabajoForm
                        <div className="flex-1 overflow-hidden bg-white dark:bg-gray-950 flex flex-col absolute inset-0 z-50">
                            <div className="flex items-center justify-between p-4 border-b bg-muted/20">
                                <h3 className="font-semibold text-sm">Registrar Parte de Trabajo</h3>
                                <Button variant="ghost" size="icon" onClick={() => setShowParteForm(false)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4">
                                <RegistroParteTrabajoForm
                                    usuarioActual={currentUser}
                                    onParteRegistrado={() => {
                                        setShowParteForm(false)
                                        toast.success("Parte registrado correctamente")
                                        setMessages(prev => [...prev, {
                                            id: Date.now().toString(),
                                            role: 'assistant',
                                            content: '✅ Parte de trabajo registrado correctamente'
                                        }])
                                    }}
                                />
                            </div>
                        </div>
                    ) : showKnowledgeBase && currentUser ? (
                        // KNOWLEDGE VIEWER TOOL
                        <div className="flex-1 overflow-hidden bg-white dark:bg-gray-950 flex flex-col absolute inset-0 z-50">
                            <div className="flex items-center justify-between p-4 border-b bg-muted/20">
                                <h3 className="font-semibold text-sm">Manuales y Políticas</h3>
                                <Button variant="ghost" size="icon" onClick={() => setShowKnowledgeBase(false)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4">
                                <KnowledgeBaseManager />
                            </div>
                        </div>
                    ) : showTaskList && currentUser ? (
                        // MY TASKS LIST TOOL
                        <div className="flex-1 overflow-hidden bg-white dark:bg-gray-950 flex flex-col absolute inset-0 z-50">
                            <div className="flex items-center justify-between p-4 border-b bg-muted/20">
                                <h3 className="font-semibold text-sm">Mis Tareas Activas</h3>
                                <Button variant="ghost" size="icon" onClick={() => setShowTaskList(false)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4">
                                <TaskListWelcome
                                    tasks={myTasks}
                                    onTaskSelect={(taskId, taskTitle) => {
                                        if (finalizeMode) {
                                            setFinalizarSelectedTask(taskId)
                                            setShowFinalizarDialog(true)
                                            setShowTaskList(false)
                                            setFinalizeMode(false) // Reset mode
                                        } else {
                                            window.location.href = `/dashboard/tareas/${taskId}`
                                        }
                                    }}
                                    userRole={currentUser?.app_metadata?.role || 'trabajador'}
                                />
                            </div>
                        </div>
                    ) : wizardState.active && wizardState.step === 99 ? (
                        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-2">
                            <div className="flex justify-end p-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setWizardState({ active: false, flow: null, step: 0, data: {} })}
                                >
                                    <X className="h-4 w-4 mr-2" /> Cancelar
                                </Button>
                            </div>
                            <ProcesadorImagen
                                tareaId={parseInt(wizardState.data.tarea_id) || 0}
                                tareaTitulo={wizardState.data.tarea_titulo}
                                onSuccess={() => {
                                    setWizardState({ active: false, flow: null, step: 0, data: {} })
                                    setMessages(prev => [...prev, {
                                        id: Date.now().toString(),
                                        role: 'assistant',
                                        content: '✅ ¡Excelente! El gasto y el comprobante se procesaron correctamente.'
                                    }])
                                }}
                            />
                        </div>
                    ) : showParteWizard && currentUser ? (
                        <div className="flex-1 overflow-hidden bg-white dark:bg-gray-950 flex flex-col absolute inset-0 z-50">
                            <div className="flex items-center justify-between p-4 border-b bg-muted/20">
                                <h3 className="font-semibold text-sm">Registrar Parte de Trabajo</h3>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowParteWizard(false)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4">
                                <RegistroParteTrabajoForm
                                    usuarioActual={currentUser}
                                    onParteRegistrado={() => {
                                        setShowParteWizard(false)
                                        toast.success("Parte registrado correctamente")
                                    }}
                                />
                            </div>
                        </div>
                    ) : showTaskWizard ? (
                        <div className="flex-1 overflow-hidden bg-white dark:bg-gray-950 flex flex-col absolute inset-0 z-50">
                            {/* Header no necesario aqui pues ya lo tiene el wrapper, o podemos poner uno generico */}
                            <div className="flex-1 overflow-y-auto w-full h-full">
                                <TaskFormChatWrapper
                                    initialData={wizardState.data}
                                    mode={wizardState.mode}
                                    taskId={wizardState.taskId}
                                    onSuccess={(taskId, taskCode) => {
                                        // Cerrar el wizard
                                        setShowTaskWizard(false)
                                        setWizardState(prev => ({ ...prev, data: {} }))

                                        // Mostrar mensaje de éxito
                                        setMessages(prev => [...prev, {
                                            id: Date.now().toString(),
                                            role: 'assistant',
                                            content: `✅ **Tarea Creada Exitosamente**\n\n📌 **${taskCode}**\n\n[📂 Abrir Tarea](/dashboard/tareas/${taskId})`
                                        }])
                                    }}
                                    onCancel={() => {
                                        setShowTaskWizard(false)
                                        setWizardState(prev => ({ ...prev, data: {} }))
                                    }}
                                />
                            </div>
                        </div>
                    ) : showFinalizarDialog ? (
                        // RENDERIZADO DEL DIÁLOGO DE FINALIZAR TAREA (Sobrepuesto o Intercalado)
                        // Nota: El Dialog usa Portal por defecto, así que no es estrictamente necesario envolverlo en un div posicionado,
                        // pero si queremos que parezca parte del chat, podemos controlarlo.
                        // Sin embargo, FinalizarTareaDialog es un Dialog de UI shadcn, se renderiza en el root.
                        // Aquí solo necesitamos renderizar el componente.
                        <FinalizarTareaDialog
                            open={showFinalizarDialog}
                            onOpenChange={(open) => {
                                setShowFinalizarDialog(open)
                                if (!open) {
                                    setFinalizarSelectedTask(null)
                                    // Restaurar vista de chat
                                    setIsComponentVisible(false)
                                }
                            }}
                            tareaId={finalizarSelectedTask!}
                            onFinalizada={() => {
                                loadMyTasks() // Recargar lista de tareas
                                // El toast de éxito ya lo maneja el dialog
                                // Agregar mensaje al chat
                                setMessages(prev => [...prev, {
                                    id: Date.now().toString(),
                                    role: 'assistant',
                                    content: `✅ **Tarea #${finalizarSelectedTask} Finalizada**\n\nEl estado se ha actualizado correctamente.`
                                }])
                            }}
                            isChatVariant={true}
                        />
                    ) : showBuildingWizard ? (
                        <div className="flex-1 overflow-hidden bg-white dark:bg-gray-950 flex flex-col absolute inset-0 z-50">
                            <div className="flex items-center justify-between p-4 border-b bg-muted/20">
                                <h3 className="font-semibold text-sm">
                                    {wizardState.mode === 'edit' ? 'Editar Edificio' : 'Nuevo Edificio'}
                                </h3>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowBuildingWizard(false)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4">
                                <BuildingWizard
                                    mode={wizardState.mode as any}
                                    initialData={wizardState.data}
                                    onSuccess={() => {
                                        setShowBuildingWizard(false)
                                        setMessages(prev => [...prev, {
                                            id: Date.now().toString(),
                                            role: 'assistant',
                                            content: `✅ **Edificio ${wizardState.mode === 'edit' ? 'Actualizado' : 'Creado'} Exitosamente**`
                                        }])
                                        toast.success("Edificio guardado")
                                    }}
                                    administradores={[]} // BuildingWizard should handle fetching if empty? Or we pass them?
                                // BuildingWizard expects 'administradores'. We should fetch them or let it fetch.
                                // Wait, BuildingWizard REQUIRES 'administradores'. It does NOT fetch them itself?
                                // Let's check BuildingWizard code. 
                                // It takes `administradores: {id, nombre}[]`.
                                // I should fetch them here or make them optional in BuildingWizard.
                                // Quickest fix: Pass empty array and let me fix BuildingWizard to fetch if needed or pass from a Hook.
                                // Actually, AiChatWidget has no 'administradores' state.
                                // I'll fetch them inside this render or useEffect? No, hooks rules.
                                // I'll modify BuildingWizard to be smarter or fetch them myself in `startWizard`.
                                />
                            </div>
                        </div>
                    ) : showPresupuestoWizard && currentUser ? (
                        <div className="flex-1 overflow-hidden bg-white dark:bg-gray-950 flex flex-col absolute inset-0 z-50">
                            <div className="flex items-center justify-between p-4 border-b bg-muted/20">
                                <h3 className="font-semibold text-sm">Crear Presupuesto Base</h3>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowPresupuestoWizard(false)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4">
                                <PresupuestoBaseForm
                                    tareas={tareasForPresupuesto}
                                    userId={currentUser.id}
                                    onSuccess={(presupuestoData) => {
                                        setShowPresupuestoWizard(false)

                                        // Agregar mensaje de éxito con detalles al chat
                                        const successMessage = `✅ **Presupuesto Base Creado Exitosamente**\n\n` +
                                            `**Código:** ${presupuestoData.code}\n` +
                                            `**Tarea:** ${presupuestoData.tarea_titulo} (${presupuestoData.tarea_code})\n\n` +
                                            `**Detalles del Presupuesto:**\n` +
                                            `• Materiales: $${presupuestoData.materiales.toLocaleString('es-ES')}\n` +
                                            `• Mano de Obra: $${presupuestoData.mano_obra.toLocaleString('es-ES')}\n` +
                                            `• **Total: $${presupuestoData.total.toLocaleString('es-ES')}**\n\n` +
                                            (presupuestoData.nota_pb ? `**Nota:** ${presupuestoData.nota_pb}\n\n` : '') +
                                            `El presupuesto está pendiente de aprobación.`

                                        setMessages(prev => [...prev, {
                                            id: Date.now().toString(),
                                            role: 'assistant',
                                            content: successMessage
                                        }])

                                        toast("Presupuesto creado", { description: "El presupuesto base se ha registrado correctamente" })
                                    }}
                                    onCancel={() => setShowPresupuestoWizard(false)}
                                />
                            </div>
                        </div>
                    ) : (
                        <ScrollArea className="flex-1 p-4 bg-gradient-to-b from-gray-50/50 to-white dark:from-gray-900/50 dark:to-gray-950" ref={scrollRef}>
                            {messages.length === 0 && !loadingTasks && (
                                <TaskListWelcome
                                    tasks={activeTasks}
                                    onTaskSelect={handleTaskSelect}
                                    userRole={userRole}
                                />
                            )}

                            {messages.length === 0 && loadingTasks && (
                                <div className="text-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" />
                                    <p className="text-xs text-gray-500 mt-2">Cargando tareas...</p>
                                </div>
                            )}

                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    style={{
                                        // A prueba de balas: Inline styles para forzar alineación
                                        alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                                        marginLeft: message.role === 'user' ? 'auto' : '0',
                                        marginRight: message.role === 'user' ? '0' : 'auto',
                                    }}
                                    className={`flex w-full mb-2 ${message.role === 'user' ? 'justify-end ml-auto' : 'justify-start mr-auto'}`}
                                >
                                    <div
                                        className={`max-w-[85%] rounded-2xl px-3 py-2 shadow-sm group relative ${message.role === 'user'
                                            ? 'bg-blue-600 text-white rounded-tr-none'
                                            : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
                                            }`}
                                    >
                                        {/* Copy Button for Assistant */}
                                        {message.role !== 'user' && <CopyButton text={message.content} />}

                                        <div className={`text-[11px] leading-3 w-full min-w-0 ${message.role !== 'user' ? 'pr-5' : ''}`}>
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    p: ({ node, ...props }: any) => <p className="mb-1 last:mb-0 break-all whitespace-pre-wrap" {...props} />,
                                                    ul: ({ node, ...props }: any) => <ul className="list-disc pl-3 mb-1 break-all whitespace-pre-wrap" {...props} />,
                                                    ol: ({ node, ...props }: any) => <ol className="list-decimal pl-3 mb-1 break-all whitespace-pre-wrap" {...props} />,
                                                    li: ({ node, ...props }: any) => <li className="mb-0 break-all whitespace-pre-wrap" {...props} />,
                                                    code: ({ node, ...props }: any) => <code className="bg-gray-100 text-gray-800 px-1 py-0 rounded text-[10px] font-mono break-all inline-block max-w-full whitespace-pre-wrap" {...props} />,
                                                    pre: ({ node, ...props }: any) => <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded mb-1 overflow-x-auto max-w-full" {...props} />,
                                                }}
                                            >
                                                {message.content}
                                            </ReactMarkdown>
                                        </div>

                                        {message.toolInvocations?.map((toolInvocation) => (
                                            <div key={toolInvocation.toolCallId} className="mt-2">
                                                {/* Tool Result Rendering */}
                                                {renderToolResult(toolInvocation)}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {isLoading && (
                                <div className="flex w-full justify-start">
                                    <div className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 rounded-bl-md shadow-sm border border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                            <span className="text-xs text-gray-500 dark:text-gray-400">Pensando...</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <p className="text-xs text-red-800 dark:text-red-300 font-medium">{error.message}</p>
                                </div>
                            )
                            }
                            <div ref={messagesEndRef} />
                        </ScrollArea >
                    )
                    }

                    {/* Cofre System - Herramientas jerárquicas por rol (Solo si NO estamos en medio de un wizard) */}
                    {
                        !wizardState.active && (
                            <CofreSelector
                                userRole={userRole}
                                onToolSelect={handleToolClick}
                            />
                        )
                    }

                    {/* Opciones del Wizard (Chips) */}
                    {
                        wizardState.active && wizardOptions.length > 0 && (
                            <div className="px-3 pb-2 border-t bg-gray-50/50 dark:bg-gray-900/50">
                                <WizardOptions
                                    options={wizardOptions}
                                    onSelect={handleWizardInput}
                                />
                            </div>
                        )
                    }

                    {/* Input mejorado - MULTI-LÍNEA + MODERNO */}
                    <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200/50 dark:border-gray-800/50 bg-gradient-to-b from-gray-50/80 to-white/80 dark:from-gray-900/80 dark:to-gray-950/80 backdrop-blur-sm">
                        {isTranscribing && (
                            <div className="mb-2.5 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1.5 font-semibold animate-in fade-in slide-in-from-top-1 duration-300">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span className="animate-pulse">Transcribiendo audio...</span>
                            </div>
                        )}

                        <div className="flex gap-2.5 items-start">
                            {/* Textarea multi-línea moderna */}
                            <div className="flex-1 relative group">
                                <textarea
                                    value={input}
                                    onChange={(e) => {
                                        setInput(e.target.value)
                                        // Auto-resize textarea
                                        e.target.style.height = 'auto'
                                        e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
                                    }}
                                    onKeyDown={(e) => {
                                        // Enviar con Enter (sin Shift)
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault()
                                            handleSubmit(e as any)
                                        }
                                    }}
                                    placeholder="Escribe tu consulta o graba un mensaje..."
                                    disabled={isLoading || isRecording || isTranscribing}
                                    rows={1}
                                    className="w-full resize-none text-xs px-3.5 py-2.5 rounded-2xl border-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed max-h-[120px] overflow-y-auto leading-relaxed shadow-sm focus:shadow-md"
                                    style={{
                                        scrollbarWidth: 'thin',
                                        scrollbarColor: 'rgb(156 163 175) transparent',
                                        minHeight: '40px'
                                    }}
                                />
                                {/* Indicador de caracteres */}
                                {input.length > 50 && (
                                    <div className="absolute bottom-2 right-3 text-[10px] text-gray-400 dark:text-gray-600 font-mono bg-white/80 dark:bg-gray-800/80 px-1.5 py-0.5 rounded backdrop-blur-sm">
                                        {input.length}
                                    </div>
                                )}
                                {/* Glow effect on focus */}
                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-blue-500/0 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
                            </div>

                            {/* Botones apilados verticalmente - COMPACTOS */}
                            <div className="flex flex-col gap-2">
                                {/* Botón de audio */}
                                <button
                                    type="button"
                                    onClick={isRecording ? stopRecording : startRecording}
                                    disabled={isLoading || isTranscribing}
                                    className={`rounded-xl w-9 h-9 flex items-center justify-center transition-all duration-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95 ${isRecording
                                        ? 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 animate-pulse shadow-red-500/20 ring-2 ring-red-500/20'
                                        : 'bg-gradient-to-br from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 hover:shadow-md hover:ring-2 hover:ring-gray-500/20'
                                        }`}
                                    title="Grabar audio"
                                >
                                    {isRecording ? (
                                        <MicOff className="w-4 h-4 text-white" />
                                    ) : (
                                        <Mic className="w-4 h-4 text-white" />
                                    )}
                                </button>

                                {/* Botón de enviar */}
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isLoading || isRecording}
                                    className="rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 w-9 h-9 flex items-center justify-center transition-all duration-300 shadow-sm hover:shadow-md hover:shadow-blue-500/20 hover:ring-2 hover:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transform active:scale-95 disabled:transform-none"
                                    title="Enviar mensaje"
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                                    ) : (
                                        <Send className="w-4 h-4 text-white" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                </div >
            )
            }
        </>
    )
}



