"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { User, Pencil, Check, X, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { actualizarNombreUsuario } from "@/app/actions/perfil-actions"

interface EditableNameFieldProps {
    initialName: string
    userEmail: string
}

export function EditableNameField({ initialName, userEmail }: EditableNameFieldProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [name, setName] = useState(initialName)
    const [saving, setSaving] = useState(false)
    const { toast } = useToast()
    const router = useRouter()

    const handleSave = async () => {
        if (!name.trim()) {
            toast({
                title: "Error",
                description: "El nombre no puede estar vacío",
                variant: "destructive",
            })
            return
        }

        setSaving(true)
        try {
            const result = await actualizarNombreUsuario(name)

            if (!result.ok) {
                throw new Error(result.error || "Error al guardar")
            }

            toast({
                title: "Nombre actualizado",
                description: "Tu nombre se ha guardado correctamente",
            })

            setIsEditing(false)
            router.refresh()
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message || "Error al guardar el nombre",
                variant: "destructive",
            })
        } finally {
            setSaving(false)
        }
    }

    const handleCancel = () => {
        setName(initialName)
        setIsEditing(false)
    }

    if (isEditing) {
        return (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/50 bg-primary/5">
                <User className="h-5 w-5 text-primary" />
                <div className="flex-1">
                    <p className="text-sm font-medium mb-1">Nombre</p>
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ingresa tu nombre completo"
                        className="h-8"
                        maxLength={100}
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSave()
                            if (e.key === 'Escape') handleCancel()
                        }}
                    />
                </div>
                <div className="flex gap-1">
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleSave}
                        disabled={saving}
                        className="h-8 w-8 p-0"
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-green-600" />}
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancel}
                        disabled={saving}
                        className="h-8 w-8 p-0"
                    >
                        <X className="h-4 w-4 text-red-500" />
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div
            className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50 group cursor-pointer hover:border-primary/30 transition-colors"
            onClick={() => setIsEditing(true)}
        >
            <User className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
                <p className="text-sm font-medium">Nombre</p>
                <p className="text-sm text-muted-foreground">
                    {initialName || <span className="italic text-muted-foreground/70">Sin nombre — clickeá para agregar</span>}
                </p>
            </div>
            <Pencil className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
        </div>
    )
}
