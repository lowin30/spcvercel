"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { generarGastosTareaPDF } from "@/lib/gastos-pdf"

export function GastosExtraPdfButton({ tareaId, facturaId }: { tareaId: number; facturaId: number }) {
  const [loading, setLoading] = useState(false)

  const onClick = async () => {
    try {
      setLoading(true)
      const { blob, filename } = await generarGastosTareaPDF(Number(tareaId), { facturaId: Number(facturaId) })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename || "Gastos.pdf"
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button size="sm" variant="secondary" onClick={onClick} disabled={loading} title="Incluye gastos extra">
      <Download className="h-4 w-4 mr-1" />
      {loading ? "Generando..." : "PDF Gastos (incluye extras)"}
    </Button>
  )
}
