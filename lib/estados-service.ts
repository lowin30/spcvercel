// lib/estados-service.ts
import { createClient } from "@/lib/supabase-client";

// Tipo para estado de tarea
export interface EstadoTarea {
  id: number;
  codigo: string;
  nombre: string;
  color: string;
  orden: number;
  descripcion?: string;
}

// Estados hardcodeados como respaldo en caso de fallo en la carga desde Supabase
export const ESTADOS_FALLBACK: EstadoTarea[] = [
  { id: 1, codigo: "organizar", nombre: "Organizar", color: "#6b7280", orden: 1 },
  { id: 2, codigo: "preguntar", nombre: "Preguntar", color: "#3b82f6", orden: 2 },
  { id: 3, codigo: "presupuestado", nombre: "Presupuestado", color: "#8b5cf6", orden: 3 },
  { id: 4, codigo: "enviado", nombre: "Enviado", color: "#6366f1", orden: 4 },
  { id: 5, codigo: "aprobado", nombre: "Aprobado", color: "#16a34a", orden: 5 },
  { id: 6, codigo: "facturado", nombre: "Facturado", color: "#f97316", orden: 6 },
  { id: 7, codigo: "terminado", nombre: "Terminado", color: "#10b981", orden: 7 },
  { id: 8, codigo: "reclamado", nombre: "Reclamado", color: "#ef4444", orden: 8 },
  { id: 9, codigo: "liquidada", nombre: "Liquidada", color: "#8b5cf6", orden: 9 }
];

// Cache en memoria para estados
let estadosCache: EstadoTarea[] | null = null;
let ultimaActualizacion: number = 0;
const TIEMPO_CACHE_MS = 5 * 60 * 1000; // 5 minutos para reducir llamadas repetidas
let estadosPromise: Promise<EstadoTarea[]> | null = null;

/**
 * Obtiene los estados de tareas desde Supabase o caché
 * @param forzarActualizacion Si es true, ignorará la caché y hará una nueva consulta
 * @returns Lista de estados de tareas
 */
export async function obtenerEstadosTarea(forzarActualizacion = false): Promise<EstadoTarea[]> {
  const ahora = Date.now();
  
  // Si tenemos caché válida y no se fuerza actualización, usar la caché
  if (estadosCache && !forzarActualizacion && (ahora - ultimaActualizacion < TIEMPO_CACHE_MS)) {
    console.log("Usando caché de estados de tareas", { cantidadEstados: estadosCache.length });
    return estadosCache;
  }
  
  // Si hay una carga en curso y no se fuerza, reutilizarla
  if (estadosPromise && !forzarActualizacion) {
    return estadosPromise;
  }
  
  try {
    // Iniciar (o reutilizar) una carga en curso
    if (!estadosPromise || forzarActualizacion) {
      console.log("Cargando estados de tareas desde Supabase");
      estadosPromise = (async () => {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("estados_tareas")
          .select("id, codigo, nombre, descripcion, color, orden")
          .order("orden");
        
        if (error) {
          console.error("Error al cargar estados de tareas:", error);
          throw error;
        }
        
        if (!data || data.length === 0) {
          console.warn("No se encontraron estados de tareas en Supabase, usando fallback");
          return ESTADOS_FALLBACK;
        }
        
        // Actualizar la caché y timestamp
        estadosCache = data;
        ultimaActualizacion = ahora;
        
        console.log("Estados cargados desde Supabase:", { cantidad: data.length, estados: data });
        return estadosCache;
      })();
    }
    const result = await estadosPromise;
    return result;
  } catch (error) {
    console.error("Error al cargar estados de tareas:", error);
    
    // Si hay un error pero tenemos caché, devolver la caché aunque esté vencida
    if (estadosCache && estadosCache.length > 0) {
      console.warn("Usando caché vencida debido a error");
      return estadosCache;
    }
    
    // Si no hay caché o está vacía, usar los valores predeterminados
    console.warn("Usando estados predeterminados debido a error");
    return ESTADOS_FALLBACK;
  } finally {
    // Limpiar la promesa pendiente para permitir futuras recargas
    estadosPromise = null;
  }
}

/**
 * Busca un estado específico por su ID
 * @param id ID del estado a buscar
 * @returns El estado encontrado o undefined
 */
export async function obtenerEstadoPorId(id: number): Promise<EstadoTarea | undefined> {
  try {
    const estados = await obtenerEstadosTarea();
    // Buscar en los estados cargados
    const estadoEncontrado = estados.find(estado => estado.id === id);
    if (estadoEncontrado) {
      return estadoEncontrado;
    }
    
    // Si no lo encuentra, buscar en el fallback como respaldo
    const estadoFallback = ESTADOS_FALLBACK.find(estado => estado.id === id);
    
    // Si lo encuentra en fallback, pero no estaba en los cargados, algo está mal
    if (estadoFallback && estados !== ESTADOS_FALLBACK) {
      console.warn(`Estado con ID ${id} encontrado solo en fallback, no en BD. Esto puede indicar un problema de sincronización.`);
    }
    
    return estadoFallback;
  } catch (error) {
    console.error(`Error buscando estado con ID ${id}:`, error);
    // Buscar en el fallback como último recurso
    return ESTADOS_FALLBACK.find(estado => estado.id === id);
  }
}

/**
 * Obtiene el color asociado a un ID de estado
 * @param id ID del estado
 * @returns Color en formato hexadecimal o un color por defecto
 */
export async function obtenerColorEstado(id?: number): Promise<string> {
  // Si no hay ID, retornar color por defecto
  if (!id) return "#6b7280"; // Gris por defecto
  
  try {  
    const estado = await obtenerEstadoPorId(id);
    if (estado?.color) {
      return estado.color;
    }
    
    // Si no encontró el estado o no tiene color, tratar de usar un color predeterminado
    // basado en rangos comunes de IDs
    if (id === 1) return "#6b7280"; // Organizar - gris
    if (id === 2) return "#3b82f6"; // Preguntar - azul
    if (id === 3) return "#8b5cf6"; // Presupuestado - púrpura
    if (id === 4) return "#6366f1"; // Enviado - índigo
    if (id === 5) return "#16a34a"; // Aprobado - verde oscuro
    if (id === 6) return "#f97316"; // Facturado - naranja
    if (id === 7) return "#10b981"; // Terminado - verde
    if (id === 8) return "#ef4444"; // Reclamado - rojo
    if (id === 9) return "#8b5cf6"; // Liquidada - púrpura
    if (id >= 10) return "#6b7280"; // Otros estados - gris
    
    return "#6b7280"; // Color por defecto si todo falla
  } catch (error) {
    console.error(`Error al obtener color para estado ${id}:`, error);
    return "#6b7280"; // Gris por defecto en caso de error
  }
}

/**
 * Limpia la caché de estados forzando una nueva carga en la próxima consulta
 */
export function limpiarCacheEstados(): void {
  estadosCache = null;
  ultimaActualizacion = 0;
  console.log("Caché de estados de tareas limpiada");
}
