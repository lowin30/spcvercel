"use client"

import type React from "react"

import { useState } from "react"
import { useSupabase } from "@/lib/supabase-provider"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { Loader2, Upload } from "lucide-react"

interface CommentFormProps {
  idTarea: number;
  onComentarioCreado?: () => void;
}

export function CommentForm({ idTarea, onComentarioCreado }: CommentFormProps) {
  const [contenido, setContenido] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { supabase, user } = useSupabase()
  const { toast } = useToast()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!contenido.trim()) {
      toast({
        title: "Error",
        description: "El comentario no puede estar vacío",
        variant: "destructive",
      })
      return
    }

    // Verificar que idTarea sea válido
    if (!idTarea || isNaN(Number(idTarea))) {
      toast({
        title: "Error",
        description: "No se puede enviar un comentario sin una tarea válida",
        variant: "destructive",
      })
      console.error("idTarea inválido:", idTarea)
      return
    }

    setIsSubmitting(true)

    try {
      let foto_url = null

      // Si hay un archivo, subirlo a Supabase Storage
      if (file) {
        const fileExt = file.name.split(".").pop()
        const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`
        const filePath = `comentarios/${fileName}`

        const { error: uploadError, data } = await supabase.storage.from("spc-files").upload(filePath, file)

        if (uploadError) {
          throw new Error(uploadError.message)
        }

        // Obtener URL pública
        const {
          data: { publicUrl },
        } = supabase.storage.from("spc-files").getPublicUrl(filePath)

        foto_url = publicUrl
      }

      // Crear comentario
      const { error } = await supabase.from("comentarios").insert({
        contenido,
        id_tarea: idTarea,
        id_usuario: user?.id,
        foto_url,
      })

      if (error) {
        throw new Error(error.message)
      }

      toast({
        title: "Comentario agregado",
        description: "El comentario se ha agregado correctamente",
      })

      // Limpiar formulario
      setContenido("")
      setFile(null)

      // Llamar al callback si existe
      if (onComentarioCreado) {
        onComentarioCreado()
      }

      // Refrescar página
      router.refresh()
    } catch (error) {
      console.error("Error al agregar comentario:", error)
      toast({
        title: "Error",
        description: "No se pudo agregar el comentario",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Textarea
        placeholder="Escribe un comentario..."
        value={contenido}
        onChange={(e) => setContenido(e.target.value)}
        className="min-h-[100px]"
        disabled={isSubmitting}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <input
            type="file"
            id="foto"
            className="hidden"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            disabled={isSubmitting}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => document.getElementById("foto")?.click()}
            disabled={isSubmitting}
          >
            <Upload className="h-4 w-4 mr-1" />
            {file ? file.name : "Adjuntar imagen"}
          </Button>
        </div>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
          Enviar comentario
        </Button>
      </div>
    </form>
  )
}
