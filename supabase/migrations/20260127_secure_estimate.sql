-- Create a function to estimate cost based on historical data
-- SECURE VERSION: Checks if the caller is an 'admin'
CREATE OR REPLACE FUNCTION estimar_costo_tarea(termino TEXT)
RETURNS TABLE (
  avg_materiales NUMERIC,
  avg_mano_obra NUMERIC,
  count BIGINT,
  min_total NUMERIC,
  max_total NUMERIC
) AS $$
DECLARE
  v_rol text;
BEGIN
  -- Verify user role
  SELECT rol INTO v_rol FROM usuarios WHERE id = auth.uid();
  
  IF v_rol IS NULL OR v_rol != 'admin' THEN
    RAISE EXCEPTION 'Acceso denegado: Solo administradores pueden realizar estimaciones.';
  END IF;

  RETURN QUERY
  SELECT
    ROUND(AVG(pb.materiales), 2) as avg_materiales,
    ROUND(AVG(pb.mano_obra), 2) as avg_mano_obra,
    COUNT(t.id) as count,
    MIN(pb.total) as min_total,
    MAX(pb.total) as max_total
  FROM tareas t
  JOIN presupuestos_base pb ON t.id = pb.id_tarea
  WHERE
    (t.titulo ILIKE '%' || termino || '%' OR t.descripcion ILIKE '%' || termino || '%')
    AND pb.aprobado = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
