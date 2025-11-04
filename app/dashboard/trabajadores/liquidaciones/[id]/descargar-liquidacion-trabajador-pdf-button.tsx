"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { useDescargarLiquidacionTrabajadorPDF } from "@/lib/descargar-liquidacion-trabajador-pdf"

export function DescargarLiquidacionTrabajadorPdfButton({ liquidacionId }: { liquidacionId: number }) {
  const { descargar, isDownloading } = useDescargarLiquidacionTrabajadorPDF()

  const onClick = async () => {
    try {
      await descargar(liquidacionId)
    } catch {}
  }

  return (
    <Button onClick={onClick} className="print:hidden" disabled={isDownloading}>
      <Download className="mr-2 h-4 w-4" />
      {isDownloading ? "Generando..." : "Descargar PDF"}
    </Button>
  )
}
