## seguridad, rls y resolucion del linter de supabase

1. ley de oro (ceguera del supervisor):
- el supervisor jamas puede leer la tabla 'presupuestos_finales', ni facturas a clientes, ni sueldos base en 'configuracion_trabajadores'.
- prohibido crear politicas rls en esas tablas para complacer al linter.

2. vistas y security_invoker:
- las 4 vistas operativas de supervisores ('vista_pb_supervisor', 'vista_liquidaciones_completa', 'vista_liquidaciones_supervisores_listado', 'vista_cuenta_corriente_supervisores') deben conservarse siempre como SECURITY DEFINER intencionales para actuar como cajas negras y no romper la ceguera del supervisor.
- solo las 13 vistas administrativas y las 7 vistas operativas generales llevan 'security_invoker = true'.
- prohibido aplicar bucles automaticos de security_invoker sobre todas las vistas.

3. funciones y rpc publicas:
- toda funcion nueva debe tener 'SET search_path = public, extensions'.
- revocar siempre permisos 'EXECUTE' a 'anon' y 'public'. conceder solo a 'authenticated' y 'service_role'.

4. politicas rls de escritura:
- prohibido 'USING (true)' o 'WITH CHECK (true)' en INSERT, UPDATE o DELETE. exigir siempre 'auth.uid() IS NOT NULL'.
