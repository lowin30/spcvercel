"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase-client"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import Image from "next/image"
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
  User, // Para Mi Perfil
} from "lucide-react"

interface MobileMenuExpandedProps {
  userDetails?: {
    rol: string
    email: string
  }
  colorPerfil?: string
}

interface RouteItem {
  href: string
  icon: any
  title: string
  role?: string[]
  badge?: string
  badgeColor?: string
}

export function MobileMenuExpanded({ userDetails, colorPerfil = '#3498db' }: MobileMenuExpandedProps) {
  const pathname = usePathname()
  const router = useRouter()
  const userRole = userDetails?.rol || ""

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  // El userRole se utilizará para filtrar las rutas del menú

  const routes = [
    {
      href: "/dashboard",
      icon: Home,
      title: "dashboard",
    },
    {
      href: "/dashboard/perfil",
      icon: User,
      title: "mi perfil",
    },
    {
      href: "/dashboard/tareas",
      icon: ClipboardList,
      title: "tareas",
    },
    {
      href: "/dashboard/agenda",
      icon: Calendar,
      title: "agenda",
    },
    {
      href: "/dashboard/edificios",
      icon: Building2,
      title: "edificios",
    },
    {
      href: "/dashboard/trabajadores/registro-dias",
      icon: Clock,
      title: "mis dias",
    },
    {
      href: "/dashboard/trabajadores/gastos",
      icon: Receipt,
      title: "mis gastos",
    },
    {
      href: "/dashboard/contactos",
      icon: Users,
      title: "contactos",
      role: ["admin", "supervisor"],
    },
    {
      href: "/dashboard/presupuestos-base",
      icon: FileBarChart,
      title: "presup base",
      role: ["admin", "supervisor"],
    },
    {
      href: "/dashboard/liquidaciones",
      icon: Wallet,
      title: "gestion de liquidaciones",
      role: ["admin", "supervisor"],
    },
    {
      href: "/dashboard/presupuestos",
      icon: FileText,
      title: "presupuestos",
      role: ["admin"],
    },
    {
      href: "/dashboard/facturas",
      icon: FileText,
      title: "facturas",
      role: ["admin"],
    },
    {
      href: "/dashboard/ajustes",
      icon: Shield,
      title: "ajustes",
      role: ["admin"],
    },
    {
      href: "/dashboard/pagos",
      icon: CreditCard,
      title: "pagos",
      role: ["admin"],
    },
    {
      href: "/dashboard/configuracion",
      icon: Settings,
      title: "configuracion",
      role: ["admin"],
    },
  ]

  // Filtrar rutas según el rol del usuario
  const filteredRoutes = routes.filter((route) => !route.role || route.role.includes(userRole))

  return (
    <div className="flex flex-col h-full">
      {/* Header con avatar de marca */}
      <div className="p-4 border-b space-y-3">
        {/* Avatar circular con logo de marca */}
        <div className="flex items-center justify-center">
          <Image
            src="/spc-profile-avatar.png"
            alt="SPC"
            width={48}
            height={48}
            className="rounded-full w-12 h-12 border-2 border-amber-500/50 object-cover"
          />
        </div>

        <div>
          <h2 className="font-semibold text-lg text-center lowercase">spc sistema de gestion</h2>
          {userDetails && (
            <div className="mt-2 text-muted-foreground text-center">
              <div className="text-[10px] lowercase opacity-50">{userDetails.email?.toLowerCase()}</div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Links con tinte de color */}
      <div
        className="flex-1 overflow-auto py-2"
        style={{
          backgroundColor: `color-mix(in srgb, ${colorPerfil} 3%, transparent)`
        }}
      >
        <nav className="grid items-start px-2 text-sm font-medium">
          {filteredRoutes.map((item, index) => {
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)
            return (
              <Link
                key={index}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary relative",
                  isActive ? "bg-muted" : "transparent",
                )}
                style={isActive ? {
                  borderLeft: `3px solid ${colorPerfil}`,
                  paddingLeft: 'calc(0.75rem - 3px)'
                } : undefined}
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
