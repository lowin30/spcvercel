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
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase-client"
import { obtenerEstadosTarea, EstadoTarea } from "@/lib/estados-service"
import { FinalizarTareaDialog } from "@/components/finalizar-tarea-dialog"
import { updateTaskStatusAction } from "@/app/dashboard/tareas/actions"

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
  onShowFinalizarDialog?: () => void
  userRol?: string
  estadosInyectados?: any[]
  className?: string
}

export function EstadoInteractivo({
  tipoEntidad,
  entidadId,
  estadoActualId,
  esFinalizada = false,
  onEstadoChange,
  onShowFinalizarDialog,
  userRol,
  estadosInyectados,
  className = ""
}: EstadoInteractivoProps) {
  const [estados, setEstados] = useState<Estado[]>([])
  const [estadoActual, setEstadoActual] = useState<Estado | null>(null)
  const [esTareaFinalizada, setEsTareaFinalizada] = useState<boolean>(esFinalizada)
  const [isLoading, setIsLoading] = useState(false)
  const [readOnly] = useState(userRol === 'trabajador')

  // Cargar los estados según el tipo de entidad desde el servicio centralizado
  useEffect(() => {
    const cargarEstados = async () => {
      if (estadosInyectados && estadosInyectados.length > 0) {
        setEstados(estadosInyectados as Estado[]);
        const estadoEncontrado = estadosInyectados.find(e => e.id === estadoActualId) || null;
        setEstadoActual(estadoEncontrado as Estado | null);
        return;
      }

      setIsLoading(true);
      try {
        const estadosDisponibles = await obtenerEstadosTarea(true);
        if (!estadosDisponibles || estadosDisponibles.length === 0) {
          console.error('EstadoInteractivo: No se recibieron estados');
          return;
        }
        setEstados(estadosDisponibles as Estado[]);
        const estadoEncontrado = estadosDisponibles.find(e => e.id === estadoActualId) || null;
        setEstadoActual(estadoEncontrado as Estado | null);
      } catch (error) {
        console.error("Error al cargar estados:", error);
      } finally {
        setIsLoading(false);
      }
    };

    cargarEstados();
  }, [tipoEntidad, estadoActualId, estadosInyectados]);

  // Actualizar estado finalizado cuando cambia desde las props
  useEffect(() => {
    if (esFinalizada !== esTareaFinalizada) {
      setEsTareaFinalizada(esFinalizada);
    }
  }, [esFinalizada]);

  // Función para manejar el cambio de estado
  const handleEstadoChange = async (estadoId: number) => {
    if (estadoId === estadoActualId || readOnly) return;

    setIsLoading(true);

    try {
      const nuevoEstado = estados.find(e => e.id === estadoId);
      if (!nuevoEstado) throw new Error("estado no encontrado");

      const res = await updateTaskStatusAction(entidadId, estadoId, esTareaFinalizada)

      if (!res.success) {
        throw new Error(res.message)
      }

      toast({
        title: "estado actualizado",
        description: `la ${tipoEntidad} ahora esta en estado: ${nuevoEstado.nombre.toLowerCase()} ${esTareaFinalizada ? '(finalizada)' : '(activa)'}`,
      });

      setEstadoActual(nuevoEstado);
      if (onEstadoChange) onEstadoChange(estadoId, esTareaFinalizada);
    } catch (err: any) {
      console.error(`Error al cambiar estado:`, err);
      toast({
        title: "error",
        description: err.message || "no se pudo cambiar el estado",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Manejar el cambio del estado finalizado
  const handleFinalizadaChange = async (checked: boolean) => {
    if (readOnly) return;

    // Si se intenta marcar como finalizada, mostrar el diálogo
    if (checked && onShowFinalizarDialog) {
      onShowFinalizarDialog();
      return;
    }

    setIsLoading(true);
    try {
      const id_estado_nuevo = 2; // organizar (según lógica previa)

      const res = await updateTaskStatusAction(entidadId, id_estado_nuevo, false)

      if (!res.success) throw new Error(res.message)

      setEsTareaFinalizada(false);
      if (onEstadoChange && estadoActual) {
        onEstadoChange(id_estado_nuevo, false);
      }

      toast({
        title: "estado de finalizacion actualizado",
        description: `la ${tipoEntidad} ahora esta activa`,
      });

    } catch (err: any) {
      console.error(`Error al cambiar estado de finalización:`, err);
      toast({
        title: "error",
        description: err.message || "no se pudo cambiar el estado de finalizacion",
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
          {!esTareaFinalizada ? (
            <Button
              size="sm"
              onClick={() => handleFinalizadaChange(true)}
              disabled={readOnly}
              className="bg-green-600 hover:bg-green-700 text-white font-medium"
            >
              finalizar tarea
            </Button>
          ) : (
            <Button
              size="sm"
              disabled
              className="bg-slate-400 text-white font-medium"
            >
              finalizada
            </Button>
          )}
        </div>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={isLoading || readOnly}>
          <Badge
            className={`${readOnly ? 'cursor-default' : 'cursor-pointer'} hover:opacity-80 transition-all`}
            style={{
              backgroundColor: estadoActual ? getColorStyle(estadoActual.color) : "#9E9E9E",
              color: "white",
            }}
          >
            {isLoading ? "actualizando..." : estadoActual?.nombre.toLowerCase() || "sin estado"}
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
