"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FileText, Loader2, ChevronDown } from "lucide-react"
import { generarFacturasPDF } from "@/lib/pdf-facturas-generator"
import { toast } from "sonner"
import { getPdfFilename, dateToISO } from "@/lib/pdf-naming"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface FacturaParaExportar {
  id: number
  code: string
  nombre: string | null
  datos_afip: string | null
  estado_nombre: string
  total: number
  saldo_pendiente: number | string
  total_ajustes: number | string
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

  const handleExport = async (sinAjustes: boolean = false) => {
    try {
      setIsLoading(true)

      if (facturas.length === 0) {
        toast.error("No hay facturas para exportar")
        return
      }

      const datosExport = {
        facturas,
        nombreAdministrador,
        ocultarAjustes: sinAjustes
      }

      const pdfBlob = await generarFacturasPDF(datosExport)

      // Crear URL para el blob y descargar
      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement("a")
      link.href = url

      // Nombre del archivo (centralizado y amigable)
      const tipo = sinAjustes ? 'facturas_resumen' : 'facturas_listado'
      const filename = getPdfFilename(tipo, {
        admin: nombreAdministrador || 'Todas',
        fecha: dateToISO(new Date()),
      })
      
      link.download = filename
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          disabled={isLoading || facturas.length === 0}
          variant="outline"
          size="sm"
          className={className}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generando...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              Exportar PDF
              <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuItem onClick={() => handleExport(false)} className="cursor-pointer">
          <FileText className="mr-2 h-4 w-4" />
          Listado Completo
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport(true)} className="cursor-pointer">
          <FileText className="mr-2 h-4 w-4 text-primary" />
          Listado sin Ajustes
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
