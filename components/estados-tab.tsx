"use client"

import { useState } from "react"
import { RefreshCw } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { getColorClase } from "@/lib/estados-utils"
import { useToast } from "@/components/ui/use-toast"

interface EstadosTabProps {
  estadosTareas: any[]
  estadosPresupuestos: any[]
  estadosFacturas: any[]
}

export function EstadosTab({ 
  estadosTareas = [], 
  estadosPresupuestos = [], 
  estadosFacturas = [] 
}: EstadosTabProps) {
  const { toast } = useToast()
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const refreshData = async () => {
    setIsRefreshing(true)
    
    try {
      // Recargar la página con el tab correcto
      window.location.href = "/dashboard/configuracion?tab=estados&refresh=true"
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
            <CardTitle className="text-sm font-medium">Estados de Tareas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estadosTareas?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estados de Presupuestos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estadosPresupuestos?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estados de Facturas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estadosFacturas?.length || 0}</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabs de Estados */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Estados del Sistema</CardTitle>
            <CardDescription>Gestión de estados de tareas, presupuestos y facturas</CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshData}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="tareas" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="tareas">Tareas</TabsTrigger>
              <TabsTrigger value="presupuestos">Presupuestos</TabsTrigger>
              <TabsTrigger value="facturas">Facturas</TabsTrigger>
            </TabsList>
            
            {/* Tab de Estados de Tareas */}
            <TabsContent value="tareas" className="space-y-4 mt-4">
              {/* Vista de tabla para pantallas medianas y grandes */}
              <div className="border rounded-md overflow-hidden hidden md:block">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nombre
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Orden
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Color
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Descripción
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {estadosTareas.map((estado) => (
                      <tr key={estado.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {estado.nombre || "Sin nombre"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {estado.orden}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={getColorClase(estado.color)}>
                            {estado.color}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {estado.descripcion || "Sin descripción"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Vista de tarjetas para dispositivos móviles */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {estadosTareas.length > 0 ? (
                  estadosTareas.map((estado) => (
                    <div key={estado.id} className="bg-white p-4 rounded-lg border shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-medium">{estado.nombre || "Sin nombre"}</h3>
                        <Badge className={getColorClase(estado.color)}>
                          {estado.color}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        <div className="flex justify-between py-1">
                          <span>Orden:</span>
                          <span className="font-medium">{estado.orden}</span>
                        </div>
                        {estado.descripcion && (
                          <div className="mt-2 border-t pt-2">
                            <span className="block text-xs text-gray-700">Descripción:</span>
                            <span className="text-xs">{estado.descripcion}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">No hay estados de tareas registrados</p>
                  </div>
                )}
              </div>
            </TabsContent>
            
            {/* Tab de Estados de Presupuestos */}
            <TabsContent value="presupuestos" className="space-y-4 mt-4">
              {/* Vista de tabla para pantallas medianas y grandes */}
              <div className="border rounded-md overflow-hidden hidden md:block">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nombre
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Orden
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Color
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Descripción
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {estadosPresupuestos.map((estado) => (
                      <tr key={estado.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {estado.nombre || "Sin nombre"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {estado.orden}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={getColorClase(estado.color)}>
                            {estado.color}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {estado.descripcion || "Sin descripción"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Vista de tarjetas para dispositivos móviles */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {estadosPresupuestos.length > 0 ? (
                  estadosPresupuestos.map((estado) => (
                    <div key={estado.id} className="bg-white p-4 rounded-lg border shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-medium">{estado.nombre || "Sin nombre"}</h3>
                        <Badge className={getColorClase(estado.color)}>
                          {estado.color}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        <div className="flex justify-between py-1">
                          <span>Orden:</span>
                          <span className="font-medium">{estado.orden}</span>
                        </div>
                        {estado.descripcion && (
                          <div className="mt-2 border-t pt-2">
                            <span className="block text-xs text-gray-700">Descripción:</span>
                            <span className="text-xs">{estado.descripcion}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">No hay estados de presupuestos registrados</p>
                  </div>
                )}
              </div>
            </TabsContent>
            
            {/* Tab de Estados de Facturas */}
            <TabsContent value="facturas" className="space-y-4 mt-4">
              {/* Vista de tabla para pantallas medianas y grandes */}
              <div className="border rounded-md overflow-hidden hidden md:block">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nombre
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Orden
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Color
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Descripción
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {estadosFacturas.map((estado) => (
                      <tr key={estado.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {estado.nombre || "Sin nombre"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {estado.orden}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={getColorClase(estado.color)}>
                            {estado.color}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {estado.descripcion || "Sin descripción"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Vista de tarjetas para dispositivos móviles */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {estadosFacturas.length > 0 ? (
                  estadosFacturas.map((estado) => (
                    <div key={estado.id} className="bg-white p-4 rounded-lg border shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-medium">{estado.nombre || "Sin nombre"}</h3>
                        <Badge className={getColorClase(estado.color)}>
                          {estado.color}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        <div className="flex justify-between py-1">
                          <span>Orden:</span>
                          <span className="font-medium">{estado.orden}</span>
                        </div>
                        {estado.descripcion && (
                          <div className="mt-2 border-t pt-2">
                            <span className="block text-xs text-gray-700">Descripción:</span>
                            <span className="text-xs">{estado.descripcion}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">No hay estados de facturas registrados</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
