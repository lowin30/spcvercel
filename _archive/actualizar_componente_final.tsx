// Actualiza esta porción de código en tu componente generar-liquidacion-dialog.tsx
// Reemplaza la función actualizarRegistrosRelacionados existente con esta versión

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
