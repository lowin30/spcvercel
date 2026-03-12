"use server"

import { validateSessionAndGetUser } from "@/lib/auth-bridge"
import Groq from "groq-sdk"
import crypto from "crypto"
import { sanitizeText } from "@/lib/utils"
import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

// Cliente administrativo para bypass de RLS en inserciones críticas
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
)

// Credenciales Cloudinary (Server-Side)
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const API_KEY = process.env.CLOUDINARY_API_KEY
const API_SECRET = process.env.CLOUDINARY_API_SECRET

/**
 * Genera la firma para Cloudinary
 */
function generateSignature(params: Record<string, string | number>, apiSecret: string): string {
    const sortedKeys = Object.keys(params).sort()
    const toSign = sortedKeys.map((key) => `${key}=${params[key]}`).join("&") + apiSecret
    return crypto.createHash("sha1").update(toSign).digest("hex")
}

/**
 * Sube imagen a Cloudinary desde el servidor
 */
async function uploadToCloudinary(fileInput: string, folder: string): Promise<string> {
    if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
        throw new Error("Credenciales de Cloudinary no configuradas")
    }

    const timestamp = Math.round(Date.now() / 1000)
    const params = {
        folder,
        timestamp,
    }

    const signature = generateSignature(params, API_SECRET)

    const formData = new FormData()
    formData.append("file", fileInput)
    formData.append("api_key", API_KEY)
    formData.append("timestamp", timestamp.toString())
    formData.append("signature", signature)
    formData.append("folder", folder)

    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`

    const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
    })

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Error Cloudinary ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    return data.secure_url
}

/**
 * Limpia el texto según requerimientos Gold Standard v81.0:
 * - Minúsculas
 * - Sin acentos
 * - Sin caracteres especiales (excepto ñ, puntos, conas)
 */
function cleanGastoText(text: string): string {
    if (!text) return ""
    return sanitizeText(text).toLowerCase()
}

/**
 * Server Action: analizarGastoAction
 * Procesa el OCR de una imagen usando Groq (Llama 4 Vision)
 */
export async function analizarGastoAction(base64Image: string) {
    try {
        // 1. Seguridad: Verificar sesión usando el Identity Bridge (Platinum)
        await validateSessionAndGetUser()

        // 2. Gestión de Imagen: Subida segura a Cloudinary
        const originalUrl = await uploadToCloudinary(base64Image, "spc/gastos_analysis_gold")
        const optimizedImageUrl = originalUrl.replace("/upload/", "/upload/e_improve,e_sharpen:100/")

        // 3. IA: Llamada a Groq (Modelo Llama 3.2 Vision)
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
        const modelId = "llama-3.2-11b-vision-preview"

        const prompt = `
      Actúa como experto contable. Analiza la imagen del comprobante.
      Extrae exclusivamente a JSON puro:
      {
        "monto": number,
        "descripcion": string,
        "fecha": string, (formato YYYY-MM-DD)
        "tipo_gasto": string ("material", "mano_de_obra", "otro")
      }
      REGLAS CRITICAS: descripcion y tipo_gasto en MINUSCULAS y SIN ACENTOS. Preserva 'ñ'.
    `

        const chatCompletion = await groq.chat.completions.create({
            model: modelId,
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        { type: "image_url", image_url: { url: optimizedImageUrl } }
                    ]
                }
            ],
            temperature: 0.1,
            response_format: { type: "json_object" }
        })

        const content = chatCompletion.choices[0]?.message?.content
        if (!content) throw new Error("IA retornó respuesta vacía")

        const datos = JSON.parse(content)

        // 4. Limpieza Post-IA (Doble Escudo Gold Standard)
        if (datos.descripcion) datos.descripcion = cleanGastoText(datos.descripcion)
        if (datos.tipo_gasto) datos.tipo_gasto = cleanGastoText(datos.tipo_gasto)

        // Validación de Fecha Robusta
        const parsedDate = new Date(datos.fecha)
        if (!datos.fecha || isNaN(parsedDate.getTime())) {
            datos.fecha = new Date().toISOString().split('T')[0] // Hoy por defecto
        }

        if (datos.monto) {
            const montoStr = datos.monto.toString().replace(/[^0-9.,]/g, "").replace(",", ".")
            datos.monto = parseFloat(montoStr) || 0
        }

        return {
            success: true,
            datos,
            cloudinaryUrl: optimizedImageUrl
        }

    } catch (error: any) {
        console.error("Error en analizarGastoAction:", error)
        return {
            success: false,
            error: error.message || "Error procesando con IA"
        }
    }
}

/**
 * Server Action: registrarGastoAction
 * Inserta un gasto en la base de datos de manera segura y limpia (Gold Standard).
 */
export async function registrarGastoAction(gastoData: any) {
    try {
        const user = await validateSessionAndGetUser()
        const userId = user.id

        // 1. Sanitización de Textos y Validación de Fecha (El Escudo Gold v81.0)
        // Soportamos 'fecha' (desde DB) y 'fecha_gasto' (desde UI)
        const rawDate = gastoData.fecha_gasto || gastoData.fecha
        const dateObj = new Date(rawDate)
        const finalDate = isNaN(dateObj.getTime()) ? new Date().toISOString().split('T')[0] : rawDate

        const normalizedData = {
            id_tarea: gastoData.id_tarea,
            monto: parseFloat(gastoData.monto),
            descripcion: cleanGastoText(gastoData.descripcion),
            tipo_gasto: cleanGastoText(gastoData.tipo_gasto),
            fecha: finalDate, // Campo real en la base de datos
            id_usuario: userId,
            liquidado: gastoData.liquidado ?? false,
            created_at: new Date().toISOString()
        }

        // 2. Blindaje de Seguridad Platinum v81.0 (RLS Manual ante Admin Bypass)
        if (user.rol !== 'admin') {
            // A. Verificación de Tarea: ¿Tiene la tarea asignada?
            const { data: asignacionS } = await supabaseAdmin
                .from('supervisores_tareas')
                .select('id')
                .eq('id_tarea', gastoData.id_tarea)
                .eq('id_supervisor', userId)
                .maybeSingle()

            const { data: asignacionT } = await supabaseAdmin
                .from('trabajadores_tareas')
                .select('id')
                .eq('id_tarea', gastoData.id_tarea)
                .eq('id_trabajador', userId)
                .maybeSingle()

            if (!asignacionS && !asignacionT) {
                throw new Error("acceso denegado: no tienes permiso sobre esta tarea")
            }

            // B. Verificación de Propiedad (en caso de UPDATE)
            if (gastoData.id) {
                const { data: gastoExistente } = await supabaseAdmin
                    .from('gastos_tarea')
                    .select('id_usuario, liquidado')
                    .eq('id', gastoData.id)
                    .single()

                if (gastoExistente && gastoExistente.id_usuario !== userId) {
                    throw new Error("acceso denegado: este gasto no te pertenece")
                }

                if (gastoExistente?.liquidado) {
                    throw new Error("acceso denegado: el gasto ya esta liquidado y no se puede modificar")
                }
            }
        }

        // 3. Inserción Directa con Admin Bypass (Propiedad ya validada)
        let result;
        if (gastoData.id) {
            result = await supabaseAdmin
                .from('gastos_tarea')
                .update(normalizedData)
                .eq('id', gastoData.id)
                .select()
                .single()
        } else {
            result = await supabaseAdmin
                .from('gastos_tarea')
                .insert([normalizedData])
                .select()
                .single()
        }

        if (result.error) throw result.error

        // 3. Cache Invalidation
        if (gastoData.id_tarea) {
            revalidatePath(`/dashboard/tareas/${gastoData.id_tarea}`)
        }
        revalidatePath('/dashboard/tareas')

        return {
            success: true,
            data: result.data,
            message: gastoData.id ? "Gasto actualizado" : "Gasto registrado"
        }

    } catch (error: any) {
        console.error("Error en registrarGastoAction:", error)
        return {
            success: false,
            error: error.message || "Error al registrar el gasto"
        }
    }
}
