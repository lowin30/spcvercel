"use client"

import { formatDateTime } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { ImageIcon } from "lucide-react"

interface Comment {
  id: number
  code: string
  contenido: string
  foto_url: string[] | string | null
  created_at: string
  usuarios: {
    email: string
    color_perfil: string
  } | null
}

interface CommentListProps {
  comments: Comment[]
}

export function CommentList({ comments }: CommentListProps) {
  const isImage = (url: string) => /\.(png|jpe?g|gif|webp|bmp|heic|heif|svg)$/i.test(url.split("?")[0])
  const isVideo = (url: string) => /\.(mp4|mov|webm|ogg|mkv)$/i.test(url.split("?")[0])

  const buildPreviewUrl = (url: string) => {
    // Optimizar imágenes en Cloudinary sin cargar original: f_auto, q_auto, ancho máx 480
    if (!isImage(url)) return url
    return url.replace("/upload/", "/upload/f_auto,q_auto,w_480,c_limit/")
  }

  const buildBlurUrl = (url: string) => {
    // Generar thumbnail de 20px con blur para placeholder instantáneo
    if (!isImage(url)) return url
    return url.replace("/upload/", "/upload/q_1,w_20,h_20,c_fill,e_blur:1000,f_auto/")
  }

  // Manejar caso donde comments puede ser undefined o null
  if (!comments || comments.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-muted-foreground">No hay comentarios</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <Card key={comment.id} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <div
                  className="w-6 h-6 rounded-full mr-2 flex items-center justify-center text-white text-xs"
                  style={{ backgroundColor: comment.usuarios?.color_perfil || "#ccc" }}
                >
                  {comment.usuarios?.email.charAt(0).toUpperCase() || "?"}
                </div>
                <span className="font-medium">{comment.usuarios?.email || "Usuario eliminado"}</span>
              </div>
              <span className="text-xs text-muted-foreground">{formatDateTime(comment.created_at)}</span>
            </div>
            <p className="text-sm">{comment.contenido}</p>
            {comment.foto_url && (
              <div className="mt-2 space-y-3">
                {(Array.isArray(comment.foto_url) ? comment.foto_url : [comment.foto_url]).map((url, index) => {
                  const isImg = isImage(url)
                  const isVid = isVideo(url)
                  const label =
                    Array.isArray(comment.foto_url) && comment.foto_url.length > 1
                      ? `Archivo ${index + 1}`
                      : "Archivo adjunto"

                  return (
                    <div key={index} className="space-y-1">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-primary hover:underline text-sm"
                      >
                        <ImageIcon className="h-4 w-4 mr-1" />
                        {label}
                      </a>

                      {isImg && (
                        <img
                          src={buildBlurUrl(url)}
                          data-src={buildPreviewUrl(url)}
                          alt={label}
                          loading="lazy"
                          className="max-h-56 w-auto rounded-md border object-contain bg-muted/40 transition-all duration-300"
                          onLoad={(e) => {
                            const img = e.target as HTMLImageElement
                            img.src = img.dataset.src || img.src
                          }}
                        />
                      )}

                      {isVid && (
                        <video
                          src={url}
                          controls
                          preload="metadata"
                          className="max-h-64 w-full rounded-md border bg-black"
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
