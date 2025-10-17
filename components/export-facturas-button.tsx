"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FileText, Loader2 } from "lucide-react"
import { generarFacturasPDF } from "@/lib/pdf-facturas-generator"
import { toast } from "sonner"

interface FacturaParaExportar {
  id: number
  code: string
  nombre: string | null
  datos_afip: string | null
  estado_nombre: string
  total: number
  saldo_pendiente: number | string
  total_ajustes_todos: number | string
}

interface ExportFacturasButtonProps {
  facturas: FacturaParaExportar[]
  nombreAdministrador?: string
  className?: string
}

export function ExportFacturasButton({
  facturas,
  nombreAdministrador,
  className,
}: ExportFacturasButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleExport = async () => {
    try {
      setIsLoading(true)

      if (facturas.length === 0) {
        toast.error("No hay facturas para exportar")
        return
      }

      const datosExport = {
        facturas,
        nombreAdministrador,
      }

      const pdfBlob = await generarFacturasPDF(datosExport)

      // Crear URL para el blob y descargar
      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement("a")
      link.href = url
      
      // Nombre del archivo
      const timestamp = new Date().toISOString().split('T')[0]
      const nombreArchivo = nombreAdministrador 
        ? `Facturas_${nombreAdministrador.replace(/\s+/g, '_')}_${timestamp}` 
        : `Facturas_${timestamp}`
        
      link.download = `${nombreArchivo}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success("PDF generado correctamente", {
        description: `Se exportaron ${facturas.length} factura(s)`,
      })
    } catch (error) {
      console.error("Error al generar PDF:", error)
      toast.error("Error al generar PDF", {
        description: "Ocurrió un error al generar el PDF. Por favor, inténtalo de nuevo.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button 
      onClick={handleExport} 
      disabled={isLoading || facturas.length === 0} 
      variant="outline" 
      size="sm"
      className={className}
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
