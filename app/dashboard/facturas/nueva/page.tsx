"use client"

import React, { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase-client"
import { DashboardShell } from "@/components/dashboard-shell"
import { toast } from "sonner"
import { EstadoInteractivo } from "@/components/estado-interactivo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ItemFacturaModal } from "@/components/item-factura-modal"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { CalendarIcon, Loader2, Check, AlertCircle, X, Plus } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

// Definición de interfaces
interface Cliente {
  id: number
  nombre: string
  empresa: string
  email: string
  telefono: string
  direccion: string
}

interface Tarea {
  id: number;
  titulo: string;
  id_edificio?: number;
}

interface Item {
  id: number
  descripcion: string
  cantidad: number
  precio: number
  id_tarea?: number
  tareas?: Tarea | null
  id_presupuesto?: number
  es_mano_obra?: boolean
  producto_id?: string
  es_producto?: boolean
  code?: string
  isNew?: boolean
}

interface PresupuestoBase {
  id: number;
  total: number;
  codigo: string;
}

interface PresupuestoFinal {
  id: number;
  id_presupuesto_base: number;
  cliente_id?: number;
  cliente?: Cliente;
  total: number;
  id_administrador?: number;
  tiene_ajustes?: boolean;
  codigo?: string;
  items?: Item[];
  presupuesto_base?: PresupuestoBase;
  created_at?: string;
}

interface EstadoFactura {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  color: string;
  orden: number;
}

// Modalidades de pago disponibles
type ModalidadPago = "total" | "mitad" | "ajustable";

// Componente que contiene la lógica principal
function FacturaContent(): JSX.Element {
  const router = useRouter()
  const searchParams = useSearchParams()
  const presupuestoFinalId = searchParams.get("presupuesto_final_id")
  
  // Estados para el formulario
  const [datosPresupuesto, setDatosPresupuesto] = useState<PresupuestoFinal | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState("")
  const [guardando, setGuardando] = useState(false)
  const [estadosFactura, setEstadosFactura] = useState<EstadoFactura[]>([])
  const [estadoSeleccionado, setEstadoSeleccionado] = useState<number>(1) // Borrador por defecto
  const [numeroFactura, setNumeroFactura] = useState<string>("") // Campo datos_afip
  const [fechaVencimiento, setFechaVencimiento] = useState<Date>(new Date(new Date().setDate(new Date().getDate() + 30)))
  const [notas, setNotas] = useState<string>("") 
  const [items, setItems] = useState<Item[]>([])
  const [nextFacturaCode, setNextFacturaCode] = useState<string>("") // Para generar código secuencial
  const [tieneManoObra, setTieneManoObra] = useState<boolean>(false)
  
  // Estados para el modal de ítems
  const [itemModalOpen, setItemModalOpen] = useState<boolean>(false)
  const [editingItem, setEditingItem] = useState<Item | undefined>(undefined)
  
  const supabase = createClient()
  
  console.log("[FacturaNueva] Componente content renderizado. presupuestoFinalId:", presupuestoFinalId)
  
  useEffect(() => {
    console.log("[FacturaNueva] useEffect ejecutándose")
    
    async function cargarDatosPresupuesto() {
      if (!presupuestoFinalId) {
        setCargando(false)
        return
      }
      
      try {
        // Paso 1: Obtenemos el presupuesto final
        const { data: presupuestoData, error: presupuestoError } = await supabase
          .from("presupuestos_finales")
          .select("*")
          .eq("id", presupuestoFinalId)
          .single();
          
        if (presupuestoError) {
          console.error("[Carga Presupuesto] Error al cargar presupuesto final:", presupuestoError);
          throw presupuestoError;
        }
        
        // Convertimos la respuesta a nuestro tipo PresupuestoFinal
        const presupuestoFinal = presupuestoData as unknown as PresupuestoFinal;
        console.log("Datos del presupuesto_final cargado:", presupuestoFinal) // Log para ver el objeto completo
        
        // Paso 2: Si el presupuesto tiene cliente_id, cargamos los datos del cliente
        let datosCliente: Cliente | undefined = undefined
        if (presupuestoFinal?.cliente_id) {
          const { data: clienteData, error: clienteError } = await supabase
            .from("clientes")
            .select("*")
            .eq("id", presupuestoFinal.cliente_id)
            .single();
            
          if (clienteError) {
            console.warn("[Carga Cliente] Advertencia al cargar cliente:", clienteError); // Usamos warn ya que podría ser opcional
          } else if (clienteData) {
            datosCliente = clienteData as unknown as Cliente;
          }
        }
        
        // Paso 3: Cargamos los items del presupuesto si existen
        let itemsCargados: Item[] = []
        try {
          // Nueva lógica: Los ítems se cargan desde la tabla 'items' usando el presupuestoFinalId directamente.
          if (presupuestoFinalId) { // Usamos el ID del presupuesto final de la URL
            console.log(`[Carga Items] Intentando cargar ítems desde la tabla 'items' para presupuesto_final_id: ${presupuestoFinalId}`);
            
            const { data: itemsData, error: itemsError } = await supabase
              .from("items") // Consultar la tabla 'items'
              .select("*")
              .eq("id_presupuesto", presupuestoFinalId); // Filtrar por 'id_presupuesto' = presupuestoFinalId

            if (itemsError) {
              console.error("[Carga Items] Error al buscar en tabla 'items':", itemsError);
            } else if (itemsData && itemsData.length > 0) {
              console.log("[Carga Items] Items encontrados en tabla 'items':", itemsData);
              itemsCargados = itemsData as Item[];
            } else {
              console.log("[Carga Items] La consulta a 'items' no devolvió datos (puede ser un array vacío).");
            }
          }

          if (itemsCargados.length === 0) {
            console.log("No se encontraron ítems para este presupuesto final en ninguna de las tablas consultadas.")
          }
          
          // Verificar si hay items de mano de obra
          const hayManoDeObra = itemsCargados.some(item => item.es_mano_obra === true)
          setTieneManoObra(hayManoDeObra)

        } catch (error) {
          console.error("Error general al cargar items del presupuesto:", error)
          toast.error("Error al cargar ítems: No se pudieron cargar los ítems del presupuesto.")
          itemsCargados = [] // Asegurarse de que esté vacío en caso de error
        }
        
        // Paso 4: Cargamos los estados de facturas
        const estadosRes = await supabase
          .from("estados_facturas")
          .select("*")
          .order("orden", { ascending: true })
          
        if (!estadosRes.error && estadosRes.data) {
          setEstadosFactura(estadosRes.data as unknown as EstadoFactura[])
        }
        
        // Paso 5: Generamos el nuevo código de factura (secuencial)
        let codigoFacturaGenerado = "fac000001"; // Usar una variable diferente para el estado

        try {
          console.log("Intentando obtener códigos de factura existentes...");
          const { data: facturasExistentes, error: errorFacturas } = await supabase
            .from("facturas")
            .select("code") as { data: Array<{ code: string | null }> | null; error: any }; // Solo necesitamos el código, sin order

          if (errorFacturas) {
            console.error("Error al obtener códigos de factura:", errorFacturas);
            // No lanzamos error aquí, permitimos que se use el código por defecto
          } else if (facturasExistentes && facturasExistentes.length > 0) {
            console.log(`Se encontraron ${facturasExistentes.length} facturas existentes.`);
            const numerosDeFactura = facturasExistentes
              .map((factura: { code: string | null }) => factura.code)
              .filter((codigo): codigo is string => typeof codigo === 'string' && codigo.startsWith("fac"))
              .map((codigo: string) => parseInt(codigo.substring(3), 10))
              .filter((numero: number) => !isNaN(numero));

            if (numerosDeFactura.length > 0) {
              const ultimoNumero = Math.max(...numerosDeFactura);
              codigoFacturaGenerado = `fac${(ultimoNumero + 1).toString().padStart(6, '0')}`;
              console.log(`Último número de factura encontrado: ${ultimoNumero}. Nuevo código generado: ${codigoFacturaGenerado}`);
            } else {
              console.log("No se encontraron códigos de factura válidos para generar el siguiente. Se usará el predeterminado.");
            }
          } else {
            console.log("No hay facturas existentes. Se usará el código predeterminado.");
          }
        } catch (errCatch) {
          console.error("Excepción en el bloque try-catch para generar código de factura:", errCatch);
        }
        // Actualizamos el estado con el código generado
        setNextFacturaCode(codigoFacturaGenerado);
        
        // Combinamos los datos finales del presupuesto
        const datosCompletosPresupuesto: PresupuestoFinal = {
          ...presupuestoFinal,
          cliente: datosCliente,
          items: itemsCargados
        }
        
        // Actualizamos el estado con todos los datos cargados
        setItems(itemsCargados) // Aseguramos que el estado 'items' también se actualice aquí
        setDatosPresupuesto(datosCompletosPresupuesto)
        setCargando(false)
      } catch (error) {
        console.error("Error al cargar datos del presupuesto:", error)
        setError("Error al cargar datos del presupuesto")
        setCargando(false)
      }
    }
    cargarDatosPresupuesto()
  }, [presupuestoFinalId, supabase])

  // Función para procesar el envío del formulario
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setGuardando(true)

    try {
      if (!datosPresupuesto) {
        throw new Error('No se han cargado los datos del presupuesto')
      }

      // Verificación de integridad de datos
      if (!datosPresupuesto.id_presupuesto_base) {
        throw new Error(
          'Error de datos: El presupuesto final no tiene un presupuesto base asociado.'
        )
      }

      // 1. Verificar que tengamos el id_administrador desde el presupuesto final
      if (!datosPresupuesto.id_administrador) {
        throw new Error(
          'Error de datos: El presupuesto final no tiene un administrador asociado.'
        )
      }

      // 2. Recalcular el total basado en los ítems actuales en el estado
      const totalCalculado = items.reduce(
        (sum, item) => sum + item.cantidad * item.precio,
        0
      )

      // Preparar datos para la nueva factura
      const nuevaFactura = {
        id_presupuesto_final: datosPresupuesto.id,
        id_presupuesto: datosPresupuesto.id_presupuesto_base,
        monto_total: totalCalculado, // Corregido: usar monto_total
        id_estado_nuevo: estadoSeleccionado,
        datos_afip: numeroFactura || null,
        id_administrador: datosPresupuesto.id_administrador, // Usar el ID del presupuesto
      }

      // Insertar la factura
      // La siguiente consulta puede marcar un error de lint, pero es la forma correcta
      // de insertar y devolver el registro según la documentación de Supabase.
      // @ts-ignore - Suprimimos el falso positivo del linter.
      const { data: facturaInsertada, error } = await supabase
        .from('facturas')
        .insert(nuevaFactura)
        .select()
        .single()

      if (error) throw error

      if (!facturaInsertada) {
        throw new Error('No se pudo obtener la factura insertada')
      }

      // Asociar ítems a la factura
      if (items && items.length > 0) {
        const itemsFactura = items.map(item => ({
          id_factura: facturaInsertada.id,
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precio_unitario: item.precio,
          subtotal_item: item.cantidad * item.precio, // Guardar en la columna correcta
        }))
        const { error: errorItems } = await supabase
          .from('items_factura')
          .insert(itemsFactura)

        if (errorItems) throw errorItems
      }

      toast.success('Factura creada exitosamente')
      router.push('/dashboard/facturas')
    } catch (error) {
      console.error('Error al guardar la factura:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Ocurrió un error desconocido.'
      toast.error(`Error al guardar la factura: ${errorMessage}`)
    } finally {
      setGuardando(false)
    }
  }
  
  const handleDeleteItem = (itemIdToDelete: number) => {
    setItems(prevItems => prevItems.filter(item => item.id !== itemIdToDelete));
    toast.info("Ítem eliminado de la factura");
  };

  // Función eliminada - Ya no usamos la edición en línea
  
  // Función para abrir el modal para añadir un nuevo ítem
  const handleAddItemModal = () => {
    setEditingItem(undefined);
    setItemModalOpen(true);
  };
  
  // Función para abrir el modal para editar un ítem existente
  const handleEditItemModal = (item: Item) => {
    setEditingItem({
      ...item,
      isNew: false
    });
    setItemModalOpen(true);
  };
  
  // Función para guardar un ítem desde el modal
  const handleSaveItemFromModal = (itemData: Omit<Item, "id">) => {
    if (editingItem) {
      // Actualizar ítem existente
      setItems(prevItems =>
        prevItems.map(item =>
          item.id === editingItem.id ? { ...item, ...itemData } : item
        )
      );
      toast.success("Ítem actualizado correctamente");
    } else {
      // Añadir nuevo ítem
      const newItem: Item = {
        id: Date.now(),
        ...itemData
      };
      setItems(prevItems => [...prevItems, newItem]);
      toast.success("Ítem añadido correctamente");
    }
    
    // Verificamos si hay ítems de mano de obra
    // Usamos !! para convertir cualquier valor posiblemente undefined a booleano
    const hayManoDeObra = items.some(item => !!item.es_mano_obra) || !!itemData.es_mano_obra;
    setTieneManoObra(hayManoDeObra);
  };

  // Función eliminada - Ya no usamos la edición en línea

  // Calcular subtotal de ítems
  const subtotalItems = items && items.length > 0 
    ? items.reduce((sum, item) => {
        return sum + (item.cantidad * item.precio)
      }, 0)
    : 0
    
  // Renderización del componente con UI de formulario
  return (
    <div className="flex-1 space-y-6">
      {/* Botones de acción */}
      <div className="flex items-center justify-end space-x-2">
        <Button variant="outline" onClick={() => router.back()}>Cancelar</Button>
        <Button 
          onClick={handleSubmit} 
          disabled={guardando || cargando || !!error}
        >
          {guardando ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Guardar Factura
            </>
          )}
        </Button>
      </div>
      
      {error && (
        <Card className="border-red-500">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
            <Button 
              variant="outline" 
              className="mt-4" 
              onClick={() => router.back()}
            >
              Volver
            </Button>
          </CardContent>
        </Card>
      )}
      
      {cargando ? (
        <div className="flex h-[400px] w-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Datos Principales</CardTitle>
              <CardDescription>
                Información básica de la factura
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código de Factura</Label>
                  <Input 
                    id="codigo" 
                    value={nextFacturaCode} 
                    readOnly
                    className="bg-muted"
                  />
                  <p className="text-sm text-muted-foreground">Generado automáticamente</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="numero_afip">Número de Factura AFIP</Label>
                  <Input 
                    id="numero_afip" 
                    value={numeroFactura} 
                    onChange={(e) => setNumeroFactura(e.target.value)}
                    placeholder="Ej: A-0001-00001234"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fecha_vencimiento">Fecha de Vencimiento</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="fecha_vencimiento"
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !fechaVencimiento && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {fechaVencimiento ? (
                          format(fechaVencimiento, "PPP", { locale: es })
                        ) : (
                          <span>Seleccione una fecha</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={fechaVencimiento}
                        onSelect={(date) => date && setFechaVencimiento(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Estado de Factura</CardTitle>
                <CardDescription>Seleccione el estado inicial</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {estadosFactura.map((estado) => (
                    <Button
                      key={estado.id}
                      type="button"
                      variant={estadoSeleccionado === estado.id ? "default" : "outline"}
                      onClick={() => setEstadoSeleccionado(estado.id)}
                      className={`${estadoSeleccionado === estado.id ? `bg-${estado.color}-500` : ''}`}
                    >
                      {estado.nombre}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Items de factura */}
          <Card>
            <CardHeader>
              <CardTitle>Ítems de la Factura</CardTitle>
              <CardDescription>
                Ítems asociados al presupuesto que se facturarán
              </CardDescription>
            </CardHeader>
            <CardContent>
              {items && items.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 text-left font-medium">Descripción</th>
                        <th className="py-2 text-right font-medium">Cantidad</th>
                        <th className="py-2 text-right font-medium">Precio Unit.</th>
                        <th className="py-2 text-right font-medium">Subtotal</th>
                        <th className="py-2 text-center font-medium">Mano de Obra</th>
                        <th className="py-2 text-center font-medium">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(item => (
                        <tr key={item.id} className="border-b">
                          <td className="py-2">
                            {item.descripcion}
                          </td>
                          <td className="py-2 text-right">
                            {item.cantidad}
                          </td>
                          <td className="py-2 text-right">
                            {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(item.precio)}
                          </td>
                          <td className="py-2 text-right">
                            {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(item.cantidad * item.precio)}
                          </td>
                          <td className="py-2 text-center">
                            {item.es_mano_obra && <Check className="h-4 w-4 mx-auto" />}
                          </td>
                          <td className="py-2 text-center">
                            <div className="flex justify-center space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditItemModal(item)}
                                  aria-label="Editar ítem"
                                >
                                  <span className="sr-only">Editar</span>
                                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                                    <path d="M11.8536 1.14645C11.6583 0.951184 11.3417 0.951184 11.1465 1.14645L3.71455 8.57836C3.62459 8.66832 3.55263 8.77461 3.50251 8.89155L2.04044 12.303C1.9599 12.491 2.00189 12.709 2.14646 12.8536C2.29103 12.9981 2.50905 13.0401 2.69697 12.9596L6.10847 11.4975C6.2254 11.4474 6.3317 11.3754 6.42166 11.2855L13.8536 3.85355C14.0488 3.65829 14.0488 3.34171 13.8536 3.14645L11.8536 1.14645ZM4.42166 9.28547L11.5 2.20711L12.7929 3.5L5.71455 10.5784L4.21924 11.2192L3.78081 10.7808L4.42166 9.28547Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                                  </svg>
                                </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteItem(item.id)}
                                aria-label="Eliminar ítem"
                              >
                                <X className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3} className="py-2 text-right font-bold">Total:</td>
                        <td className="py-2 text-right font-bold">
                          {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(subtotalItems)}
                        </td>
                        <td></td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="text-center p-4 text-muted-foreground">
                  No hay ítems para mostrar
                </div>
              )}
              <div className="mt-4 flex justify-start">
                <Button type="button" variant="default" onClick={handleAddItemModal}>
                  <Plus className="mr-2 h-4 w-4" />
                  Añadir Ítem
                </Button>
              </div>
              
              {/* Modal para añadir/editar ítems */}
              <ItemFacturaModal
                open={itemModalOpen}
                setOpen={setItemModalOpen}
                onSave={handleSaveItemFromModal}
                editingItem={editingItem}
              />
              
              {tieneManoObra && (
                <div className="mt-4 p-3 rounded-md bg-blue-50 border border-blue-200">
                  <p className="text-sm text-blue-700">
                    Este presupuesto incluye ítems de mano de obra que podrían tener ajustes.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notas */}
          <Card>
            <CardHeader>
              <CardTitle>Notas</CardTitle>
              <CardDescription>Información adicional para la factura</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea 
                placeholder="Ingrese información adicional o notas para la factura..."
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  )
}

// Componente principal exportado
export default function NuevaFacturaPage() {
  return (
    <FacturaContent />
  )
}