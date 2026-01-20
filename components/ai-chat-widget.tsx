"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Bot, Send, X, User, Sparkles, Loader2 } from "lucide-react"
import { usePathname } from "next/navigation"

export function AiChatWidget() {
    const [isOpen, setIsOpen] = useState(false)
    const pathname = usePathname()
    const scrollRef = useRef<HTMLDivElement>(null)

    // No mostrar en login/home (DESPUÉS de todos los hooks)
    const shouldHide = pathname === '/login' || pathname === '/'

    // MANUAL IMPLEMENTATION: useChat de @ai-sdk/react está roto por conflicto de versiones
    // Implementamos manualmente el chat con fetch + estado local
    const [messages, setMessages] = useState<Array<{ id: string; role: string; content: string }>>([])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)

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

    // Auto-scroll al final cuando hay nuevos mensajes
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    if (shouldHide) return null

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-4">
            {/* Botón Flotante */}
            {!isOpen && (
                <Button
                    onClick={() => setIsOpen(true)}
                    className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 transition-all duration-300 hover:scale-110"
                >
                    <Bot className="h-8 w-8" />
                </Button>
            )}

            {/* Ventana de Chat */}
            {isOpen && (
                <Card className="w-[350px] sm:w-[400px] h-[500px] shadow-2xl flex flex-col animate-in slide-in-from-bottom-10 fade-in duration-300 border-primary/20">
                    <CardHeader className="p-4 border-b bg-primary/5 flex flex-row items-center justify-between space-y-0">
                        <div className="flex items-center gap-2">
                            <div className="bg-primary/10 p-2 rounded-full">
                                <Sparkles className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-base">Asistente SPC-IA</CardTitle>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    En línea (Groq Powered)
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-background/20"
                            onClick={() => setIsOpen(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </CardHeader>

                    <CardContent className="flex-1 p-0 overflow-hidden relative bg-muted/5">
                        <ScrollArea className="h-full p-4" ref={scrollRef}>
                            <div className="space-y-4">
                                {/* Mensaje de bienvenida */}
                                {messages.length === 0 && (
                                    <div className="text-center py-8 px-4 text-muted-foreground">
                                        <Bot className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                        <p className="text-sm">
                                            Hola, soy tu asistente inteligente.
                                            <br />
                                            ¿En qué puedo ayudarte hoy con la gestión del consorcio?
                                        </p>
                                    </div>
                                )}

                                {messages.map((m) => (
                                    <div
                                        key={m.id}
                                        className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"
                                            }`}
                                    >
                                        {m.role === "assistant" && (
                                            <Avatar className="h-8 w-8 border">
                                                <AvatarFallback className="bg-primary/10 text-primary">AI</AvatarFallback>
                                            </Avatar>
                                        )}

                                        <div
                                            className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${m.role === "user"
                                                ? "bg-primary text-primary-foreground rounded-tr-none"
                                                : "bg-background border rounded-tl-none text-foreground"
                                                }`}
                                        >
                                            {m.content}
                                        </div>

                                        {m.role === "user" && (
                                            <Avatar className="h-8 w-8 border">
                                                <AvatarFallback className="bg-muted">
                                                    <User className="h-4 w-4" />
                                                </AvatarFallback>
                                            </Avatar>
                                        )}
                                    </div>
                                ))}

                                {/* Indicador de carga */}
                                {isLoading && (
                                    <div className="flex justify-start gap-3">
                                        <Avatar className="h-8 w-8 border">
                                            <AvatarFallback className="bg-primary/10 text-primary">AI</AvatarFallback>
                                        </Avatar>
                                        <div className="bg-background border rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-1">
                                            <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                            <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                            <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" />
                                        </div>
                                    </div>
                                )}

                                {/* Error display */}
                                {error && (
                                    <div className="text-center py-2 px-4 text-destructive text-sm">
                                        Error: {error.message}
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>

                    <CardFooter className="p-3 bg-background border-t">
                        <form onSubmit={handleSubmit} className="flex w-full gap-2 relative">
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Escribe tu consulta..."
                                className="pr-10 rounded-full bg-muted/30 focus-visible:ring-primary/20"
                                disabled={isLoading}
                            />
                            <Button
                                type="submit"
                                size="icon"
                                className="absolute right-1 top-1 h-8 w-8 rounded-full"
                                disabled={isLoading || !input.trim()}
                            >
                                {isLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                            </Button>
                        </form>
                    </CardFooter>
                </Card>
            )}
        </div>
    )
}
