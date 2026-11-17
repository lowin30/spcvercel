-- migracion: activar security_invoker = true en vistas seguras y administrativas
-- protocolo platinum: cero fugas rls, proteccion estricta de presupuestos_finales

-- 1. vistas de administracion
ALTER VIEW public.vista_pb_admin SET (security_invoker = true);
ALTER VIEW public.vista_comprobantes_admin_v4 SET (security_invoker = true);
ALTER VIEW public.vista_auditoria_admin_balances SET (security_invoker = true);
ALTER VIEW public.vista_finanzas_admin SET (security_invoker = true);
ALTER VIEW public.vista_tareas_admin SET (security_invoker = true);
ALTER VIEW public.vista_admin_liquidaciones_sin_pf SET (security_invoker = true);
ALTER VIEW public.vista_admin_pb_sin_aprobar SET (security_invoker = true);
ALTER VIEW public.vista_admin_pf_aprobado_sin_factura SET (security_invoker = true);
ALTER VIEW public.vista_admin_pb_finalizada_sin_pf SET (security_invoker = true);
ALTER VIEW public.vista_admin_pf_enviado_sin_actividad SET (security_invoker = true);
ALTER VIEW public.vista_admin_pf_enviado_sin_aprobar SET (security_invoker = true);
ALTER VIEW public.vista_administradores SET (security_invoker = true);
ALTER VIEW public.vista_actividad_maestra_god_mode SET (security_invoker = true);

-- 2. vistas operativas seguras
ALTER VIEW public.vista_presupuestos_finales_completa SET (security_invoker = true);
ALTER VIEW public.vista_facturas_completa SET (security_invoker = true);
ALTER VIEW public.vista_edificios_completa SET (security_invoker = true);
ALTER VIEW public.vista_agenda_operativa_unificada SET (security_invoker = true);
ALTER VIEW public.vista_tareas_completa SET (security_invoker = true);
ALTER VIEW public.vista_tareas_supervisor SET (security_invoker = true);
ALTER VIEW public.vista_presupuestos_base_completa SET (security_invoker = true);
