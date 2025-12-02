"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Loader2, ArrowLeft, PlusCircle, Trash2, FileWarning } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ProductoPicker } from "@/components/producto-picker"
import { NoData } from "@/components/ui/no-data"
import { createClient } from "@/lib/supabase-client"
import { formatCurrency } from "@/lib/utils"

interface Item {
  id?: number
  descripcion: string
  cantidad: number
  precio: number
  es_producto?: boolean
  producto_id?: string
}

export default function NuevoPresupuestoFinalPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { toast } = useToast()
  
  // Estados
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [presupuestosBase, setPresupuestosBase] = useState<any[]>([])
  const [selectedPresupuesto, setSelectedPresupuesto] = useState<any>(null)
  const [items, setItems] = useState<Item[]>([])
  const [newItem, setNewItem] = useState<Item>({ descripcion: "", cantidad: 1, precio: 0 })
  const [montoTotal, setMontoTotal] = useState(0)
  const [notas, setNotas] = useState("")

  // Cargar datos iniciales: usuario, presupuestos base aprobados
  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true)
        
        // Verificar sesión de usuario
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push('/login')
          return
        }
        
        // Obtener detalles del usuario
        const { data: userData, error: userError } = await supabase
          .from("usuarios")
          .select("*")
          .eq("id", session.user.id)
          .single()
          
        if (userError || !userData) {
          console.error("Error al obtener datos del usuario:", userError)
          router.push('/login')
          return
        }
        
        setUser(userData)

        // Solo admins pueden crear presupuestos finales
        if (userData?.rol !== "admin") {
          router.push("/dashboard")
          return
        }
        
        // Cargar presupuestos base aprobados
        const { data: presupuestosBaseData, error: presupuestosError } = await supabase
          .from("presupuestos_base")
          .select("*, tareas(titulo, code, edificios(nombre))")
          .eq("estado", "aprobado")
          .order("created_at", { ascending: false })
        
        if (presupuestosError) {
          console.error("Error al cargar presupuestos base:", presupuestosError)
          setError("No se pudieron cargar los presupuestos base aprobados")
          return
        }
        
        setPresupuestosBase(presupuestosBaseData || [])
      } catch (err) {
        console.error("Error inesperado:", err)
        setError("Ocurrió un error al cargar los datos necesarios")
      } finally {
        setLoading(false)
      }
    }
    
    loadInitialData()
  }, [router, supabase])

  // Actualiza el monto total cuando cambian los items
  useEffect(() => {
    const total = items.reduce((sum, item) => sum + (item.cantidad * item.precio), 0)
    setMontoTotal(total)
  }, [items])
  
  // Manejar selección de presupuesto base
  const handleSelectPresupuestoBase = async (id: string) => {
    try {
      // Obtener detalles del presupuesto base
      const { data: presupuestoData, error: presupuestoError } = await supabase
        .from("presupuestos_base")
        .select("*, tareas(titulo, code, edificios(nombre))")
        .eq("id", id)
        .single()
        
      if (presupuestoError || !presupuestoData) {
        toast({
          title: "Error", 
          description: "No se pudo cargar el presupuesto base seleccionado", 
          variant: "destructive"
        })
        return
      }
      
      // Actualizar estado
      setSelectedPresupuesto(presupuestoData)
      
      // Los presupuestos base NO tienen items, empezar con array vacío
      // El usuario agregará manualmente los items para el presupuesto final
      setItems([])
    } catch (error) {
      console.error("Error al seleccionar presupuesto base:", error)
      toast({
        title: "Error", 
        description: "Ocurrió un problema al cargar el presupuesto base", 
        variant: "destructive"
      })
    }
  }
  
  // Agregar item
  const handleAddItem = () => {
    if (!newItem.descripcion || newItem.cantidad <= 0 || newItem.precio <= 0) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos del ítem correctamente",
        variant: "destructive",
      })
      return
    }

    setItems([...items, { ...newItem }])
    setNewItem({ descripcion: "", cantidad: 1, precio: 0 })
  }
  
  // Eliminar item
  const handleDeleteItem = (index: number) => {
    const updatedItems = [...items]
    updatedItems.splice(index, 1)
    setItems(updatedItems)
  }
  
  // Manejar cambios en el item actual
  const handleItemChange = (field: string, value: string | number) => {
    setNewItem({
      ...newItem,
      [field]: value
    })
  }
  
  // Enviar formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedPresupuesto) {
      toast({ 
        title: "Error", 
        description: "Debe seleccionar un presupuesto base", 
        variant: "destructive" 
      })
      return
    }
    
    if (items.length === 0) {
      toast({ 
        title: "Error", 
        description: "Debe agregar al menos un ítem al presupuesto", 
        variant: "destructive" 
      })
      return
    }
    
    try {
      setSubmitting(true)
      
      // Generar código único para el presupuesto final
      const now = new Date()
      const timestamp = now.getTime().toString().slice(-6)
      const presupuestoCode = `PF-${timestamp}`
      
      // Insertar presupuesto final
      const { data: presupuestoFinal, error: presupuestoError } = await supabase
        .from("presupuestos_finales")
        .insert([
          {
            codigo: presupuestoCode,
            id_presupuesto_base: selectedPresupuesto.id,
            id_tarea: selectedPresupuesto.id_tarea,
            monto_total: montoTotal,
            notas: notas,
            estado: "pendiente",
            creado_por: user.id
          }
        ])
        .select("id")
        .single()
      
      if (presupuestoError || !presupuestoFinal) {
        throw new Error(presupuestoError?.message || "Error al crear el presupuesto final")
      }
      
      // Insertar items del presupuesto final en la tabla 'items'
      const itemsToInsert = items.map(item => ({
        id_presupuesto: presupuestoFinal.id,  // FK a presupuestos_finales
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precio: item.precio,
        es_producto: item.es_producto || false,
        es_material: false,  // Valor por defecto, se puede editar después
        producto_id: item.producto_id || null
      }))
      
      const { error: itemsError } = await supabase
        .from("items")
        .insert(itemsToInsert)
      
      if (itemsError) {
        throw new Error(itemsError.message || "Error al insertar los ítems del presupuesto")
      }
      
      toast({
        title: "Éxito", 
        description: "Presupuesto final creado correctamente"
      })
      
      // Redirigir a la página de la tarea
      router.push(`/dashboard/tareas/${selectedPresupuesto.id_tarea}`)
      
    } catch (error: any) {
      console.error("Error al crear presupuesto final:", error)
      toast({
        title: "Error", 
        description: error.message || "Ocurrió un error al crear el presupuesto final", 
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }
  
  // Mostrar pantalla de carga
  if (loading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando datos...</p>
        </div>
      </div>
    )
  }
  
  // Mostrar mensaje de error
  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="rounded-md bg-destructive/15 p-4 text-center">
          <p className="text-destructive">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push('/dashboard/presupuestos-finales')}>
            Volver a presupuestos finales
          </Button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          size="sm" 
          className="mr-2"
          onClick={() => router.push('/dashboard/presupuestos-finales')}
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Nuevo Presupuesto Final</h1>
      </div>

      {/* Selección de presupuesto base aprobado */}
      {!selectedPresupuesto && (
        <Card>
          <CardHeader>
            <CardTitle>Seleccionar Presupuesto Base Aprobado</CardTitle>
          </CardHeader>
          <CardContent>
            {presupuestosBase.length > 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Selecciona un presupuesto base aprobado para crear el presupuesto final:</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Tarea</TableHead>
                      <TableHead>Edificio</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {presupuestosBase.map((presupuesto) => (
                      <TableRow key={presupuesto.id}>
                        <TableCell>{presupuesto.codigo}</TableCell>
                        <TableCell>
                          {presupuesto.tareas?.titulo || "Sin título"}
                          <div className="text-xs text-muted-foreground">
                            {presupuesto.tareas?.code || ""}
                          </div>
                        </TableCell>
                        <TableCell>{presupuesto.tareas?.edificios?.nombre || "Sin edificio"}</TableCell>
                        <TableCell>
                          {formatCurrency(presupuesto.monto_total)}
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            onClick={() => handleSelectPresupuestoBase(presupuesto.id)}
                          >
                            Seleccionar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <NoData
                title="No hay presupuestos base aprobados"
                description="Primero debes crear y aprobar un presupuesto base"
                icon={<FileWarning className="h-10 w-10 text-muted-foreground" />}
                action={(
                  <Button asChild>
                    <Link href="/dashboard/presupuestos-base/nuevo">
                      <PlusCircle className="h-4 w-4 mr-1" /> Crear Presupuesto Base
                    </Link>
                  </Button>
                )}
              />
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Formulario para crear presupuesto final cuando ya se ha seleccionado un presupuesto base */}
      {selectedPresupuesto && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Detalles del presupuesto base seleccionado */}
          <Card>
            <CardHeader>
              <CardTitle>Presupuesto Base Seleccionado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium mb-1">Código:</p>
                  <p className="text-base">{selectedPresupuesto.codigo}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Tarea:</p>
                  <p className="text-base">
                    {selectedPresupuesto.tareas?.titulo}
                    <span className="text-xs text-muted-foreground block">
                      {selectedPresupuesto.tareas?.code}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Edificio:</p>
                  <p className="text-base">{selectedPresupuesto.tareas?.edificios?.nombre}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Materiales:</p>
                  <p className="text-base">{formatCurrency(selectedPresupuesto.materiales)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Mano de obra:</p>
                  <p className="text-base">{formatCurrency(selectedPresupuesto.mano_obra)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Total:</p>
                  <p className="text-base font-bold">{formatCurrency(selectedPresupuesto.monto_total)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Formulario para agregar ítems */}
          <Card>
            <CardHeader>
              <CardTitle>Ítems del Presupuesto Final</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Lista de ítems */}
              {items.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="w-[150px] text-right">Cantidad</TableHead>
                      <TableHead className="w-[150px] text-right">Precio</TableHead>
                      <TableHead className="w-[150px] text-right">Subtotal</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.descripcion}</TableCell>
                        <TableCell className="text-right">{item.cantidad}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.precio)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.cantidad * item.precio)}</TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            type="button"
                            onClick={() => handleDeleteItem(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={3} className="text-right font-bold">TOTAL:</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(montoTotal)}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}

              {/* Formulario para agregar nuevo ítem */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-6">
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Input 
                    id="descripcion"
                    value={newItem.descripcion}
                    onChange={(e) => handleItemChange('descripcion', e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="cantidad">Cantidad</Label>
                  <Input 
                    id="cantidad"
                    type="number"
                    min="1"
                    step="1"
                    value={newItem.cantidad}
                    onChange={(e) => handleItemChange('cantidad', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="precio">Precio</Label>
                  <Input 
                    id="precio"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newItem.precio}
                    onChange={(e) => handleItemChange('precio', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Button type="button" onClick={handleAddItem} className="w-full">
                    <PlusCircle className="h-4 w-4 mr-1" /> Agregar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notas */}
          <Card>
            <CardHeader>
              <CardTitle>Notas y Observaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ingrese cualquier nota o detalle adicional para este presupuesto..."
                className="min-h-[100px]"
              />
            </CardContent>
          </Card>

          {/* Botón de envío */}
          <div className="flex justify-end">
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Presupuesto Final
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
