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
  onSuccess?: (presupuestoData: any) => void
  onCancel?: () => void
}

export default function PresupuestoBaseForm({ tareas, userId, presupuesto, onSuccess, onCancel }: PresupuestoBaseFormProps) {
  const router = useRouter()
  const supabase = createClient() // Still used for creating tasks client-side for now

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tareaId, setTareaId] = useState(presupuesto?.id_tarea?.toString() || "")
  const [materiales, setMateriales] = useState(presupuesto?.materiales?.toString() || "")
  const [manoObra, setManoObra] = useState(presupuesto?.mano_obra?.toString() || "")
  const [notaPb, setNotaPb] = useState(presupuesto?.nota_pb || "")

  // Estados para la creación de tarea
  const [showCrearTarea, setShowCrearTarea] = useState(false)
  const [creandoTarea, setCreandoTarea] = useState(false)
  const [nuevaTarea, setNuevaTarea] = useState({
    titulo: "",
    descripcion: "",
    id_edificio: ""
  })
  const [edificios, setEdificios] = useState<any[]>([])

  // Cargar edificios para el formulario de tarea
  const cargarEdificios = async () => {
    try {
      const { data, error } = await supabase
        .from("edificios")
        .select("id, nombre")
        .order("nombre")

      if (error) throw error
      setEdificios(data || [])
    } catch (error) {
      console.error("Error al cargar edificios:", error)
    }
  }

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

  // Crear nueva tarea (Mantenemos logica cliente por ahora para no romper flujo modal complejo, podria refactorizarse luego)
  const crearNuevaTarea = async () => {
    if (!nuevaTarea.titulo || !nuevaTarea.id_edificio) {
      toast.error("Por favor completa todos los campos requeridos")
      return
    }

    setCreandoTarea(true)

    try {
      const now = new Date()
      const code = `T-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, "0")}${Math.floor(
        Math.random() * 1000,
      ).toString().padStart(3, "0")}`

      const { data, error } = await supabase
        .from("tareas")
        .insert({
          ...nuevaTarea,
          code,
          id_supervisor: userId,
          estado: "organizar"
        })
        .select()

      if (error) throw error

      const nuevaTareaCreada = data[0]
      setTareaId(nuevaTareaCreada.id.toString())

      toast.success("La tarea ha sido creada correctamente")
      setShowCrearTarea(false)
      // Idealmente recargar tareas aqui
    } catch (error) {
      console.error("Error al crear tarea:", error)
      toast.error("Ocurrió un error al crear la tarea")
    } finally {
      setCreandoTarea(false)
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
              onClick={() => {
                setShowCrearTarea(true)
                cargarEdificios()
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> Nueva Tarea
            </Button>
          )}
        </div>

        {tareas.length > 0 ? (
          <Select value={tareaId} onValueChange={setTareaId} disabled={isSubmitting || !!presupuesto}>
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
              onClick={() => {
                setShowCrearTarea(true)
                cargarEdificios()
              }}
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
            disabled={isSubmitting}
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
            disabled={isSubmitting}
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
          value={totalCalculado.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
          disabled={isSubmitting}
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
        <Button type="submit" disabled={isSubmitting || (!presupuesto && !tareaId)}>
          {isSubmitting ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</>
          ) : presupuesto ? (
            "Actualizar Presupuesto"
          ) : (
            "Guardar Presupuesto Base"
          )}
        </Button>
      </div>

      <Dialog open={showCrearTarea} onOpenChange={setShowCrearTarea}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nueva Tarea</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título de la Tarea</Label>
              <Input
                id="titulo"
                value={nuevaTarea.titulo}
                onChange={(e) => setNuevaTarea({ ...nuevaTarea, titulo: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={nuevaTarea.descripcion}
                onChange={(e) => setNuevaTarea({ ...nuevaTarea, descripcion: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edificio">Edificio</Label>
              {edificios.length > 0 ? (
                <Select
                  value={nuevaTarea.id_edificio}
                  onValueChange={(value) => setNuevaTarea({ ...nuevaTarea, id_edificio: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un edificio" />
                  </SelectTrigger>
                  <SelectContent>
                    {edificios.map((edificio) => (
                      <SelectItem key={edificio.id} value={edificio.id.toString()}>
                        {edificio.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-4 border rounded-md bg-muted/50 text-center">
                  <p className="text-muted-foreground">No hay edificios disponibles</p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCrearTarea(false)} disabled={creandoTarea}>
              Cancelar
            </Button>
            <Button onClick={crearNuevaTarea} disabled={creandoTarea}>
              {creandoTarea ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                <>Crear Tarea</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  )
}
