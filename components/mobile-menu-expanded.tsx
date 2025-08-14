"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { getSupabaseClient } from "@/lib/supabase-client"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Building2,
  Calendar,
  ClipboardList,
  FileText,
  Home,
  Settings,
  Users,
  Wallet,
  Package,
  Tag,
  LogOut,
  Clock,
  Receipt,
  UserCheck,
  FileBarChart,
  CreditCard,
  Shield, // Añadido para el ítem Ajustes
} from "lucide-react"

interface MobileMenuExpandedProps {
  userDetails?: {
    rol: string
    email: string
  }
}

interface RouteItem {
  href: string
  icon: any
  title: string
  role?: string[]
  badge?: string
  badgeColor?: string
}

export function MobileMenuExpanded({ userDetails }: MobileMenuExpandedProps) {
  const pathname = usePathname()
  const router = useRouter()
  const userRole = userDetails?.rol || ""

  const handleSignOut = async () => {
    const supabase = getSupabaseClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  // Verificar y mostrar información de depuración
  console.log("MobileMenuExpanded - userRole:", userRole)

  const routes = [
    {
      href: "/dashboard",
      icon: Home,
      title: "Inicio",
    },
    {
      href: "/dashboard/tareas",
      icon: ClipboardList,
      title: "Tareas",
    },
    {
      href: "/dashboard/agenda",
      icon: Calendar,
      title: "Agenda",
    },
    {
      href: "/dashboard/edificios",
      icon: Building2,
      title: "Edificios",
    },
    {
      href: "/dashboard/trabajadores/registro-dias",
      icon: Clock,
      title: "Mis Días",
    },
    {
      href: "/dashboard/trabajadores/gastos",
      icon: Receipt,
      title: "Mis Gastos",
    },
    {
      href: "/dashboard/presupuestos-base",
      icon: FileBarChart,
      title: "Presup. Base",
      role: ["supervisor", "admin"],
    },
    {
      href: "/dashboard/pagos",
      icon: CreditCard,
      title: "Pagos",
      role: ["admin"],
    },
    {
      href: "/dashboard/contactos",
      icon: Users,
      title: "Contactos",
      role: ["admin", "supervisor"],
    },
    {
      href: "/dashboard/presupuestos",
      icon: FileText,
      title: "Presupuestos",
      role: ["admin"],
    },
    {
      href: "/dashboard/facturas",
      icon: FileText,
      title: "Facturas",
      role: ["admin"],
    },
    {
      href: "/dashboard/liquidaciones",
      icon: Wallet,
      title: "Gestión de Liquidaciones",
      role: ["admin", "supervisor"],
    },

    // Entrada de Trabajadores eliminada - Ahora se accede desde Configuración

    {
      href: "/dashboard/ajustes",
      icon: Shield,
      title: "Ajustes",
      role: ["admin"],
      badge: "CONFIDENCIAL",
      badgeColor: "bg-red-600",
    },
    {
      href: "/dashboard/trabajadores/liquidaciones",
      icon: UserCheck,
      title: "Pagos Personal",
      role: ["trabajador", "supervisor", "admin"],
    },
    {
      href: "/dashboard/configuracion",
      icon: Settings,
      title: "Configuración",
      role: ["admin"],
    },
  ]

  // Filtrar rutas según el rol del usuario
  const filteredRoutes = routes.filter((route) => !route.role || route.role.includes(userRole))

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg">SPC Sistema de Gestión</h2>
        {userDetails && (
          <div className="mt-2 text-sm text-muted-foreground">
            <div className="font-medium">{userDetails.email}</div>
            <div className="capitalize">{userDetails.rol}</div>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid items-start px-2 text-sm font-medium">
          {filteredRoutes.map((item, index) => {
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)
            return (
              <Link
                key={index}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
                  isActive ? "bg-muted" : "transparent",
                )}
              >
                <item.icon className="h-4 w-4" />
                <div className="flex items-center gap-1.5">
                  <span>{item.title}</span>
                  {item.badge && (
                    <span className={cn("text-xs px-1.5 py-0.5 rounded-md font-medium", item.badgeColor || "bg-blue-100 text-blue-800")}>
                      {item.badge}
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Footer con botón de cerrar sesión */}
      <div className="p-4 border-t">
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted"
        >
          <LogOut className="h-4 w-4" />
          <span>Cerrar sesión</span>
        </Button>
      </div>
    </div>
  )
}
