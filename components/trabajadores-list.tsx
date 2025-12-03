"use client"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Edit, Eye, DollarSign } from "lucide-react"
import Link from "next/link"

interface Trabajador {
  id: string
  email: string
  color_perfil: string
  configuracion_trabajadores?: {
    salario_diario: number
    activo: boolean
  }
}

interface TrabajadoresListProps {
  trabajadores: Trabajador[]
}

export function TrabajadoresList({ trabajadores }: TrabajadoresListProps) {
  return (
    <div className="space-y-4">
      {/* Vista de escritorio - Tabla */}
      <div className="rounded-md border hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Trabajador</TableHead>
              <TableHead>Salario Diario</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trabajadores.map((trabajador) => (
              <TableRow key={trabajador.id}>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: trabajador.color_perfil }} />
                    <span className="font-medium">{trabajador.email}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {trabajador.configuracion_trabajadores?.salario_diario ? (
                    <span className="font-mono">
                      ${trabajador.configuracion_trabajadores.salario_diario.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">No configurado</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={trabajador.configuracion_trabajadores?.activo ? "default" : "secondary"}>
                    {trabajador.configuracion_trabajadores?.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/configuracion?view=${trabajador.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/configuracion?edit=${trabajador.id}`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/configuracion?liquidaciones=${trabajador.id}`}>
                        <DollarSign className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Vista móvil - Tarjetas */}
      <div className="space-y-4 block md:hidden">
        {trabajadores.map((trabajador) => (
          <div key={trabajador.id} className="border rounded-lg p-4 shadow-sm">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-6 h-6 rounded-full" style={{ backgroundColor: trabajador.color_perfil }} />
              <span className="font-medium text-md">{trabajador.email}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="text-sm text-muted-foreground">Salario Diario:</div>
              <div className="text-sm font-mono">
                {trabajador.configuracion_trabajadores?.salario_diario
                  ? `$${trabajador.configuracion_trabajadores.salario_diario.toLocaleString()}`
                  : <span className="text-muted-foreground">No configurado</span>}
              </div>
              
              <div className="text-sm text-muted-foreground">Estado:</div>
              <div>
                <Badge variant={trabajador.configuracion_trabajadores?.activo ? "default" : "secondary"}>
                  {trabajador.configuracion_trabajadores?.activo ? "Activo" : "Inactivo"}
                </Badge>
              </div>
            </div>
            
            <div className="flex space-x-2 pt-2 border-t">
              <Button variant="outline" size="sm" className="flex-1" asChild>
                <Link href={`/dashboard/configuracion?view=${trabajador.id}`}>
                  <Eye className="h-3 w-3 mr-1" /> Ver
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="flex-1" asChild>
                <Link href={`/dashboard/configuracion?edit=${trabajador.id}`}>
                  <Edit className="h-3 w-3 mr-1" /> Editar
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="flex-1" asChild>
                <Link href={`/dashboard/configuracion?liquidaciones=${trabajador.id}`}>
                  <DollarSign className="h-3 w-3 mr-1" /> Pagos
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </div>

      {trabajadores.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No hay trabajadores registrados</p>
        </div>
      )}
    </div>
  )
}
