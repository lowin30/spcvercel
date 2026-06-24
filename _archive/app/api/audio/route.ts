import { NextRequest } from 'next/server'

export const runtime = 'edge'
export const maxDuration = 30

/**
 * Endpoint de transcripción de audio con Groq Whisper
 * Recibe audio en formato base64 y lo transcribe a texto
 */
export async function POST(req: NextRequest) {
    try {
        const { audio } = await req.json()

        if (!audio) {
            return new Response(JSON.stringify({ error: 'No se envió audio' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        console.log('[WHISPER] 🎤 Transcribiendo audio...')

        // Convertir base64 a blob
        const audioBuffer = Buffer.from(audio.split(',')[1], 'base64')

        // Crear FormData para Groq Whisper API
        const formData = new FormData()
        const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' })
        formData.append('file', audioBlob, 'audio.webm')
        formData.append('model', 'whisper-large-v3')
        formData.append('language', 'es') // Español
        formData.append('response_format', 'json')

        // Llamar a Groq Whisper API
        const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            },
            body: formData
        })

        if (!response.ok) {
            const error = await response.text()
            console.error('[WHISPER] ❌ Error:', error)
            return new Response(JSON.stringify({
                error: 'Error en transcripción',
                details: error
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        const result = await response.json()

        console.log('[WHISPER] ✅ Transcrito:', result.text)

        return new Response(JSON.stringify({
            text: result.text
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        })

    } catch (error: any) {
        console.error('[WHISPER] ❌ Error:', error.message)
        return new Response(JSON.stringify({
            error: 'Error en servidor de audio',
            details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
}
