"use client"

// Componente para renderizar el Badge de estado de la tarea
import { useState, useEffect, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { obtenerColorEstado, obtenerEstadosTarea, limpiarCacheEstados } from "@/lib/estados-service"
import { toast } from "@/components/ui/use-toast"

// Definir interfaces para TypeScript
interface TaskProps {
  id?: number | string;
  titulo?: string;
  estado_tarea?: string;
  id_estado_nuevo?: number | string;
  estado?: string;
  estados?: {
    nombre?: string;
    color?: string;
  }
}

interface TaskStatusBadgeProps {
  task: TaskProps;
}

export function TaskStatusBadge({ task }: TaskStatusBadgeProps) {
  // Estados locales para nombre y color del estado
  const [estadoNombre, setEstadoNombre] = useState<string>("Sin estado")
  const [estadoColor, setEstadoColor] = useState<string>("#6b7280") // gris por defecto
  const [loading, setLoading] = useState(true)
  
  // Preparar función para cargar datos del estado (reutilizable)
  const cargarEstado = useCallback(async () => {
    setLoading(true)
    try {
      // Determinar nombre del estado
      let nombre = "Sin estado"
      if (task.estado_tarea) {
        nombre = task.estado_tarea
        // Primera letra en mayúscula si no lo está ya
        if (nombre.length > 0 && nombre[0] === nombre[0].toLowerCase()) {
          nombre = nombre.charAt(0).toUpperCase() + nombre.slice(1)
        }
      } else if (task.estado) {
        nombre = task.estado
        // Primera letra en mayúscula si no lo está ya
        if (nombre.length > 0 && nombre[0] === nombre[0].toLowerCase()) {
          nombre = nombre.charAt(0).toUpperCase() + nombre.slice(1)
        }
      } else if (task.estados?.nombre) {
        nombre = task.estados.nombre
      }
      setEstadoNombre(nombre)
      
      // Obtener color basado en ID
      let color = task.estados?.color || "#6b7280" // usar color embebido si viene
      if (!task.estados?.color && task.id_estado_nuevo) {
        const idEstado = typeof task.id_estado_nuevo === 'string' 
          ? parseInt(task.id_estado_nuevo) 
          : (task.id_estado_nuevo as number)
        // Usar nuestro servicio centralizado solo si no vino el color embebido
        const estadoColor = await obtenerColorEstado(idEstado)
        color = estadoColor
      }
      setEstadoColor(color)
    } catch (error) {
      console.error("Error al cargar estado de tarea:", error)
    } finally {
      setLoading(false)
    }
  }, [task.estado_tarea, task.estado, task.id_estado_nuevo, task.estados?.color, task.estados?.nombre])

  // Cargar datos del estado al montar/actualizar dependencias
  useEffect(() => {
    cargarEstado()
  }, [cargarEstado])
  
  // Determinar color de texto (blanco para fondos oscuros, negro para fondos claros)
  function esColorOscuro(color: string) {
    // Si no hay color, no es oscuro
    if (!color) return false;
    
    // Convertir el color hex a RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Fórmula para calcular luminosidad percibida
    // https://www.w3.org/TR/WCAG20-TECHS/G18.html
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5; // Si es menor a 0.5, es oscuro
  }
  
  const textColor = estadoColor && esColorOscuro(estadoColor) ? "white" : "black";
  
  // Determinar variante del Badge basado en el color y nombre
  const nombreLowerCase = estadoNombre.toLowerCase();
  let badgeVariant: "default" | "destructive" | "outline" | "secondary" = "outline";
  
  // Primero intentar determinar por color
  if (estadoColor === "#6b7280") { // gris
    badgeVariant = "secondary";
  } else if (estadoColor.startsWith("#ef") || estadoColor.startsWith("#b9")) { // rojos
    badgeVariant = "destructive";
  } else if (estadoColor === "#f59e0b") { // ámbar
    badgeVariant = "outline";
  } 
  // Si no se pudo determinar por color, intentar por nombre
  else {
    if (nombreLowerCase.includes("pendiente")) {
      badgeVariant = "default";
    } else if (nombreLowerCase.includes("progreso") || nombreLowerCase.includes("revisión")) {
      badgeVariant = "secondary";
    } else if (nombreLowerCase.includes("completada") || nombreLowerCase.includes("aprobado") || 
              nombreLowerCase.includes("pagada") || nombreLowerCase.includes("facturada")) {
      badgeVariant = "default"; // cambiado de 'success' a 'default' porque 'success' no es un tipo válido
    } else if (nombreLowerCase.includes("cancelada") || nombreLowerCase.includes("rechazado")) {
      badgeVariant = "destructive";
    } else if (nombreLowerCase.includes("suspendida")) {
      badgeVariant = "secondary"; // cambiado de 'warning' a 'secondary' porque 'warning' no es un tipo válido
    }
  }
  
  // Función para forzar actualización de estados
  const actualizarEstados = async () => {
    setLoading(true);
    try {
      // Limpiar caché y forzar recarga
      limpiarCacheEstados();
      await obtenerEstadosTarea(true);
      
      // Recargar estado de la tarea actual
      await cargarEstado();
      
      toast({
        title: "Estados actualizados",
        description: "Los estados de tareas han sido actualizados correctamente."
      });
    } catch (error) {
      console.error("Error al actualizar estados:", error);
      toast({
        title: "Error",
        description: "No se pudieron actualizar los estados.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Mostrar un indicador de carga mientras se cargan los datos
  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="secondary">Cargando...</Badge>
        <Button 
          size="sm" 
          variant="outline" 
          className="h-6 w-6 p-0 rounded-full" 
          disabled
        >
          <RefreshCw className="h-3 w-3 animate-spin" />
        </Button>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant={estadoColor ? "outline" : badgeVariant} 
        style={{
          backgroundColor: estadoColor || '',
          color: estadoColor ? textColor : '',
          border: estadoColor ? `1px solid ${estadoColor}` : ''
        }}
      >
        {estadoNombre}
      </Badge>
      <Button 
        size="sm" 
        variant="outline" 
        className="h-6 w-6 p-0 rounded-full" 
        onClick={actualizarEstados}
        title="Actualizar estados"
      >
        <RefreshCw className="h-3 w-3" />
      </Button>
    </div>
  );
}
