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
    <div className="flex items-center gap-1.5 flex-wrap">
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20 border border-green-500/30 transition-all"
        title={`Abrir WhatsApp wa.me a ${nombre || 'contacto'}`}
      >
        <MessageCircle className="h-3.5 w-3.5 fill-green-600 text-green-600 dark:text-green-400 shrink-0" />
        <span>{numero}</span>
      </a>

      <Button 
        size="sm" 
        variant="ghost" 
        className="h-6 w-6 p-0 hover:bg-slate-100 dark:hover:bg-zinc-800"
        onClick={() => window.open(telUrl)}
        title={`Llamar a ${nombre || 'contacto'}`}
      >
        <Phone className="h-3.5 w-3.5" />
      </Button>
      
      <Button 
        size="sm" 
        variant="ghost" 
        className="h-6 w-6 p-0 hover:bg-slate-100 dark:hover:bg-zinc-800"
        onClick={copyToClipboard}
        title="Copiar número"
      >
        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
    </div>
  )
}
