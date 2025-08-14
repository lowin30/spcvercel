// IMPLEMENTACIÓN PARA ACTUALIZAR EL COMPONENTE REACT CON LA FUNCIÓN RPC

// Este código debe reemplazar la función actualizarRegistrosRelacionados en el archivo
// generar-liquidacion-dialog.tsx para resolver definitivamente el problema de RLS

const actualizarRegistrosRelacionados = async (liquidacionId: number, trabajadorId: string, semanaInicio: string, semanaFin: string, idsTareas: number[]) => {
  try {
    console.log(`Actualizando registros relacionados con la liquidación ID: ${liquidacionId}`);
    console.log(`Parámetros: trabajador ${trabajadorId} fechas: ${semanaInicio} - ${semanaFin}`);
    console.log(`Tareas encontradas: ${JSON.stringify(idsTareas)}`);
    
    // Llamar directamente a la función RPC con privilegios elevados
    const { data, error } = await supabase.rpc('actualizar_liquidacion_completa_v2', {
      p_trabajador_id: trabajadorId,
      p_fecha_inicio: semanaInicio,
      p_fecha_fin: semanaFin,
      p_liquidacion_id: liquidacionId,
      p_tareas: idsTareas
    });
    
    if (error) {
      console.error('❌ Error en la actualización mediante RPC:', error);
      return { partesActualizados: 0, gastosActualizados: 0 };
    }
    
    console.log('✅ Resultado completo de la actualización:', data);
    
    // Verificar y mostrar los resultados
    const partesActualizados = data?.partes_actualizados || 0;
    const gastosActualizados = data?.gastos_actualizados || 0;
    
    console.log(`✅ Actualizados mediante RPC: ${partesActualizados} partes de trabajo y ${gastosActualizados} gastos`);
    
    // Devolver resultados para mostrar en la interfaz
    return { 
      partesActualizados, 
      gastosActualizados 
    };
  } catch (error: any) {
    console.error('❌ Error inesperado en la actualización:', error);
    return { partesActualizados: 0, gastosActualizados: 0 };
  }
};
