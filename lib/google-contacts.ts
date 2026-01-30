import { getValidAccessToken } from "@/lib/google-auth"

// SPC Protocol v16.0 Constants
const SPC_LABEL = "spc"

type ContactData = {
    edificio: string
    depto: string
    nombre: string
    relacion: string
    telefonos?: string[]
    emails?: string[]
}

/**
 * SPC v16.0 Sanitization
 * - Remove accents (except Ñ)
 * - NO Case conversion
 */
function sanitizeSpcV16(text: string): string {
    if (!text) return ""

    // Estrategia: 
    // 1. Proteger la Ñ reemplazándola temporalmente
    // 2. Normalizar NFD y remover diacríticos (acentos)
    // 3. Restaurar la Ñ

    let protectedText = text.replace(/ñ/g, '__n_lower__').replace(/Ñ/g, '__N_UPPER__')

    // Remover acentos
    let normalized = protectedText.normalize("NFD").replace(/[\u0300-\u036f]/g, "")

    // Restaurar Ñ
    return normalized
        .replace(/__n_lower__/g, 'ñ')
        .replace(/__N_UPPER__/g, 'Ñ')
}

/**
 * Crea o recupera un Contact Group (Label) en Google Contacts.
 */
async function getOrCreateLabel(accessToken: string, labelName: string): Promise<string | null> {
    try {
        // 1. Listar grupos para ver si existe
        const listRes = await fetch('https://people.googleapis.com/v1/contactGroups', {
            headers: { Authorization: `Bearer ${accessToken}` }
        })

        if (!listRes.ok) return null

        const listData = await listRes.json()
        const groups = listData.contactGroups || []

        // Buscar exact match (case insensitive? Google labels are robust, let's look for exact name)
        const existing = groups.find((g: any) => g.name === labelName || g.formattedName === labelName)

        if (existing) {
            return existing.resourceName // e.g., "contactGroups/12345"
        }

        // 2. Crear si no existe
        const createRes = await fetch('https://people.googleapis.com/v1/contactGroups', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contactGroup: { name: labelName }
            })
        })

        if (!createRes.ok) return null

        const newGroup = await createRes.json()
        return newGroup.resourceName

    } catch (e) {
        console.error("Error creating/fetching label:", labelName, e)
        return null
    }
}

/**
 * Sincroniza un contacto con Google People API siguiendo v16.0
 */
export async function syncGoogleContact(userId: string, data: ContactData, supabase: any) {
    console.log("🔄 Starting SPC v16.0 Contact Sync...")

    // 1. Auto-Healing Auth
    const accessToken = await getValidAccessToken(userId, supabase)

    if (!accessToken) {
        console.warn("⚠️ No valid Google Token for user. Skipping sync.")
        return { success: false, error: "No connection" }
    }

    // 2. Prepare Data (Strict Format)
    const edificio = sanitizeSpcV16(data.edificio)
    const depto = sanitizeSpcV16(data.depto)
    const nombre = sanitizeSpcV16(data.nombre)
    const relacion = sanitizeSpcV16(data.relacion)

    // Format: "{edificio} {depto} {nombre} {relacion}"
    const fullName = `${edificio} ${depto} ${nombre} ${relacion}`.trim()

    // 3. Manage Labels (Double Tagging)
    // Label 1: "spc"
    const spcLabelResource = await getOrCreateLabel(accessToken, SPC_LABEL)

    // Label 2: "{edificio}" (Raw name from DB, sanitized? User said "nombre del edificio tomado de la db")
    // Let's use the sanitized version for the label name to avoid issues with special chars in label names
    const buildingLabelResource = await getOrCreateLabel(accessToken, data.edificio)

    const membershipBodies = []
    if (spcLabelResource) membershipBodies.push({ contactGroupMembership: { contactGroupResourceName: spcLabelResource } })
    if (buildingLabelResource) membershipBodies.push({ contactGroupMembership: { contactGroupResourceName: buildingLabelResource } })

    // 4. Create Contact Payload
    const contactPayload = {
        names: [{ givenName: fullName }],
        phoneNumbers: data.telefonos?.map(p => ({ value: p, type: 'mobile' })),
        emailAddresses: data.emails?.map(e => ({ value: e, type: 'work' })),
        memberships: membershipBodies
    }

    // 5. Execute API Call
    try {
        const res = await fetch('https://people.googleapis.com/v1/people:createContact', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(contactPayload)
        })

        if (!res.ok) {
            const errBody = await res.text()
            console.error("❌ Google API Error:", errBody)
            return { success: false, error: errBody }
        }

        const contactCreated = await res.json()
        console.log("✅ Contact Created Successfully:", contactCreated.resourceName)
        return { success: true, resourceName: contactCreated.resourceName }

    } catch (e) {
        console.error("❌ Network Error during Sync:", e)
        return { success: false, error: String(e) }
    }
}
