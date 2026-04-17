"use server"

import { validateSessionAndGetUser } from "@/lib/auth-bridge"
import Groq from "groq-sdk"
import crypto from "crypto"
import { sanitizeText } from "@/lib/utils"
import { revalidatePath } from "next/cache"
import { supabaseAdmin } from "@/lib/supabase-admin";

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

export async function analizarGastoAction(base64Image: string) {
    try {
        // 1. seguridad: verificar sesion y rol admin/supervisor (platinum). ref: scanner de gastos 265
        const user = await validateSessionAndGetUser()
        if (!user || (user.rol !== 'admin' && user.rol !== 'supervisor')) {
            throw new Error("acceso denegado: solo personal administrativo o supervisores pueden usar el scanner")
        }

        // 2. Gestión de Imagen: Subida segura a Cloudinary
        const originalUrl = await uploadToCloudinary(base64Image, "spc/gastos_analysis_gold")
        const optimizedImageUrl = originalUrl.replace("/upload/", "/upload/e_improve,e_sharpen:100/")

        // 3. ia: llamada a groq (modelo llama 4 scout). sin acentos.
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
        const modelId = "meta-llama/llama-4-scout-17b-16e-instruct"

        console.log("[ia-scanner-audit] ejecutando vision con llama-4-scout-17b (v87.0)")

        const prompt = `
      Actúa como experto contable. Analiza la imagen del comprobante.
      Extrae exclusivamente a JSON puro:
      {
        "monto": number,
        "descripcion": string,
        "fecha": string, (formato YYYY-MM-DD)
        "tipo_gasto": "material" // Siempre material (Requerimiento SPC v3.0)
      }
      REGLAS CRITICAS: descripcion en MINUSCULAS y SIN ACENTOS. Preserva 'ñ'. solo responde con JSON.
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
            temperature: 0,
            response_format: { type: "json_object" }
        })

        const content = chatCompletion.choices[0]?.message?.content
        if (!content) throw new Error("IA retornó respuesta vacía")

        const datos = JSON.parse(content)

        // 4. Limpieza Post-IA (Doble Escudo Gold Standard)
        if (datos.descripcion) datos.descripcion = cleanGastoText(datos.descripcion)
        datos.tipo_gasto = "material" // Fuerza bruta platinum: siempre material.

        // Validación de Fecha Robusta
        const parsedDate = new Date(datos.fecha)
        if (!datos.fecha || isNaN(parsedDate.getTime())) {
            datos.fecha_gasto = new Date().toISOString().split('T')[0] // Hoy por defecto
        } else {
            datos.fecha_gasto = datos.fecha
        }
        delete datos.fecha // Eliminar campo obsoleto (v87.2 fix)

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
        if (!user) throw new Error("sesion no valida")
        const userId = user.id

        // 1. Sanitización de Textos y Validación de Fecha (El Escudo Gold v81.0)
        // Soportamos 'fecha' (desde DB) y 'fecha_gasto' (desde UI)
        // Soportamos 'fecha_gasto' (desde UI o IA)
        const rawDate = gastoData.fecha_gasto
        const dateObj = new Date(rawDate)
        const finalDate = isNaN(dateObj.getTime()) ? new Date().toISOString().split('T')[0] : rawDate

        const normalizedData: any = {
            id_tarea: gastoData.id_tarea,
            monto: parseFloat(gastoData.monto),
            descripcion: cleanGastoText(gastoData.descripcion),
            tipo_gasto: cleanGastoText(gastoData.tipo_gasto),
            fecha_gasto: finalDate, // Campo real en la base de datos (v87.2 fix)
            id_usuario: userId,
            liquidado: gastoData.liquidado ?? false,
            comprobante_url: gastoData.comprobante_url || null,
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
                .select('id, monto, descripcion, fecha_gasto')
                .single()
        } else {
            result = await supabaseAdmin
                .from('gastos_tarea')
                .insert([normalizedData])
                .select('id, monto, descripcion, fecha_gasto')
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

/**
 * Server Action: eliminarGastoAction
 * Borra un gasto de la base de datos y su comprobante en Cloudinary (Platinum v113.0).
 */
export async function eliminarGastoAction(gastoId: any) {
    const cleanId = String(gastoId).replace('G-', '');
    console.log(`[audit] intentando eliminar gasto: ${gastoId} (as ID: ${cleanId})`);
    try {
        const user = await validateSessionAndGetUser()
        if (!user) throw new Error("sesion no valida")
        const userId = user.id

        // 1. Busqueda Administrativa (Admin Bypass RLS)
        const { data: gasto, error: errorFetch } = await supabaseAdmin
            .from('gastos_tarea')
            .select('*')
            .eq('id', Number(cleanId))
            .single()

        if (errorFetch || !gasto) {
            console.error(`[error] gasto no encontrado o error en fetch:`, errorFetch);
            throw new Error("gasto no encontrado");
        }

        // 2. Validaciones de Seguridad SPC
        if (user.rol !== 'admin') {
            if (gasto.id_usuario !== userId) {
                throw new Error("acceso denegado: este gasto no te pertenece")
            }
            if (gasto.liquidado) {
                throw new Error("acceso denegado: el gasto ya esta liquidado");
            }
        }

        // 3. Limpieza Fisica en Cloudinary (si existe comprobante)
        if (gasto.comprobante_url) {
            try {
                const publicId = getPublicIdFromUrl(gasto.comprobante_url)
                if (publicId) {
                    await deleteFromCloudinary(publicId)
                }
            } catch (error) {
                console.error("[cloudinary-cleanup-error] Fallo al borrar archivo:", error)
                // No bloqueamos el borrado de la DB por un error en Cloudinary, pero lo logueamos
            }
        }

        // 4. Borrado Atómico en Base de Datos
        const { error: errorDelete } = await supabaseAdmin
            .from('gastos_tarea')
            .delete()
            .eq('id', Number(cleanId))

        if (errorDelete) throw errorDelete

        // 5. Cache Invalidation
        if (gasto.id_tarea) {
            revalidatePath(`/dashboard/tareas/${gasto.id_tarea}`)
        }
        revalidatePath('/dashboard/tareas')

        return { success: true, message: "gasto y comprobante eliminados correctamente" }

    } catch (error: any) {
        console.error("Error en eliminarGastoAction:", error)
        return { success: false, error: error.message || "error al eliminar el gasto" }
    }
}

/**
 * Utilidad: Extrae el public_id de una URL de Cloudinary
 */
function getPublicIdFromUrl(url: string): string | null {
    try {
        const parts = url.split('/upload/')
        if (parts.length < 2) return null
        let remaining = parts[1]
        if (remaining.startsWith('v')) {
            const firstSlash = remaining.indexOf('/')
            remaining = remaining.substring(firstSlash + 1)
        }
        const lastDot = remaining.lastIndexOf('.')
        if (lastDot !== -1) remaining = remaining.substring(0, lastDot)
        return remaining
    } catch {
        return null
    }
}

/**
 * Utilidad: Llama a la API de Cloudinary para destruir un recurso
 */
async function deleteFromCloudinary(publicId: string) {
    if (!CLOUD_NAME || !API_KEY || !API_SECRET) return

    const timestamp = Math.round(Date.now() / 1000)
    const params = { public_id: publicId, timestamp }
    const signature = generateSignature(params, API_SECRET)

    const formData = new FormData()
    formData.append("public_id", publicId)
    formData.append("api_key", API_KEY)
    formData.append("timestamp", timestamp.toString())
    formData.append("signature", signature)

    const deleteUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`
    await fetch(deleteUrl, { method: "POST", body: formData })
}
