-- ============================================
-- MEMORIA CONVERSACIONAL PARA CHATBOT IA
-- ============================================
-- Crea tabla para guardar historial de chat
-- con RLS para que cada usuario solo vea sus conversaciones

-- 1. CREAR TABLA DE CONVERSACIONES
CREATE TABLE IF NOT EXISTS public.chat_conversaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Índices para búsqueda rápida
  CONSTRAINT unique_user_session UNIQUE (user_id, session_id)
);

-- 2. CREAR TABLA DE MENSAJES
CREATE TABLE IF NOT EXISTS public.chat_mensajes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversacion_id UUID NOT NULL REFERENCES public.chat_conversaciones(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  function_call TEXT,
  function_result JSONB,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 3. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_chat_conversaciones_user_id 
  ON public.chat_conversaciones(user_id);

CREATE INDEX IF NOT EXISTS idx_chat_conversaciones_session_id 
  ON public.chat_conversaciones(session_id);

CREATE INDEX IF NOT EXISTS idx_chat_conversaciones_updated_at 
  ON public.chat_conversaciones(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_mensajes_conversacion_id 
  ON public.chat_mensajes(conversacion_id);

CREATE INDEX IF NOT EXISTS idx_chat_mensajes_created_at 
  ON public.chat_mensajes(created_at DESC);

-- 4. TRIGGER PARA ACTUALIZAR updated_at
CREATE OR REPLACE FUNCTION public.update_chat_conversacion_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chat_conversaciones
  SET updated_at = NOW()
  WHERE id = NEW.conversacion_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversacion_timestamp
  AFTER INSERT ON public.chat_mensajes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chat_conversacion_timestamp();

-- 5. RLS POLICIES
ALTER TABLE public.chat_conversaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_mensajes ENABLE ROW LEVEL SECURITY;

-- Policy: Usuarios solo ven sus propias conversaciones
DROP POLICY IF EXISTS "Users can view own conversations" ON public.chat_conversaciones;
CREATE POLICY "Users can view own conversations"
  ON public.chat_conversaciones
  FOR SELECT
  USING (
    user_id = auth.uid() 
    OR 
    EXISTS (
      SELECT 1 FROM public.usuarios 
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

-- Policy: Usuarios pueden crear sus conversaciones
DROP POLICY IF EXISTS "Users can create own conversations" ON public.chat_conversaciones;
CREATE POLICY "Users can create own conversations"
  ON public.chat_conversaciones
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy: Usuarios pueden actualizar sus conversaciones
DROP POLICY IF EXISTS "Users can update own conversations" ON public.chat_conversaciones;
CREATE POLICY "Users can update own conversations"
  ON public.chat_conversaciones
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy: Usuarios solo ven mensajes de sus conversaciones
DROP POLICY IF EXISTS "Users can view own messages" ON public.chat_mensajes;
CREATE POLICY "Users can view own messages"
  ON public.chat_mensajes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversaciones 
      WHERE id = conversacion_id 
      AND (
        user_id = auth.uid() 
        OR 
        EXISTS (
          SELECT 1 FROM public.usuarios 
          WHERE id = auth.uid() AND rol = 'admin'
        )
      )
    )
  );

-- Policy: Usuarios pueden crear mensajes en sus conversaciones
DROP POLICY IF EXISTS "Users can create messages" ON public.chat_mensajes;
CREATE POLICY "Users can create messages"
  ON public.chat_mensajes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_conversaciones 
      WHERE id = conversacion_id 
      AND user_id = auth.uid()
    )
  );

-- 6. RPC FUNCTION: Obtener historial de conversación
CREATE OR REPLACE FUNCTION public.obtener_historial_chat(
  p_session_id TEXT,
  p_limite INTEGER DEFAULT 10
)
RETURNS TABLE (
  role TEXT,
  content TEXT,
  created_at TIMESTAMPTZ
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_conversacion_id UUID;
BEGIN
  -- Obtener o crear conversación
  SELECT c.id INTO v_conversacion_id
  FROM public.chat_conversaciones c
  WHERE c.user_id = auth.uid()
    AND c.session_id = p_session_id;
  
  -- Si no existe, crearla
  IF v_conversacion_id IS NULL THEN
    INSERT INTO public.chat_conversaciones (user_id, session_id)
    VALUES (auth.uid(), p_session_id)
    RETURNING id INTO v_conversacion_id;
  END IF;
  
  -- Retornar últimos N mensajes
  RETURN QUERY
  SELECT 
    m.role::TEXT,
    m.content::TEXT,
    m.created_at
  FROM public.chat_mensajes m
  WHERE m.conversacion_id = v_conversacion_id
  ORDER BY m.created_at DESC
  LIMIT p_limite;
END;
$$;

-- 7. RPC FUNCTION: Guardar mensaje en conversación
CREATE OR REPLACE FUNCTION public.guardar_mensaje_chat(
  p_session_id TEXT,
  p_role TEXT,
  p_content TEXT,
  p_function_call TEXT DEFAULT NULL,
  p_function_result JSONB DEFAULT NULL,
  p_tokens_used INTEGER DEFAULT NULL
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_conversacion_id UUID;
  v_mensaje_id UUID;
BEGIN
  -- Obtener o crear conversación
  SELECT c.id INTO v_conversacion_id
  FROM public.chat_conversaciones c
  WHERE c.user_id = auth.uid()
    AND c.session_id = p_session_id;
  
  IF v_conversacion_id IS NULL THEN
    INSERT INTO public.chat_conversaciones (user_id, session_id)
    VALUES (auth.uid(), p_session_id)
    RETURNING id INTO v_conversacion_id;
  END IF;
  
  -- Insertar mensaje
  INSERT INTO public.chat_mensajes (
    conversacion_id,
    role,
    content,
    function_call,
    function_result,
    tokens_used
  )
  VALUES (
    v_conversacion_id,
    p_role,
    p_content,
    p_function_call,
    p_function_result,
    p_tokens_used
  )
  RETURNING id INTO v_mensaje_id;
  
  RETURN v_mensaje_id;
END;
$$;

-- 8. RPC FUNCTION: Limpiar conversaciones antiguas (admin only)
CREATE OR REPLACE FUNCTION public.limpiar_conversaciones_antiguas(
  p_dias INTEGER DEFAULT 90
)
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  -- Solo admin puede ejecutar
  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE id = auth.uid() AND rol = 'admin'
  ) THEN
    RAISE EXCEPTION 'Solo administradores pueden limpiar conversaciones';
  END IF;
  
  -- Eliminar conversaciones sin actividad en X días
  DELETE FROM public.chat_conversaciones
  WHERE updated_at < NOW() - (p_dias || ' days')::INTERVAL;
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  
  RETURN v_deleted;
END;
$$;

-- 9. VISTA: Estadísticas de uso del chatbot (admin)
CREATE OR REPLACE VIEW public.vista_stats_chatbot AS
SELECT
  u.nombre AS supervisor_nombre,
  u.rol,
  COUNT(DISTINCT c.id) AS conversaciones_totales,
  COUNT(m.id) AS mensajes_totales,
  COALESCE(SUM(m.tokens_used), 0) AS tokens_usados,
  MAX(c.updated_at) AS ultima_actividad,
  COUNT(DISTINCT DATE(c.created_at)) AS dias_activos
FROM public.usuarios u
LEFT JOIN public.chat_conversaciones c ON c.user_id = u.id
LEFT JOIN public.chat_mensajes m ON m.conversacion_id = c.id
GROUP BY u.id, u.nombre, u.rol
ORDER BY mensajes_totales DESC;

-- Grant de permisos
GRANT SELECT ON public.vista_stats_chatbot TO authenticated;

-- 10. COMENTARIOS
COMMENT ON TABLE public.chat_conversaciones IS 
  'Tabla de conversaciones del chatbot IA con RLS por usuario';

COMMENT ON TABLE public.chat_mensajes IS 
  'Mensajes individuales de cada conversación con metadata';

COMMENT ON FUNCTION public.obtener_historial_chat IS 
  'Obtiene últimos N mensajes de la conversación del usuario autenticado';

COMMENT ON FUNCTION public.guardar_mensaje_chat IS 
  'Guarda un nuevo mensaje en la conversación del usuario autenticado';

-- ============================================
-- COMPLETADO ✅
-- ============================================
-- Ejecuta este SQL en Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Pega y Run
-- ============================================
