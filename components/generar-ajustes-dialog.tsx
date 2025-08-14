"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/lib/supabase-provider";
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Loader2, Calculator, AlertTriangle, Package2 } from "lucide-react"

interface Item {
  id: number
  descripcion: string
  cantidad: number
  precio_unitario: number
  subtotal_item: number
  es_producto: boolean
  es_material: boolean
  producto_id?: string
}

interface Factura {
  id: number
  code: string
  total: number
  administrador_facturador: string
  id_administrador: number
}

interface GenerarAjustesDialogProps {
  factura: Factura
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GenerarAjustesDialog({ factura, open, onOpenChange }: GenerarAjustesDialogProps) {
  const [items, setItems] = useState<Item[]>([])
  const [selectedItems, setSelectedItems] = useState<Item[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [porcentajeAjuste, setPorcentajeAjuste] = useState<number>(0)
  const { toast } = useToast()
  const router = useRouter()
  const { supabase } = useSupabase();

  useEffect(() => {
    if (open) {
      loadItems()
      loadAdministradorConfig()
    }
  }, [open])

  const loadAdministradorConfig = async () => {
    try {
      // Obtener el porcentaje de ajuste configurado para el administrador
      const { data: adminData, error: adminError } = await supabase
        .from("administradores")
        .select("porcentaje_default")
        .eq("id", factura.id_administrador)
        .single();

      if (adminError) throw adminError;

      if (adminData && adminData.porcentaje_default) {
        setPorcentajeAjuste(adminData.porcentaje_default);
      }
    } catch (error) {
      console.error("Error al cargar configuración del administrador:", error);
      // Si hay un error, dejamos el valor por defecto (10%)
    }
  };

  const loadItems = async () => {
    setIsLoadingData(true);
    try {
      const { data: itemsData, error: itemsError } = await supabase
        .from("items_factura")
        .select("*")
        .eq("id_factura", factura.id);

      if (itemsError) throw itemsError;

      setItems(itemsData || []);

      // Pre-seleccionar items que no son materiales
      const noMaterialItems = (itemsData || []).filter(item => !item.es_material);
      setSelectedItems(noMaterialItems);
    } catch (error) {
      console.error("Error al cargar items:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los items de la factura",
        variant: "destructive",
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  const calcularTotalAjustes = () => {
    return selectedItems.reduce((total, item) => {
      const subtotal = item.subtotal_item;
      return total + subtotal * (porcentajeAjuste / 100);
    }, 0);
  };

  const handleItemSelect = (item: Item) => {
    setSelectedItems((prev) => 
      prev.some((i) => i.id === item.id) 
        ? prev.filter((i) => i.id !== item.id) 
        : [...prev, item]
    );
  };

  const handleGenerar = async () => {
    if (selectedItems.length === 0) {
      toast({
        title: "Error",
        description: "Selecciona al menos un item para generar ajustes",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const ajustesData = selectedItems
        .map((item) => {
          const montoBase = item.subtotal_item;
          const montoAjuste = montoBase * (porcentajeAjuste / 100);

          return {
            id_factura: factura.id,
            id_item: item.id,
            descripcion_item: item.descripcion,
            monto_base: montoBase,
            porcentaje_ajuste: porcentajeAjuste,
            monto_ajuste: montoAjuste,
            aprobado: false,
            pagado: false,
          };
        })
        .filter(Boolean);

      const { error } = await supabase.from("ajustes_facturas").insert(ajustesData);

      if (error) throw error;

      // Actualizar el estado de la factura
      await supabase
        .from("facturas")
        .update({ tiene_ajustes: true })
        .eq("id", factura.id);

      toast({
        title: "Ajustes generados",
        description: `Se generaron ${ajustesData.length} ajustes por un total de $${calcularTotalAjustes().toLocaleString()}`,
      });

      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error("Error al generar ajustes:", error);
      toast({
        title: "Error",
        description: "No se pudieron generar los ajustes",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleToggleMaterial = async (item: Item) => {
    try {
      // Actualizar en la base de datos
      const { error } = await supabase
        .from("items_factura")
        .update({ es_material: !item.es_material })
        .eq("id", item.id);
        
      if (error) throw error;
      
      // Actualizar en el estado local
      setItems(items.map(i => 
        i.id === item.id ? { ...i, es_material: !item.es_material } : i
      ));
      
      // Actualizar la selección si es necesario
      if (!item.es_material) { // Era mano de obra, ahora será material
        setSelectedItems(selectedItems.filter(i => i.id !== item.id));
      } else { // Era material, ahora será mano de obra
        setSelectedItems([...selectedItems, {...item, es_material: false}]);
      }
      
      toast({
        title: "Item actualizado",
        description: `${item.descripcion} marcado como ${!item.es_material ? "material" : "mano de obra"}`
      });
    } catch (error) {
      console.error("Error al actualizar el item:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el tipo de item",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calculator className="h-5 w-5 text-orange-600" />
            <span>Generar Ajustes - {factura.code}</span>
          </DialogTitle>
          <DialogDescription className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span>
              Selecciona los items de mano de obra que requieren ajuste del {porcentajeAjuste}% para {factura.administrador_facturador}
            </span>
          </DialogDescription>
        </DialogHeader>

        {isLoadingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Cargando items...</span>
          </div>
        ) : (
          <div className="space-y-4">
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="text-sm text-orange-800">Resumen de Ajustes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Items seleccionados:</span>
                    <div className="text-lg font-bold text-orange-600">{selectedItems.length}</div>
                  </div>
                  <div>
                    <span className="font-medium">Total ajustes:</span>
                    <div className="text-lg font-bold text-orange-600">${calcularTotalAjustes().toLocaleString()}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {items.map((item) => {
                const subtotal = item.subtotal_item;
                const ajuste = subtotal * (porcentajeAjuste / 100);
                const isSelected = selectedItems.some(selected => selected.id === item.id);

                return (
                  <div
                    key={item.id}
                    className={`flex items-center space-x-3 p-3 border rounded-lg transition-colors ${
                      isSelected ? "bg-orange-50 border-orange-200" : "bg-gray-50 hover:bg-gray-100"
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleItemSelect(item)}
                      disabled={item.es_material}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{item.descripcion}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.cantidad} x ${item.precio_unitario.toLocaleString()} = ${subtotal.toLocaleString()}
                      </div>
                      <div className="flex items-center mt-1 space-x-2">
                        <div className={`text-xs px-1.5 py-0.5 rounded-full ${item.es_material ? "bg-blue-100 text-blue-800" : "bg-orange-100 text-orange-800"}`}>
                          {item.es_material ? (
                            <span className="flex items-center"><Package2 className="h-3 w-3 mr-1" />Material</span>
                          ) : (
                            <span>Mano de obra</span>
                          )}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 text-xs" 
                          onClick={() => handleToggleMaterial(item)}
                        >
                          Cambiar
                        </Button>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">Ajuste {porcentajeAjuste}%</div>
                      <div className="text-orange-600 font-bold">${ajuste.toLocaleString()}</div>
                    </div>
                  </div>
                )
              })}
            </div>

            {items.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">No se encontraron items en esta factura</div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleGenerar}
            disabled={isLoading || selectedItems.length === 0 || isLoadingData}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generar Ajustes ({selectedItems.length} items)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
