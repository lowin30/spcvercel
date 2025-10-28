"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase-client"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

function parseBucketAndPath(publicUrl: string): { bucket: string; path: string } | null {
  try {
    const u = new URL(publicUrl)
    const p = u.pathname
    const extrasIdx = p.indexOf("/storage/v1/object/public/comprobantes_extras/")
    const compIdx = p.indexOf("/storage/v1/object/public/comprobantes/")
    if (extrasIdx !== -1) {
      return {
        bucket: "comprobantes_extras",
        path: p.substring(extrasIdx + "/storage/v1/object/public/comprobantes_extras/".length)
      }
    }
    if (compIdx !== -1) {
      return {
        bucket: "comprobantes",
        path: p.substring(compIdx + "/storage/v1/object/public/comprobantes/".length)
      }
    }
    const parts = p.split("/")
    const i = parts.indexOf("comprobantes_extras") !== -1 ? parts.indexOf("comprobantes_extras") : parts.indexOf("comprobantes")
    if (i !== -1 && i < parts.length - 1) {
      return { bucket: parts[i], path: parts.slice(i + 1).join("/") }
    }
    return null
  } catch {
    return null
  }
}

export function EliminarGastoExtraButton({ extraId, comprobanteUrl, imagenProcesadaUrl }: { extraId: number; comprobanteUrl?: string | null; imagenProcesadaUrl?: string | null }) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const onDelete = async () => {
    if (!confirm("¿Eliminar comprobante extra?")) return
    try {
      setLoading(true)
      const toDelete: { bucket: string; path: string }[] = []
      if (comprobanteUrl) {
        const parsed = parseBucketAndPath(comprobanteUrl)
        if (parsed) toDelete.push(parsed)
      }
      if (imagenProcesadaUrl) {
        const parsed = parseBucketAndPath(imagenProcesadaUrl)
        if (parsed) toDelete.push(parsed)
      }
      for (const item of toDelete) {
        await supabase.storage.from(item.bucket).remove([item.path])
      }
      const { error } = await supabase.from("gastos_extra_pdf_factura").delete().eq("id", extraId)
      if (error) throw new Error(error.message)
      toast.success("Eliminado")
      router.refresh()
    } catch (e: any) {
      toast.error(e?.message || "No se pudo eliminar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button size="icon" variant="ghost" onClick={onDelete} disabled={loading} aria-label="Eliminar comprobante extra">
      <Trash2 className="h-4 w-4 text-red-600" />
    </Button>
  )
}
