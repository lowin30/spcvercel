"use client"

// Componente para renderizar el Badge de estado de la tarea
import { Badge } from "@/components/ui/badge"

// Definir interfaces para TypeScript
interface TaskProps {
  id?: number;
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

// Mapeo de IDs de estado a nombres y colores
const ESTADOS_MAP = {
  1: { nombre: "Pendiente", color: "#f59e0b" },    // ámbar
  2: { nombre: "En progreso", color: "#3b82f6" },  // azul
  3: { nombre: "Completada", color: "#10b981" },   // verde
  4: { nombre: "Cancelada", color: "#ef4444" },    // rojo
  5: { nombre: "Aprobado", color: "#16a34a" },     // verde oscuro
  6: { nombre: "Rechazado", color: "#b91c1c" },    // rojo oscuro
  7: { nombre: "En revisión", color: "#6366f1" }, // violeta
  8: { nombre: "Suspendida", color: "#eab308" },   // amarillo
  9: { nombre: "Facturada", color: "#0d9488" },    // teal
  10: { nombre: "Pagada", color: "#059669" }        // esmeralda
};

export function TaskStatusBadge({ task }: TaskStatusBadgeProps) {
  // Depurar qué datos llegan realmente a este componente
  console.log("TaskStatusBadge - Datos de tarea:", {
    id: task.id, 
    titulo: task.titulo,
    estado_tarea: task.estado_tarea,
    id_estado_nuevo: task.id_estado_nuevo,
    estado: task.estado,
    estados: task.estados
  });
  
  // Inicializamos con valores por defecto
  let estadoNombre = "Sin estado";
  let estadoColor = "#6b7280"; // gris por defecto
  
  // Dar prioridad al campo estado_tarea que viene directamente de la vista
  if (task.estado_tarea) {
    estadoNombre = task.estado_tarea;
    // Primera letra en mayúscula si no lo está ya
    if (estadoNombre.length > 0 && estadoNombre[0] === estadoNombre[0].toLowerCase()) {
      estadoNombre = estadoNombre.charAt(0).toUpperCase() + estadoNombre.slice(1);
    }
    
    // Buscar el color adecuado para este estado_tarea basado en su nombre
    if (task.id_estado_nuevo) {
      // Primero intentar obtener el color basado en id_estado_nuevo
      const idEstado = typeof task.id_estado_nuevo === 'string' ? parseInt(task.id_estado_nuevo) : task.id_estado_nuevo;
      if (ESTADOS_MAP[idEstado as keyof typeof ESTADOS_MAP]) {
        estadoColor = ESTADOS_MAP[idEstado as keyof typeof ESTADOS_MAP].color;
      }
    }
    
    // Si aún no tenemos color, buscar por nombre en el mapeo
    if (estadoColor === "#6b7280") { // Si sigue siendo el gris por defecto
      const nombreNormalizado = estadoNombre.toLowerCase();
      
      // Mapeo de nombres comunes a IDs
      const nombreAId: Record<string, number> = {
        "pendiente": 1,
        "en progreso": 2,
        "completada": 3,
        "cancelada": 4,
        "aprobado": 5,
        "rechazado": 6,
        "en revisión": 7,
        "suspendida": 8,
        "facturada": 9,
        "pagada": 10
      };
      
      // Buscar coincidencia parcial
      for (const [nombre, id] of Object.entries(nombreAId)) {
        if (nombreNormalizado.includes(nombre)) {
          if (ESTADOS_MAP[id]) {
            estadoColor = ESTADOS_MAP[id].color;
            break;
          }
        }
      }
    }
  }
  // Luego probar con estados.nombre si existe
  else if (task.estados && task.estados.nombre) {
    estadoNombre = task.estados.nombre;
    estadoColor = task.estados.color || estadoColor;
    
    // Formatear si está en snake_case
    if (estadoNombre === "en_progreso") estadoNombre = "En progreso";
    if (estadoNombre === "pendiente") estadoNombre = "Pendiente";
    if (estadoNombre === "completada") estadoNombre = "Completada";
  }
  // Por último usar id_estado_nuevo y mapearlo a un nombre
  else if (task.id_estado_nuevo) {
    // Convertir a número si es string
    const idEstado = typeof task.id_estado_nuevo === 'string' ? parseInt(task.id_estado_nuevo) : task.id_estado_nuevo;
    
    // Si el ID existe en nuestro mapeo
    if (ESTADOS_MAP[idEstado as keyof typeof ESTADOS_MAP]) {
      estadoNombre = ESTADOS_MAP[idEstado as keyof typeof ESTADOS_MAP].nombre;
      estadoColor = ESTADOS_MAP[idEstado as keyof typeof ESTADOS_MAP].color;
    } else {
      // Si es un ID desconocido
      estadoNombre = `Estado ${idEstado}`;
    }
  }
  
  // Si tenemos nombre de estado pero no color, intentamos obtenerlo del mapeo
  if (estadoNombre && !estadoColor) {
    // Buscar en el mapeo si hay algún color que coincida con este nombre de estado
    Object.keys(ESTADOS_MAP).forEach(key => {
      const numKey = parseInt(key);
      if (ESTADOS_MAP[numKey as keyof typeof ESTADOS_MAP].nombre.toLowerCase() === estadoNombre.toLowerCase()) {
        estadoColor = ESTADOS_MAP[numKey as keyof typeof ESTADOS_MAP].color;
      }
    });
  }
  
  // Si aún no tenemos un nombre de estado, mostrar "Sin estado"
  if (!estadoNombre) {
    estadoNombre = "Sin estado";
  }
  
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
  
  // Determinar variante predeterminada para el badge si no hay color específico
  const nombreLowerCase = estadoNombre.toLowerCase();
  let badgeVariant = "outline";
  
  if (!estadoColor) {
    if (nombreLowerCase.includes("pendiente")) {
      badgeVariant = "default";
    } else if (nombreLowerCase.includes("progreso") || nombreLowerCase.includes("revisión")) {
      badgeVariant = "secondary";
    } else if (nombreLowerCase.includes("completada") || nombreLowerCase.includes("aprobado") || nombreLowerCase.includes("pagada") || nombreLowerCase.includes("facturada")) {
      badgeVariant = "success";
    } else if (nombreLowerCase.includes("cancelada") || nombreLowerCase.includes("rechazado")) {
      badgeVariant = "destructive";
    } else if (nombreLowerCase.includes("suspendida")) {
      badgeVariant = "warning";
    }
  }
  
  return (
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
  );
}
