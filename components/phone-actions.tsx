"use client"

import { Phone, MessageCircle, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface PhoneActionsProps {
  numero: string
  nombre?: string
}

export function PhoneActions({ numero, nombre }: PhoneActionsProps) {
  // Limpiar número para WhatsApp (quitar + y caracteres no numéricos)
  const whatsappNumber = numero.replace(/\D/g, '')
  const telNumber = numero
  
  const whatsappUrl = `https://wa.me/${whatsappNumber}`
  const telUrl = `tel:${telNumber}`

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(numero)
      toast.success(`Número copiado: ${numero}`)
    } catch (err) {
      // Fallback para navegadores antiguos
      const textArea = document.createElement('textarea')
      textArea.value = numero
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      toast.success(`Número copiado: ${numero}`)
    }
  }

  return (
    <div className="flex gap-1">
      <Button 
        size="sm" 
        variant="ghost" 
        className="h-7 w-7 p-0 hover:bg-green-50"
        onClick={() => window.open(whatsappUrl, '_blank')}
        title={`WhatsApp a ${nombre || 'contacto'}`}
      >
        <MessageCircle className="h-4 w-4 text-green-600" />
      </Button>
      
      <Button 
        size="sm" 
        variant="ghost" 
        className="h-7 w-7 p-0"
        onClick={() => window.open(telUrl)}
        title={`Llamar a ${nombre || 'contacto'}`}
      >
        <Phone className="h-4 w-4" />
      </Button>
      
      <Button 
        size="sm" 
        variant="ghost" 
        className="h-7 w-7 p-0"
        onClick={copyToClipboard}
        title="Copiar número"
      >
        <Copy className="h-4 w-4 text-muted-foreground" />
      </Button>
    </div>
  )
}
