"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { useSupabaseClient } from "@supabase/auth-helpers-react"
import { Label } from "@/components/ui/label"
import { useUser } from "@supabase/auth-helpers-react"

const formSchema = z.object({
  materiales: z.string().min(2, {
    message: "Los materiales deben tener al menos 2 caracteres.",
  }),
  manoObra: z.string().min(2, {
    message: "La mano de obra debe tener al menos 2 caracteres.",
  }),
  observaciones: z.string().optional(),
})

interface BudgetFormProps {
  idTarea: string
  tipo: "base" | "adicional"
  onSuccess: () => void
}

export function BudgetFormNormalizado({ idTarea, tipo, onSuccess }: BudgetFormProps) {
  const { toast } = useToast()
  const supabase = useSupabaseClient()
  const user = useUser()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [notasPb, setNotasPb] = useState("")
  const userRole = user?.user_metadata?.role

  // 1. Define your form.
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      materiales: "",
      manoObra: "",
      observaciones: "",
    },
  })

  // 2. Define a submit handler.
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    // Do something with the form values.
    // ✅ This will be type-safe and validated.
    const { materiales, manoObra, observaciones } = values

    try {
      if (tipo === "base") {
        // Crear presupuesto base
        const { data, error } = await supabase
          .from("presupuestos_base")
          .insert({
            id_tarea: idTarea,
            materiales,
            mano_obra: manoObra,
            observaciones,
            nota_pb: notasPb, // Añadir esta línea
            id_supervisor: userRole === "supervisor" ? supabase.auth.getUser().then((res) => res.data.user?.id) : null,
          })
          .select()
          .single()

        if (error) {
          console.error("Error creating presupuesto base:", error)
          toast({
            title: "Error al crear el presupuesto base.",
            description: "Hubo un problema al guardar el presupuesto. Por favor, inténtalo de nuevo.",
            variant: "destructive",
          })
        } else {
          toast({
            title: "Éxito!",
            description: "Presupuesto base creado correctamente.",
          })
          onSuccess()
        }
      } else {
        // Crear presupuesto adicional
        const { data, error } = await supabase
          .from("presupuestos_adicionales")
          .insert({
            id_tarea: idTarea,
            materiales,
            mano_obra: manoObra,
            observaciones,
          })
          .select()
          .single()

        if (error) {
          console.error("Error creating presupuesto adicional:", error)
          toast({
            title: "Error al crear el presupuesto adicional.",
            description: "Hubo un problema al guardar el presupuesto. Por favor, inténtalo de nuevo.",
            variant: "destructive",
          })
        } else {
          toast({
            title: "Éxito!",
            description: "Presupuesto adicional creado correctamente.",
          })
          onSuccess()
        }
      }
    } catch (error) {
      console.error("Unexpected error:", error)
      toast({
        title: "Error inesperado.",
        description: "Ocurrió un error inesperado. Por favor, inténtalo de nuevo más tarde.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="materiales"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Materiales</FormLabel>
              <FormControl>
                <Input placeholder="Ej. 2 sacos de cemento, 5 metros de cable..." disabled={isSubmitting} {...field} />
              </FormControl>
              <FormDescription>Describe detalladamente los materiales necesarios para esta tarea.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="manoObra"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mano de Obra</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ej. 2 horas de electricista, 1 día de albañil..."
                  disabled={isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormDescription>Describe detalladamente la mano de obra necesaria para esta tarea.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="observaciones"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observaciones (opcional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Ej. Se necesita andamio, el acceso es complicado..."
                  disabled={isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Cualquier observación adicional relevante para la realización de esta tarea.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="space-y-2">
          <Label htmlFor="nota_pb">Notas Internas</Label>
          <Textarea
            id="nota_pb"
            value={notasPb}
            onChange={(e) => setNotasPb(e.target.value)}
            placeholder="Notas internas (solo visibles para el equipo)"
            disabled={isSubmitting}
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            {notasPb.length}/500 caracteres - Esta información es solo para uso interno
          </p>
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Enviando..." : "Enviar"}
        </Button>
      </form>
    </Form>
  )
}
