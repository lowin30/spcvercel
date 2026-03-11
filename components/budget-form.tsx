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
import { EsMaterialCheckbox } from "@/app/dashboard/facturas/[id]/es-material-checkbox"
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
  idTarea?: string | number
  presupuestoBase?: PresupuestoBase | any
  itemsBase?: Item[]
  presupuestoAEditar?: PresupuestoFinal | PresupuestoBase | any // Añadimos para modo edición
  // v93.9: Bridge Protocol Injection
  initialData?: any
  userId?: string
  listas?: {
    administradores: any[]
    edificios: any[]
    productos: any[]
  }
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
  initialData,
  userId,
  listas,
}: BudgetFormProps) {

  const [aprobado, setAprobado] = useState(presupuestoAEditar?.aprobado || false);
  const [selectedTarea, setSelectedTarea] = useState(idTarea || tareaSeleccionada?.id?.toString() || "")
  const [items, setItems] = useState<Item[]>(itemsBase || [])

  // Estados para la selección en cascada de administrador-edificio
  const [administradores, setAdministradores] = useState<any[]>(listas?.administradores || [])
  const [edificios, setEdificios] = useState<any[]>(listas?.edificios || [])
  const [selectedAdministrador, setSelectedAdministrador] = useState<string>(initialData?.id_administrador?.toString() || presupuestoAEditar?.id_administrador?.toString() || "")
  const [selectedEdificio, setSelectedEdificio] = useState<string>(initialData?.id_edificio?.toString() || presupuestoAEditar?.id_edificio?.toString() || "")
  const [loadingEdificios, setLoadingEdificios] = useState<boolean>(false)
  const [isMounted, setIsMounted] = useState(false)

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

  // Hydration safety v94.1
  useEffect(() => {
    setIsMounted(true)
  }, [])


  // Estados para el modal de ítems
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null)

  const { supabase } = useSupabase()
  const { toast } = useToast()
  const router = useRouter()

  // Sincronizar listas inyectadas (v94.1) e hidratar estados iniciales
  useEffect(() => {
    if (listas) {
      setAdministradores(listas.administradores);
      // Sincronizar edificios filtrados si hay un admin seleccionado
      if (selectedAdministrador) {
        const filtrados = listas.edificios.filter(e => e.id_administrador?.toString() === selectedAdministrador);
        if (filtrados.length > 0) {
          setEdificios(filtrados);
        } else {
          setEdificios(listas.edificios);
        }
      } else {
        setEdificios(listas.edificios);
      }
    }
  }, [listas, selectedAdministrador]);


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

        // identificar mano de obra basado en las palabras clave en la descripcion
        const esManoDeObra = [
          'mano de obra',
          'm.o',
          'mano obra',
          'instalacion',
          'servicio',
          'montaje',
          'montado',
          'colocacion'
        ].some(keyword => descripcionLower.includes(keyword))

        // identificar materiales basado en palabras clave
        const esMaterial = [
          'material',
          'materiales',
          'suministro',
          'insumo',
          'equipo',
          'herramienta'
        ].some(keyword => descripcionLower.includes(keyword))

        // decision final basada en prioridades:
        // 1. si explicitamente menciona mano de obra, es mano de obra
        // 2. si explicitamente menciona material, es material
        // 3. si tiene producto_id y no menciona mano de obra, es material
        // 4. en cualquier otro caso, es mano de obra
        if (esManoDeObra) {
          acc.mano_obra += itemTotal
        } else if (esMaterial || !!item.producto_id) {
          acc.materiales += itemTotal
        } else {
          // por defecto, si no tiene ninguna palabra clave, sigue la logica antigua
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

  // Extraer totales para uso en el renderizado v94.1
  const { total, materiales: totalMaterialesItems, mano_obra: totalManoObraItems } = calculateTotals();


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
          // Hardened Fallback: Unificando la fuente de verdad.
          id_presupuesto_base: initialData?.id_presupuesto_base || presupuestoBase?.id || (idPadre ? Number(idPadre) : (presupuestoAEditar && 'id_presupuesto_base' in presupuestoAEditar ? presupuestoAEditar.id_presupuesto_base : null)),
          materiales,
          mano_obra,
          total,
          total_base: presupuestoBase ? presupuestoBase.materiales + presupuestoBase.mano_obra : (presupuestoAEditar && 'total_base' in presupuestoAEditar ? (presupuestoAEditar as any).total_base : 0),
          ajuste_admin: presupuestoAEditar && 'ajuste_admin' in presupuestoAEditar ? (presupuestoAEditar as any).ajuste_admin : 0,
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
      // God Mode: Asegurar que es_material esté bien seteado antes de subir
      const itemsProcesados = items.map(item => {
        const desc = item.descripcion.toLowerCase();
        const esMaterialAuto = [
          'material', 'materiales', 'suministro', 'insumo', 'equipo', 'herramienta'
        ].some(k => desc.includes(k)) || !!item.producto_id;

        return {
          ...item,
          es_material: item.es_material !== undefined ? item.es_material : esMaterialAuto
        };
      });

      const res = await saveBudgetAction({
        tipo,
        budgetData: budgetPayload,
        items: itemsProcesados,
        isEditing: !!presupuestoAEditar,
        budgetId: presupuestoAEditar?.id
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
          router.push('/dashboard/presupuestos-finales');
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
    <form onSubmit={handleSubmit} className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* COLUMNA IZQUIERDA: INFORMACION Y ITEMS (8/12 en LP, Full en Mobile) */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-primary/10 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4">
              <CardTitle className="text-lg">
                informacion del presupuesto
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">

              {/* BLOQUE DE IDENTIDAD (TAREA Y EDIFICIO) */}
              {tipo === "base" ? (
                <div className="space-y-2">
                  <Label htmlFor="tarea" className="text-xs uppercase text-muted-foreground tracking-tighter">tarea *</Label>
                  {tareaSeleccionada ? (
                    <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                      <p className="font-bold text-base leading-snug">
                        {tareaSeleccionada.code} - {tareaSeleccionada.titulo}
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {tareaSeleccionada.edificios?.nombre || (tareaSeleccionada.id_edificio ? `edificio id: ${tareaSeleccionada.id_edificio}` : 'edificio no especificado')}
                      </p>
                    </div>
                  ) : (
                    <Select value={selectedTarea?.toString()} onValueChange={setSelectedTarea} disabled={isSubmitting} required>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="selecciona una tarea" />
                      </SelectTrigger>
                      <SelectContent>
                        {tareas?.map((tarea) => (
                          <SelectItem key={tarea.id} value={tarea.id.toString()}>
                            {tarea.code} - {tarea.titulo} ({tarea.edificios?.nombre || (tarea.id_edificio ? `id: ${tarea.id_edificio}` : '')})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-muted/40 rounded-xl border border-primary/10 shadow-inner">
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 block">tarea vinculada</Label>
                    <p className="font-bold text-lg leading-tight text-foreground">
                      {presupuestoBase?.titulo_tarea || presupuestoAEditar?.titulo_tarea || presupuestoBase?.tareas?.titulo || 'titulo no disponible'}
                    </p>
                    <p className="text-sm font-medium text-primary/80 mt-1 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      {presupuestoBase?.nombre_edificio || presupuestoAEditar?.nombre_edificio || presupuestoBase?.edificios?.nombre || 'edificio no especificado'}
                    </p>
                  </div>

                  {/* Detalle del Presupuesto Base - MAS COMPACTO */}
                  <div className="grid grid-cols-2 gap-3 p-3 bg-background border rounded-lg shadow-sm">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase text-muted-foreground">materiales base</span>
                      <span className="font-semibold text-sm">{formatCurrency(presupuestoBase?.materiales || 0)}</span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[10px] uppercase text-muted-foreground">mano obra base</span>
                      <span className="font-semibold text-sm">{formatCurrency(presupuestoBase?.mano_obra || 0)}</span>
                    </div>
                  </div>

                  {/* REQUISITO: NOTA DEL PRESUPUESTO BASE */}
                  {presupuestoBase?.nota_pb && (
                    <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/40" />
                      <Label className="text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1 block ml-2">instrucciones del presupuesto base</Label>
                      <p className="text-sm italic text-muted-foreground leading-relaxed ml-2 px-1">
                        "{presupuestoBase.nota_pb}"
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Selectores Cascada (Solo si no hay contexto) */}
              {(!presupuestoAEditar && !presupuestoBase) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="administrador">administrador</Label>
                    <Select value={selectedAdministrador} onValueChange={(value) => {
                      setSelectedAdministrador(value);
                      cargarEdificiosPorAdministrador(value);
                      setSelectedEdificio("");
                    }} disabled={isSubmitting}>
                      <SelectTrigger><SelectValue placeholder="selecciona un administrador" /></SelectTrigger>
                      <SelectContent>
                        {listas?.administradores.map((admin) => (
                          <SelectItem key={admin.id} value={admin.id.toString()}>{admin.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edificio">edificio</Label>
                    <Select value={selectedEdificio} onValueChange={setSelectedEdificio} disabled={isSubmitting || !selectedAdministrador || loadingEdificios}>
                      <SelectTrigger>
                        {loadingEdificios ? <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> cargando...</span> : <SelectValue placeholder="selecciona un edificio" />}
                      </SelectTrigger>
                      <SelectContent>
                        {edificios.map((ed) => (
                          <SelectItem key={ed.id} value={ed.id.toString()}>{ed.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* SECCION ITEMS */}
              <div className="pt-4 border-t space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">items del presupuesto</h3>
                  <Button type="button" onClick={handleOpenAddItemModal} disabled={isSubmitting} size="sm" className="gap-1.5 rounded-full shadow-lg">
                    <Plus className="h-4 w-4" /> añadir item
                  </Button>
                </div>

                <div className="rounded-xl border bg-background/50 overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-muted/50 text-[10px] uppercase font-bold">
                      <TableRow>
                        <TableHead className="py-2 h-auto">descripcion</TableHead>
                        <TableHead className="text-right py-2 h-auto">cant.</TableHead>
                        <TableHead className="text-right py-2 h-auto">total</TableHead>
                        <TableHead className="w-[40px] py-2 h-auto"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic">
                            presiona añadir item para comenzar
                          </TableCell>
                        </TableRow>
                      ) : (
                        items.map((item, index) => (
                          <TableRow key={index} className="group hover:bg-muted/30 transition-colors">
                            <TableCell className="py-3">
                              <div className="font-medium text-sm leading-snug">{item.descripcion}</div>
                              {item.es_material && <Badge className="mt-1 text-[9px] h-4 py-0 bg-primary/10 text-primary border-none">material</Badge>}
                            </TableCell>
                            <TableCell className="text-right py-3 text-sm">{item.cantidad}</TableCell>
                            <TableCell className="text-right py-3 font-semibold text-sm">{formatCurrency(item.cantidad * item.precio)}</TableCell>
                            <TableCell className="py-3 px-1">
                              <div className="flex flex-col gap-1">
                                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleOpenEditItemModal(index)}>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                                </Button>
                                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleRemoveItem(index)}>
                                  <Trash className="h-14 w-14" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* COLUMNA DERECHA: RESUMEN Y ACCIONES (Sticky en Desktop) */}
        <div className="lg:col-span-4 lg:sticky lg:top-6 space-y-6">
          <Card className="border-primary/20 bg-primary/[0.02] shadow-xl overflow-hidden">
            <CardHeader className="pb-2 border-b">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">resumen final</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">observaciones / notas</Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="notas para el cliente o detalles adicionales..."
                  disabled={isSubmitting}
                />
              </div>

              {presupuestoAEditar && tipo === 'final' && (
                <div className="flex items-center space-x-2 p-2 bg-muted/50 rounded-lg">
                  <Checkbox id="aprobado" checked={aprobado} onCheckedChange={(checked) => setAprobado(Boolean(checked))} />
                  <Label htmlFor="aprobado" className="text-sm font-medium">presupuesto aprobado</Label>
                </div>
              )}

              <div className="p-4 bg-muted/30 rounded-xl space-y-2 border shadow-inner">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>mano de obra</span>
                  <span>{formatCurrency(calculateTotals().mano_obra)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>materiales</span>
                  <span>{formatCurrency(calculateTotals().materiales)}</span>
                </div>
                <div className="pt-4 border-t flex justify-between items-end">
                  <span className="font-bold text-sm">TOTAL FINAL</span>
                  <span className="text-2xl font-black text-primary tracking-tight">
                    {formatCurrency(calculateTotals().total)}
                  </span>
                </div>
              </div>

              <Button type="submit" className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/20 rounded-xl" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                {presupuestoAEditar ? 'guardar cambios' : 'crear presupuesto final'}
              </Button>
            </CardContent>
          </Card>

          {/* Modal Items (Inyectado via portal o inline) */}
          <ItemPresupuestoModal
            open={isModalOpen}
            setOpen={setIsModalOpen}
            onSave={handleSaveItemFromModal}
            editingItem={editingItemIndex !== null ? items[editingItemIndex] : { ...newItem, precio: typeof newItem.precio === 'string' ? parseFloat(newItem.precio) || 0 : newItem.precio }}
            productosInyectados={listas?.productos}
          />
        </div>
      </div>
    </form>
  )
}
