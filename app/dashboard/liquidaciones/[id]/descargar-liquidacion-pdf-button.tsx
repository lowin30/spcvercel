"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { useDescargarLiquidacionPDF } from "@/lib/descargar-liquidacion-pdf"

export function DescargarLiquidacionPdfButton({ liquidacionId }: { liquidacionId: number }) {
  const { descargar, isDownloading } = useDescargarLiquidacionPDF()

  const onClick = async () => {
    try {
      await descargar(liquidacionId)
    } catch {}
  }

  return (
    <Button onClick={onClick} size="sm" disabled={isDownloading}>
      <Download className="h-4 w-4 mr-1" />
      {isDownloading ? "Generando..." : "Descargar PDF"}
    </Button>
  )
}
