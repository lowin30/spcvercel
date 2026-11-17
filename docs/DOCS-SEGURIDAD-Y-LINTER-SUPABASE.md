# protocolo de seguridad y resolucion del linter de supabase (spc)

fecha de aprobacion: 2026-11-09  
estado: activo / obligatorio  

---

## 1. resumen ejecutivo del blindaje

se ejecutaron 4 etapas quirurgicas en postgresql para resolver advertencias del linter oficial de supabase sin quebrar ninguna funcionalidad operativa ni comercial:

1. **eliminacion de objetos deprecados y cron zombie**:
   - eliminadas definitivamente de postgres las 3 vistas en desuso: `mv_finanzas_supervisor_deprecated`, `vista_asignaciones_tareas_supervisores_deprecated` y `vista_liquidaciones_items_deprecated`.
   - desprogramado el cron job 1 que ejecutaba cada 5 minutos un comando huerfano en bucle.
2. **blindaje de funciones y endpoints rpc (60+ warnings resueltos)**:
   - 88 funciones blindadas fijando `search_path = public, extensions` para neutralizar riesgos de secuestro de esquemas.
   - revocado el permiso `EXECUTE` a `anon` y `public` en todo el esquema public. ninguna funcion interna ni disparador puede invocarse desde la api externa sin inicio de sesion valido.
   - permisos otorgados exclusivamente a `authenticated` y `service_role`.
3. **correccion rls en microtareas**:
   - reemplazada la regla abierta `Microtareas: Acceso total` por `Microtareas: Acceso autenticados` exigiendo `auth.uid() IS NOT NULL`.
4. **correccion de vistas en el linter (20 vistas actualizadas con `security_invoker = true`)**:
   - 13 vistas de administracion: `vista_pb_admin`, `vista_comprobantes_admin_v4`, `vista_auditoria_admin_balances`, `vista_finanzas_admin`, `vista_tareas_admin`, `vista_admin_liquidaciones_sin_pf`, `vista_admin_pb_sin_aprobar`, `vista_admin_pf_aprobado_sin_factura`, `vista_admin_pb_finalizada_sin_pf`, `vista_admin_pf_enviado_sin_actividad`, `vista_admin_pf_enviado_sin_aprobar`, `vista_administradores`, `vista_actividad_maestra_god_mode`.
   - 7 vistas operativas compartidas: `vista_presupuestos_finales_completa`, `vista_facturas_completa`, `vista_edificios_completa`, `vista_agenda_operativa_unificada`, `vista_tareas_completa`, `vista_tareas_supervisor`, `vista_presupuestos_base_completa`.
5. **resguardo estricto de las 4 vistas confidenciales (`SECURITY DEFINER` intencional)**:
   - se conservan como `SECURITY DEFINER`: `vista_pb_supervisor`, `vista_liquidaciones_completa`, `vista_liquidaciones_supervisores_listado`, `vista_cuenta_corriente_supervisores`.

---

## 2. las 5 reglas de oro para cualquier auditoria futura

### regla 1: no caer en la trampa de activar `security_invoker = true` a ciegas
- **el peligro**: el linter marca como error cualquier vista sin `security_invoker = true`. pero si esa vista hace join con una tabla a la que el usuario logueado no tiene acceso rls, la consulta fallara con `permission denied` o entregara datos en blanco.
- **que hacer**: antes de cambiar una vista a `security_invoker = true`, audita siempre que tablas lee. si lee tablas restringidas, la vista debe seguir siendo `SECURITY DEFINER`.

### regla 2: ceguera del supervisor (ley suprema del negocio)
- **el principio**: el supervisor jamas puede leer la tabla `presupuestos_finales`, ni las facturas a clientes, ni los sueldos base de los trabajadores en `configuracion_trabajadores`.
- **el cuidado**: nunca crees politicas rls de lectura en `presupuestos_finales` para supervisores solo para conformar al linter. es preferible tolerar el aviso del linter que romper la confidencialidad financiera de la empresa.

### regla 3: plantilla obligatoria para funciones nuevas
cada vez que crees una funcion en postgresql, redactala siempre con esta estructura para que no genere advertencias:
```sql
CREATE OR REPLACE FUNCTION public.mi_funcion()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions -- 1. obligatorio: elimina warning de search_path
AS $$
BEGIN
  -- logica
END;
$$;

-- 2. obligatorio: revocar acceso a usuarios sin login
REVOKE EXECUTE ON FUNCTION public.mi_funcion() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.mi_funcion() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mi_funcion() TO service_role;
```

### regla 4: prohibido `USING (true)` en politicas rls de escritura
- **el principio**: usar `USING (true)` o `WITH CHECK (true)` en insert, update o delete equivale a tener la seguridad apagada.
- **el cuidado**: como minimo exige que el usuario este autenticado:
```sql
TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
```

### regla 5: si borras una vista materializada, revisa siempre `cron.job`
si alguna vez borras o renombras una tabla o vista que tenia automatizacion, verifica siempre:
```sql
SELECT jobid, command FROM cron.job;
```
y si quedo el job huerfano, desprogramalo con `SELECT cron.unschedule(jobid);` para no saturar los registros del servidor con errores en bucle.
