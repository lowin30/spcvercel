-- ============================================
-- TABLA DE ALERTAS PARA SISTEMA AUTOMÁTICO
-- ============================================
-- Tabla para guardar alertas generadas por n8n

-- 1. CREAR TABLA DE ALERTAS
CREATE TABLE IF NOT EXISTS public.alertas_sistema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN (
    'tareas_urgentes',
    'gastos_pendientes',
    'liquidaciones_atrasadas',
    'trabajadores_inactivos',
    'presupuestos_vencidos',
    'documentos_faltantes'
  )),
  nivel TEXT NOT NULL DEFAULT 'medio' CHECK (nivel IN ('bajo', 'medio', 'alto', 'critico')),
  mensaje TEXT NOT NULL,
  cantidad INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  leida BOOLEAN DEFAULT false,
  leida_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  leida_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

-- 2. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_alertas_tipo ON public.alertas_sistema(tipo);
CREATE INDEX IF NOT EXISTS idx_alertas_nivel ON public.alertas_sistema(nivel);
CREATE INDEX IF NOT EXISTS idx_alertas_leida ON public.alertas_sistema(leida);
CREATE INDEX IF NOT EXISTS idx_alertas_created_at ON public.alertas_sistema(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alertas_expires_at ON public.alertas_sistema(expires_at);

-- 3. RLS POLICIES
ALTER TABLE public.alertas_sistema ENABLE ROW LEVEL SECURITY;

-- Policy: Admin puede ver todas las alertas
DROP POLICY IF EXISTS "Admin can view all alerts" ON public.alertas_sistema;
CREATE POLICY "Admin can view all alerts"
  ON public.alertas_sistema
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios 
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

-- Policy: Admin puede crear alertas (para testing manual)
DROP POLICY IF EXISTS "Admin can create alerts" ON public.alertas_sistema;
CREATE POLICY "Admin can create alerts"
  ON public.alertas_sistema
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios 
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

-- Policy: Admin puede marcar alertas como leídas
DROP POLICY IF EXISTS "Admin can update alerts" ON public.alertas_sistema;
CREATE POLICY "Admin can update alerts"
  ON public.alertas_sistema
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios 
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

-- Policy: Service role puede crear alertas (para n8n)
DROP POLICY IF EXISTS "Service role can create alerts" ON public.alertas_sistema;
CREATE POLICY "Service role can create alerts"
  ON public.alertas_sistema
  FOR INSERT
  WITH CHECK (true); -- Service role bypasses RLS pero igual agregamos policy

-- 4. RPC FUNCTION: Obtener alertas no leídas
CREATE OR REPLACE FUNCTION public.obtener_alertas_activas(
  p_limite INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  tipo TEXT,
  nivel TEXT,
  mensaje TEXT,
  cantidad INTEGER,
  created_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Solo admin puede ver alertas
  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE id = auth.uid() AND rol = 'admin'
  ) THEN
    RAISE EXCEPTION 'Solo administradores pueden ver alertas';
  END IF;
  
  -- Retornar alertas no leídas y no expiradas
  RETURN QUERY
  SELECT 
    a.id,
    a.tipo::TEXT,
    a.nivel::TEXT,
    a.mensaje::TEXT,
    a.cantidad::INTEGER,
    a.created_at
  FROM public.alertas_sistema a
  WHERE a.leida = false
    AND (a.expires_at IS NULL OR a.expires_at > NOW())
  ORDER BY 
    CASE a.nivel
      WHEN 'critico' THEN 1
      WHEN 'alto' THEN 2
      WHEN 'medio' THEN 3
      WHEN 'bajo' THEN 4
    END,
    a.created_at DESC
  LIMIT p_limite;
END;
$$;

-- 5. RPC FUNCTION: Marcar alerta como leída
CREATE OR REPLACE FUNCTION public.marcar_alerta_leida(
  p_alerta_id UUID
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Solo admin puede marcar alertas
  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE id = auth.uid() AND rol = 'admin'
  ) THEN
    RAISE EXCEPTION 'Solo administradores pueden marcar alertas';
  END IF;
  
  -- Actualizar alerta
  UPDATE public.alertas_sistema
  SET 
    leida = true,
    leida_por = auth.uid(),
    leida_at = NOW()
  WHERE id = p_alerta_id;
  
  RETURN FOUND;
END;
$$;

-- 6. RPC FUNCTION: Limpiar alertas expiradas (ejecutar desde n8n diariamente)
CREATE OR REPLACE FUNCTION public.limpiar_alertas_expiradas()
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  -- Eliminar alertas expiradas
  DELETE FROM public.alertas_sistema
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  
  RETURN v_deleted;
END;
$$;

-- 7. TRIGGER: Auto-expirar alertas antiguas leídas
CREATE OR REPLACE FUNCTION public.auto_expire_read_alerts()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.leida = true AND OLD.leida = false THEN
    NEW.expires_at := NOW() + INTERVAL '24 hours';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_expire_alerts
  BEFORE UPDATE ON public.alertas_sistema
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_expire_read_alerts();

-- 8. VISTA: Resumen de alertas por tipo y nivel
CREATE OR REPLACE VIEW public.vista_resumen_alertas AS
SELECT
  tipo,
  nivel,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE leida = false) AS sin_leer,
  MAX(created_at) AS ultima_alerta
FROM public.alertas_sistema
WHERE expires_at > NOW() OR expires_at IS NULL
GROUP BY tipo, nivel
ORDER BY 
  CASE nivel
    WHEN 'critico' THEN 1
    WHEN 'alto' THEN 2
    WHEN 'medio' THEN 3
    WHEN 'bajo' THEN 4
  END,
  total DESC;

-- Grant de permisos
GRANT SELECT ON public.vista_resumen_alertas TO authenticated;

-- 9. SEED: Datos de ejemplo (opcional - comentar si no quieres ejemplos)
/*
INSERT INTO public.alertas_sistema (tipo, nivel, mensaje, cantidad, metadata) VALUES
('tareas_urgentes', 'alto', 'Hay 5 tareas que vencen mañana: Mitre 4483 piso 4, Aguero 1659, Rivadavia 1954, Pujol 1069, Yrigoyen 1983', 5, '{"criticas": 5, "total": 24}'::jsonb),
('gastos_pendientes', 'medio', 'Tienes $45,000 en gastos sin liquidar de la última semana', 3, '{"monto": 45000, "dias": 7}'::jsonb),
('liquidaciones_atrasadas', 'critico', 'Hay 8 liquidaciones pendientes hace más de 15 días', 8, '{"dias_promedio": 18}'::jsonb);
*/

-- 10. COMENTARIOS
COMMENT ON TABLE public.alertas_sistema IS 
  'Tabla de alertas generadas automáticamente por workflows de n8n';

COMMENT ON FUNCTION public.obtener_alertas_activas IS 
  'Obtiene alertas no leídas y no expiradas para el admin';

COMMENT ON FUNCTION public.marcar_alerta_leida IS 
  'Marca una alerta como leída por el usuario actual';

COMMENT ON FUNCTION public.limpiar_alertas_expiradas IS 
  'Limpia alertas expiradas (ejecutar diariamente desde n8n)';

-- ============================================
-- COMPLETADO ✅
-- ============================================
-- Ejecuta este SQL en Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Pega y Run
-- ============================================
