"use client"



// SPC Protocol v9.5: Triple Cofre System - MOBILE OPTIMIZED - RBAC FIXED
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, Lock, BookOpen, CheckCircle, Smartphone } from "lucide-react"

// ... (COFRE_DEFINITIONS remains the same, assuming it's imported or defined above unchanged)
// We need to keep COFRE_DEFINITIONS in the file. Since I'm replacing the whole component logic, I should provide the full block if possible or use careful replace.
// But wait, replace_file_content replaces a block. I will use a larger block or multiple edits?
// No, I'll use replace_file_content for the component only.

// ... COFRE_DEFINITIONS definition ...
const COFRE_DEFINITIONS = {
    operations: {
        name: "OPERACIONES",
        shortName: "OPS",
        icon: "📦",
        roles: ["trabajador", "supervisor", "admin"],
        tools: {
            trabajador: [
                "registrar_gasto",
                "registrar_parte",
                "listar_mis_tareas",
            ],
            supervisor: [
                "crear_tarea",
                "registrar_gasto",
                "registrar_parte",
                "finalizar_tarea",
                "listar_mis_tareas",
            ],
            admin: [
                "crear_tarea",
                "registrar_gasto",
                "registrar_parte",
                "finalizar_tarea",
                "listar_mis_tareas",
            ]
        },
        features: ["knowledge_base"],
        color: "bg-blue-500 hover:bg-blue-600"
    },
    management: {
        name: "GESTIÓN",
        shortName: "GEST",
        icon: "🛠️",
        roles: ["supervisor", "admin"],
        tools: {
            supervisor: [
                "asignar_trabajador",
                "crear_departamento",
                "crear_presupuesto_base",
            ],
            admin: [
                "crear_producto",
                "asignar_trabajador",
                "asignar_supervisor",
                "crear_departamento",
                "crear_presupuesto_base",
            ]
        },
        features: [] as string[],
        color: "bg-amber-500 hover:bg-amber-600"
    },
    control: {
        name: "CONTROL",
        shortName: "CTRL",
        icon: "🏢",
        roles: ["admin"],
        tools: {
            admin: [
                "crear_edificio",
                "crear_factura",
                "registrar_pago",
                "generar_liquidacion",
                "crear_admin",
                "configurar_afip",
                "mostrar_kpis",
                "aprobar_presupuesto",
            ]
        },
        features: [] as string[],
        color: "bg-purple-500 hover:bg-purple-600"
    }
}

interface CofreSelectorProps {
    userRole: string
    onToolSelect: (toolId: string) => void
}

export function CofreSelector({ userRole, onToolSelect }: CofreSelectorProps) {
    const [googleConnected, setGoogleConnected] = useState<boolean | null>(null)

    // Check Google Status for Admin
    useEffect(() => {
        if (userRole === 'admin') {
            fetch('/api/auth/google/status')
                .then(res => res.json())
                .then(data => setGoogleConnected(data.connected))
                .catch(err => console.error("Error checking google status:", err))
        }
    }, [userRole])

    const handleGoogleConnect = async () => {
        try {
            const res = await fetch('/api/auth/google/url')
            const data = await res.json()
            if (data.url) {
                window.location.href = data.url
            }
        } catch (e) {
            console.error("Failed to start google auth", e)
        }
    }

    // Filter cofres by user role
    const availableCofres = Object.entries(COFRE_DEFINITIONS).filter(
        ([_, config]) => config.roles.includes(userRole)
    )

    if (availableCofres.length === 0) {
        return (
            <div className="px-2 py-1.5 border-b bg-gray-50 dark:bg-gray-900">
                <p className="text-xs text-center text-muted-foreground">
                    Sin permisos
                </p>
            </div>
        )
    }

    return (
        <div className="border-b bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 px-2 sm:px-3 py-1.5 sm:py-2">
            {/* Header ultra compacto - solo visible en desktop */}
            <div className="hidden sm:flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Herramientas
                </span>
                <div className="flex items-center gap-1">
                    <Lock className="h-2.5 w-2.5 text-gray-400" />
                    <Badge variant="outline" className="text-[8px] h-3.5 px-1">
                        {userRole.toUpperCase()}
                    </Badge>
                </div>
            </div>

            {/* Cofres - Responsivos */}
            <div className="flex gap-1 sm:gap-1.5">
                {availableCofres.map(([cofreId, cofre]) => {
                    // Get role-specific tools
                    const roleTools = cofre.tools[userRole as keyof typeof cofre.tools] || []

                    // Skip cofre if user has no tools in it
                    if (roleTools.length === 0) return null

                    return (
                        <DropdownMenu key={cofreId}>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={`h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs font-medium ${cofre.color} text-white border-none hover:scale-105 transition-transform flex-1`}
                                >
                                    {/* Solo icono en TODAS las pantallas (móvil y PC) */}
                                    <span className="text-base">{cofre.icon}</span>
                                    <ChevronDown className="ml-0.5 h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-52 sm:w-56">
                                <DropdownMenuLabel className="text-xs">
                                    {cofre.icon} {cofre.name}
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {roleTools.map((toolId: string) => (
                                    <DropdownMenuItem
                                        key={toolId}
                                        className="text-xs cursor-pointer"
                                        onClick={() => onToolSelect(toolId)}
                                    >
                                        {getToolLabel(toolId)}
                                    </DropdownMenuItem>
                                ))}
                                {cofre.features?.includes("knowledge_base") && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            className="text-xs cursor-pointer flex items-center gap-2"
                                            onClick={() => onToolSelect("knowledge_viewer")}
                                        >
                                            <BookOpen className="h-3 w-3" />
                                            Manuales y Políticas
                                        </DropdownMenuItem>
                                    </>
                                )}

                                {/* Integración Google Contacts para Admin en CONTROL */}
                                {cofreId === 'control' && userRole === 'admin' && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <div className="px-2 py-1.5">
                                            {googleConnected ? (
                                                <div className="text-[10px] text-green-600 font-medium flex items-center gap-1.5 bg-green-50 p-1.5 rounded border border-green-100">
                                                    <CheckCircle className="h-3 w-3" />
                                                    Sincronización activa (spc + edificio)
                                                </div>
                                            ) : (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full text-[10px] h-7 justify-start gap-2 border-blue-200 hover:bg-blue-50 text-blue-700"
                                                    onClick={handleGoogleConnect}
                                                >
                                                    <Smartphone className="h-3 w-3" />
                                                    Conectar Cuenta Google
                                                </Button>
                                            )}
                                        </div>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )
                })}
            </div>

            {/* Badge de rol en mobile - debajo de los botones */}
            <div className="flex sm:hidden justify-end mt-1">
                <Badge variant="outline" className="text-[8px] h-3.5 px-1.5">
                    {userRole.toUpperCase()}
                </Badge>
            </div>
        </div>
    )
}

// Helper function to get human-readable labels
function getToolLabel(toolId: string): string {
    const labels: Record<string, string> = {
        crear_tarea: "➕ Nueva Tarea",
        registrar_gasto: "💰 Registrar Gasto",
        registrar_parte: "⏱️ Registrar Día",
        finalizar_tarea: "✅ Finalizar Tarea",
        listar_mis_tareas: "📋 Mis Tareas",
        crear_producto: "📦 Nuevo Producto",
        asignar_trabajador: "👷 Asignar Personal",
        asignar_supervisor: "👔 Asignar Supervisor",
        crear_departamento: "🏗️ Nuevo Departamento",
        crear_presupuesto_base: "💼 Presupuesto Base",
        // aprobar_gasto: REMOVED 2026-01-28 - not used anymore
        crear_edificio: "🏢 Nuevo Edificio",
        crear_factura: "📄 Nueva Factura",
        registrar_pago: "💵 Registrar Pago",
        generar_liquidacion: "💰 Generar Liquidación",
        crear_admin: "👨‍💼 Nuevo Administrador",
        configurar_afip: "🏛️ Configurar AFIP",
        mostrar_kpis: "📊 Ver KPIs",
        aprobar_presupuesto: "✅ Aprobar Presupuesto",
    }
    return labels[toolId] || toolId
}
