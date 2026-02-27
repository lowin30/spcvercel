'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2, ArrowRight, Building2, User, CheckCircle } from "lucide-react"
import { getEdificiosAction, getDepartamentosAction } from "@/app/dashboard/tareas/actions"
import { createExpressProjectAction } from "@/app/dashboard/presupuestos-finales/actions-express"

interface ExpressBudgetFormProps {
    administradores: { id: string; nombre: string }[]
    supervisores: { id: string; email: string }[]
    currentUserId: string
}

export function ExpressBudgetForm({ administradores, supervisores, currentUserId }: ExpressBudgetFormProps) {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    
    // Form State
    const [adminId, setAdminId] = useState("")
    const [edificioId, setEdificioId] = useState("")
    const [deptoId, setDeptoId] = useState("")
    const [titulo, setTitulo] = useState("")
    const [supervisorId, setSupervisorId] = useState("")

    // Cascaded Data
    const [edificios, setEdificios] = useState<{ id: string; nombre: string }[]>([])
    const [departamentos, setDepartamentos] = useState<{ id: string; codigo: string }[]>([])

    // Load Buildings when Admin changes
    useEffect(() => {
        if (!adminId) {
            setEdificios([])
            setEdificioId("")
            return
        }
        const loadEdificios = async () => {
            const res = await getEdificiosAction(parseInt(adminId))
            if (res.success) {
                setEdificios(res.data.map((e: any) => ({ ...e, id: e.id.toString() })))
            }
        }
        loadEdificios()
    }, [adminId])

    // Load Departments when Building changes
    useEffect(() => {
        if (!edificioId) {
            setDepartamentos([])
            setDeptoId("")
            return
        }
        const loadDepto = async () => {
            const res = await getDepartamentosAction(parseInt(edificioId))
            if (res.success) {
                setDepartamentos(res.data.map((d: any) => ({ ...d, id: d.id.toString() })))
            }
        }
        loadDepto()
    }, [edificioId])

    // Auto-generate title
    useEffect(() => {
        if (edificioId) {
            const ed = edificios.find(e => e.id === edificioId)
            const depto = departamentos.find(d => d.id === deptoId)
            let newTitle = ed?.nombre || ""
            if (depto) newTitle += ` ${depto.codigo}`
            setTitulo(newTitle)
        }
    }, [edificioId, deptoId, edificios, departamentos])

    const handleSubmit = async () => {
        if (!adminId || !edificioId || !titulo) {
            toast.error("Por favor completa los campos obligatorios")
            return
        }

        setIsSubmitting(true)
        try {
            const res = await createExpressProjectAction({
                id_administrador: adminId,
                id_edificio: edificioId,
                id_departamento: deptoId || undefined,
                titulo: titulo,
                id_supervisor: supervisorId || undefined
            })

            if (res.success) {
                toast.success("Proyecto Express creado. Redirigiendo...")
                // Redirect to the regular NEW budget final page with the task ID
                router.push(`/dashboard/presupuestos-finales/nuevo?id_tarea=${res.taskId}`)
            } else {
                throw new Error(res.message)
            }
        } catch (error: any) {
            toast.error(error.message || "Error al crear el proyecto")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Card className="max-w-xl mx-auto border-t-4 border-t-primary shadow-xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-6 w-6 text-primary" />
                    Creación Rápida de Presupuesto
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* 1. Administrador */}
                <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                        <User className="h-4 w-4" /> Administrador *
                    </Label>
                    <Select value={adminId} onValueChange={setAdminId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecciona Administrador" />
                        </SelectTrigger>
                        <SelectContent>
                            {administradores.map(a => <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                {/* 2. Edificio */}
                <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" /> Edificio *
                    </Label>
                    <Select value={edificioId} onValueChange={setEdificioId} disabled={!adminId}>
                        <SelectTrigger>
                            <SelectValue placeholder={adminId ? "Selecciona Edificio" : "Elige un Administrador primero"} />
                        </SelectTrigger>
                        <SelectContent>
                            {edificios.map(e => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                {/* 3. Departamento (Opcional) */}
                <div className="space-y-2">
                    <Label>Departamento / Unidad</Label>
                    <Select value={deptoId} onValueChange={setDeptoId} disabled={!edificioId}>
                        <SelectTrigger>
                            <SelectValue placeholder={edificioId ? "Opcional" : "Elige un Edificio primero"} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="_ninguno_">Ninguno</SelectItem>
                            {departamentos.map(d => <SelectItem key={d.id} value={d.id}>{d.codigo}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                {/* 4. Título Tarea */}
                <div className="space-y-2">
                    <Label>Título del Proyecto / Tarea *</Label>
                    <Input 
                        value={titulo} 
                        onChange={(e) => setTitulo(e.target.value)}
                        placeholder="Ej: Edificio Central 5B - Filtración"
                    />
                </div>

                {/* 5. Supervisor (Opcional) */}
                <div className="space-y-2">
                    <Label>Supervisor Asignado</Label>
                    <Select value={supervisorId} onValueChange={setSupervisorId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Opcional" />
                        </SelectTrigger>
                        <SelectContent>
                            {supervisores.map(s => <SelectItem key={s.id} value={s.id}>{s.email}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
            <CardFooter>
                <Button 
                    className="w-full h-12 text-base font-semibold transition-all hover:scale-[1.02]"
                    disabled={isSubmitting || !edificioId || !titulo}
                    onClick={handleSubmit}
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Creando Proyecto...
                        </>
                    ) : (
                        <>
                            Empezar Presupuesto
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                    )}
                </Button>
            </CardFooter>
        </Card>
    )
}
