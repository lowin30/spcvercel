'use server'

import { z } from "zod"
import { GoogleMasterService } from "@/lib/services/google-master"

// Esquema de validación para la entrada
const ResolveUrlSchema = z.object({
    url: z.string().min(5, "La URL es demasiado corta"),
})

export type APIResponse<T = any> = {
    success: boolean
    data?: T
    error?: string
}

/**
 * Server Action para resolver una URL de Google Maps.
 * Actúa como puente seguro entre el cliente y el GoogleMasterService.
 */
export async function resolveMapUrlAction(inputUrl: string): Promise<APIResponse> {
    try {
        // 1. Validación de entrada
        const result = ResolveUrlSchema.safeParse({ url: inputUrl })
        if (!result.success) {
            return { success: false, error: "URL inválida" }
        }

        // 2. Llamada al servicio maestro
        const locationData = await GoogleMasterService.resolveLocationData(result.data.url)

        if (!locationData) {
            return { success: false, error: "No se pudo extraer información del mapa. Intente verificar el enlace." }
        }

        // 3. Retorno exitoso
        return {
            success: true,
            data: locationData
        }

    } catch (error) {
        console.error("[Action] Error en resolveMapUrlAction:", error)
        return { success: false, error: "Error interno del servidor procesando el mapa." }
    }
}
