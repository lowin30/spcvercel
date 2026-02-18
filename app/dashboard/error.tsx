"use client" // Error components must be Client Components

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error("Dashboard Error Boundary caught:", error)
    }, [error])

    const isChunkError = error.name === 'ChunkLoadError' || error.message?.includes('Loading chunk')

    return (
        <div className="flex h-[80vh] w-full flex-col items-center justify-center gap-4 p-4 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-red-600">
                {isChunkError ? "Actualización Necesaria" : "¡Algo salió mal!"}
            </h2>
            <p className="text-muted-foreground max-w-[500px]">
                {isChunkError
                    ? "Hemos actualizado el sistema. Por favor, recarga la página para continuar."
                    : "Ocurrió un error inesperado al cargar esta página."}
            </p>

            {error.message && (
                <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md text-sm max-w-[600px] overflow-auto">
                    Error: {error.message}
                </div>
            )}

            <div className="flex flex-wrap gap-4 mt-4 justify-center">
                <Button onClick={() => reset()}>
                    Reintentar
                </Button>
                <Button variant="outline" onClick={() => window.location.href = '/login'}>
                    Ir al Login
                </Button>
                <Button variant="outline" onClick={() => window.location.href = '/'}>
                    Ir al Inicio
                </Button>
            </div>
        </div>
    )
}
