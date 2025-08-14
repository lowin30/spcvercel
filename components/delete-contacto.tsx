"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase-client"
import { Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

interface DeleteContactoProps {
  contactoId: string | number
  contactoNombre: string
}

export function DeleteContacto({ contactoId, contactoNombre }: DeleteContactoProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const supabase = getSupabaseClient()
      
      if (!supabase) {
        toast({
          title: "Error",
          description: "No se pudo inicializar la conexión",
          variant: "destructive",
        })
        setIsDeleting(false)
        return
      }
      
      // Verificar si el contacto está asociado a tareas
      const { data: tareas, error: tareasError } = await supabase
        .from("tareas")
        .select("id")
        .eq("id_contacto", contactoId)
        .limit(1)

      if (tareasError) {
        throw new Error(tareasError.message)
      }

      // Si hay tareas asociadas, mostrar un mensaje de error
      if (tareas && tareas.length > 0) {
        toast({
          title: "No se puede eliminar el contacto",
          description: "Este contacto está asociado a una o más tareas. Elimine las asociaciones primero.",
          variant: "destructive",
        })
        setIsDeleting(false)
        return
      }

      // Eliminar el contacto
      const { error } = await supabase.from("contactos").delete().eq("id", contactoId)

      if (error) {
        throw new Error(error.message)
      }

      toast({
        title: "Contacto eliminado",
        description: `El contacto ${contactoNombre} ha sido eliminado correctamente.`,
      })

      // Redirigir a la lista de contactos
      router.push("/dashboard/contactos")
      router.refresh()
    } catch (error) {
      console.error("Error al eliminar el contacto:", error)
      toast({
        title: "Error al eliminar",
        description: "Ha ocurrido un error al eliminar el contacto. Inténtelo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="mr-2 h-4 w-4" />
          Eliminar Contacto
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Está seguro de eliminar este contacto?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. El contacto <strong>{contactoNombre}</strong> será eliminado
            permanentemente del sistema.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleDelete()
            }}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Eliminando..." : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
