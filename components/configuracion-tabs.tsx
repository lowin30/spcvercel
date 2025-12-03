"use client"

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Settings, Database, Shield, Palette, UserCheck, Users, Package, Tag, Users2, ActivitySquare } from "lucide-react"
import { UserRoleManager } from "@/components/user-role-manager"
import { ConfigurarTrabajadorForm } from "@/components/configurar-trabajador-form"
import { EditarTrabajadorForm } from "@/components/editar-trabajador-form"
import { SystemSettings } from "@/components/system-settings"
import { TrabajadoresList } from "@/components/trabajadores-list"
import { ProductosTab } from "@/components/productos-tab"
import { CategoriasTab } from "@/components/categorias-tab"
import { AdministradoresTab } from "@/components/administradores-tab"
import { EstadosTab } from "@/components/estados-tab"
import { AparienciaTab } from "@/components/apariencia-tab"

interface ConfiguracionTabsProps {
  trabajadores: any[]
  combinedUsers: any[]
  productos?: any[]
  categorias?: any[]
  administradores?: any[]
  estadosTareas?: any[]
  estadosPresupuestos?: any[]
  estadosFacturas?: any[]
}

export default function ConfiguracionTabs({ 
  trabajadores, 
  combinedUsers, 
  productos = [], 
  categorias = [],
  administradores = [],
  estadosTareas = [],
  estadosPresupuestos = [],
  estadosFacturas = []
}: ConfiguracionTabsProps) {
  const searchParams = useSearchParams()
  const [editMode, setEditMode] = useState(false)
  const [editTrabajadorId, setEditTrabajadorId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("usuarios")
  
  useEffect(() => {
    // Detectar si venimos de una edición exitosa para forzar recarga
    const refresh = searchParams.get('refresh')
    if (refresh === 'true') {
      // Eliminar el parámetro refresh y recargar para obtener datos frescos
      const tabParam = searchParams.get('tab') || 'trabajadores'
      window.location.href = `/dashboard/configuracion?tab=${tabParam}`
      return
    }
    
    // Leer el tab de los parámetros de búsqueda
    const tabParam = searchParams.get('tab')
    if (tabParam) {
      setActiveTab(tabParam)
    }
    
    // Verificar si estamos en modo edición o vista
    const editId = searchParams.get('edit')
    const viewId = searchParams.get('view')
    const liquidacionesId = searchParams.get('liquidaciones')
    
    if (editId) {
      setEditMode(true)
      setEditTrabajadorId(editId)
      setActiveTab('trabajadores')
    } else if (viewId || liquidacionesId) {
      setEditMode(false)
      setEditTrabajadorId(null)
      setActiveTab('trabajadores')
    } else {
      setEditMode(false)
      setEditTrabajadorId(null)
    }
  }, [searchParams])

  // Sincronizar el estado del tab con el valor del tab activo
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <Tabs defaultValue="usuarios" className="w-full pb-16 md:pb-0" value={activeTab} onValueChange={handleTabChange}>
      {/* Menú desplegable para móviles en la parte inferior */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-lg p-3 block md:hidden">
        <Select value={activeTab} onValueChange={handleTabChange}>
          <SelectTrigger className="w-full bg-primary text-primary-foreground">
            <SelectValue placeholder="Seleccionar sección" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            <SelectItem value="usuarios" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span>Usuarios y Roles</span>
            </SelectItem>
          
            <SelectItem value="trabajadores" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              <span>Trabajadores</span>
            </SelectItem>
          
            <SelectItem value="sistema" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span>Sistema</span>
            </SelectItem>
          
            <SelectItem value="apariencia" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              <span>Apariencia</span>
            </SelectItem>
          
            <SelectItem value="productos" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span>Productos</span>
            </SelectItem>
          
            <SelectItem value="categorias" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              <span>Categorías</span>
            </SelectItem>
          
            <SelectItem value="administradores" className="flex items-center gap-2">
              <Users2 className="h-4 w-4" />
              <span>Administradores</span>
            </SelectItem>
          
            <SelectItem value="estados" className="flex items-center gap-2">
              <ActivitySquare className="h-4 w-4" />
              <span>Estados</span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs para escritorio - grid */}
      <div className="hidden md:block">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
          <TabsTrigger value="usuarios" className="flex items-center">
            <Shield className="mr-2 h-4 w-4 flex-shrink-0" />
            <span className="hidden xl:inline">Gestión de Usuarios</span>
            <span className="xl:hidden">Usuarios</span>
          </TabsTrigger>
          <TabsTrigger value="trabajadores" className="flex items-center">
            <UserCheck className="mr-2 h-4 w-4 flex-shrink-0" />
            <span className="hidden xl:inline">Configuración Trabajadores</span>
            <span className="xl:hidden">Trabajadores</span>
          </TabsTrigger>
          <TabsTrigger value="sistema" className="flex items-center">
            <Database className="mr-2 h-4 w-4 flex-shrink-0" />
            <span className="hidden xl:inline">Configuración del Sistema</span>
            <span className="xl:hidden">Sistema</span>
          </TabsTrigger>
          <TabsTrigger value="apariencia" className="flex items-center">
            <Palette className="mr-2 h-4 w-4 flex-shrink-0" />
            <span>Apariencia</span>
          </TabsTrigger>
          <TabsTrigger value="productos" className="flex items-center">
            <Package className="mr-2 h-4 w-4 flex-shrink-0" />
            <span>Productos</span>
          </TabsTrigger>
          <TabsTrigger value="categorias" className="flex items-center">
            <Tag className="mr-2 h-4 w-4 flex-shrink-0" />
            <span>Categorías</span>
          </TabsTrigger>
          <TabsTrigger value="administradores" className="flex items-center">
            <Users2 className="mr-2 h-4 w-4 flex-shrink-0" />
            <span className="hidden xl:inline">Administradores</span>
            <span className="xl:hidden">Admins</span>
          </TabsTrigger>
          <TabsTrigger value="estados" className="flex items-center">
            <ActivitySquare className="mr-2 h-4 w-4 flex-shrink-0" />
            <span>Estados</span>
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="usuarios" className="space-y-4 mt-4 mb-4">
        <Card>
          <CardHeader className="md:block hidden">
            <CardTitle>Usuarios y Roles</CardTitle>
            <CardDescription>Gestión de roles de usuario</CardDescription>
          </CardHeader>
          <CardContent>
            <h3 className="text-lg font-semibold mb-4 md:hidden">Usuarios</h3>
            <UserRoleManager users={combinedUsers || []} />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="trabajadores" className="space-y-4 mt-4 mb-4">
        {editMode && editTrabajadorId ? (
          <EditarTrabajadorForm trabajadorId={editTrabajadorId} />
        ) : (
          <>
            {/* Sección de Estadísticas */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Trabajadores</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{trabajadores?.length || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Trabajadores Activos</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {trabajadores?.filter((t) => t.configuracion_trabajadores?.activo)?.length || 0}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Formulario de configuración */}
            <Card>
              <CardHeader>
                <CardTitle>Configuración de Trabajadores</CardTitle>
                <CardDescription>Configura salarios y estado de actividad de los trabajadores</CardDescription>
              </CardHeader>
              <CardContent>
                <ConfigurarTrabajadorForm trabajadores={trabajadores || []} />
              </CardContent>
            </Card>

            {/* Lista de trabajadores */}
            <Card>
              <CardHeader>
                <CardTitle>Lista de Trabajadores</CardTitle>
                <CardDescription>Todos los trabajadores registrados en el sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <TrabajadoresList trabajadores={trabajadores || []} />
              </CardContent>
            </Card>
          </>
        )}
      </TabsContent>
      <TabsContent value="sistema" className="space-y-4 mt-4 mb-4">
        <SystemSettings />
      </TabsContent>
      <TabsContent value="apariencia" className="space-y-4 mt-4 mb-4">
        <AparienciaTab />
      </TabsContent>
      
      <TabsContent value="productos" className="space-y-4 mt-4 mb-4">
        <ProductosTab productos={productos || []} categorias={categorias || []} />
      </TabsContent>
      
      <TabsContent value="categorias" className="space-y-4 mt-4 mb-4">
        <CategoriasTab categorias={categorias || []} />
      </TabsContent>
      
      <TabsContent value="administradores" className="space-y-4 mt-4 mb-4">
        <AdministradoresTab administradores={administradores || []} />
      </TabsContent>
      
      <TabsContent value="estados" className="space-y-4 mt-4 mb-4">
        <EstadosTab 
          estadosTareas={estadosTareas || []} 
          estadosPresupuestos={estadosPresupuestos || []} 
          estadosFacturas={estadosFacturas || []} 
        />
      </TabsContent>
    </Tabs>
  )
}
