"use client"

import { formatDateTime } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { ImageIcon } from "lucide-react"

interface Comment {
  id: number
  code: string
  contenido: string
  foto_url: string | null
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
              <div className="mt-2">
                <a
                  href={comment.foto_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-primary hover:underline text-sm"
                >
                  <ImageIcon className="h-4 w-4 mr-1" />
                  Ver imagen adjunta
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
