"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase-client"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2, MessageSquare } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface NotasDepartamentoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  departamentoId: number
  departamentoCodigo: string
  onNotaGuardada?: () => void
}

export function NotasDepartamentoDialog({
  open,
  onOpenChange,
  departamentoId,
  departamentoCodigo,
  onNotaGuardada
}: NotasDepartamentoDialogProps) {
  const [notaActual, setNotaActual] = useState("")
  const [notasHistorial, setNotasHistorial] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Cargar notas existentes cuando se abre el dialog
  useEffect(() => {
    if (open && departamentoId) {
      cargarNotas()
    }
  }, [open, departamentoId])

  const cargarNotas = async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("departamentos")
        .select("notas")
        .eq("id", departamentoId)
        .single()

      if (error) throw error

      if (data?.notas) {
        // Separar por líneas que empiezan con fecha [DD/MM/YYYY]
        const lineas = data.notas.split('\n\n').filter(l => l.trim())
        setNotasHistorial(lineas)
      } else {
        setNotasHistorial([])
      }
    } catch (error) {
      console.error("Error al cargar notas:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGuardar = async () => {
    if (!notaActual.trim()) {
      toast.error("Escribe una nota antes de guardar")
      return
    }

    setIsSaving(true)
    try {
      const supabase = createClient()
      
      // Formatear nueva nota con fecha
      const fecha = new Date().toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
      const nuevaNota = `[${fecha}] ${notaActual.trim()}`

      // Obtener notas actuales
      const { data: currentData } = await supabase
        .from("departamentos")
        .select("notas")
        .eq("id", departamentoId)
        .single()

      // Concatenar con historial
      const notasActualizadas = currentData?.notas 
        ? `${currentData.notas}\n\n${nuevaNota}`
        : nuevaNota

      // Guardar
      const { error } = await supabase
        .from("departamentos")
        .update({ notas: notasActualizadas })
        .eq("id", departamentoId)

      if (error) throw error

      toast.success("Nota guardada exitosamente")
      setNotaActual("")
      cargarNotas()
      
      if (onNotaGuardada) {
        onNotaGuardada()
      }
    } catch (error) {
      console.error("Error al guardar nota:", error)
      toast.error("No se pudo guardar la nota")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Notas del Departamento {departamentoCodigo}
          </DialogTitle>
          <DialogDescription>
            Registra cómo te atendieron en este departamento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Campo para nueva nota */}
          <div>
            <Label htmlFor="nueva-nota" className="text-sm font-medium">
              Nueva nota
            </Label>
            <Textarea
              id="nueva-nota"
              placeholder="Ej: Muy amable, nos atendió rápido y colaboró con todo..."
              value={notaActual}
              onChange={(e) => setNotaActual(e.target.value)}
              rows={3}
              className="mt-1"
              disabled={isSaving}
            />
          </div>

          {/* Historial de notas */}
          {notasHistorial.length > 0 && (
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Historial de notas
              </Label>
              <ScrollArea className="h-[150px] rounded-md border p-3">
                {isLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span className="text-sm text-muted-foreground">Cargando...</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notasHistorial.map((nota, index) => (
                      <div 
                        key={index} 
                        className="text-sm p-2 bg-muted rounded-md"
                      >
                        {nota}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}

          {!isLoading && notasHistorial.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No hay notas registradas para este departamento
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setNotaActual("")
              onOpenChange(false)
            }}
            disabled={isSaving}
          >
            Cerrar
          </Button>
          <Button
            onClick={handleGuardar}
            disabled={isSaving || !notaActual.trim()}
          >
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Guardar Nota
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
