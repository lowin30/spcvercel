"use client"

import { useEffect } from "react"

export default function SWRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      const onLoad = () => {
        navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {})
      }
      if (document.readyState === "complete") {
        onLoad()
      } else {
        window.addEventListener("load", onLoad, { once: true })
      }
    }
  }, [])
  return null
}
