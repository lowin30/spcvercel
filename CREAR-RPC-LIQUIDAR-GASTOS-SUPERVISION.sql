-- RPC: liquidar_gastos_supervision
-- Marca como liquidados los gastos de una tarea cargados por usuarios con rol admin o supervisor
-- y les asigna el id_liquidacion de la liquidación del supervisor.
-- Seguridad: SECURITY DEFINER para bypass de RLS controlado

create or replace function public.liquidar_gastos_supervision(
  p_id_tarea integer,
  p_id_liquidacion integer
)
returns table (gastos_actualizados integer) 
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
begin
  -- Actualizar solo gastos de admin/supervisor para la tarea indicada y que no estén liquidados
  update public.gastos_tarea g
    set liquidado = true,
        estado = 'pagado',
        id_liquidacion = p_id_liquidacion,
        updated_at = now()
  from public.usuarios u
  where g.id_tarea = p_id_tarea
    and g.id_usuario = u.id
    and u.rol in ('admin','supervisor')
    and coalesce(g.liquidado, false) = false;

  get diagnostics v_count = row_count;

  return query select v_count::int as gastos_actualizados;
end;
$$;

-- Recomendado: limitar ejecución a rol autenticado
-- revoke all on function public.liquidar_gastos_supervision(integer, integer) from public;
-- grant execute on function public.liquidar_gastos_supervision(integer, integer) to authenticated;
