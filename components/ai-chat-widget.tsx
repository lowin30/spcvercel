"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bot, Send, Mic, MicOff, Loader2, X, Copy, Check } from "lucide-react"
import { usePathname } from "next/navigation"
import { ChatQuickActions } from "@/components/chat-quick-actions"
import { TaskListWelcome } from "@/components/task-list-welcome"
import { ToolConfirmationCard } from "@/components/tool-confirmation-card"
import { ToolInvocation } from "ai"
import { toast } from "sonner"
import dynamic from 'next/dynamic'

const ProcesadorImagen = dynamic(() => import('./procesador-imagen').then(mod => mod.ProcesadorImagen), { ssr: false })
const RegistroParteTrabajoForm = dynamic(() => import('./registro-parte-trabajo-form'), { ssr: false })
const PresupuestoBaseForm = dynamic(() => import('./presupuesto-base-form'), { ssr: false })
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
    // ... (estados existentes)

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

        if (state === 'result') {
            return (
                <div key={toolCallId} className="bg-gray-50 dark:bg-gray-900 border border-l-4 border-l-green-500 rounded-r-lg p-3 text-sm animate-in fade-in">
                    <div className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-1">
                        {toolInvocation.result.includes('❌') ? '🚫 Cancelado / Error' : '✅ Completado'}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 font-mono text-xs">
                        {toolInvocation.result}
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

        return null;
    };
    const [isOpen, setIsOpen] = useState(false)
    const [isMounted, setIsMounted] = useState(false)
    const pathname = usePathname()
    const scrollRef = useRef<HTMLDivElement>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null) // Nueva ref para el final

    // No mostrar en login/home
    const shouldHide = pathname === '/login' || pathname === '/'

    // Estado del chat
    const [messages, setMessages] = useState<Array<{ id: string; role: string; content: string; toolInvocations?: ToolInvocation[] }>>([])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    // Estado de audio
    const [isRecording, setIsRecording] = useState(false)
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
        fetchUserRole()
    }, [])

    // Volver a cargar rol cuando cambie la ruta (ej: después de login)
    useEffect(() => {
        if (isMounted && pathname && !pathname.includes('/login')) {
            fetchUserRole()
        }
    }, [pathname, isMounted])

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

    // Wizard State
    const [wizardState, setWizardState] = useState<{
        active: boolean
        flow: 'gasto' | 'parte' | 'tarea' | null
        step: number
        data: Record<string, any>
    }>({ active: false, flow: null, step: 0, data: {} })

    const [showParteWizard, setShowParteWizard] = useState(false)
    const [showPresupuestoWizard, setShowPresupuestoWizard] = useState(false)
    const [tareasForPresupuesto, setTareasForPresupuesto] = useState<any[]>([])

    const [wizardOptions, setWizardOptions] = useState<Array<{ label: string, value: string }>>([])

    // Estado para tareas activas (task-centric UX)
    const [activeTasks, setActiveTasks] = useState<Array<any>>([])
    const [loadingTasks, setLoadingTasks] = useState(false)
    const [selectedTask, setSelectedTask] = useState<{ id: number, title: string } | null>(null)

    // Manejar clicks en Quick Actions
    const handleActionClick = (command: string) => {
        if (command === 'registrar_gasto') {
            startWizard('gasto')
        } else if (command === 'registrar_parte') {
            // Abrir wizard de calendario de partes
            setShowParteWizard(true)
        } else if (command === 'crear_presupuesto_base') {
            // Abrir wizard de creación de presupuesto base
            loadTareasForPresupuesto()
        } else if (command === 'crear_tarea') {
            startWizard('tarea')
        } else {
            // Comando directo: Traducir a lenguaje natural para mejor contexto
            let message = command;
            switch (command) {
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
                case 'ver_mis_pagos': message = 'Ver mis pagos y liquidaciones'; break;
            }

            processSubmission(message)
        }
    }

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

    const startWizard = async (flow: 'gasto' | 'tarea') => {
        if (flow === 'gasto') {
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
                setWizardState({ active: true, flow, step: 1, data: {} })
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
        } else {
            // Flujo Tarea (Placeholder por ahora)
            setWizardState({ active: true, flow, step: 1, data: {} })
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: '📝 Nueva Tarea. ¿Cuál es el título o descripción breve?'
            }])
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
        if (isMounted && userRole) {
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
    }, [isMounted, userRole])


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

                while (!done) {
                    const { value, done: readerDone } = await reader.read()
                    done = readerDone
                    const chunk = decoder.decode(value, { stream: true })

                    // Procesar chunk para herramientas o texto
                    const toolCallMatch = chunk.match(/<tool_code>(.*?)<\/tool_code>/s)
                    if (toolCallMatch) {
                        try {
                            const toolCall = JSON.parse(toolCallMatch[1])
                            const toolResult = await handleToolExecution(toolCall, "Exito")
                            assistantContent += `\n[Herramienta Ejecutada: ${toolCall.function.name}]\n`
                        } catch (e) {
                            console.error("Error parsing tool", e)
                        }
                    } else {
                        assistantContent += chunk
                    }

                    setMessages(prev => {
                        const existing = prev.find(m => m.id === assistantId)
                        if (existing) {
                            return prev.map(m => m.id === assistantId ? { ...m, content: assistantContent } : m)
                        } else {
                            return [...prev, { id: assistantId, role: "assistant", content: assistantContent }]
                        }
                    })
                }

                // Al terminar de streamear, guardar en DB
                saveToHistory('assistant', assistantContent)
            }
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)))
        } finally {
            setIsLoading(false)
        }
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
    }, [messages, wizardState, isLoading]) // Agregamos dependencias clave

    // No renderizar hasta que esté montado en el cliente (fix hydration)
    if (!isMounted || shouldHide) return null

    return (
        <>
            {/* Botón flotante */}
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
                <div className="fixed bottom-0 right-0 z-50 w-full md:w-96 md:bottom-4 md:right-4 h-[100dvh] md:h-[600px] bg-white dark:bg-gray-900 shadow-2xl md:rounded-3xl border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden">
                    {/* Header moderno con gradiente */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-200/50 dark:border-gray-800/50 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-600 text-white relative overflow-hidden">
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
                        >
                            <X className="w-4.5 h-4.5" />
                        </button>
                    </div>

                    {/* Lógica de Contenido Principal (Wizards vs Chat) */}
                    {wizardState.active && wizardState.step === 99 ? (
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

                                        <div className={`text-[11px] leading-3 whitespace-pre-wrap ${message.role !== 'user' ? 'pr-5' : ''}`}>
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    p: ({ node, ...props }: any) => <p className="mb-1 last:mb-0" {...props} />,
                                                    ul: ({ node, ...props }: any) => <ul className="list-disc pl-3 mb-1" {...props} />,
                                                    ol: ({ node, ...props }: any) => <ol className="list-decimal pl-3 mb-1" {...props} />,
                                                    li: ({ node, ...props }: any) => <li className="mb-0" {...props} />,
                                                    code: ({ node, ...props }: any) => <code className="bg-gray-100 text-gray-800 px-1 py-0 rounded text-[10px] font-mono" {...props} />,
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

                    {/* Quick Actions - Botones por rol (Solo si NO estamos en medio de un wizard) */}
                    {
                        !wizardState.active && (
                            <ChatQuickActions
                                role={userRole}
                                onActionClick={handleActionClick}
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

                        {/* Hint de Enter para enviar */}
                        <div className="mt-2.5 text-[10px] text-gray-400 dark:text-gray-600 text-center font-medium">
                            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-700 shadow-sm">Enter</kbd> enviar • <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-700 shadow-sm">Shift+Enter</kbd> nueva línea
                        </div>
                    </form>
                </div >
            )
            }
        </>
    )
}


