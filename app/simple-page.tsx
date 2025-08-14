"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function SimplePage() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirigir automáticamente al login
    router.push("/login")
  }, [])
  
  return null
}
