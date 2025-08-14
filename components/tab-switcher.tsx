"use client"

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export default function TabSwitcher() {
  const searchParams = useSearchParams()
  
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam) {
      // Intentar encontrar el elemento del tab con el valor correspondiente
      const tabElement = document.querySelector(`[data-value="${tabParam}"]`) as HTMLButtonElement
      if (tabElement) {
        // Simular click para cambiar la pestaña
        tabElement.click()
      }
    }
  }, [searchParams])

  return null // Este componente no renderiza nada visible
}
