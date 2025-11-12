-- Crear RPC para pago masivo de liquidaciones de supervisores
-- Idempotente y seguro (admin-only mediante get_my_role())

BEGIN;

CREATE OR REPLACE FUNCTION public.pagar_liquidaciones_supervisores(
  p_ids int[],
  p_fecha timestamptz DEFAULT now()
)
RETURNS TABLE (
  cantidad_actualizadas integer,
  total_pagado numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total numeric := 0;
  v_count int := 0;
BEGIN
  -- Autorización: solo admin
  IF public.get_my_role() <> 'admin' THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  -- Sumar solo impagas a pagar
  SELECT COALESCE(SUM(ln.total_supervisor), 0)
    INTO v_total
  FROM public.liquidaciones_nuevas ln
  WHERE ln.id = ANY(p_ids)
    AND COALESCE(ln.pagada, false) = false;

  -- Marcar como pagadas solo las impagas
  UPDATE public.liquidaciones_nuevas ln
     SET pagada = true,
         fecha_pago = COALESCE(p_fecha, now()),
         updated_at = now()
   WHERE ln.id = ANY(p_ids)
     AND COALESCE(ln.pagada, false) = false;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN QUERY SELECT v_count::int, v_total::numeric;
END;
$$;

-- Endurecer permisos
REVOKE ALL ON FUNCTION public.pagar_liquidaciones_supervisores(int[], timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pagar_liquidaciones_supervisores(int[], timestamptz) TO authenticated;

COMMIT;
