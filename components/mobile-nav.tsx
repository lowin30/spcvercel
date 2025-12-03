"use client"

import Link from "next/link"
import { Menu, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { MobileMenuExpanded } from "@/components/mobile-menu-expanded"
import { ThemeToggle } from "@/components/theme-toggle"
import { createClient } from "@/lib/supabase-client"
import { useRouter, usePathname } from "next/navigation"
import { useState, useEffect } from "react"

interface MobileNavProps {
  userDetails?: {
    rol: string
    email: string
  }
}

export function MobileNav({ userDetails }: MobileNavProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  const handleSignOut = async () => {
    const supabase = createClient()
    if (supabase) {
      await supabase.auth.signOut()
    }
    router.push("/login")
  }
  
  // Cerrar el menú cuando cambie la ruta
  useEffect(() => {
    if (open) {
      setOpen(false)
    }
  }, [pathname])

  return (
    <header className="md:hidden" role="banner">
      <nav className="flex h-14 items-center justify-between border-b px-3" role="navigation" aria-label="Navegación principal">
        {/* Botón de menú con mejor accesibilidad */}
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => setOpen(true)}
          aria-label="Abrir menú de navegación"
          aria-expanded={open}
          aria-controls="mobile-menu-panel"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">Abrir menú</span>
        </Button>

        {/* Título centrado */}
        <div className="flex-1 text-center">
          <span className="font-bold">SPC Sistema de Gestión</span>
        </div>
        
        {/* Controles de la derecha */}
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleSignOut} 
            className="text-muted-foreground hover:text-primary"
            aria-label="Cerrar sesión"
          >
            <LogOut className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Cerrar sesión</span>
          </Button>
        </div>
      </nav>
      
      {/* Panel lateral - Siempre presente en el DOM pero visualmente oculto cuando está cerrado */}
      <Sheet open={open} onOpenChange={setOpen} modal={false}>
        <SheetContent 
          side="left" 
          className="w-72 p-0" 
          id="mobile-menu-panel"
          // Eliminamos preventDefault que causa problemas de foco
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Menú Principal</SheetTitle>
            <SheetDescription>
              Navegación principal y opciones de la cuenta.
            </SheetDescription>
          </SheetHeader>
          <MobileMenuExpanded userDetails={userDetails} />
        </SheetContent>
      </Sheet>
    </header>
  )
}
