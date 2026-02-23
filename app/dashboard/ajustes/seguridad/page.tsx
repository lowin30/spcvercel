"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { ShieldAlert, RefreshCw, AlertTriangle, UserX } from "lucide-react"
import { toast } from "sonner"
import { revokeUserSession } from "../actions"

interface UserEntry {
    id: string
    email: string
    rol: string
    nombre: string
}

export default function SeguridadSessionsPage() {
    const [loading, setLoading] = useState(false)
    const [users, setUsers] = useState<UserEntry[]>([])
    const [fetching, setFetching] = useState(true)

    useEffect(() => {
        async function loadUsers() {
            const supabase = createClient()
            const { data, error } = await supabase.from('usuarios').select('id, email, rol, nombre')
            if (data) setUsers(data)
            setFetching(false)
        }
        loadUsers()
    }, [])

    const handleRevokeSession = async (userId: string, userName: string) => {
        if (!confirm(`¿Estás seguro de que deseas forzar el cierre de sesión para ${userName}? Deberá volver a iniciar sesión.`)) return

        setLoading(true)
        const result = await revokeUserSession(userId)
        if (result.success) {
            toast.success(`Sesión revocada para ${userName}`)
        } else {
            toast.error(`Error al revocar: ${result.error}`)
        }
        setLoading(false)
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto py-6">
            <div className="flex items-center gap-2">
                <ShieldAlert className="h-8 w-8 text-red-600" />
                <h1 className="text-3xl font-bold tracking-tight">Centro de Seguridad (Botón de Pánico)</h1>
            </div>
            <p className="text-muted-foreground">
                Esta herramienta permite revocar de inmediato las sesiones activas de los usuarios, forzando la rotación de sus tokens JWT. Utilízala si has cambiado el rol de un usuario y necesitas que el cambio sea instantáneo.
            </p>

            <div className="grid gap-4 mt-8">
                {fetching ? (
                    <div className="flex justify-center p-8"><RefreshCw className="animate-spin h-6 w-6" /></div>
                ) : (
                    users.map((user) => (
                        <Card key={user.id} className="border-red-100 dark:border-red-900/30">
                            <div className="flex flex-col sm:flex-row justify-between items-center p-4">
                                <div>
                                    <h3 className="font-semibold text-lg">{user.nombre || "Usuario"} <span className="text-sm font-normal text-muted-foreground">({user.email})</span></h3>
                                    <p className="text-sm text-blue-600 dark:text-blue-400 font-medium capitalize">Rol actual: {user.rol}</p>
                                </div>
                                <div className="mt-4 sm:mt-0">
                                    <Button
                                        variant="destructive"
                                        onClick={() => handleRevokeSession(user.id, user.nombre || user.email)}
                                        disabled={loading}
                                    >
                                        <UserX className="h-4 w-4 mr-2" />
                                        Forzar Cierre de Sesión
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
