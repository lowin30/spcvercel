-- ====================================================================
-- SISTEMA DE VISTAS NORMALIZADAS: PRESUPUESTOS BASE (PB) V3.2 (FIX ADMIN NAME)
-- Soluciona:
-- 1. Visibilidad dinámica de supervisor (Tarea 197)
-- 2. Soporte para Solapas Inteligentes (Pendientes, Activas, Pagada)
-- 3. Estado de PF (Facturado) incluido en flujo operativo
-- 4. Consistencia de datos entre Supervisor y Admin
-- 5. FIX: Nombre de administrador obtenido del edificio (e.id_administrador)
-- ====================================================================

BEGIN;

-- 1. VISTA BASE (Para evitar duplicar lógica)
DROP VIEW IF EXISTS public.vista_pb_supervisor CASCADE;
DROP VIEW IF EXISTS public.vista_pb_admin CASCADE;

CREATE VIEW public.vista_pb_supervisor AS
WITH pf_info AS (
  SELECT 
    pf.id_tarea,
    ep.codigo as estado_pf,
    pf.aprobado as pf_aprobado,
    pf.rechazado as pf_rechazado
  FROM public.presupuestos_finales pf
  INNER JOIN public.estados_presupuestos ep ON pf.id_estado = ep.id
)
SELECT 
  pb.id,
  pb.code,
  pb.id_tarea,
  pb.nota_pb,
  pb.materiales,
  pb.mano_obra,
  pb.total,
  pb.aprobado as pb_aprobado,
  pb.created_at,
  pb.updated_at,
  -- PRIORIDAD DE SUPERVISOR: 
  -- 1. Asignado actual a la tarea (Supervisores_tareas)
  -- 2. El que creó el presupuesto (pb.id_supervisor) como fallback
  COALESCE(st.id_supervisor, pb.id_supervisor) as id_supervisor,
  t.titulo as titulo_tarea,
  t.code as code_tarea,
  t.id_estado_nuevo as id_estado_tarea,
  et.nombre as estado_tarea,
  pb.id_edificio,
  e.nombre as nombre_edificio,
  e.direccion as direccion_edificio,
  -- FIX: Siempre usar el administrador del edificio para consistencia
  adm.nombre as nombre_administrador,
  pfi.estado_pf as codigo_estado_pf,
  COALESCE(pfi.pf_aprobado, false) as pf_aprobado,
  COALESCE(pfi.pf_rechazado, false) as pf_rechazado,
  EXISTS (
    SELECT 1 FROM public.liquidaciones_nuevas ln
    WHERE ln.id_tarea = pb.id_tarea
  ) as esta_liquidado,
  EXTRACT(DAY FROM NOW() - pb.created_at)::INTEGER as dias_desde_creacion,
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.liquidaciones_nuevas ln WHERE ln.id_tarea = pb.id_tarea) THEN 'pagada'
    WHEN pfi.estado_pf IN ('aprobado', 'facturado') THEN 'activa'
    WHEN pfi.estado_pf = 'rechazado' THEN 'rechazada'
    ELSE 'pendiente'
  END as estado_operativo
FROM public.presupuestos_base pb
LEFT JOIN public.tareas t ON pb.id_tarea = t.id
LEFT JOIN public.estados_tareas et ON t.id_estado_nuevo = et.id
LEFT JOIN public.edificios e ON pb.id_edificio = e.id
LEFT JOIN public.administradores adm ON e.id_administrador = adm.id
LEFT JOIN public.supervisores_tareas st ON pb.id_tarea = st.id_tarea
LEFT JOIN pf_info pfi ON pb.id_tarea = pfi.id_tarea;

-- 2. VISTA PARA ADMINS
CREATE VIEW public.vista_pb_admin AS SELECT * FROM public.vista_pb_supervisor;

-- SEGURIDAD Y PERMISOS
GRANT SELECT ON public.vista_pb_supervisor TO authenticated;
GRANT SELECT ON public.vista_pb_admin TO authenticated;
ALTER VIEW public.vista_pb_supervisor SET (security_invoker = true);
ALTER VIEW public.vista_pb_admin SET (security_invoker = true);

COMMIT;
