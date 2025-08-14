"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { ProductoPicker } from "@/components/producto-picker"
import { Producto } from "@/types/producto"
import { formatCurrency } from "@/lib/utils"
import type { Item } from "@/app/dashboard/facturas/nueva/page"

interface ItemFacturaModalProps {
  open: boolean
  setOpen: (open: boolean) => void
  onSave: (item: Omit<Item, "id">) => void
  editingItem?: Item
}

export function ItemFacturaModal({ 
  open, 
  setOpen, 
  onSave, 
  editingItem 
}: ItemFacturaModalProps) {
  const [activeTab, setActiveTab] = useState<string>(editingItem ? "manual" : "producto")
  const [descripcion, setDescripcion] = useState(editingItem?.descripcion || "")
  const [cantidad, setCantidad] = useState(editingItem?.cantidad || 1)
  const [precio, setPrecio] = useState(editingItem?.precio || 0)
  const [esManoObra, setEsManoObra] = useState(editingItem?.es_mano_obra || false)
  const [selectedProducto, setSelectedProducto] = useState<Producto | null>(null)

  const subtotal = cantidad * precio

  const resetForm = () => {
    setDescripcion(editingItem?.descripcion || "")
    setCantidad(editingItem?.cantidad || 1)
    setPrecio(editingItem?.precio || 0)
    setEsManoObra(editingItem?.es_mano_obra || false)
    setSelectedProducto(null)
    setActiveTab(editingItem ? "manual" : "producto")
  }

  const handleClose = () => {
    resetForm()
    setOpen(false)
  }

  const handleSave = () => {
    onSave({
      descripcion,
      cantidad,
      precio,
      es_mano_obra: esManoObra,
      isNew: true,
    })
    handleClose()
  }

  const handleProductSelect = (producto: Producto) => {
    setSelectedProducto(producto)
    setDescripcion(producto.nombre)
    setPrecio(producto.precio)
    setActiveTab("manual")
  }

  const isValid = descripcion.trim() !== "" && cantidad > 0 && precio >= 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 max-h-[95vh] overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>{editingItem ? "Editar Ítem" : "Añadir Ítem a la Factura"}</DialogTitle>
          <DialogDescription>
            {editingItem 
              ? "Modifica los datos del ítem seleccionado" 
              : "Selecciona un producto existente o ingresa los datos manualmente"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-6 pt-2 pb-0 overflow-y-auto max-h-[calc(95vh-180px)]">
          {!editingItem && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-2 w-full mb-4">
                <TabsTrigger value="producto">Seleccionar Producto</TabsTrigger>
                <TabsTrigger value="manual">Ingreso Manual</TabsTrigger>
              </TabsList>
              <TabsContent value="producto" className="space-y-4">
                {selectedProducto ? (
                  <div className="p-3 border rounded-md">
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">{selectedProducto.nombre}</span>
                      <span className="font-bold">{formatCurrency(selectedProducto.precio)}</span>
                    </div>
                    {selectedProducto.descripcion && (
                      <p className="text-sm text-muted-foreground mb-2">{selectedProducto.descripcion}</p>
                    )}
                    <Button variant="outline" size="sm" onClick={() => setSelectedProducto(null)}>
                      Cambiar Producto
                    </Button>
                  </div>
                ) : (
                  <div className="flex justify-center py-4">
                    <ProductoPicker
                      onSelect={handleProductSelect}
                      buttonLabel="Seleccionar un Producto"
                    />
                  </div>
                )}
              </TabsContent>
              <TabsContent value="manual" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="descripcion">Descripción</Label>
                    <Input
                      id="descripcion"
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      placeholder="Descripción del ítem"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cantidad">Cantidad</Label>
                      <Input
                        id="cantidad"
                        type="number"
                        value={cantidad}
                        onChange={(e) => setCantidad(parseInt(e.target.value, 10) || 0)}
                        min="1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="precio">Precio Unitario</Label>
                      <Input
                        id="precio"
                        type="number"
                        value={precio}
                        onChange={(e) => setPrecio(parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="es_mano_obra" 
                      checked={esManoObra}
                      onCheckedChange={(checked) => setEsManoObra(!!checked)}
                    />
                    <Label htmlFor="es_mano_obra" className="text-sm font-normal">
                      Este ítem corresponde a mano de obra
                    </Label>
                  </div>
                  
                  <div className="p-3 bg-muted rounded-md">
                    <div className="flex justify-between">
                      <span className="font-medium">Subtotal:</span>
                      <span className="font-bold">{formatCurrency(subtotal)}</span>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
          
          {editingItem && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Input
                  id="descripcion"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Descripción del ítem"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cantidad">Cantidad</Label>
                  <Input
                    id="cantidad"
                    type="number"
                    value={cantidad}
                    onChange={(e) => setCantidad(parseInt(e.target.value, 10) || 0)}
                    min="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="precio">Precio Unitario</Label>
                  <Input
                    id="precio"
                    type="number"
                    value={precio}
                    onChange={(e) => setPrecio(parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="es_mano_obra" 
                  checked={esManoObra}
                  onCheckedChange={(checked) => setEsManoObra(!!checked)}
                />
                <Label htmlFor="es_mano_obra" className="text-sm font-normal">
                  Este ítem corresponde a mano de obra
                </Label>
              </div>
              
              <div className="p-3 bg-muted rounded-md">
                <div className="flex justify-between">
                  <span className="font-medium">Subtotal:</span>
                  <span className="font-bold">{formatCurrency(subtotal)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="p-4 border-t">
          <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!isValid}
            className="w-full sm:w-auto"
          >
            {editingItem ? "Actualizar" : "Añadir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
