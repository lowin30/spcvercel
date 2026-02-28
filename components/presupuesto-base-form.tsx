"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase-client" // Keep for client-side task creation logic if needed, or refactor later. Kept for now as createNuevaTarea uses it.
import { createPresupuestoBase, updatePresupuestoBase } from "@/app/dashboard/presupuestos-base/actions"

interface Tarea {
  id: number
  titulo: string
  code: string
}

interface PresupuestoBaseFormProps {
  tareas: Tarea[]
  userId: string
  presupuesto?: any
  isReadOnly?: boolean
  onSuccess?: (presupuestoData: any) => void
  onCancel?: () => void
  initialTareaId?: string
}

export default function PresupuestoBaseForm({ tareas, userId, presupuesto, isReadOnly = false, onSuccess, onCancel, initialTareaId }: PresupuestoBaseFormProps) {
  const router = useRouter()
  const supabase = createClient()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tareaId, setTareaId] = useState(initialTareaId || presupuesto?.id_tarea?.toString() || "")
  const [materiales, setMateriales] = useState(presupuesto?.materiales?.toString() || "")
  const [manoObra, setManoObra] = useState(presupuesto?.mano_obra?.toString() || "")
  const [notaPb, setNotaPb] = useState(presupuesto?.nota_pb || "")

  const totalCalculado = (Number.parseInt(materiales) || 0) + (Number.parseInt(manoObra) || 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!tareaId || !materiales || !manoObra) {
      toast.error("Por favor completa todos los campos requeridos")
      return
    }

    setIsSubmitting(true)

    try {
      if (presupuesto) {
        // UPDATE con Server Action
        const updateData = {
          id_tarea: Number.parseInt(tareaId),
          materiales: Number.parseInt(materiales),
          mano_obra: Number.parseInt(manoObra),
          nota_pb: notaPb,
        };

        const result = await updatePresupuestoBase(presupuesto.id, updateData);

        if (!result.success) throw new Error(result.error);

        toast.success("El presupuesto base ha sido actualizado correctamente")

      } else {
        // CREATE con Server Action
        const createData = {
          id_tarea: Number.parseInt(tareaId),
          materiales: Number.parseInt(materiales),
          mano_obra: Number.parseInt(manoObra),
          nota_pb: notaPb,
        };

        const result = await createPresupuestoBase(createData);

        if (!result.success) throw new Error(result.error);

        toast.success("El presupuesto base ha sido creado correctamente")

        // Callback handling
        const tareaSeleccionada = tareas.find(t => t.id === Number.parseInt(tareaId));
        if (onSuccess && result.data) {
          onSuccess({
            ...result.data,
            tarea_titulo: tareaSeleccionada?.titulo || "Tarea",
            tarea_code: tareaSeleccionada?.code || "",
            total: totalCalculado
          });
          return;
        }
      }

      if (!onSuccess) {
        router.push("/dashboard/presupuestos-base");
        router.refresh();
      }

    } catch (error: any) {
      console.error("Error al guardar presupuesto base:", error);
      toast.error(error.message || "Ocurrió un error al guardar el presupuesto base")
    } finally {
      setIsSubmitting(false);
    }
  }


  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label htmlFor="tarea">Tarea</Label>
          {!presupuesto && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard/tareas/nueva?returnTo=/dashboard/presupuestos-base/nuevo')}
            >
              <Plus className="h-4 w-4 mr-1" /> Nueva Tarea
            </Button>
          )}
        </div>

        {tareas.length > 0 ? (
          <Select value={tareaId} onValueChange={setTareaId} disabled={isSubmitting || !!presupuesto || isReadOnly}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una tarea" />
            </SelectTrigger>
            <SelectContent>
              {tareas.map((tarea) => (
                <SelectItem key={tarea.id} value={tarea.id.toString()}>
                  {tarea.titulo} ({tarea.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="p-4 border rounded-md bg-muted/50 text-center">
            <p className="text-muted-foreground mb-2">No hay tareas disponibles</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push('/dashboard/tareas/nueva?returnTo=/dashboard/presupuestos-base/nuevo')}
            >
              <Plus className="h-4 w-4 mr-1" /> Crear nueva tarea
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="materiales">Materiales ($)</Label>
          <Input
            id="materiales"
            type="number"
            value={materiales}
            onChange={(e) => setMateriales(e.target.value)}
            disabled={isSubmitting || isReadOnly}
            min="0"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="manoObra">Mano de Obra ($)</Label>
          <Input
            id="manoObra"
            type="number"
            value={manoObra}
            onChange={(e) => setManoObra(e.target.value)}
            disabled={isSubmitting || isReadOnly}
            min="0"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="total">Total ($)</Label>
        <Input
          id="total"
          type="text"
          value={totalCalculado.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          disabled
          className="bg-muted font-semibold"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notaPb">Notas Internas (Opcional)</Label>
        <Textarea
          id="notaPb"
          value={notaPb}
          onChange={(e) => setNotaPb(e.target.value)}
          placeholder="Cualquier observación relevante para este presupuesto base..."
          rows={3}
          disabled={isSubmitting || isReadOnly}
        />
        <p className="text-xs text-muted-foreground">Esta información es solo para uso interno.</p>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => onCancel ? onCancel() : router.push("/dashboard/presupuestos-base")}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting || (!presupuesto && !tareaId) || isReadOnly}>
          {isSubmitting ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</>
          ) : presupuesto ? (
            "Actualizar Presupuesto"
          ) : (
            "Guardar Presupuesto Base"
          )}
        </Button>
      </div>
    </form>
  )
}
