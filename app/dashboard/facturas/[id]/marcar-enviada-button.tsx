"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Send, Loader2 } from "lucide-react"
import { marcarFacturaComoEnviada } from "@/app/dashboard/facturas/actions-envio"
import { toast } from "sonner"

interface MarcarEnviadaButtonProps {
  facturaId: number
  enviada?: boolean
}

export function MarcarEnviadaButton({ facturaId, enviada }: MarcarEnviadaButtonProps) {
  const [enviando, setEnviando] = useState(false)

  const handleMarcarComoEnviada = async () => {
    if (!confirm("¿Marcar esta factura como enviada?")) {
      return
    }

    setEnviando(true)
    try {
      const result = await marcarFacturaComoEnviada(facturaId)
      if (result.success) {
        toast.success(result.message || "Factura marcada como enviada")
        // Recargar la página para mostrar el nuevo estado
        window.location.reload()
      } else {
        toast.error(result.message || "No se pudo marcar como enviada")
      }
    } catch (error) {
      toast.error("Ocurrió un error inesperado")
    } finally {
      setEnviando(false)
    }
  }

  // No mostrar botón si ya está enviada
  if (enviada) {
    return null
  }

  return (
    <Button
      variant="outline"
      onClick={handleMarcarComoEnviada}
      disabled={enviando}
      className="text-indigo-600 hover:text-indigo-800"
    >
      {enviando ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Enviando...
        </>
      ) : (
        <>
          <Send className="h-4 w-4 mr-2" />
          Marcar como Enviada
        </>
      )}
    </Button>
  )
}
