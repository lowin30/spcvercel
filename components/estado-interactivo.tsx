"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { createBrowserSupabaseClient } from "@/lib/supabase-client"

interface Estado {
  id: number
  codigo: string
  nombre: string
  descripcion: string | null
  color: string
  orden: number

}

// Los estados se cargarán desde Supabase
// const estadosMockeados: Record<string, Estado[]> = {
//   tarea: [
//     { id: 1, codigo: "organizar", nombre: "Organizar", descripcion: "Fase inicial de la tarea", color: "gray", orden: 1 },
//     { id: 2, codigo: "preguntar", nombre: "Preguntar", descripcion: "Fase de consulta e investigación", color: "blue", orden: 2 },
//     { id: 3, codigo: "presupuestado", nombre: "Presupuestado", descripcion: "Tarea con presupuesto creado", color: "purple", orden: 3 },
//     { id: 4, codigo: "enviado", nombre: "Enviado", descripcion: "Presupuesto enviado al cliente", color: "indigo", orden: 4 },
//     { id: 5, codigo: "aprobado", nombre: "Aprobado", descripcion: "Presupuesto aprobado por el cliente", color: "green", orden: 5 },
//     { id: 6, codigo: "facturado", nombre: "Facturado", descripcion: "Tarea facturada", color: "orange", orden: 6 },
//     { id: 7, codigo: "terminado", nombre: "Terminado", descripcion: "Tarea completada", color: "green", orden: 7, es_final: true },
//     { id: 8, codigo: "reclamado", nombre: "Reclamado", descripcion: "Con reclamo del cliente", color: "red", orden: 8 }
//   ],
//   presupuesto: [
//     { id: 1, codigo: "borrador", nombre: "Borrador", descripcion: "Presupuesto en borrador", color: "blue", orden: 1 },
//     { id: 2, codigo: "enviado", nombre: "Enviado", descripcion: "Presupuesto enviado al cliente", color: "yellow", orden: 2 },
//     { id: 3, codigo: "en_revision", nombre: "En Revisión", descripcion: "Presupuesto en revisión por el cliente", color: "orange", orden: 3 },
//     { id: 4, codigo: "aprobado", nombre: "Aprobado", descripcion: "Presupuesto aprobado", color: "green", orden: 4 },
//     { id: 5, codigo: "rechazado", nombre: "Rechazado", descripcion: "Presupuesto rechazado", color: "red", orden: 5, es_final: true },
//     { id: 6, codigo: "vencido", nombre: "Vencido", descripcion: "Presupuesto vencido", color: "gray", orden: 6, es_final: true }
//   ],
//   factura: [
//     { id: 1, codigo: "emitida", nombre: "Emitida", descripcion: "Factura emitida", color: "blue", orden: 1 },
//     { id: 2, codigo: "no_pagado", nombre: "No pagado", descripcion: "Factura emitida pero no pagada", color: "yellow", orden: 2 },
//     { id: 3, codigo: "parcialmente", nombre: "Parcialmente pagado", descripcion: "Factura con pago parcial", color: "blue", orden: 3 },
//     { id: 4, codigo: "vencido", nombre: "Vencido", descripcion: "Factura vencida sin pago completo", color: "red", orden: 4 },
//     { id: 5, codigo: "pagado", nombre: "Pagado", descripcion: "Factura pagada completamente", color: "green", orden: 5, es_final: true },
//     { id: 6, codigo: "anulado", nombre: "Anulado", descripcion: "Factura anulada", color: "gray", orden: 6, es_final: true }
//   ]
// }

interface EstadoInteractivoProps {
  tipoEntidad: "tarea" | "presupuesto" | "factura"
  entidadId: number
  estadoActualId: number | null
  esFinalizada?: boolean
  onEstadoChange?: (nuevoEstadoId: number, esFinalizada: boolean) => void
  className?: string
}

export function EstadoInteractivo({
  tipoEntidad,
  entidadId,
  estadoActualId,
  esFinalizada = false,
  onEstadoChange,
  className = ""
}: EstadoInteractivoProps) {
  const [estados, setEstados] = useState<Estado[]>([])
  const [estadoActual, setEstadoActual] = useState<Estado | null>(null)
  const [esTareaFinalizada, setEsTareaFinalizada] = useState<boolean>(esFinalizada)
  const [isLoading, setIsLoading] = useState(false)

  // Cargar los estados según el tipo de entidad desde Supabase
  useEffect(() => {
    const cargarEstadosDesdeSupabase = async () => {
      setIsLoading(true);
      try {
        const supabase = createBrowserSupabaseClient();
        // Asumiendo que la tabla estados_tareas tiene una columna 'tipo_entidad' o similar para filtrar.
        // Si no, ajusta la consulta. Por ahora, cargaremos todos y filtraremos en cliente si es necesario,
        // o si 'tipoEntidad' se refiere a la tabla a actualizar (ej. 'tareas' vs 'presupuestos').
        // Para este caso, asumimos que 'estados_tareas' es la fuente única y no necesita filtro por tipoEntidad aquí.
        const { data: estadosData, error: estadosError } = await supabase
          .from("estados_tareas")
          .select("id, codigo, nombre, descripcion, color, orden") // Asegúrate que estas columnas existan
          .order("orden", { ascending: true });

        if (estadosError) {
          console.error("Error al cargar estados desde Supabase:", estadosError);
          toast({ title: "Error", description: "No se pudieron cargar los estados.", variant: "destructive" });
          setEstados([]);
          setEstadoActual(null);
          return;
        }

        const estadosDisponibles: Estado[] = (estadosData as Estado[]) || [];
        setEstados(estadosDisponibles);
        
        const estadoEncontrado = estadosDisponibles.find(e => e.id === estadoActualId) || null;
        setEstadoActual(estadoEncontrado);
        console.log('Estados cargados desde Supabase:', { tipoEntidad, estadoActualId, estadoEncontrado, disponibles: estadosDisponibles.length });

      } catch (error) {
        console.error("Error general al cargar estados:", error);
        toast({ title: "Error", description: "Ocurrió un error inesperado al cargar estados.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    
    cargarEstadosDesdeSupabase();
  }, [tipoEntidad, estadoActualId]);
  
  // Actualizar estado finalizado cuando cambia desde las props
  useEffect(() => {
    if (esFinalizada !== esTareaFinalizada) {
      setEsTareaFinalizada(esFinalizada);
    }
  }, [esFinalizada]);

  // Función para manejar el cambio de estado
  const handleEstadoChange = async (estadoId: number) => {
    // Si es el mismo estado, no hacemos nada
    if (estadoId === estadoActualId) return;
    
    setIsLoading(true);
    
    try {
      const nuevoEstado = estados.find(e => e.id === estadoId);
      if (!nuevoEstado) {
        throw new Error("Estado no encontrado");
      }
      
      // await new Promise(resolve => setTimeout(resolve, 400)); // Simulación eliminada

      const supabase = createBrowserSupabaseClient();
      // Determinar la tabla a actualizar basado en tipoEntidad
      // Por ahora, asumimos que siempre es 'tareas' para este componente cuando tipoEntidad es 'tarea'
      // IMPORTANTE: La actualización SIEMPRE se realiza en las tablas originales, no en las vistas
      // aunque las consultas se hagan contra la vista optimizada "vista_tareas_completa"
      const tablaAActualizar = tipoEntidad === 'tarea' ? 'tareas' : tipoEntidad; // Corregido: la tabla es 'tareas' (plural)

      const { data, error } = await supabase
        .from(tablaAActualizar) // ej. 'tareas'
        .update({ id_estado_nuevo: estadoId })
        .eq("id", entidadId);

      if (error) {
        console.error(`Error al actualizar estado en Supabase (${tablaAActualizar}):`, error);
        throw new Error(`Error al actualizar estado: ${error.message}`);
      }
      console.log(`Estado actualizado en Supabase (${tablaAActualizar}):`, data);

      console.log('Actualización de estado:', {
        tipoEntidad,
        entidadId,
        estadoAnteriorId: estadoActualId,
        nuevoEstadoId: estadoId,
        nuevoEstadoNombre: nuevoEstado.nombre,
        esTareaFinalizada
      });
      
      toast({
        title: "Estado actualizado", 
        description: `La ${tipoEntidad} ahora está en estado: ${nuevoEstado.nombre} ${esTareaFinalizada ? '(Finalizada)' : '(Activa)'}`,
      });

      // Actualizar el estado local
      setEstadoActual(nuevoEstado);
      
      // Notificar al componente padre
      if (onEstadoChange) {
        onEstadoChange(estadoId, esTareaFinalizada);
      }
    } catch (err) {
      console.error(`Error al cambiar estado:`, err);
      toast({
        title: "Error",
        description: `No se pudo cambiar el estado. ${err instanceof Error ? err.message : ""}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Manejar el cambio del estado finalizado
  const handleFinalizadaChange = async (checked: boolean) => {
    setIsLoading(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const tablaAActualizar = tipoEntidad === 'tarea' ? 'tareas' : tipoEntidad; // Corregido: la tabla es 'tareas' (plural)
      
      // Determinar el valor de id_estado_nuevo según si está finalizada o activa
      // 7 = terminado (cuando finalizada = true)
      // 2 = organizar (cuando finalizada = false)
      const id_estado_nuevo = checked ? 7 : 2;
      
      console.log(`Actualizando tarea ${entidadId}: finalizada=${checked}, id_estado_nuevo=${id_estado_nuevo}`);
      
      // Actualizar tanto finalizada como id_estado_nuevo
      const { data, error } = await supabase
        .from(tablaAActualizar)
        .update({ 
          finalizada: checked,
          id_estado_nuevo: id_estado_nuevo 
        })
        .eq("id", entidadId);

      if (error) {
        console.error(`Error al actualizar estado finalizada en Supabase (${tablaAActualizar}):`, error);
        throw new Error(`Error al actualizar estado finalizada: ${error.message}`);
      }
      console.log(`Estado finalizada actualizado en Supabase (${tablaAActualizar}):`, data);
      
      setEsTareaFinalizada(checked); // Actualizar estado local después del éxito

      // Notificar al componente padre
      if (onEstadoChange && estadoActual) {
        onEstadoChange(estadoActual.id, checked);
      }

      toast({
        title: "Estado de finalización actualizado", 
        description: `La ${tipoEntidad} ahora está ${checked ? 'finalizada' : 'activa'}`,
      });

    } catch (err) {
      console.error(`Error al cambiar estado de finalización:`, err);
      toast({
        title: "Error",
        description: `No se pudo cambiar el estado de finalización. ${err instanceof Error ? err.message : ""}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Función para convertir colores de texto a valores CSS
  const getColorStyle = (colorName: string) => {
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
    
    return colorMap[colorName] || colorName;
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {tipoEntidad === "tarea" && (
        <div className="flex items-center mr-2">
          <Switch
            id="toggle-finalizada"
            checked={esTareaFinalizada}
            onCheckedChange={handleFinalizadaChange}
            className="mr-2"
          />
          <Label htmlFor="toggle-finalizada">
            {esTareaFinalizada ? "Finalizada" : "Activa"}
          </Label>
        </div>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={isLoading}>
          <Badge 
            className="cursor-pointer hover:opacity-80 transition-all"
            style={{
              backgroundColor: estadoActual ? getColorStyle(estadoActual.color) : "#9E9E9E",
              color: "white",
            }}
          >
            {isLoading ? "Actualizando..." : estadoActual?.nombre || "Sin estado"}
          </Badge>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {estados.map((estado) => (
            <DropdownMenuItem
              key={estado.id}
              onClick={() => handleEstadoChange(estado.id)}
              className="cursor-pointer"
              disabled={estado.id === estadoActualId}
            >
              <div 
                className="w-3 h-3 mr-2 rounded-full" 
                style={{ backgroundColor: getColorStyle(estado.color) }}
              />
              {estado.nombre}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
