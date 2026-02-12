"use client"

import { useEffect } from "react"

// spc v48.5: desregistrar service workers viejos para evitar QuotaExceededError
// la app B2B no necesita SW por ahora
export default function SWRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister()
          console.log('spc: service worker desregistrado')
        }
      }).catch(() => { })

      // limpiar caches viejos del SW
      if ('caches' in window) {
        caches.keys().then((names) => {
          for (const name of names) {
            caches.delete(name)
          }
          if (names.length > 0) console.log('spc: caches limpiados', names.length)
        }).catch(() => { })
      }
    }
  }, [])
  return null
}
