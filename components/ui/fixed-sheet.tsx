"use client"

import * as React from "react"
import { Sheet, SheetContent, SheetContentProps, SheetTrigger } from "./sheet"

/**
 * FixedSheetTrigger - Componente que envuelve SheetTrigger para mantener consistencia en la API
 */
export const FixedSheetTrigger = React.forwardRef<
  React.ElementRef<typeof SheetTrigger>,
  React.ComponentPropsWithoutRef<typeof SheetTrigger>
>((props, ref) => {
  return <SheetTrigger ref={ref} {...props} />
})
FixedSheetTrigger.displayName = "FixedSheetTrigger"

/**
 * FixedSheetContent - Versión modificada de SheetContent que maneja correctamente los eventos de scroll
 */
export const FixedSheetContent = React.forwardRef<
  React.ElementRef<typeof SheetContent>,
  SheetContentProps
>(({ className, children, ...props }, ref) => {
  // Referencia al contenedor de scroll para el manejo adecuado del evento touchmove
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)
  
  return (
    <SheetContent 
      ref={ref} 
      className={className} 
      {...props}
    >
      <div 
        ref={scrollContainerRef} 
        className="h-full overflow-y-auto pb-20"
      >
        {children}
      </div>
    </SheetContent>
  )
})
FixedSheetContent.displayName = "FixedSheetContent"

/**
 * FixedSheet - Componente personalizado que corrige el error de scroll en dispositivos móviles
 * relacionado con "Failed to execute 'contains' on 'Node': parameter 1 is not of type 'Node'"
 */
export const FixedSheet = React.forwardRef<
  React.ElementRef<typeof Sheet>,
  React.ComponentPropsWithoutRef<typeof Sheet>
>(({
  open,
  onOpenChange,
  children,
  ...props
}, ref) => {
  // Referencia al contenedor de scroll
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)

  // Efecto que desactiva y restaura el scroll cuando se abre/cierra el Sheet
  React.useEffect(() => {
    if (open) {
      // Cuando el Sheet está abierto, prevenir comportamientos predeterminados de scroll
      const handleTouchMove = (e: TouchEvent) => {
        // Verificar si e.target es un nodo válido y si está fuera del área de scroll
        const target = e.target as Node;
        const container = scrollContainerRef.current;
        
        // Solo prevenir el scroll si tenemos un target válido y un contenedor válido
        // y el target no está dentro del contenedor
        if (container && target && target.nodeType && 
            !container.contains(target)) {
          e.preventDefault();
        }
      }

      // Agregar escuchadores de eventos cuando el Sheet está abierto
      document.addEventListener('touchmove', handleTouchMove, { passive: false })

      return () => {
        // Limpiar escuchadores cuando el componente se desmonta o el Sheet se cierra
        document.removeEventListener('touchmove', handleTouchMove)
      }
    }
  }, [open])

  return (
    <Sheet 
      ref={ref}
      open={open} 
      onOpenChange={onOpenChange}
      {...props}
    >
      {children}
    </Sheet>
  )
})
FixedSheet.displayName = "FixedSheet"
