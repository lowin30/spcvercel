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
  onSuccess?: () => void; // Renamed from onComentarioCreado for consistency
  // Chat Integration Props (SPC v9.5)
  isChatVariant?: boolean;
}

export function CommentForm({ idTarea, onSuccess, isChatVariant = false }: CommentFormProps) {
  const [contenido, setContenido] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { supabase, user } = useSupabase()
  const { toast } = useToast()
  const router = useRouter()

  const getAssetType = (file: File): "image" | "video" => {
    if (file.type.startsWith("video")) return "video"
    if (file.type.startsWith("image")) return "image"

    const extension = file.name.split(".").pop()?.toLowerCase()
    if (extension && ["mp4", "mov", "webm", "ogg", "mkv"].includes(extension)) {
      return "video"
    }

    return "image"
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!contenido.trim() && files.length === 0) {
      toast({
        title: "Error",
        description: "Agrega texto o al menos un archivo para enviar",
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

    if (!user?.id) {
      toast({
        title: "Sesión requerida",
        description: "Debes iniciar sesión para comentar.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      let fotoUrls: string[] = []

      if (files.length > 0) {
        const now = new Date()
        const yearMonth = now.toISOString().slice(0, 7)
        const folder = `spc-comentarios/${yearMonth}/${idTarea}`

        type SignaturePayload = {
          timestamp: number
          signature: string
          cloudName: string
          apiKey: string
          transformation: string
          thumbnailTransformation: string
          resourceType: "image" | "video"
        }

        const signatureCache: Partial<Record<"image" | "video", SignaturePayload>> = {}

        const getSignature = async (assetType: "image" | "video") => {
          if (signatureCache[assetType]) {
            return signatureCache[assetType]!
          }

          const signatureRes = await fetch("/api/cloudinary/comment-upload-signature", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ folder, assetType }),
          })

          if (!signatureRes.ok) {
            const data = await signatureRes.json().catch(() => null)
            const message = data?.error || `Error ${signatureRes.status} al firmar subida`
            throw new Error(`Cloudinary firma ${assetType}: ${message}`)
          }

          const payload = (await signatureRes.json()) as SignaturePayload
          signatureCache[assetType] = payload
          return payload
        }

        for (const file of files) {
          const assetType = getAssetType(file)
          const { timestamp, signature, cloudName, apiKey, transformation, thumbnailTransformation, resourceType } =
            await getSignature(assetType)

          const formData = new FormData()
          formData.append("file", file)
          formData.append("api_key", apiKey)
          formData.append("timestamp", String(timestamp))
          formData.append("signature", signature)
          formData.append("folder", folder)
          formData.append("transformation", transformation)

          const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
            method: "POST",
            body: formData,
          })

          if (!uploadRes.ok) {
            let serverMsg = ""
            try {
              const errJson = await uploadRes.json()
              serverMsg = errJson?.error?.message || JSON.stringify(errJson)
            } catch {
              // ignore parse errors
            }
            throw new Error(`Error al subir a Cloudinary (${uploadRes.status}): ${serverMsg || "sin detalle"}`)
          }

          const uploadData = await uploadRes.json()
          if (uploadData.secure_url) {
            fotoUrls.push(uploadData.secure_url as string)
          }
        }
      }

      const { error } = await supabase.from("comentarios").insert({
        contenido,
        id_tarea: idTarea,
        id_usuario: user?.id,
        foto_url: fotoUrls,
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
      setFiles([])

      // Llamar al callback si existe
      if (onSuccess) {
        onSuccess()
      }

      // Refrescar página (solo si no es chat variant)
      if (!isChatVariant) {
        router.refresh()
      }
    } catch (error: any) {
      console.error("Error al agregar comentario:", error)
      const message = error?.message || "No se pudo agregar el comentario"
      toast({
        title: "Error",
        description: message,
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
            accept="image/*, video/*, .mp4, .mov, .webm, .ogg"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
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
            {files.length > 0 ? `${files.length} archivo(s) seleccionado(s)` : "Adjuntar imágenes o videos"}
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
