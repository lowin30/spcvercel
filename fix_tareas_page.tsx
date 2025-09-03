// Corrección para app/dashboard/tareas/[id]/page.tsx
// Línea 144-145 debe cambiar para usar tareaId (ya convertido a entero) en lugar de id (que es un string)

const { data: tareaData, error: rpcError } = await supabase
  .rpc('get_tarea_details', { tarea_id_param: tareaId })
  .single();
