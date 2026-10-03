"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FileText, Loader2 } from "lucide-react"
import { generarFacturaDetallePDF } from "@/lib/pdf-factura-detalle-generator"
import { format } from "date-fns"
import { toast } from "@/components/ui/use-toast"

interface FacturaItem {
  id: number
  descripcion: string
  cantidad: number
  tarifa: number
  total: number
}

interface ExportFacturaDetalleButtonProps {
  facturaId: string | number
  codigo: string
  fecha: Date
  datos_afip?: string | null
  referencia?: string
  cliente: {
    nombre: string
    cuit: string
    departamento?: string
    tarea?: string
  }
  items: FacturaItem[]
  notas?: string[]
  terminosCondiciones?: string[]
  totalFactura: number
  descuentoMonto?: number
}

export function ExportFacturaDetalleButton({
  facturaId,
  codigo,
  fecha,
  datos_afip,
  referencia = "",
  cliente,
  items,
  notas,
  terminosCondiciones,
  totalFactura,
  descuentoMonto,
}: ExportFacturaDetalleButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleExport = async () => {
    try {
      setIsLoading(true)

      const datosFactura = {
        codigo,
        fecha,
        datos_afip,
        referencia,
        cliente,
        items,
        notas: notas || [
          "*Todo el personal de la empresa cuenta con seguros de accidentes personales.",
        ],
        terminosCondiciones: terminosCondiciones || [
          "método de pago: transferencia bancaria / cheque",
        ],
        totalFactura,
        descuento_monto: descuentoMonto,
      }

      const pdfBlob = await generarFacturaDetallePDF(datosFactura)

      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement("a")
      link.href = url

      const totalFormateado = Math.round(totalFactura).toLocaleString("es-AR")
      const nombreArchivo = cliente.tarea
        ? `Factura_${cliente.tarea}_$${totalFormateado}`
        : `Factura_${codigo}_${format(fecha, "dd-MM-yyyy")}_$${totalFormateado}`

      const nombreArchivoLimpio = nombreArchivo.replace(/[\/:*?"<>|]/g, "-")

      link.download = `${nombreArchivoLimpio}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "PDF generado correctamente",
        description: `La factura ${codigo} ha sido exportada como PDF.`,
      })
    } catch (error) {
      console.error("Error al generar PDF de factura:", error)
      toast({
        title: "Error al generar PDF",
        description: "Ocurrió un error al generar el PDF. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleExport}
      disabled={isLoading}
      variant="outline"
      size="sm"
      data-export-button
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Generando PDF...
        </>
      ) : (
        <>
          <FileText className="h-4 w-4 mr-2" />
          Exportar PDF
        </>
      )}
    </Button>
  )
}
