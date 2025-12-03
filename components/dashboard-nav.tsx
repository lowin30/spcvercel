"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
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
} from "lucide-react"

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles?: string[]
  badge?: string
  badgeColor?: string
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Building2,
  },
  {
    title: "Tareas",
    href: "/dashboard/tareas",
    icon: ClipboardList,
  },
  {
    title: "Edificios",
    href: "/dashboard/edificios",
    icon: Building2,
  },
  {
    title: "Contactos",
    href: "/dashboard/contactos",
    icon: Users,
    roles: ["admin", "supervisor"],
  },
  {
    title: "Presupuestos",
    href: "/dashboard/presupuestos",
    icon: FileText,
    roles: ["admin"],
  },
  {
    title: "Presup. Base",
    href: "/dashboard/presupuestos-base",
    icon: FileText,
    roles: ["admin", "supervisor"],
  },
  {
    title: "Facturas",
    href: "/dashboard/facturas",
    icon: FileText,
    roles: ["admin"],
  },
  {
    title: "Gestión de Liquidaciones",
    href: "/dashboard/liquidaciones",
    icon: DollarSign,
    roles: ["admin", "supervisor"],
  },
  {
    title: "Pagos",
    href: "/dashboard/pagos",
    icon: CreditCard,
    roles: ["admin"],
  },
  {
    title: "Ajustes",
    href: "/dashboard/ajustes",
    icon: Shield,
    roles: ["admin"],
  },
  {
    title: "Agenda",
    href: "/dashboard/agenda",
    icon: Calendar,
  },
  {
    title: "Mis Días",
    href: "/dashboard/trabajadores/registro-dias",
    icon: Clock,
  },
  {
    title: "Mis Gastos",
    href: "/dashboard/trabajadores/gastos",
    icon: Receipt,
  },
  {
    title: "Pagos Personal",
    href: "/dashboard/trabajadores/liquidaciones",
    icon: DollarSign,
    roles: ["trabajador", "supervisor"],
  },
  {
    title: "Configuración",
    href: "/dashboard/configuracion",
    icon: Settings,
    roles: ["admin"],
  },
]

interface DashboardNavProps {
  userRole?: string
}

export function DashboardNav({ userRole }: DashboardNavProps) {
  const pathname = usePathname()

  const filteredItems = navItems.filter((item) => {
    if (!item.roles) return true
    return item.roles.includes(userRole || "")
  })

  return (
    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
      {filteredItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
              isActive && "bg-muted text-primary",
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="flex-1">{item.title}</span>
            {item.badge && (
              <span
                className={cn("px-2 py-1 text-xs font-bold text-white rounded-full", item.badgeColor || "bg-gray-600")}
              >
                {item.badge}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
