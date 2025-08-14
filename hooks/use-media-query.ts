import { useState, useEffect } from "react"

/**
 * Hook para detectar si una media query coincide con la ventana actual
 * Útil para diseño responsive
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)
  
  useEffect(() => {
    // Verificar si estamos en el navegador (no en SSR)
    if (typeof window === "undefined") return
    
    // Crear el objeto MediaQueryList
    const media = window.matchMedia(query)
    
    // Establecer el estado inicial
    setMatches(media.matches)
    
    // Callback para actualizar el estado cuando cambie la media query
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }
    
    // Agregar listener
    media.addEventListener("change", listener)
    
    // Cleanup
    return () => media.removeEventListener("change", listener)
  }, [query])
  
  return matches
}
