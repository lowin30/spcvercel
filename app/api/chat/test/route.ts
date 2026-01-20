import { NextResponse } from 'next/server'

export const runtime = 'edge'

/**
 * ENDPOINT DE PRUEBA TEMPORAL
 * 
 * Propósito: Confirmar que el frontend funciona
 * URL: /api/chat/test
 * 
 * NO requiere autenticación
 * NO usa Groq API
 * Solo devuelve respuesta mockеada
 */

export async function POST(req: Request) {
    try {
        const { messages } = await req.json()

        console.log('[TEST] Prueba de chat sin Groq')
        console.log('[TEST] Mensajes recibidos:', messages.length)

        const lastMessage = messages[messages.length - 1]?.content || 'sin mensaje'

        // Respuesta simple sin usar IA
        const response = `✅ Sistema funcionando!

Tu mensaje: "${lastMessage}"

🔍 Diagnóstico:
- Frontend: ✅ Funcional
- Backend: ✅ Funcional  
- Groq API: ❌ NO PROBADO (este endpoint no usa Groq)

📝 Próximo paso:
1. Genera nueva Groq API key en: https://console.groq.com/keys
2. Reemplaza en .env.local línea 15
3. Reinicia servidor (Ctrl+C → npm run dev)
4. Prueba endpoint real: /api/chat

---
Modelo actual: MOCK (sin IA real)
Para usar IA real, necesitas nueva Groq API key.`

        // Simular streaming (chunk por chunk)
        const encoder = new TextEncoder()
        const stream = new ReadableStream({
            async start(controller) {
                const chunks = response.split('\n')
                for (const chunk of chunks) {
                    controller.enqueue(encoder.encode(chunk + '\n'))
                    await new Promise(resolve => setTimeout(resolve, 50)) // Simular latencia
                }
                controller.close()
            }
        })

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Transfer-Encoding': 'chunked'
            }
        })

    } catch (error) {
        console.error('[TEST] Error:', error)
        return NextResponse.json({
            error: 'Error en endpoint de prueba',
            details: String(error)
        }, { status: 500 })
    }
}
