"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FileText, Loader2 } from "lucide-react"
import { generarPagosPDF, PagoParaPDF } from "@/lib/pdf-pagos-generator"
import { toast } from "sonner"
import { getPdfFilename, dateToISO } from "@/lib/pdf-naming"

interface ExportPagosButtonProps {
  pagos: PagoParaPDF[]
  nombreAdministrador?: string
  rangoFechas?: {
    desde?: string
    hasta?: string
  }
  className?: string
}

export function ExportPagosButton({
  pagos,
  nombreAdministrador,
  rangoFechas,
  className,
}: ExportPagosButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleExport = async () => {
    try {
      setIsLoading(true)

      if (pagos.length === 0) {
        toast.error("No hay pagos para exportar")
        return
      }

      const datosExport = {
        pagos,
        nombreAdministrador,
        rangoFechas,
      }

      const pdfBlob = await generarPagosPDF(datosExport)

      // Crear URL para la descarga
      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement("a")
      link.href = url

      // Nombre sanitizado del archivo
      const filename = getPdfFilename('pagos_listado', {
        admin: nombreAdministrador || 'Todos',
        fecha: dateToISO(new Date()),
      })

      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success("informe de pagos exportado con exito", {
        description: `se exportaron ${pagos.length} pago(s)`,
      })
    } catch (error) {
      console.error("Error al generar PDF de pagos:", error)
      toast.error("error al generar el pdf de pagos")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      disabled={isLoading || pagos.length === 0}
      onClick={handleExport}
      variant="outline"
      size="sm"
      className={className}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          generando pdf...
        </>
      ) : (
        <>
          <FileText className="h-4 w-4 mr-2 text-emerald-600 dark:text-emerald-400" />
          exportar pdf
        </>
      )}
    </Button>
  )
}
