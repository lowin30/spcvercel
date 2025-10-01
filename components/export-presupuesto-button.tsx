"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FileText, Loader2 } from "lucide-react"
import { generarPresupuestoPDF } from "@/lib/pdf-generator"
import { format } from "date-fns"
import { toast } from "@/components/ui/use-toast"

interface PresupuestoItem {
  id: number
  descripcion: string
  cantidad: number
  tarifa: number
  total: number
}

interface ExportPresupuestoButtonProps {
  presupuestoId: string
  codigo: string
  fecha: Date
  referencia: string
  cliente: {
    nombre: string
    cuit: string
    departamento?: string
    tarea?: string
  }
  items: PresupuestoItem[]
  notas?: string[]
  terminosCondiciones?: string[]
  totalPresupuesto: number
}

export function ExportPresupuestoButton({
  presupuestoId,
  codigo,
  fecha,
  referencia,
  cliente,
  items,
  notas,
  terminosCondiciones,
  totalPresupuesto,
}: ExportPresupuestoButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleExport = async () => {
    try {
      setIsLoading(true)

      const datosPresupuesto = {
        codigo,
        fecha,
        referencia,
        cliente,
        items,
        notas: notas || [
          "*EL presupuesto arriba mencionado tiene vigencia para el dia de la fecha debido a posibles variaciones en los valores correspondientes a los costos de los materiales que se deberian actualizar a la fecha de aprobacion del presupuesto si existiera tal variacion.",
          "*Todo el personal de la empresa cuenta con seguros de accidentes personales.",
        ],
        terminosCondiciones: terminosCondiciones || ["metodo de pago: anticipo 50% saldo al terminar el trabajo"],
        totalPresupuesto,
      }

      const pdfBlob = await generarPresupuestoPDF(datosPresupuesto)

      // Crear URL para el blob y descargar
      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement("a")
      link.href = url
      
      // Usar el nombre de la tarea para el archivo en lugar del código
      const nombreArchivo = cliente.tarea 
        ? `Presupuesto_${cliente.tarea}` 
        : `Presupuesto_${codigo}_${format(fecha, "dd-MM-yyyy")}`
        
      // Eliminar caracteres inválidos para nombres de archivos
      const nombreArchivoLimpio = nombreArchivo.replace(/[\/:*?"<>|]/g, "-")
      
      link.download = `${nombreArchivoLimpio}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "PDF generado correctamente",
        description: `El presupuesto ${codigo} ha sido exportado como PDF.`,
      })
    } catch (error) {
      console.error("Error al generar PDF:", error)
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
