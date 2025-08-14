"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Check, Pencil, X } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import type { SupabaseClient } from "@supabase/auth-helpers-nextjs"

interface DatosAFIPFormProps {
  facturaId: string
  datosIniciales: string | null
  onUpdate: (nuevosDatos: string) => void
  supabase: SupabaseClient<any, "public", any>
}

export function DatosAFIPForm({ facturaId, datosIniciales, onUpdate, supabase }: DatosAFIPFormProps) {
  const [editando, setEditando] = useState(false)
  const [datosAFIP, setDatosAFIP] = useState(datosIniciales || "")
  const [isLoading, setIsLoading] = useState(false)

  const handleGuardar = async () => {
    if (!facturaId) return
    
    setIsLoading(true)
    
    try {
      const { error } = await supabase
        .from("facturas")
        .update({ datos_afip: datosAFIP })
        .eq("id", facturaId)
      
      if (error) {
        throw error
      }
      
      onUpdate(datosAFIP)
      setEditando(false)
      toast({
        title: "Datos AFIP actualizados",
        description: "Los datos AFIP de la factura han sido actualizados correctamente.",
      })
    } catch (error: any) {
      console.error("Error al actualizar datos AFIP:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar los datos AFIP. " + error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelar = () => {
    setDatosAFIP(datosIniciales || "")
    setEditando(false)
  }

  if (editando) {
    return (
      <div className="flex flex-col space-y-2">
        <h3 className="font-medium mb-1">Datos AFIP</h3>
        <div className="flex gap-2">
          <Input
            value={datosAFIP}
            onChange={(e) => setDatosAFIP(e.target.value)}
            placeholder="Ingrese los datos AFIP"
            className="flex-1"
            disabled={isLoading}
          />
          <Button 
            onClick={handleGuardar} 
            size="icon" 
            variant="outline" 
            disabled={isLoading}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button 
            onClick={handleCancelar} 
            size="icon" 
            variant="outline"
            disabled={isLoading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h3 className="font-medium mb-1">Datos AFIP</h3>
      <div className="flex justify-between items-center">
        <p>{datosAFIP || 'No especificado'}</p>
        <Button 
          onClick={() => setEditando(true)} 
          size="icon" 
          variant="ghost"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
