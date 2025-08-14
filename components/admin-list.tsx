"use client"

import Link from "next/link"
import { formatDate } from "@/lib/date-utils"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building, Phone } from "lucide-react"

interface Admin {
  id: number
  code: string
  nombre: string
  telefono: string
  estado: string
  created_at: string
}

interface AdminListProps {
  admins: Admin[]
  edificiosPorAdmin?: Record<number, number>
}

export function AdminList({ admins, edificiosPorAdmin = {} }: AdminListProps) {
  if (admins.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No hay administradores disponibles</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {admins.map((admin) => (
        <Link href={`/dashboard/administradores/${admin.id}`} key={admin.id}>
          <Card className="h-full hover:bg-muted/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{admin.nombre}</h3>
                  <p className="text-sm text-muted-foreground flex items-center">
                    <Phone className="mr-1 h-3 w-3" />
                    {admin.telefono}
                  </p>
                  <div className="flex items-center mt-2">
                    <Building className="mr-1 h-3 w-3 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{edificiosPorAdmin[admin.id] || 0} edificios</span>
                  </div>
                </div>
                <Badge variant="outline">{admin.code}</Badge>
              </div>
            </CardContent>
            <CardFooter className="p-4 pt-0 flex justify-between items-center border-t">
              <Badge variant={admin.estado === "activo" ? "success" : "destructive"}>{admin.estado}</Badge>
              <div className="text-xs text-muted-foreground">{formatDate(admin.created_at)}</div>
            </CardFooter>
          </Card>
        </Link>
      ))}
    </div>
  )
}
