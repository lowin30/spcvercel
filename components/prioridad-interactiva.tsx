"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { toast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase-client"

// Tipos de prioridad disponibles en la aplicación real
type PrioridadType = "baja" | "media" | "alta" | "urgente"

interface PrioridadInteractivaProps {
  tareaId: number
  prioridadActual: PrioridadType
  onPrioridadChange?: (nuevaPrioridad: PrioridadType) => void
  className?: string
}

// Definición de prioridades con sus propiedades correctas
const prioridades: {id: PrioridadType, nombre: string, color: string}[] = [
  { id: "baja", nombre: "Baja", color: "#4CAF50" }, // Verde
  { id: "media", nombre: "Media", color: "#2196F3" }, // Azul
  { id: "alta", nombre: "Alta", color: "#FF9800" }, // Naranja
  { id: "urgente", nombre: "Urgente", color: "#F44336" }, // Rojo
];

export function PrioridadInteractiva({
  tareaId,
  prioridadActual,
  onPrioridadChange,
  className = ""
}: PrioridadInteractivaProps) {
  // Asegurar que la prioridad sea válida o establecer un valor predeterminado
  const prioridadInicial = prioridades.some(p => p.id === prioridadActual) ? prioridadActual : "media";
  const [prioridad, setPrioridad] = useState<PrioridadType>(prioridadInicial)
  const [isLoading, setIsLoading] = useState(false)
  
  // Actualizar estado cuando cambia la prop
  useEffect(() => {
    if (prioridadActual && prioridadActual !== prioridad) {
      setPrioridad(prioridadActual);
    }
  }, [prioridadActual]);

  // Función para manejar el cambio de prioridad
  const handlePrioridadChange = async (nuevaPrioridad: PrioridadType) => {
    // Si es la misma prioridad, no hacemos nada
    if (nuevaPrioridad === prioridad) return;
    
    setIsLoading(true);
    
    try {
      // Simular un pequeño retraso para mejorar UX
      // await new Promise(resolve => setTimeout(resolve, 400)); // Comentado para prueba directa

      const supabase = createClient();
      // Importante: La actualización SIEMPRE se realiza en la tabla original "tareas"
      // aunque las consultas se hagan contra la vista optimizada "vista_tareas_completa"
      const { data, error } = await supabase
        .from("tareas")
        .update({ prioridad: nuevaPrioridad })
        .eq("id", tareaId);

      if (error) {
        console.error('Error al actualizar prioridad en Supabase:', error);
        throw new Error(`Error al actualizar prioridad: ${error.message}`);
      }

      console.log('Prioridad actualizada en Supabase:', data);
      console.log('Actualización de prioridad:', {
        tareaId,
        prioridadAnterior: prioridad,
        nuevaPrioridad
      });
      
      // Actualizar el estado local
      setPrioridad(nuevaPrioridad);
      
      // Notificar al componente padre
      if (onPrioridadChange) {
        onPrioridadChange(nuevaPrioridad);
      }
      
      const prioridadInfo = prioridades.find(p => p.id === nuevaPrioridad);
      
      toast({
        title: "Prioridad actualizada", 
        description: `La tarea ahora tiene prioridad: ${prioridadInfo?.nombre || nuevaPrioridad}`,
      });
    } catch (err) {
      console.error(`Error al cambiar prioridad:`, err);
      toast({
        title: "Error",
        description: `No se pudo cambiar la prioridad. ${err instanceof Error ? err.message : ""}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Obtener el color de la prioridad actual
  const prioridadInfo = prioridades.find(p => p.id === prioridad);
  const color = prioridadInfo?.color || "#9E9E9E";

  return (
    <div className={`inline-flex ${className}`}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={isLoading}>
          <Badge 
            className="cursor-pointer hover:opacity-80 transition-all"
            style={{
              backgroundColor: color,
              color: "white",
            }}
          >
            {isLoading ? "Actualizando..." : `Prioridad: ${prioridadInfo?.nombre || prioridad}`}
          </Badge>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {prioridades.map((p) => (
            <DropdownMenuItem
              key={p.id}
              onClick={() => handlePrioridadChange(p.id)}
              className="cursor-pointer"
              disabled={p.id === prioridad}
            >
              <div 
                className="w-3 h-3 mr-2 rounded-full" 
                style={{ backgroundColor: p.color }}
              />
              {p.nombre}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
