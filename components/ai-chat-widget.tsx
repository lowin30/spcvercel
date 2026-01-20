"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bot, Send, Mic, MicOff, Loader2, X } from "lucide-react"
import { usePathname } from "next/navigation"

export function AiChatWidget() {
    const [isOpen, setIsOpen] = useState(false)
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

    if (shouldHide) return null

    return (
        <>
            {/* Botón flotante */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-4 right-4 z-50 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all"
                    aria-label="Abrir chat IA"
                >
                    <Bot className="w-6 h-6" />
                </button>
            )}

            {/* Chat widget - MINIMALISTA MÓVIL */}
            {isOpen && (
                <div className="fixed bottom-0 right-0 z-50 w-full md:w-96 md:bottom-4 md:right-4 h-[100dvh] md:h-[600px] bg-white dark:bg-gray-900 shadow-2xl md:rounded-2xl border border-gray-200 dark:border-gray-800 flex flex-col">
                    {/* Header compacto */}
                    <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                        <div className="flex items-center gap-2">
                            <Bot className="w-5 h-5" />
                            <span className="font-semibold text-sm">Asistente SPC</span>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="hover:bg-blue-800 rounded-full p-1 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Mensajes */}
                    <ScrollArea className="flex-1 p-3" ref={scrollRef}>
                        {messages.length === 0 && (
                            <div className="text-center text-gray-500 dark:text-gray-400 mt-8 px-4">
                                <Bot className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p className="text-sm">¡Hola! Soy tu asistente de SPC.</p>
                                <p className="text-xs mt-1">Pregúntame sobre proyectos, liquidaciones o finanzas.</p>
                            </div>
                        )}

                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex gap-2 mb-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${message.role === 'user'
                                            ? 'bg-blue-600 text-white rounded-br-sm'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm'
                                        }`}
                                >
                                    <div className="whitespace-pre-wrap break-words">
                                        {message.content}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex gap-2 mb-3">
                                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-3 py-2 rounded-bl-sm">
                                    <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-3">
                                <p className="text-xs text-red-800 dark:text-red-300">{error.message}</p>
                            </div>
                        )}
                    </ScrollArea>

                    {/* Input compacto con audio */}
                    <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                        {isTranscribing && (
                            <div className="mb-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Transcribiendo audio...
                            </div>
                        )}

                        <div className="flex gap-2">
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Escribe o graba un mensaje..."
                                disabled={isLoading || isRecording || isTranscribing}
                                className="flex-1 text-sm border-gray-300 dark:border-gray-700 rounded-full"
                            />

                            {/* Botón de audio */}
                            <Button
                                type="button"
                                size="icon"
                                onClick={isRecording ? stopRecording : startRecording}
                                disabled={isLoading || isTranscribing}
                                className={`rounded-full w-10 h-10 ${isRecording
                                        ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                                        : 'bg-gray-600 hover:bg-gray-700'
                                    }`}
                            >
                                {isRecording ? (
                                    <MicOff className="w-5 h-5" />
                                ) : (
                                    <Mic className="w-5 h-5" />
                                )}
                            </Button>

                            {/* Botón de enviar */}
                            <Button
                                type="submit"
                                size="icon"
                                disabled={!input.trim() || isLoading || isRecording}
                                className="rounded-full bg-blue-600 hover:bg-blue-700 w-10 h-10"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Send className="w-5 h-5" />
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            )}
        </>
    )
}
