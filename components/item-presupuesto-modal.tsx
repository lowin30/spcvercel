"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProductoPicker } from "@/components/producto-picker"
import { formatCurrency } from "@/lib/utils"
import type { Producto } from "@/types/producto"

// Interfaces

export interface ItemPresupuesto {
  id?: number
  descripcion: string
  cantidad: number
  precio: number
  es_producto?: boolean
  es_material?: boolean
  producto_id?: string
  producto?: Producto
}

interface ItemPresupuestoModalProps {
  open: boolean
  setOpen: (open: boolean) => void
  onSave: (item: Omit<ItemPresupuesto, "id">) => void
  editingItem?: ItemPresupuesto
  productosInyectados?: any[]
}


export function ItemPresupuestoModal({
  open,
  setOpen,
  onSave,
  editingItem,
  productosInyectados
}: ItemPresupuestoModalProps) {

  // Estado para los campos del formulario
  const [descripcion, setDescripcion] = useState("")
  const [cantidad, setCantidad] = useState(1)
  const [precio, setPrecio] = useState(0)
  const [precioMostrado, setPrecioMostrado] = useState("")
  const [productoId, setProductoId] = useState<string | undefined>(undefined)
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | undefined>(undefined)
  const [esProducto, setEsProducto] = useState(false)
  const [esMaterial, setEsMaterial] = useState(false)

  // Estado para las pestañas
  const [activeTab, setActiveTab] = useState<string>("manual")

  // Calcular subtotal en tiempo real
  const subtotal = cantidad * precio

  // Validación
  const isValid = descripcion.trim() !== "" && cantidad > 0 && precio >= 0

  // Efecto para cargar datos del ítem a editar
  useEffect(() => {
    if (editingItem) {
      setDescripcion(editingItem.descripcion || "")
      setCantidad(editingItem.cantidad || 1)
      const initialPrecio = editingItem.precio || 0
      setPrecio(initialPrecio)
      setPrecioMostrado(initialPrecio > 0 ? new Intl.NumberFormat('es-ES').format(initialPrecio) : "")
      setProductoId(editingItem.producto_id)
      setProductoSeleccionado(editingItem.producto)
      setEsProducto(!!editingItem.es_producto)
      setEsMaterial(!!editingItem.es_material)

      // Si el ítem es un producto, cambiar a la pestaña de producto
      if (editingItem.es_producto && editingItem.producto_id) {
        setActiveTab("producto")
      } else {
        setActiveTab("manual")
      }
    } else {
      // Reset para un nuevo ítem
      setDescripcion("")
      setCantidad(1)
      setPrecio(0)
      setPrecioMostrado("")
      setProductoId(undefined)
      setProductoSeleccionado(undefined)
      setEsProducto(false)
      setEsMaterial(false)
      setActiveTab("manual")
    }
  }, [editingItem, open])

  // Manejar la selección de un producto
  const handleProductSelect = (producto: Producto) => {
    setProductoSeleccionado(producto)
    setDescripcion(`${producto.nombre}${producto.descripcion ? ` - ${producto.descripcion}` : ''}`)
    const selectedPrecio = producto.precio || 0
    setPrecio(selectedPrecio)
    setPrecioMostrado(new Intl.NumberFormat('es-ES').format(selectedPrecio))
    setProductoId(producto.id)
    setEsProducto(true)
    setEsMaterial(true)
    setActiveTab("manual") // Cambiar a la pestaña manual para editar
  }

  const handlePrecioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value
    const numericValue = parseInt(rawValue.replace(/\D/g, ""), 10)

    if (isNaN(numericValue)) {
      setPrecio(0)
      setPrecioMostrado("")
    } else {
      setPrecio(numericValue)
      setPrecioMostrado(new Intl.NumberFormat('es-ES').format(numericValue))
    }
  }

  // Guardar los datos del ítem
  const handleSave = () => {
    onSave({
      descripcion,
      cantidad,
      precio,
      producto_id: esProducto ? productoId : undefined,
      producto: esProducto ? productoSeleccionado : undefined,
      es_producto: esProducto,
      es_material: esMaterial
    })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {editingItem ? "Editar ítem" : "Añadir ítem"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Este modal permite gestionar los ítems (materiales y mano de obra) vinculados al presupuesto.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="producto">Seleccionar Producto</TabsTrigger>
            <TabsTrigger value="manual">Ingreso Manual</TabsTrigger>
          </TabsList>

          <TabsContent value="producto" className="space-y-4 pt-4">
            <ProductoPicker
              onSelect={handleProductSelect}
              buttonLabel="Buscar Producto"
              productosInyectados={productosInyectados}
            />


            {productoSeleccionado && (
              <div className="rounded-md border p-3 mt-2">
                <p className="font-medium">{productoSeleccionado.nombre}</p>
                <p className="text-sm text-muted-foreground">{productoSeleccionado.code}</p>
                <div className="flex justify-between mt-1">
                  <span>Precio:</span>
                  <span>{formatCurrency(productoSeleccionado.precio || 0)}</span>
                </div>
              </div>
            )}

            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="cantidad-producto">Cantidad</Label>
                <Input
                  id="cantidad-producto"
                  type="number"
                  min="1"
                  step="1"
                  value={cantidad}
                  onChange={(e) => setCantidad(Number(e.target.value) || 1)}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="es-material-producto"
                  checked={esMaterial}
                  onCheckedChange={(checked) => setEsMaterial(Boolean(checked))}
                />
                <Label htmlFor="es-material-producto" className="cursor-pointer">
                  ¿Es material?
                </Label>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4 pt-4">
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  placeholder="Descripción del ítem"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="cantidad">Cantidad</Label>
                  <Input
                    id="cantidad"
                    type="number"
                    min="1"
                    step="1"
                    value={cantidad}
                    onChange={(e) => setCantidad(Number(e.target.value) || 1)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="precio">Precio unitario</Label>
                  <Input
                    id="precio"
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={precioMostrado}
                    onChange={handlePrecioChange}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="es-material-manual"
                  checked={esMaterial}
                  onCheckedChange={(checked) => setEsMaterial(Boolean(checked))}
                />
                <Label htmlFor="es-material-manual" className="cursor-pointer">
                  ¿Es material?
                </Label>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Subtotal */}
        <div className="flex justify-between items-center border-t pt-3 mt-2">
          <span className="font-medium">Subtotal:</span>
          <span className="text-lg font-bold">{formatCurrency(subtotal)}</span>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!isValid}
          >
            {editingItem ? "Actualizar" : "Añadir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
