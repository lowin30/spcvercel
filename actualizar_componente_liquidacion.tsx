// Modificación para generar-liquidacion-dialog.tsx
// Reemplaza la función actualizarRegistrosRelacionados con esta nueva implementación

const actualizarRegistrosRelacionados = async (liquidacionId: number, trabajadorId: string, semanaInicio: string, semanaFin: string, tareas: number[]) => {
  try {
    console.log(`Actualizando registros relacionados con la liquidación ID: ${liquidacionId}`);
    console.log(`Parámetros: trabajador ${trabajadorId} fechas: ${semanaInicio} - ${semanaFin}`);
    console.log(`Tareas encontradas: ${JSON.stringify(tareas)}`);
    
    // Usar la función RPC creada en el SQL para actualizar todo de una vez
    const { data, error } = await supabase.rpc('actualizar_liquidacion_completa', {
      p_trabajador_id: trabajadorId,
      p_tareas: tareas,
      p_fecha_inicio: semanaInicio,
      p_fecha_fin: semanaFin,
      p_liquidacion_id: liquidacionId
    });

    if (error) {
      console.error('Error al actualizar registros mediante RPC:', error);
      return { partesActualizados: 0, gastosActualizados: 0 };
    }

    console.log('Resultado de la actualización RPC:', data);
    
    return { 
      partesActualizados: data.partes_actualizados || 0, 
      gastosActualizados: data.gastos_actualizados || 0 
    };
  } catch (error) {
    console.error('Error en actualizarRegistrosRelacionados:', error);
    return { partesActualizados: 0, gastosActualizados: 0 };
  }
};
