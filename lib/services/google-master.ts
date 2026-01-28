import { extractAddressFromUrl, extractCoordinatesFromUrl, getAddressFromCoordinates, resolveShortUrl } from "@/lib/map-utils"
import { sanitizeText } from "@/lib/utils"

export type LocationData = {
    address: string
    name: string
    lat: number
    lng: number
    google_maps_url: string
}

export class GoogleMasterService {
    /**
     * Resuelve y estandariza datos de ubicación desde una URL o texto.
     * Aplica Protocolo SPC v3.5: Mayúsculas, Sin Acentos, Ñ-Friendly.
     */
    static async resolveLocationData(url: string): Promise<LocationData | null> {
        try {
            let finalUrl = url
            let isShortUrl = url.includes("goo.gl") || url.includes("maps.app.goo.gl")

            // 1. Expansión de URL si es corta
            if (isShortUrl) {
                const resolved = await resolveShortUrl(url)
                if (resolved) {
                    finalUrl = resolved
                }
            }

            // 2. Extracción de Coordenadas
            const coords = extractCoordinatesFromUrl(finalUrl)
            if (!coords) {
                console.warn("[GoogleMaster] No se pudieron extraer coordenadas de:", finalUrl)
                return null
            }

            // 3. Obtención de Dirección (Geocoding Inverso)
            // Primero intentamos extraer de la URL misma
            let rawAddress = extractAddressFromUrl(finalUrl)

            // Si no hay dirección en la URL, usamos Nominatim (u otro servicio si tuviéramos API Key)
            if (!rawAddress) {
                rawAddress = await getAddressFromCoordinates(coords.lat, coords.lng)
            }

            if (!rawAddress) {
                // Fallback extremo
                rawAddress = `UBICACIÓN ${coords.lat}, ${coords.lng}`
            }

            // 4. Sanitización Estricta (SPC Protocol)
            const cleanAddress = this._applySpcSanitization(rawAddress)
            const cleanName = this._suggestNameFromAddress(cleanAddress)

            return {
                address: cleanAddress,
                name: cleanName,
                lat: coords.lat,
                lng: coords.lng,
                google_maps_url: finalUrl
            }

        } catch (error) {
            console.error("[GoogleMaster] Error crítico resolviendo ubicación:", error)
            return null
        }
    }

    /**
     * Aplica las reglas rígidas de sanitización del SPC.
     */
    private static _applySpcSanitization(text: string): string {
        // 1. Limpieza base (quita acentos pero deja Ñ)
        const sanitized = sanitizeText(text)
        // 2. Forzar Mayúsculas
        return sanitized.toUpperCase()
    }

    /**
     * Sugiere un nombre corto basado en la dirección.
     * Generalmente toma la calle y altura, descartando ciudad/provincia.
     */
    private static _suggestNameFromAddress(fullAddress: string): string {
        // Ejemplo: "AV. CORRIENTES 1234, CABA" -> "AV. CORRIENTES 1234"
        const parts = fullAddress.split(",")
        if (parts.length > 0) {
            return parts[0].trim()
        }
        return fullAddress
    }

    /**
     * Placeholder para futura integración con Google People API
     */
    static async syncGoogleContacts(refreshToken: string) {
        throw new Error("Not implemented yet - Waiting for OAuth flow")
    }
}
