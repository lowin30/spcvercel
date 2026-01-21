"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bot, Send, Mic, MicOff, Loader2, X } from "lucide-react"
import { usePathname } from "next/navigation"
import { ChatQuickActions } from "@/components/chat-quick-actions"

export function AiChatWidget() {
    const [isOpen, setIsOpen] = useState(false)
    const [isMounted, setIsMounted] = useState(false)
    const pathname = usePathname()
    const scrollRef = useRef<HTMLDivElement>(null)

    // No mostrar en login/home
    const shouldHide = pathname === '/login' || pathname === '/'

    // Estado del chat
    const [messages, setMessages] = useState<Array<{ id: string; role: string; content: string }>>([])
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

    // Fix hydration: solo renderizar después de montar
    useEffect(() => {
        setIsMounted(true)

        // Fetch user role on mount
        fetch('/api/user')
            .then(res => res.json())
            .then(data => {
                if (data.user?.rol) {
                    setUserRole(data.user.rol)
                }
            })
            .catch(err => console.error('Error fetching user:', err))
    }, [])

    // Enviar mensaje de texto
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim() || isLoading) return

        const userMessage = { id: Date.now().toString(), role: "user", content: input }
        setMessages(prev => [...prev, userMessage])
        setInput("")
        setIsLoading(true)
        setError(null)

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: [...messages, userMessage] })
            })

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            }

            const reader = response.body?.getReader()
            const decoder = new TextDecoder()
            let assistantContent = ""
            const assistantId = (Date.now() + 1).toString()

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break

                    assistantContent += decoder.decode(value, { stream: true })
                    setMessages(prev => {
                        const existing = prev.find(m => m.id === assistantId)
                        if (existing) {
                            return prev.map(m => m.id === assistantId ? { ...m, content: assistantContent } : m)
                        } else {
                            return [...prev, { id: assistantId, role: "assistant", content: assistantContent }]
                        }
                    })
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)))
        } finally {
            setIsLoading(false)
        }
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

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

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

                    {/* Mensajes */}
                    <ScrollArea className="flex-1 p-4 bg-gradient-to-b from-gray-50/50 to-white dark:from-gray-900/50 dark:to-gray-950" ref={scrollRef}>
                        {messages.length === 0 && (
                            <div className="text-center text-gray-500 dark:text-gray-400 mt-12 px-4">
                                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                                    <Bot className="w-9 h-9 text-white" />
                                </div>
                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">¡Hola! Soy tu asistente inteligente</p>
                                <p className="text-xs mt-2 text-gray-500 dark:text-gray-400">Pregúntame sobre proyectos, liquidaciones o finanzas.</p>
                                <div className="mt-4 inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full">
                                    <Mic className="w-3 h-3" />
                                    <span>Puedes escribir o grabar tu mensaje</span>
                                </div>
                            </div>
                        )}

                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex gap-2.5 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${message.role === 'user'
                                        ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-md shadow-blue-500/20'
                                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md border border-gray-200 dark:border-gray-700'
                                        }`}
                                >
                                    <div className="whitespace-pre-wrap break-words font-medium">
                                        {message.content}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex gap-2.5 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                        )}
                    </ScrollArea>

                    {/* Quick Actions - Botones por rol */}
                    <ChatQuickActions
                        role={userRole}
                        onActionClick={(command) => {
                            setInput(command)
                            // Auto-submit el comando
                            setTimeout(() => {
                                const fakeEvent = { preventDefault: () => { } } as React.FormEvent
                                handleSubmit(fakeEvent)
                            }, 100)
                        }}
                    />

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
                </div>
            )}
        </>
    )
}


