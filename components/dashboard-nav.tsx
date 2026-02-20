"use client"

import type React from "react"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { createClient } from "@/lib/supabase-client"
import {
  Building2,
  Users,
  ClipboardList,
  FileText,
  Settings,
  Package,
  Calendar,
  CreditCard,
  Shield,
  UserCheck,
  DollarSign,
  Clock,
  Receipt,
  User,
  LogOut,
} from "lucide-react"

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles?: string[]
}

const navItems: NavItem[] = [
  { title: "dashboard", href: "/dashboard", icon: Building2 },
  { title: "mi perfil", href: "/dashboard/perfil", icon: User },
  { title: "tareas", href: "/dashboard/tareas", icon: ClipboardList },
  { title: "agenda", href: "/dashboard/agenda", icon: Calendar },
  { title: "edificios", href: "/dashboard/edificios", icon: Building2 },
  { title: "mis dias", href: "/dashboard/trabajadores/registro-dias", icon: Clock },
  { title: "mis gastos", href: "/dashboard/trabajadores/gastos", icon: Receipt },
  { title: "contactos", href: "/dashboard/contactos", icon: Users, roles: ["admin", "supervisor"] },
  { title: "presup base", href: "/dashboard/presupuestos-base", icon: FileText, roles: ["admin", "supervisor"] },
  { title: "gestion de liquidaciones", href: "/dashboard/liquidaciones", icon: Package, roles: ["admin", "supervisor"] },
  { title: "presupuestos", href: "/dashboard/presupuestos", icon: FileText, roles: ["admin"] },
  { title: "facturas", href: "/dashboard/facturas", icon: Receipt, roles: ["admin"] },
  { title: "ajustes", href: "/dashboard/ajustes", icon: Shield, roles: ["admin"] },
  { title: "pagos", href: "/dashboard/pagos", icon: CreditCard, roles: ["admin"] },
  { title: "configuracion", href: "/dashboard/configuracion", icon: Settings, roles: ["admin"] },
]

interface DashboardNavProps {
  userRole?: string
  userEmail?: string
  colorPerfil?: string
}

export function DashboardNav({ userRole, userEmail, colorPerfil = '#3498db' }: DashboardNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      console.log('spc: sesion cerrada con supabase')
      router.push('/login')
    } catch (err) {
      console.error('spc: error al cerrar sesion', err)
    }
  }

  const filteredItems = navItems.filter((item) => {
    if (!item.roles) return true
    return item.roles.includes(userRole || "")
  })

  return (
    <div className="space-y-4">
      {/* Navigation with color tint */}
      <nav
        className="grid items-start px-2 text-sm font-medium lg:px-4"
        style={{
          backgroundColor: `color-mix(in srgb, ${colorPerfil} 3%, transparent)`
        }}
      >
        {filteredItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary relative",
                isActive && "bg-muted text-primary",
              )}
              style={isActive ? {
                borderLeft: `3px solid ${colorPerfil}`,
                paddingLeft: 'calc(0.75rem - 3px)'
              } : undefined}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{item.title}</span>
            </Link>
          )
        })}
      </nav>

      {/* Profile section at bottom */}
      <div className="mt-auto pt-4 border-t">
        <div className="flex flex-col items-center gap-2 pb-4">
          <Image
            src="/spc-profile-avatar.png"
            alt="SPC"
            width={48}
            height={48}
            className="rounded-full w-12 h-12 border-2 border-amber-500/50 object-cover"
          />
          <div className="text-center">
            <p className="text-[10px] lowercase opacity-50 text-muted-foreground">{userEmail?.toLowerCase()}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors w-full justify-center mt-1"
          >
            <LogOut className="h-3.5 w-3.5" />
            cerrar sesion
          </button>
        </div>
      </div>
    </div>
  )
}
