"use client"

import { useState } from "react"
import { PlusCircle, RefreshCw, Building2, CheckCircle, XCircle, Edit, Eye, Users2, Percent } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import Link from "next/link"
import { createClient } from "@/lib/supabase-client"
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
      {/* Sección de estadísticas mejoradas */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Administradores</CardTitle>
            <Users2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{administradores?.length || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administradores Activos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {administradores?.filter(a => a.estado === 'activo').length || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Edificios</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {administradores?.reduce((sum, a) => sum + (a.total_edificios || 0), 0) || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Con Ajustes</CardTitle>
            <Percent className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {administradores?.filter(a => a.aplica_ajustes).length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Aplican porcentaje
            </p>
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
              {/* Vista de escritorio - tabla mejorada */}
              <div className="border rounded-md hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Nombre
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Teléfono
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Estado
                      </th>
                      <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Edificios
                      </th>
                      <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Aplica Ajustes
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        % Default
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {administradores.map((admin) => (
                      <tr key={admin.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <td className="px-4 py-3">
                          <Link href={`/dashboard/administradores/${admin.id}`} 
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 font-medium">
                            {admin.nombre || "Sin nombre"}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                          <a href={`tel:${admin.telefono}`} className="hover:underline">
                            {admin.telefono || "—"}
                          </a>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={admin.estado === 'activo' ? 'default' : 'secondary'}>
                            {admin.estado || 'activo'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link href={`/dashboard/edificios?admin=${admin.id}`} 
                                      className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline">
                                  <Building2 className="h-4 w-4" />
                                  <span className="font-semibold">{admin.total_edificios || 0}</span>
                                </Link>
                              </TooltipTrigger>
                              <TooltipContent>
                                Ver edificios de {admin.nombre}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {admin.aplica_ajustes ? (
                            <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                          ) : (
                            <XCircle className="h-5 w-5 text-gray-400 mx-auto" />
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {admin.porcentaje_default && admin.porcentaje_default > 0 ? (
                            <span className="font-semibold text-blue-600 dark:text-blue-400">
                              {admin.porcentaje_default}%
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" asChild>
                                    <Link href={`/dashboard/administradores/${admin.id}`}>
                                      <Eye className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Ver detalles</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" asChild>
                                    <Link href={`/dashboard/administradores/${admin.id}/editar`}>
                                      <Edit className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Editar</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Vista móvil - tarjetas mejoradas */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {administradores.map((admin) => (
                  <div key={admin.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg border shadow-sm">
                    {/* Header con nombre y estado */}
                    <div className="flex justify-between items-start mb-3">
                      <Link href={`/dashboard/administradores/${admin.id}`} 
                            className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                        {admin.nombre || "Sin nombre"}
                      </Link>
                      <Badge variant={admin.estado === 'activo' ? 'default' : 'secondary'}>
                        {admin.estado || 'activo'}
                      </Badge>
                    </div>
                    
                    {/* Información en grid */}
                    <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Teléfono:</span>
                        <a href={`tel:${admin.telefono}`} 
                           className="block font-medium text-blue-600 dark:text-blue-400 hover:underline">
                          {admin.telefono || "—"}
                        </a>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Edificios:</span>
                        <Link href={`/dashboard/edificios?admin=${admin.id}`} 
                              className="block font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {admin.total_edificios || 0} edificios
                        </Link>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Aplica Ajustes:</span>
                        <span className="block font-medium">
                          {admin.aplica_ajustes ? '✓ Sí' : '✗ No'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">% Default:</span>
                        <span className="block font-semibold text-blue-600 dark:text-blue-400">
                          {admin.porcentaje_default && admin.porcentaje_default > 0 ? `${admin.porcentaje_default}%` : '—'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Botones de acción */}
                    <div className="flex gap-2 pt-3 border-t dark:border-gray-700">
                      <Button variant="outline" size="sm" asChild className="flex-1">
                        <Link href={`/dashboard/administradores/${admin.id}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild className="flex-1">
                        <Link href={`/dashboard/administradores/${admin.id}/editar`}>
                          <Edit className="h-4 w-4 mr-1" />
                          Editar
                        </Link>
                      </Button>
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
