"use client"

import { Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export function MicroTareaFAB() {
    const router = useRouter()

    const openMicrotasks = () => {
        const params = new URLSearchParams(window.location.search)
        params.set('action', 'microtareas')
        window.history.pushState({}, '', `?${params.toString()}`)
        window.dispatchEvent(new PopStateEvent('popstate'))
    }

    return (
        <Button
            onClick={openMicrotasks}
            className="fixed bottom-24 right-6 h-14 w-14 rounded-full bg-violet-600 hover:bg-violet-700 text-white shadow-2xl shadow-violet-600/40 border border-violet-500/50 flex items-center justify-center transition-all active:scale-90 md:bottom-24 z-50 group grow-0 shrink-0"
            size="icon"
        >
            <Zap className="h-7 w-7 fill-current group-hover:scale-110 transition-transform" />
            <span className="sr-only">microtareas</span>
        </Button>
    )
}
