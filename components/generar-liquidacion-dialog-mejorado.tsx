"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSupabase } from "@/lib/supabase-provider";
import { toast } from "sonner"

interface GenerarLiquidacionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface Trabajador {
  id: string
  nombre: string
  email: string
  salario_diario: number
}

export function GenerarLiquidacionDialog({ open, onOpenChange, onSuccess }: GenerarLiquidacionDialogProps) {
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([])
  const [selectedTrabajador, setSelectedTrabajador] = useState("")
  const [semanaInicio, setSemanaInicio] = useState("")
  const [semanaFin, setSemanaFin] = useState("")
  const [plusManual, setPlusManual] = useState("")
  const [observaciones, setObservaciones] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [calculoPreview, setCalculoPreview] = useState<any>(null)
  const { supabase } = useSupabase();

  useEffect(() => {
    if (open) {
      cargarTrabajadores()
      // Establecer fechas por defecto (semana actual)
      const hoy = new Date()
      const lunes = new Date(hoy)
      lunes.setDate(hoy.getDate() - hoy.getDay() + 1)
      const viernes = new Date(lunes)
      viernes.setDate(lunes.getDate() + 4)

      setSemanaInicio(lunes.toISOString().split("T")[0])
      setSemanaFin(viernes.toISOString().split("T")[0])
    }
  }, [open])

  useEffect(() => {
    if (selectedTrabajador && semanaInicio && semanaFin) {
      calcularPreview()
    }
  }, [selectedTrabajador, semanaInicio, semanaFin, plusManual])

  const cargarTrabajadores = async () => {
    try {
      // Paso 1: Obtener trabajadores activos con su configuración salarial
      const { data, error } = await supabase
        .from("usuarios")
        .select(
          `
          id,
          email,
          configuracion_trabajadores!inner (
            salario_diario
          )
        `
        )
        .eq("rol", "trabajador")
        .eq("configuracion_trabajadores.activo", true);

      if (error) {
        console.error("Error al obtener trabajadores con su configuración:", error);
        toast.error("No se pudo cargar la lista de trabajadores.");
        throw error;
      }

      // Paso 2: Mapear los datos para el estado del componente
      // El !inner join en una relación uno-a-uno asegura que configuracion_trabajadores es un objeto
      const trabajadoresListos =
        data?.map((usuario: any) => ({
          id: usuario.id,
          nombre: usuario.email, // Usamos el email como identificador principal
          email: usuario.email,
          salario_diario: usuario.configuracion_trabajadores.salario_diario,
        })) || [];

      setTrabajadores(trabajadoresListos);
    } catch (error) {
      // El error ya se maneja y notifica en el bloque if de arriba
      console.error("Fallo en la función cargarTrabajadores:", error)
    }
  }

  const calcularPreview = async () => {
    if (!selectedTrabajador || !semanaInicio || !semanaFin) {
      setCalculoPreview(null)
      return
    }

    try {
      const { data, error } = await supabase.rpc("calcular_liquidacion_semanal", {
        p_trabajador_id: selectedTrabajador,
        p_fecha_inicio: semanaInicio,
        p_fecha_fin: semanaFin,
      })

      if (error) {
        toast.error("Error al calcular la liquidación.")
        throw error
      }

      if (data && data.length > 0) {
        const calculo = data[0]
        setCalculoPreview({
          ...calculo,
          plus_manual: Number.parseInt(plusManual) || 0,
          total_final: calculo.total_pagar + (Number.parseInt(plusManual) || 0),
        })
      } else {
        setCalculoPreview(null)
      }
    } catch (error) {
      console.error("Error al calcular preview:", error)
      toast.error("Hubo un problema al calcular la liquidación.")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTrabajador || !semanaInicio || !semanaFin) {
      toast.error("Por favor completa todos los campos requeridos")
      return
    }

    setIsLoading(true)
    try {
      // Verificar si ya existe una liquidación para este período usando SQL RPC en lugar de consulta directa
      // Esto evita problemas con formatos de fecha en la API REST
      const { data: existente, error: errorVerificacion } = await supabase
        .rpc("verificar_liquidacion_existente", {
          p_trabajador_id: selectedTrabajador,
          p_fecha_inicio: semanaInicio,
          p_fecha_fin: semanaFin
        });

      if (existente) {
        toast.error("Ya existe una liquidación para este trabajador en este período");
        return;
      }

      // Crear la liquidación
      const { error } = await supabase.from("liquidaciones_trabajadores").insert({
        id_trabajador: selectedTrabajador,
        semana_inicio: semanaInicio,
        semana_fin: semanaFin,
        total_dias: calculoPreview?.total_dias || 0,
        salario_base: calculoPreview?.salario_base || 0,
        plus_manual: Number.parseInt(plusManual) || 0,
        gastos_reembolsados: calculoPreview?.gastos_reembolsados || 0,
        total_pagar: calculoPreview?.total_final || 0,
        observaciones: observaciones || null,
      });

      if (error) throw error;
      
      // Obtenemos el ID de la liquidación recén creada
      const { data: nuevaLiquidacion, error: errorObtenerLiquidacion } = await supabase
        .from("liquidaciones_trabajadores")
        .select("id")
        .eq("id_trabajador", selectedTrabajador)
        .eq("semana_inicio", semanaInicio)
        .eq("semana_fin", semanaFin)
        .single();
        
      if (errorObtenerLiquidacion) {
        console.error("Error al obtener ID de liquidación:", errorObtenerLiquidacion);
        toast.warning("La liquidación se creó, pero podría haber problemas con la actualización de registros relacionados.");
      } else {
        console.log("Liquidación creada con ID:", nuevaLiquidacion.id);
        // Ahora actualizamos las partes de trabajo y gastos relacionados con este trabajador
        await actualizarRegistrosRelacionados(selectedTrabajador, nuevaLiquidacion.id, semanaInicio, semanaFin);
      }
      
      toast.success("Liquidación generada exitosamente")
      onSuccess()
      onOpenChange(false)
      resetForm()
    } catch (error) {
      console.error("Error al generar liquidación:", error)
      toast.error("Error al generar liquidación")
    } finally {
      setIsLoading(false)
    }
  }

  // Función para actualizar partes_de_trabajo y gastos_tarea relacionados con una liquidación
  const actualizarRegistrosRelacionados = async (trabajadorId: string, liquidacionId: number, fechaInicio: string, fechaFin: string) => {
    console.log(`Actualizando registros relacionados con la liquidación ID: ${liquidacionId}`);
    console.log(`Parámetros: trabajador ${trabajadorId} fechas: ${fechaInicio} - ${fechaFin}`);
    
    // 1. Primero obtenemos todas las tareas del trabajador en el período especificado
    const { data: tareas, error: errorTareas } = await supabase
      .from('trabajadores_tareas')
      .select('id_tarea')
      .eq('id_trabajador', trabajadorId);
      
    if (errorTareas) {
      console.error('Error al obtener tareas del trabajador:', errorTareas);
      toast.warning('No se pudieron actualizar algunos registros relacionados');
      return { partesActualizados: 0, gastosActualizados: 0 };
    }
    
    if (!tareas || tareas.length === 0) {
      console.log('No se encontraron tareas para este trabajador');
      return { partesActualizados: 0, gastosActualizados: 0 };
    }
    
    const idsTareas = tareas.map(t => t.id_tarea);
    console.log(`Tareas encontradas: ${JSON.stringify(idsTareas)}`);
    
    try {
      // Llamar a la NUEVA función RPC con privilegios elevados
      const { data, error } = await supabase.rpc('actualizar_liquidacion_trabajador', {
        p_trabajador_id: trabajadorId,
        p_fecha_inicio: fechaInicio,
        p_fecha_fin: fechaFin,
        p_liquidacion_id: liquidacionId,
        p_tareas: idsTareas
      });
      
      if (error) {
        console.error('❌ Error en la actualización mediante RPC:', error);
        toast.error(`Error al actualizar registros: ${error.message}`);
        return { partesActualizados: 0, gastosActualizados: 0 };
      }
      
      console.log('✅ Resultado completo de la actualización:', data);
      
      // Verificar y mostrar los resultados
      const partesActualizados = data?.partes_actualizados || 0;
      const gastosActualizados = data?.gastos_actualizados || 0;
      
      console.log(`✅ Actualizados mediante RPC: ${partesActualizados} partes de trabajo y ${gastosActualizados} gastos`);
      
      if (partesActualizados > 0 || gastosActualizados > 0) {
        toast.success(`Se actualizaron ${partesActualizados} partes de trabajo y ${gastosActualizados} gastos`);
      }
      
      // Devolver resultados para mostrar en la interfaz
      return { 
        partesActualizados, 
        gastosActualizados 
      };
    } catch (error: any) {
      console.error('❌ Error inesperado en la actualización:', error);
      toast.error(`Error inesperado: ${error.message}`);
      return { partesActualizados: 0, gastosActualizados: 0 };
    }
  }
  
  const resetForm = () => {
    setSelectedTrabajador("")
    setSemanaInicio("")
    setSemanaFin("")
    setPlusManual("")
    setObservaciones("")
    setCalculoPreview(null)
  }

  const formatMonto = (monto: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(monto)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Modificamos el DialogContent para que tenga una altura máxima y scroll */}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
        <DialogHeader>
          <DialogTitle>Generar Liquidación Semanal</DialogTitle>
          <DialogDescription>
            Complete los datos para generar la liquidación semanal del trabajador seleccionado.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="trabajador">Trabajador *</Label>
              <Select value={selectedTrabajador} onValueChange={setSelectedTrabajador}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar trabajador" />
                </SelectTrigger>
                <SelectContent>
                  {trabajadores.map((trabajador) => (
                    <SelectItem key={trabajador.id} value={trabajador.id}>
                      {trabajador.nombre} - {formatMonto(trabajador.salario_diario)}/día
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plus">Plus Manual</Label>
              <Input
                id="plus"
                type="number"
                value={plusManual}
                onChange={(e) => setPlusManual(e.target.value)}
                placeholder="0"
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inicio">Semana Inicio *</Label>
              <Input
                id="inicio"
                type="date"
                value={semanaInicio}
                onChange={(e) => setSemanaInicio(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fin">Semana Fin *</Label>
              <Input id="fin" type="date" value={semanaFin} onChange={(e) => setSemanaFin(e.target.value)} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea
              id="observaciones"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Observaciones adicionales..."
              rows={3}
            />
          </div>

          {/* Preview del cálculo */}
          {calculoPreview && (
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h4 className="font-semibold">Preview de Liquidación:</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  Días trabajados: <span className="font-medium">{calculoPreview.total_dias}</span>
                </div>
                <div>
                  Salario base: <span className="font-medium">{formatMonto(calculoPreview.salario_base)}</span>
                </div>
                <div>
                  Plus manual: <span className="font-medium">{formatMonto(calculoPreview.plus_manual)}</span>
                </div>
                <div>
                  Gastos reembolsados:{" "}
                  <span className="font-medium">{formatMonto(calculoPreview.gastos_reembolsados)}</span>
                </div>
              </div>
              <div className="pt-2 border-t">
                <div className="text-lg font-bold">Total a pagar: {formatMonto(calculoPreview.total_final)}</div>
              </div>
            </div>
          )}

          {/* Fijamos los botones al final del diálogo */}
          <DialogFooter className="sticky bottom-0 bg-background pt-4 pb-2">
            <div className="flex justify-end gap-3 w-full">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Generando..." : "Generar Liquidación"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
