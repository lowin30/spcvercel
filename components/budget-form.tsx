"use client"

import { Badge } from "@/components/ui/badge"

import type React from "react"

import { useState, useEffect } from "react"
import { useSupabase } from "@/lib/supabase-provider"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { formatCurrency, formatCuit } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2 } from "lucide-react"
import { ProductoPicker } from "./producto-picker"
import type { Producto } from "@/types/producto"
import { ItemPresupuestoModal } from "./item-presupuesto-modal"
import { EsMaterialCheckbox } from "@/app/dashboard/presupuestos-finales/editar/[id]/es-material-checkbox"
import { toast as sonnerToast } from "sonner"
import { convertirPresupuestoADosFacturas } from "@/app/dashboard/presupuestos-finales/actions-factura"
import { getTaskForFinalBudgetAction, saveBudgetAction } from "@/app/dashboard/tareas/actions"

interface Tarea {
  id: number
  code: string
  titulo: string
  descripcion?: string
  id_edificio?: number
  id_administrador?: string | number
  edificios?: {
    nombre?: string
    id_administrador?: string | number
  }
}

interface PresupuestoBase {
  id: number
  code: string
  materiales: number
  mano_obra: number
  total: number
  aprobado: boolean
  id_edificio?: number
  id_tarea?: number
  id_administrador?: string | number // Asumiendo que puede ser string (UUID) o number
  tareas?: {
    code?: string
    titulo?: string
    edificios?: {
      nombre?: string
    }
  }
  edificios?: {
    id?: number
    nombre?: string
  }
  // Campos opcionales de la vista completa (para compatibilidad)
  titulo_tarea?: string
  nombre_edificio?: string
  edificio_info?: {
    cuit?: string
  }
}

interface Item {
  id?: number
  descripcion: string
  cantidad: number
  precio: number
  es_producto?: boolean
  es_material?: boolean
  producto_id?: string
  producto?: Producto
}

// Interface for the new item form state
interface NewItemFormState {
  descripcion: string;
  cantidad: number;
  precio: number | string; // Allow string for input flexibility, but treat as number elsewhere
  es_producto?: boolean;
  producto_id?: string;
  producto?: Producto;
}

interface BudgetFormProps {
  tipo: "base" | "final"
  tareas?: Tarea[]
  tareaSeleccionada?: Tarea | null
  idPadre?: string
  idTarea?: string
  presupuestoBase?: PresupuestoBase
  itemsBase?: Item[]
  presupuestoAEditar?: PresupuestoFinal | PresupuestoBase // Añadimos para modo edición
}

// Definimos un tipo más explícito para PresupuestoFinal que puede ser editado
interface PresupuestoFinal {
  id: number;
  code: string;
  total: number;
  aprobado: boolean;
  id_presupuesto_base: number | null;
  created_at: string;
  // Campos adicionales de vista_presupuestos_finales_completa
  id_edificio?: number;
  id_tarea?: number;
  id_administrador?: number;
  nombre_edificio?: string;
  nombre_administrador?: string;
  titulo_tarea?: string;
  // Info adicional del edificio
  edificio_info?: {
    cuit?: string;
  };
}

export function BudgetForm({
  presupuestoAEditar, // Añadimos la nueva prop
  tipo,
  tareas,
  tareaSeleccionada,
  idPadre,
  idTarea,
  presupuestoBase,
  itemsBase,
}: BudgetFormProps) {
  const [aprobado, setAprobado] = useState(presupuestoAEditar?.aprobado || false);
  const [selectedTarea, setSelectedTarea] = useState(idTarea || tareaSeleccionada?.id?.toString() || "")
  const [items, setItems] = useState<Item[]>(itemsBase || [])

  // Estados para la selección en cascada de administrador-edificio
  const [administradores, setAdministradores] = useState<any[]>([])
  const [edificios, setEdificios] = useState<any[]>([])
  const [selectedAdministrador, setSelectedAdministrador] = useState<string>("")
  const [selectedEdificio, setSelectedEdificio] = useState<string>("")
  const [loadingEdificios, setLoadingEdificios] = useState<boolean>(false)

  const initialNewItemFormState: NewItemFormState = {
    descripcion: "",
    cantidad: 1,
    precio: "", // Initialize precio as empty string
    es_producto: undefined,
    producto_id: undefined,
    producto: undefined,
  };
  const [newItem, setNewItem] = useState<NewItemFormState>(initialNewItemFormState);
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Estados para el modal de ítems
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null)

  const { supabase } = useSupabase()
  const { toast } = useToast()
  const router = useRouter()

  // Si hay una tarea seleccionada, establecerla como valor inicial
  useEffect(() => {
    if (tareaSeleccionada && tareaSeleccionada.id) {
      setSelectedTarea(tareaSeleccionada.id.toString())
    }
  }, [tareaSeleccionada])

  // Sincronizar el estado interno de 'items' con la prop 'itemsBase'
  // Esto es crucial para cuando se navega para crear un nuevo presupuesto (itemsBase podría ser undefined o [])
  // o cuando se carga un presupuesto base diferente.
  useEffect(() => {
    setItems(itemsBase || []);
  }, [itemsBase]);

  // Efecto para pre-seleccionar Administrador y Edificio basado en la tarea (desde edición o creación)
  useEffect(() => {
    const preseleccionarDesdeTarea = async () => {
      // Caso 1: Si estamos editando un presupuesto final (presupuestoAEditar)
      // Los datos vienen directamente de vista_presupuestos_finales_completa
      if (presupuestoAEditar) {
        if (presupuestoAEditar.id_administrador) {
          const adminIdStr = presupuestoAEditar.id_administrador.toString();
          setSelectedAdministrador(adminIdStr);
          await cargarEdificiosPorAdministrador(adminIdStr);
        }

        if (presupuestoAEditar.id_edificio) {
          setSelectedEdificio(presupuestoAEditar.id_edificio.toString());
        }
        return;
      }

      // Caso 2: Crear presupuesto desde presupuestoBase o idTarea
      const tareaId = presupuestoBase?.id_tarea || (idTarea ? parseInt(idTarea) : null);

      if (tareaId) {
        const res = await getTaskForFinalBudgetAction(tareaId);

        if (!res.success) {
          console.error('Error al obtener datos de la tarea para preseleccionar:', res.message);
          return;
        }

        const tareaCompleta = res.data;

        if (tareaCompleta) {
          if (tareaCompleta.id_administrador) {
            const adminIdStr = tareaCompleta.id_administrador.toString();
            setSelectedAdministrador(adminIdStr);
            // Una vez que el administrador está seleccionado, necesitamos cargar sus edificios
            await cargarEdificiosPorAdministrador(adminIdStr);
          }
          if (tareaCompleta.id_edificio) {
            setSelectedEdificio(tareaCompleta.id_edificio.toString());
          }
        }
      }
    };

    preseleccionarDesdeTarea();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presupuestoBase, idTarea, presupuestoAEditar, supabase]);

  // Cargar lista de administradores al iniciar el formulario
  useEffect(() => {
    const cargarAdministradores = async () => {
      if (tipo === "final") {
        try {
          const { data, error } = await supabase
            .from("administradores")
            .select("*")
            .order("nombre", { ascending: true });

          if (error) {
            console.error("Error al cargar administradores:", error);
            return;
          }

          setAdministradores(data || []);
        } catch (error) {
          console.error("Error al cargar administradores:", error);
        }
      }
    };

    cargarAdministradores();
  }, [tipo, supabase, presupuestoBase, tareaSeleccionada]);

  // Función para cargar edificios según el administrador seleccionado
  const cargarEdificiosPorAdministrador = async (idAdministrador: string) => {
    if (!idAdministrador) {
      setEdificios([]);
      setSelectedEdificio("");
      return;
    }

    setLoadingEdificios(true);

    try {
      const { data, error } = await supabase
        .from("edificios")
        .select("*")
        .eq("id_administrador", idAdministrador)
        .order("nombre", { ascending: true });

      if (error) {
        console.error("Error al cargar edificios:", error);
        return;
      }

      setEdificios(data || []);
      setLoadingEdificios(false);
    } catch (error) {
      console.error("Error al cargar edificios:", error);
    } finally {
      setLoadingEdificios(false);
    }
  };

  // Abrir modal para añadir un nuevo ítem
  const handleOpenAddItemModal = () => {
    setEditingItemIndex(null);
    setIsModalOpen(true);
  };

  // Abrir modal para editar un ítem existente
  const handleOpenEditItemModal = (index: number) => {
    setEditingItemIndex(index);
    setIsModalOpen(true);
  };

  // Guardar ítem desde el modal (añadir nuevo o actualizar existente)
  const handleSaveItemFromModal = (item: {
    descripcion: string;
    cantidad: number;
    precio: number;
    es_producto?: boolean;
    producto_id?: string;
    producto?: Producto;
  }) => {
    // Si estamos editando un ítem existente
    if (editingItemIndex !== null) {
      const newItems = [...items];
      newItems[editingItemIndex] = item as Item;
      setItems(newItems);
    } else {
      // Si estamos añadiendo un nuevo ítem
      setItems([...items, item as Item]);
    }
  };

  // Esta función se mantiene para compatibilidad mientras hacemos la transición al modal
  const handleAddItem = () => {
    const priceValue = parseFloat(String(newItem.precio));
    if (!newItem.descripcion || newItem.cantidad <= 0 || isNaN(priceValue) || priceValue <= 0) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos del ítem correctamente",
        variant: "destructive",
      })
      return
    }

    setItems([...items, {
      ...newItem,
      precio: parseFloat(String(newItem.precio)) // Convert precio to number before adding to items list
    }])

    // Reset form
    setNewItem(initialNewItemFormState)
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleProductSelect = (producto: Producto) => {
    const itemFromProduct = {
      ...initialNewItemFormState,
      descripcion: `${producto.nombre}${producto.descripcion ? ` - ${producto.descripcion}` : ''}`,
      cantidad: 1,
      precio: String(producto.precio),
      es_producto: true,
      producto_id: producto.id,
      producto: producto,
    };
    setNewItem(itemFromProduct);
    setEditingItemIndex(null); // Aseguramos que es un ítem nuevo
    setIsModalOpen(true); // Abrimos el modal inmediatamente
  }

  const calculateTotals = () => {
    return items.reduce(
      (acc, item) => {
        const itemTotal = item.cantidad * item.precio
        const descripcionLower = item.descripcion.toLowerCase()

        // Identificar mano de obra basado en las palabras clave en la descripción
        const esManoDeObra = [
          'mano de obra',
          'm.o',
          'mano obra',
          'instalación',
          'instalacion',
          'servicio',
          'montaje',
          'montado',
          'colocación',
          'colocacion'
        ].some(keyword => descripcionLower.includes(keyword))

        // Identificar materiales basado en palabras clave
        const esMaterial = [
          'material',
          'materiales',
          'suministro',
          'insumo',
          'equipo',
          'herramienta'
        ].some(keyword => descripcionLower.includes(keyword))

        // Decisión final basada en prioridades:
        // 1. Si explícitamente menciona mano de obra, es mano de obra
        // 2. Si explícitamente menciona material, es material
        // 3. Si tiene producto_id y no menciona mano de obra, es material
        // 4. En cualquier otro caso, es mano de obra
        if (esManoDeObra) {
          acc.mano_obra += itemTotal
        } else if (esMaterial || !!item.producto_id) {
          acc.materiales += itemTotal
        } else {
          // Por defecto, si no tiene ninguna palabra clave, sigue la lógica antigua
          if (!!item.producto_id) {
            acc.materiales += itemTotal
          } else {
            acc.mano_obra += itemTotal
          }
        }

        acc.total += itemTotal
        return acc
      },
      { total: 0, materiales: 0, mano_obra: 0 }
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validaciones básicas
    if (tipo === "base" && !selectedTarea && !presupuestoAEditar) {
      toast({ title: "Error", description: "Por favor selecciona una tarea", variant: "destructive" });
      return;
    }

    if (items.length === 0) {
      toast({ title: "Error", description: "Por favor agrega al menos un ítem", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    try {
      const { total, materiales, mano_obra } = calculateTotals();

      // 2. Preparar payload de presupuesto
      let budgetPayload: any = {};

      if (tipo === "final") {
        const selectedTareaObj = selectedTarea ? tareas?.find(t => t.id === Number(selectedTarea)) : null;

        // Prioridad de Identidades (Admin/Edificio)
        let administradorId = selectedAdministrador || null;
        if (!administradorId && selectedTareaObj) {
          administradorId = selectedTareaObj.id_administrador?.toString() || selectedTareaObj.edificios?.id_administrador?.toString() || null;
        }
        if (!administradorId && presupuestoBase?.id_administrador) {
          administradorId = presupuestoBase.id_administrador.toString();
        }

        const edificioId = selectedEdificio || presupuestoBase?.id_edificio || selectedTareaObj?.id_edificio || null;

        budgetPayload = {
          id_presupuesto_base: idPadre ? Number(idPadre) : (presupuestoAEditar && 'id_presupuesto_base' in presupuestoAEditar ? presupuestoAEditar.id_presupuesto_base : null),
          materiales,
          mano_obra,
          total,
          total_base: presupuestoBase ? presupuestoBase.materiales + presupuestoBase.mano_obra : (presupuestoAEditar && 'total_base' in presupuestoAEditar ? (presupuestoAEditar as any).total_base : 0),
          id_edificio: edificioId ? Number(edificioId) : null,
          id_tarea: presupuestoBase?.id_tarea || (selectedTarea ? Number(selectedTarea) : (presupuestoAEditar?.id_tarea || null)),
          id_administrador: administradorId,
          aprobado: aprobado,
        };

        if (!presupuestoAEditar) {
          budgetPayload.code = `PF-${new Date().getTime().toString().slice(-6)}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
          budgetPayload.id_estado = 1;
        }
      } else {
        // Tipo Base
        budgetPayload = {
          id_tarea: Number(selectedTarea) || Number(idTarea) || presupuestoAEditar?.id_tarea,
          materiales,
          mano_obra,
          aprobado: false,
          id_edificio: tareas?.find(t => t.id === Number(selectedTarea))?.id_edificio || presupuestoAEditar?.id_edificio,
        };
        if (!presupuestoAEditar) {
          budgetPayload.code = `PB-${new Date().getTime().toString().slice(-6)}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
        }
      }

      // 3. Llamar a la Bridge Action
      const res = await saveBudgetAction({
        tipo,
        budgetData: budgetPayload,
        items,
        isEditing: !!presupuestoAEditar,
        budgetId: presupuestoAEditar?.id,
      });

      if (!res.success) throw new Error(res.message);

      // 4. Éxito y Redirección
      toast({
        title: presupuestoAEditar ? "Presupuesto actualizado" : "Presupuesto creado",
        description: `El presupuesto ha sido guardado correctamente.`,
      });

      // Lógica de redirección post-aprobación o estándar
      if (tipo === "final" && aprobado && !presupuestoAEditar?.aprobado) {
        sonnerToast.success("Presupuesto aprobado. Redirigiendo a facturas...");
        setTimeout(() => router.push("/dashboard/facturas"), 1500);
      } else {
        const redirectId = budgetPayload.id_tarea || res.data.id_tarea;
        if (redirectId) {
          router.push(`/dashboard/tareas/${redirectId}`);
        } else {
          router.push('/dashboard/presupuestos');
        }
      }

      router.refresh();

    } catch (error: any) {
      console.error("Error al guardar presupuesto:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar el presupuesto",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid-responsive grid-responsive-lg">
        <Card>
          <CardHeader>
            <CardTitle>Información del Presupuesto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tipo === "base" ? (
              <div className="space-y-2">
                <Label htmlFor="tarea">Tarea *</Label>
                {tareaSeleccionada ? (
                  <div className="p-2 border rounded-md">
                    <p className="font-medium">
                      {tareaSeleccionada.code} - {tareaSeleccionada.titulo}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {tareaSeleccionada.edificios?.nombre || (tareaSeleccionada.id_edificio ? `Edificio ID: ${tareaSeleccionada.id_edificio}` : 'Edificio no especificado')}
                    </p>
                  </div>
                ) : (
                  <Select value={selectedTarea} onValueChange={setSelectedTarea} disabled={isSubmitting} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una tarea" />
                    </SelectTrigger>
                    <SelectContent>
                      {tareas?.map((tarea) => (
                        <SelectItem key={tarea.id} value={tarea.id.toString()}>
                          {tarea.code} - {tarea.titulo} ({tarea.edificios?.nombre || (tarea.id_edificio ? `ID: ${tarea.id_edificio}` : '')})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Tarea</Label>
                <div className="p-2 border rounded-md">
                  <p className="font-medium">
                    {presupuestoAEditar?.titulo_tarea || presupuestoBase?.tareas?.titulo || 'Título no disponible'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {presupuestoAEditar?.edificio_info?.cuit
                      ? presupuestoAEditar.edificio_info.cuit
                      : (presupuestoAEditar?.nombre_edificio || presupuestoBase?.edificios?.nombre || 'Edificio no especificado')}
                  </p>
                </div>
              </div>
            )}

            {tipo === "final" && (
              <>
                <div className="space-y-2">
                  <Label>Presupuesto Base</Label>
                  <div className="p-2 border rounded-md">
                    <div className="flex justify-between">
                      <p className="font-medium">Materiales</p>
                      <p>${presupuestoBase?.materiales.toLocaleString()}</p>
                    </div>
                    <div className="flex justify-between">
                      <p className="font-medium">Mano de obra</p>
                      <p>${presupuestoBase?.mano_obra.toLocaleString()}</p>
                    </div>
                    <div className="flex justify-between pt-2 border-t mt-2">
                      <p className="font-medium">Total</p>
                      <p>
                        ${(presupuestoBase ? presupuestoBase.materiales + presupuestoBase.mano_obra : 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Selección en cascada de Administrador y Edificio - Solo para presupuestos nuevos */}
                {!presupuestoAEditar && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="administrador">Administrador</Label>
                      <Select
                        value={selectedAdministrador}
                        onValueChange={(value) => {
                          setSelectedAdministrador(value);
                          cargarEdificiosPorAdministrador(value);
                          // Al cambiar de administrador, reseteamos el edificio seleccionado
                          setSelectedEdificio("");
                        }}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un administrador" />
                        </SelectTrigger>
                        <SelectContent>
                          {administradores.map((admin) => (
                            <SelectItem key={admin.id} value={admin.id.toString()}>
                              {admin.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edificio">Edificio</Label>
                      <Select
                        value={selectedEdificio}
                        onValueChange={setSelectedEdificio}
                        disabled={isSubmitting || !selectedAdministrador || loadingEdificios}
                      >
                        <SelectTrigger>
                          {loadingEdificios ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Cargando edificios...</span>
                            </div>
                          ) : (
                            <SelectValue placeholder={selectedAdministrador ? "Selecciona un edificio" : "Primero selecciona un administrador"} />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          {edificios.map((edificio) => (
                            <SelectItem key={edificio.id} value={edificio.id.toString()}>
                              {edificio.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedAdministrador && edificios.length === 0 && !loadingEdificios && (
                        <p className="text-sm text-muted-foreground">No hay edificios asociados a este administrador</p>
                      )}
                    </div>
                  </>
                )}
              </>
            )}

            <div className="space-y-2">
              <div className="flex justify-between w-full items-center">
                <Label>Ítems del Presupuesto</Label>
                <Button
                  type="button"
                  onClick={handleOpenAddItemModal}
                  disabled={isSubmitting}
                  className="flex gap-1 items-center"
                >
                  <Plus className="h-4 w-4" /> Añadir ítem
                </Button>
              </div>

              {/* Modal para añadir/editar ítems */}
              <ItemPresupuestoModal
                open={isModalOpen}
                setOpen={setIsModalOpen}
                onSave={handleSaveItemFromModal}
                editingItem={editingItemIndex !== null ? items[editingItemIndex] : { ...newItem, precio: typeof newItem.precio === 'string' ? parseFloat(newItem.precio) || 0 : newItem.precio }}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between items-center">
            <div>
              {presupuestoAEditar && tipo === 'final' && (
                <div className="flex items-center space-x-2">
                  <Checkbox id="aprobado" checked={aprobado} onCheckedChange={(checked) => setAprobado(Boolean(checked))} />
                  <Label htmlFor="aprobado">Aprobado</Label>
                </div>
              )}
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {presupuestoAEditar ? 'Guardar Cambios' : 'Crear Presupuesto'}
            </Button>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-xl font-bold">{formatCurrency(calculateTotals().total)}</p>
            </div>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detalle de Ítems</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {items.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">No hay ítems agregados</p>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table style={{ minWidth: '400px' }}>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">
                        <span className="hidden sm:inline">Cantidad</span>
                        <span className="inline sm:hidden">Cant.</span>
                      </TableHead>
                      <TableHead className="text-right">
                        <span className="hidden sm:inline">Precio</span>
                        <span className="inline sm:hidden">Precio</span>
                      </TableHead>
                      <TableHead className="text-right">
                        <span className="hidden sm:inline">Subtotal</span>
                        <span className="inline sm:hidden">Total</span>
                      </TableHead>
                      {tipo === "final" && (
                        <TableHead>
                          <span className="hidden sm:inline">Material</span>
                          <span className="inline sm:hidden">Mat.</span>
                        </TableHead>
                      )}
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {item.descripcion}
                          {item.producto_id && (
                            <Badge variant="outline" className="ml-2">
                              Producto
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{item.cantidad}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.precio)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.cantidad * item.precio)}</TableCell>

                        {tipo === "final" && (
                          <TableCell>
                            {presupuestoAEditar && item.id ? (
                              <EsMaterialCheckbox
                                itemId={item.id}
                                initialValue={!!item.es_material}
                                presupuestoId={presupuestoAEditar.id}
                              />
                            ) : (
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  checked={!!item.es_material}
                                  disabled={true}
                                />
                                <span className="text-xs text-muted-foreground">
                                  {item.es_material ? 'Material' : 'M.O.'}
                                </span>
                              </div>
                            )}
                          </TableCell>
                        )}

                        <TableCell>
                          <div className="flex space-x-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEditItemModal(index)}
                              disabled={isSubmitting}
                              title="Editar ítem"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil">
                                <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                <path d="m15 5 4 4" />
                              </svg>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveItem(index)}
                              disabled={isSubmitting}
                              title="Eliminar ítem"
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </form>
  )
}
