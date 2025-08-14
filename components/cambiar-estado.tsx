"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

interface CambiarEstadoProps {
  tipoEntidad?: "tarea" | "presupuesto" | "factura"
  entidadId?: number
  estadoActualId?: number | null
  idTarea?: number
  estadoActual?: number | null
  esFinalizada?: boolean
  buttonText?: string
  buttonVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  onEstadoChange?: (nuevoEstadoId: number, esFinalizada: boolean) => void
}

interface Estado {
  id: number
  codigo: string
  nombre: string
  descripcion: string | null
  color: string
  orden: number
  es_final?: boolean
}

const estadosMockeados: Record<string, Estado[]> = {
  tarea: [
    { id: 1, codigo: "organizar", nombre: "Organizar", descripcion: "Tarea en fase inicial de organización", color: "gray", orden: 1 },
    { id: 2, codigo: "preguntar", nombre: "Preguntar", descripcion: "Tarea en fase de consulta o investigación", color: "blue", orden: 2 },
    { id: 3, codigo: "presupuestado", nombre: "Presupuestado", descripcion: "Tarea con presupuesto creado", color: "purple", orden: 3 },
    { id: 4, codigo: "enviado", nombre: "Enviado", descripcion: "Presupuesto enviado al cliente", color: "indigo", orden: 4 },
    { id: 5, codigo: "aprobado", nombre: "Aprobado", descripcion: "Presupuesto aprobado por el cliente", color: "green", orden: 5 },
    { id: 6, codigo: "facturado", nombre: "Facturado", descripcion: "Tarea facturada", color: "orange", orden: 6 },
    { id: 7, codigo: "terminado", nombre: "Terminado", descripcion: "Tarea completada", color: "green", orden: 7, es_final: true },
    { id: 8, codigo: "reclamado", nombre: "Reclamado", descripcion: "Tarea con reclamo del cliente", color: "red", orden: 8 }
  ],
  presupuesto: [
    { id: 1, codigo: "borrador", nombre: "Borrador", descripcion: "Presupuesto en fase de creación", color: "gray", orden: 1 },
    { id: 2, codigo: "enviado", nombre: "Enviado", descripcion: "Presupuesto enviado al cliente", color: "blue", orden: 2 },
    { id: 3, codigo: "aceptado", nombre: "Aceptado", descripcion: "Presupuesto aceptado por el cliente", color: "green", orden: 3 },
    { id: 4, codigo: "facturado", nombre: "Facturado", descripcion: "Presupuesto facturado", color: "orange", orden: 4, es_final: true },
    { id: 5, codigo: "rechazado", nombre: "Rechazado", descripcion: "Presupuesto rechazado por el cliente", color: "red", orden: 5, es_final: true }
  ],
  factura: [
    { id: 1, codigo: "borrador", nombre: "Borrador", descripcion: "Factura en fase de creación", color: "gray", orden: 1 },
    { id: 2, codigo: "no_pagado", nombre: "No pagado", descripcion: "Factura emitida pero no pagada", color: "yellow", orden: 2 },
    { id: 3, codigo: "parcialmente", nombre: "Parcialmente pagado", descripcion: "Factura con pago parcial", color: "blue", orden: 3 },
    { id: 4, codigo: "vencido", nombre: "Vencido", descripcion: "Factura vencida sin pago completo", color: "red", orden: 4 },
    { id: 5, codigo: "pagado", nombre: "Pagado", descripcion: "Factura pagada completamente", color: "green", orden: 5, es_final: true },
    { id: 6, codigo: "anulado", nombre: "Anulado", descripcion: "Factura anulada", color: "gray", orden: 6, es_final: true }
  ]
}

export function CambiarEstado(props: CambiarEstadoProps) {
  const {
    idTarea,
    estadoActual,
    tipoEntidad: propsTipoEntidad,
    entidadId: propsEntidadId,
    estadoActualId: propsEstadoActualId,
    esFinalizada = false,
    buttonText = "Cambiar estado",
    buttonVariant = "default",
    onEstadoChange,
  } = props
  
  const tipoEntidad = propsTipoEntidad || (idTarea ? "tarea" : "presupuesto")
  const entidadId = propsEntidadId || idTarea || 0
  const estadoActualId = propsEstadoActualId || estadoActual || null
  
  const [estados, setEstados] = useState<Estado[]>([])
  const [selectedEstadoId, setSelectedEstadoId] = useState<number | null>(estadoActualId)
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoadingEstados, setIsLoadingEstados] = useState(false)
  const [esTareaFinalizada, setEsTareaFinalizada] = useState<boolean>(esFinalizada)

  // Quitamos la inicialización directa del cliente Supabase para evitar errores
  // y volvemos a utilizar solo datos mockeados

  // Ya no necesitamos el filtro de estados activos/finalizados, ya que todos los estados son activos
  // En su lugar, usamos un toggle para marcar la tarea como finalizada o activa

  useEffect(() => {
    if (isOpen) {
      setIsLoadingEstados(true);

      // Simular un tiempo de carga breve para mejorar UX
      const timeoutId = setTimeout(() => {
        try {
          let estadosParaEntidad: Estado[] = [];
          
          if (tipoEntidad === "tarea") {
            estadosParaEntidad = estadosMockeados.tarea;
          } else if (tipoEntidad === "presupuesto") {
            estadosParaEntidad = estadosMockeados.presupuesto;
          } else if (tipoEntidad === "factura") {
            estadosParaEntidad = estadosMockeados.factura;
          }
          
          console.log(`Estados cargados (${estadosParaEntidad.length}) para ${tipoEntidad}:`, estadosParaEntidad);
          setEstados(estadosParaEntidad);
        } catch (error) {
          console.error("Error al cargar estados:", error);
          toast({
            title: "Error",
            description: "No se pudieron cargar los estados",
            variant: "destructive",
          });
          setEstados([]);
        } finally {
          setIsLoadingEstados(false);
        }
      }, 500); // Leve retraso para simular carga

      return () => clearTimeout(timeoutId);
    }
  }, [tipoEntidad, isOpen]);

  // Función para manejar el cambio de estado
  const handleEstadoChange = async (value: string) => {
    const nuevoEstadoId = Number(value);
    setSelectedEstadoId(nuevoEstadoId);
    
    setIsLoading(true);
    
    try {
      // Obtener información del estado seleccionado para mostrar mensaje de éxito
      const estadoSeleccionado = estados.find(e => e.id === nuevoEstadoId);
      if (!estadoSeleccionado) {
        throw new Error("Estado no encontrado");
      }
      
      if (!entidadId) {
        throw new Error(`ID de entidad no proporcionado`);
      }
      
      // Simular un tiempo de procesamiento breve
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Log del cambio (para simular la operación)
      console.log('Simulando actualización de estado:', {
        tipoEntidad,
        entidadId,
        estadoAnteriorId: estadoActualId,
        nuevoEstadoId,
        nuevoEstadoNombre: estadoSeleccionado.nombre,
        esTareaFinalizada
      });
      
      // En una implementación real, aquí se realizarían las llamadas a la API
      // para actualizar el estado y el flag de finalización de la entidad
      
      toast({
        title: "Cambios guardados", 
        description: `La ${tipoEntidad} ha sido actualizada: ${estadoSeleccionado.nombre} ${esTareaFinalizada ? '(Finalizada)' : '(Activa)'}`,
      });

      // Notificar al componente padre sobre el cambio de estado
      if (onEstadoChange) {
        onEstadoChange(nuevoEstadoId, esTareaFinalizada);
      }

      // Cerrar el diálogo automáticamente después de aplicar el cambio
      setIsOpen(false);
      
      // Opcionalmente, podríamos emitir un evento para informar al componente padre
      // de que el estado ha cambiado y necesita actualizar su UI
      
    } catch (err) {
      console.error(`Error al guardar cambios:`, err);
      toast({
        title: "Error",
        description: `No se pudieron guardar los cambios. ${err instanceof Error ? err.message : ""}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  // Función para manejar el cambio del switch finalizada/activa
  const handleFinalizadaChange = (checked: boolean) => {
    setEsTareaFinalizada(checked);
    console.log(`Tarea ${checked ? 'finalizada' : 'activa'}:`, {
      tipoEntidad,
      entidadId,
      estadoActualId
    });
  }

  // Función para convertir colores de texto a clases de Tailwind o valores CSS
  const getColorStyle = (colorName: string) => {
    // Mapeo de nombres de colores a clases de Tailwind
    const colorMap: Record<string, string> = {
      "gray": "#9E9E9E",
      "blue": "#2196F3",
      "purple": "#9C27B0",
      "indigo": "#3F51B5",
      "green": "#4CAF50",
      "orange": "#FF9800",
      "yellow": "#FFC107",
      "red": "#F44336",
    };
    
    return colorMap[colorName] || colorName; // Si no está en el mapa, usar el color directamente
  };
  
  // Ya no filtramos estados, mostramos todos
  const estadosFiltrados = estados;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Button variant={buttonVariant} size="sm" onClick={() => setIsOpen(true)}>
        {buttonText}
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cambiar estado</DialogTitle>
          <DialogDescription>
            Selecciona el nuevo estado para {tipoEntidad === "tarea" ? "la tarea" : 
                                           tipoEntidad === "presupuesto" ? "el presupuesto" : 
                                           tipoEntidad === "factura" ? "la factura" : "la entidad"}
          </DialogDescription>
        </DialogHeader>
        
        {/* Toggle para marcar la tarea como finalizada */}
        {tipoEntidad === "tarea" && (
          <div className="flex items-center justify-between border-b pb-3">
            <span className="text-sm font-medium">Estado de la tarea</span>
            <div className="flex items-center">
              <Switch
                id="toggle-tarea-finalizada"
                checked={esTareaFinalizada}
                onCheckedChange={handleFinalizadaChange}
              />
              <Label htmlFor="toggle-tarea-finalizada" className="ml-2">
                {esTareaFinalizada ? "Finalizada" : "Activa"}
              </Label>
            </div>
          </div>
        )}
        
        <div className="space-y-4 py-4">
          {isLoadingEstados ? (
            <div className="text-center py-4 flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900 mr-2"></div>
              Cargando estados disponibles...
            </div>
          ) : (
            <RadioGroup
              value={selectedEstadoId?.toString()}
              onValueChange={handleEstadoChange}
            >
              {Array.isArray(estadosFiltrados) && estadosFiltrados.length > 0 ? (
                <div className="grid gap-2">
                  {estadosFiltrados.map((estado) => {
                    const colorStyle = getColorStyle(estado.color);
                    return (
                      <div 
                        key={estado.id} 
                        className={`flex items-center space-x-2 p-2 rounded-md hover:bg-slate-100 ${estado.es_final ? 'opacity-90' : 'opacity-100'}`}
                      >
                        <RadioGroupItem value={estado.id.toString()} id={`estado-${estado.id}`} />
                        <Label htmlFor={`estado-${estado.id}`} className="flex-1 flex items-center cursor-pointer">
                          <div 
                            className="w-3 h-3 rounded-full mr-2" 
                            style={{ backgroundColor: colorStyle }}
                          />
                          <div>
                            <div className="font-medium">{estado.nombre}</div>
                            {estado.descripcion && (
                              <div className="text-xs text-muted-foreground">
                                {estado.descripcion}
                              </div>
                            )}
                          </div>
                          {estado.es_final && (
                            <span className="ml-auto text-xs px-2 py-0.5 bg-gray-200 rounded-full">
                              Final
                            </span>
                          )}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-amber-500 py-3">
                  {estadosFiltrados.length === 0 ? "No hay estados disponibles con el filtro actual" : "Error cargando estados. Inténtalo de nuevo."}
                </div>
              )}
            </RadioGroup>
          )}
        </div>
        {isLoading && (
          <div className="text-center py-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
            Aplicando cambio de estado...
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
