"use client"

import { useState } from "react"
import { PlusCircle, RefreshCw } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { createBrowserSupabaseClient } from "@/lib/supabase-client"
import { useToast } from "@/components/ui/use-toast"

interface AdministradoresTabProps {
  administradores: any[]
}

export function AdministradoresTab({ administradores = [] }: AdministradoresTabProps) {
  const { toast } = useToast()
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const refreshData = async () => {
    setIsRefreshing(true)
    
    try {
      // Recargar la página con el tab correcto
      window.location.href = "/dashboard/configuracion?tab=administradores&refresh=true"
    } catch (error) {
      console.error("Error al refrescar datos:", error)
      toast({
        title: "Error",
        description: "No se pudieron refrescar los datos",
        variant: "destructive"
      })
      setIsRefreshing(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Sección de estadísticas */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Administradores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{administradores?.length || 0}</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Lista de administradores */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between md:block hidden">
          <div>
            <CardTitle>Lista de Administradores</CardTitle>
            <CardDescription>Administradores registrados en el sistema</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshData}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button asChild>
              <Link href="/dashboard/administradores/nuevo">
                <PlusCircle className="h-4 w-4 mr-1" />
                Nuevo Administrador
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Encabezado móvil y botones */}
          <div className="flex flex-col gap-3 mb-4 md:hidden">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Administradores</h3>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={refreshData}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
                <Button size="sm" asChild>
                  <Link href="/dashboard/administradores/nuevo">
                    <PlusCircle className="h-4 w-4 mr-1" />
                    Nuevo
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {administradores && administradores.length > 0 ? (
            <>
              {/* Vista de escritorio - tabla */}
              <div className="border rounded-md hidden md:block">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nombre
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Edificio
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {administradores.map((admin) => (
                      <tr key={admin.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Link href={`/dashboard/administradores/${admin.id}`} className="text-blue-600 hover:text-blue-900">
                            {admin.nombre || "Sin nombre"}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {admin.edificio?.nombre || "No asignado"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={admin.activo ? "default" : "destructive"}>
                            {admin.activo ? "Activo" : "Inactivo"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Vista móvil - tarjetas */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {administradores.map((admin) => (
                  <div key={admin.id} className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <Link href={`/dashboard/administradores/${admin.id}`} className="font-medium text-blue-600 hover:text-blue-900">
                        {admin.nombre || "Sin nombre"}
                      </Link>
                      <Badge variant={admin.activo ? "default" : "destructive"} className="ml-auto">
                        {admin.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500">
                      {admin.edificio?.nombre || "No asignado"}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground">No hay administradores registrados</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
