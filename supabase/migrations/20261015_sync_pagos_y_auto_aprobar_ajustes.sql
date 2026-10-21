-- migracion quirurgica: sincronizacion automatica de pagos y auto-aprobacion de ajustes
-- fecha: 2026-10-15
-- objetivo: 
-- 1. trigger en pagos_facturas para recalcular saldo, total_pagado y estado 5 (pagado) en facturas.
-- 2. funcion auto_aprobar_ajustes_factura_pagada robusta ante facturas saldadas o pagadas.

CREATE OR REPLACE FUNCTION public.auto_aprobar_ajustes_factura_pagada()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_estado_factura INTEGER;
  v_saldo_pendiente NUMERIC;
  v_pagada BOOLEAN;
BEGIN
  -- obtener estado, saldo y bandera de la factura
  SELECT id_estado_nuevo, COALESCE(saldo_pendiente, 0), COALESCE(pagada, false)
  INTO v_estado_factura, v_saldo_pendiente, v_pagada
  FROM facturas 
  WHERE id = NEW.id_factura;
  
  -- auto-aprobar si esta pagada (estado 5, saldo cero o pagada = true)
  IF v_estado_factura = 5 OR v_saldo_pendiente <= 0.01 OR v_pagada = true THEN
    NEW.aprobado := true;
    NEW.fecha_aprobacion := COALESCE(NEW.fecha_aprobacion, NOW());
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_sync_pago_a_factura()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_factura_id INTEGER;
  v_total_pagado NUMERIC;
  v_total_factura NUMERIC;
  v_nuevo_saldo NUMERIC;
  v_nuevo_estado INTEGER;
BEGIN
  v_factura_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.id_factura ELSE NEW.id_factura END;

  IF v_factura_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT total INTO v_total_factura
  FROM facturas
  WHERE id = v_factura_id;

  IF v_total_factura IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(SUM(monto_pagado), 0)
  INTO v_total_pagado
  FROM pagos_facturas
  WHERE id_factura = v_factura_id;

  v_nuevo_saldo := GREATEST(0, v_total_factura - v_total_pagado);

  IF v_nuevo_saldo <= 0.01 THEN
    v_nuevo_estado := 5; -- pagado
  ELSIF v_total_pagado > 0 THEN
    v_nuevo_estado := 3; -- parcialmente pagado
  ELSE
    v_nuevo_estado := 2; -- no pagado
  END IF;

  UPDATE facturas
  SET 
    total_pagado = v_total_pagado,
    saldo_pendiente = v_nuevo_saldo,
    id_estado_nuevo = v_nuevo_estado,
    pagada = (v_nuevo_saldo <= 0.01)
  WHERE id = v_factura_id
    AND (
      total_pagado IS DISTINCT FROM v_total_pagado OR
      saldo_pendiente IS DISTINCT FROM v_nuevo_saldo OR
      id_estado_nuevo IS DISTINCT FROM v_nuevo_estado OR
      pagada IS DISTINCT FROM (v_nuevo_saldo <= 0.01)
    );

  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_pago_a_factura ON pagos_facturas;
CREATE TRIGGER trg_sync_pago_a_factura
AFTER INSERT OR UPDATE OR DELETE ON pagos_facturas
FOR EACH ROW
EXECUTE FUNCTION fn_sync_pago_a_factura();
