import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { sanitizeText } from "@/lib/utils"

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    const supabase = createRouteHandlerClient({ cookies })

    try {
        // 1. Fetch all source data
        // We need telefonos_departamento JOIN departamentos JOIN edificios to generate proper slugs
        const { data: sourceData, error: sourceError } = await supabase
            .from("telefonos_departamento")
            .select(`
        *,
        departamentos (
          id,
          codigo,
          edificio_id,
          edificios (
            id,
            nombre
          )
        )
      `)

        if (sourceError) {
            return NextResponse.json({ error: sourceError.message }, { status: 500 })
        }

        if (!sourceData || sourceData.length === 0) {
            return NextResponse.json({ message: "No records to migrate", stats: { migrated: 0 } })
        }

        const migratedRecords = []
        const errors = []

        // 2. Transform and Insert
        for (const record of sourceData) {
            try {
                const depto = record.departamentos
                const edificio = depto?.edificios

                if (!depto || !edificio) {
                    errors.push({ id: record.id, error: "Missing relation data" })
                    continue
                }

                // Generate Slug: edificio-depto-nombre
                // Sanitization of components for the SLUG (standard logic)
                const edName = sanitizeText(edificio.nombre).toLowerCase().replace(/\s+/g, '-')
                const depCode = sanitizeText(depto.codigo).toLowerCase().replace(/\s+/g, '-')
                const contactName = sanitizeText(record.nombre_contacto || "sin-nombre").toLowerCase().replace(/\s+/g, '-')

                let uniqueSlug = `${edName}-${depCode}-${contactName}`
                // Append random string to ensure uniqueness during batch migration
                uniqueSlug += `-${Math.random().toString(36).substring(2, 7)}`

                // Prepare Payload
                // SPC V18.1: sanitizeText verifies Ñ is kept in "nombreReal" but verified against accents
                const nombreRealSanitized = sanitizeText(record.nombre_contacto)

                const payload = {
                    nombre: uniqueSlug, // Internal ID
                    "nombreReal": nombreRealSanitized, // Human Display
                    telefono: record.numero,
                    tipo_padre: 'edificio', // Normalized to Building level
                    id_padre: edificio.id,
                    departamento: depto.codigo, // Legacy text field
                    departamento_id: depto.id, // New FK
                    notas: record.notas,
                    relacion: sanitizeText(record.relacion),
                    es_principal: record.es_principal || false,
                    updated_at: new Date().toISOString()
                }

                // Insert
                const { error: insertError } = await supabase
                    .from("contactos")
                    .insert(payload)

                if (insertError) {
                    errors.push({ id: record.id, error: insertError.message })
                } else {
                    migratedRecords.push({ original_id: record.id, new_slug: uniqueSlug, nombre_real: nombreRealSanitized })
                }

            } catch (e: any) {
                errors.push({ id: record.id, error: e.message })
            }
        }

        return NextResponse.json({
            success: true,
            stats: {
                total_source: sourceData.length,
                migrated: migratedRecords.length,
                failed: errors.length
            },
            sample_migrated: migratedRecords.slice(0, 5),
            errors: errors
        })

    } catch (error: any) {
        return NextResponse.json({ internal_error: error.message }, { status: 500 })
    }
}
