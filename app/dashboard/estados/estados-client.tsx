"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

// Esta función es segura para el cliente, la definimos aquí directamente.
function getColorClase(color: string): string {
  switch (color) {
    case "gray":
      return "bg-gray-500 hover:bg-gray-600"
    case "blue":
      return "bg-blue-500 hover:bg-blue-600"
    case "green":
      return "bg-green-500 hover:bg-green-600"
    case "red":
      return "bg-red-500 hover:bg-red-600"
    case "yellow":
      return "bg-yellow-500 hover:bg-yellow-600"
    case "purple":
      return "bg-purple-500 hover:bg-purple-600"
    case "indigo":
      return "bg-indigo-500 hover:bg-indigo-600"
    case "orange":
      return "bg-orange-500 hover:bg-orange-600"
    default:
      return "bg-gray-500 hover:bg-gray-600"
  }
}

export default function EstadosClientPage({ 
  estadosTareas, 
  estadosPresupuestos, 
  estadosFacturas, 
  conteoTareas, 
  conteoPresupuestos, 
  conteoFacturas 
}: any) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard de Estados</h1>
        <p className="text-muted-foreground">Visualiza y gestiona los estados del sistema</p>
      </div>

      <Tabs defaultValue="tareas">
        <TabsList>
          <TabsTrigger value="tareas">Tareas</TabsTrigger>
          <TabsTrigger value="presupuestos">Presupuestos</TabsTrigger>
          <TabsTrigger value="facturas">Facturas</TabsTrigger>
        </TabsList>
        <TabsContent value="tareas" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {estadosTareas?.map((estado: any) => {
              const conteo = conteoTareas?.find((c: any) => c.id_estado === estado.id)?.conteo || 0
              return (
                <Card key={estado.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">{estado.nombre}</CardTitle>
                      <Badge className={`${getColorClase(estado.color)} text-white`}>{conteo}</Badge>
                    </div>
                    <CardDescription>{estado.descripcion || "Sin descripción"}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      Orden: {estado.orden}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
        <TabsContent value="presupuestos" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {estadosPresupuestos?.map((estado: any) => {
              const conteo = conteoPresupuestos?.find((c: any) => c.id_estado === estado.id)?.conteo || 0
              return (
                <Card key={estado.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">{estado.nombre}</CardTitle>
                      <Badge className={`${getColorClase(estado.color)} text-white`}>{conteo}</Badge>
                    </div>
                    <CardDescription>{estado.descripcion || "Sin descripción"}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      Orden: {estado.orden}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
        <TabsContent value="facturas" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {estadosFacturas?.map((estado: any) => {
              const conteo = conteoFacturas?.find((c: any) => c.id_estado === estado.id)?.conteo || 0
              return (
                <Card key={estado.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">{estado.nombre}</CardTitle>
                      <Badge className={`${getColorClase(estado.color)} text-white`}>{conteo}</Badge>
                    </div>
                    <CardDescription>{estado.descripcion || "Sin descripción"}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      Orden: {estado.orden}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
