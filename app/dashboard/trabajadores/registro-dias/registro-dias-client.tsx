"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import RegistroParteTrabajoForm from '@/components/registro-parte-trabajo-form'
import { toast } from '@/components/ui/use-toast'
import { UserSessionData } from '@/lib/types'

interface RegistroDiasClientProps {
    userDetails: UserSessionData
}

export default function RegistroDiasClient({ userDetails }: RegistroDiasClientProps) {
    return (
        <div className="container mx-auto max-w-4xl py-8 px-4">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Registro General de Partes</h1>
                <p className="text-muted-foreground">
                    Utiliza este formulario para registrar días o medios días de trabajo en cualquier tarea.
                </p>
            </div>

            <Card className="border shadow-md">
                <CardHeader>
                    <CardTitle>Nuevo Parte de Trabajo</CardTitle>
                </CardHeader>
                <CardContent>
                    <RegistroParteTrabajoForm
                        usuarioActual={userDetails}
                        onParteRegistrado={() => {
                            toast({
                                title: 'Éxito',
                                description: 'Parte de trabajo registrado correctamente.',
                                className: 'bg-green-100 text-green-800',
                            })
                        }}
                    />
                </CardContent>
            </Card>
        </div>
    )
}
