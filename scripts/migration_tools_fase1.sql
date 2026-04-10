-- =====================================================
-- migracion: tools modulares fase 1
-- EJECUTAR EN ORDEN: paso 1 → paso 2 → paso 3
-- =====================================================

-- =====================================================
-- PASO 1: añadir columna estado a partes_de_trabajo
-- (ejecutar primero, es seguro y reversible)
-- =====================================================
ALTER TABLE public.partes_de_trabajo
ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'confirmado';

ALTER TABLE public.partes_de_trabajo
DROP CONSTRAINT IF EXISTS partes_de_trabajo_estado_check;

ALTER TABLE public.partes_de_trabajo
ADD CONSTRAINT partes_de_trabajo_estado_check
CHECK (estado IN ('proyectado', 'confirmado'));

COMMENT ON COLUMN partes_de_trabajo.estado IS 'estado del parte: proyectado (planificacion) o confirmado (realidad). solo los confirmados cuentan para liquidaciones y costes.';

-- =====================================================
-- PASO 2: actualizar trigger de capacidad diaria
-- los registros proyectados NO consumen capacidad
-- =====================================================
CREATE OR REPLACE FUNCTION spc_enforce_capacidad_diaria_v1()
RETURNS TRIGGER AS $$
DECLARE
  suma_existente NUMERIC := 0;
  valor_nuevo    NUMERIC := 0;
BEGIN
  -- los registros proyectados no consumen capacidad diaria
  IF NEW.estado = 'proyectado' THEN
    RETURN NEW;
  END IF;

  IF NEW.tipo_jornada = 'dia_completo' THEN
    valor_nuevo := 1;
  ELSIF NEW.tipo_jornada = 'medio_dia' THEN
    valor_nuevo := 0.5;
  ELSE
    valor_nuevo := 0;
  END IF;

  -- lock transaccional por (id_trabajador, fecha)
  PERFORM pg_advisory_xact_lock(
    (('x' || substr(md5(NEW.id_trabajador::text || '|' || NEW.fecha::text), 1, 16))::bit(64))::bigint
  );

  -- solo contar registros CONFIRMADOS
  SELECT COALESCE(SUM(
           CASE
             WHEN tipo_jornada = 'dia_completo' THEN 1::NUMERIC
             WHEN tipo_jornada = 'medio_dia'    THEN 0.5::NUMERIC
             ELSE 0::NUMERIC
           END
         ), 0::NUMERIC)
    INTO suma_existente
  FROM public.partes_de_trabajo
  WHERE id_trabajador = NEW.id_trabajador
    AND fecha = NEW.fecha
    AND estado = 'confirmado'
    AND (TG_OP <> 'UPDATE' OR id <> NEW.id);

  IF (suma_existente + valor_nuevo) > 1 THEN
    RAISE EXCEPTION
      'Capacidad diaria excedida: trabajador=% fecha=% (actual=%, nuevo=%, total=%)',
      NEW.id_trabajador,
      NEW.fecha,
      to_char(suma_existente, 'FM999999990.00'),
      to_char(valor_nuevo, 'FM999999990.00'),
      to_char(suma_existente + valor_nuevo, 'FM999999990.00')
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PASO 3: actualizar vista god mode
-- IMPORTANTE: usamos DROP + CREATE (no CREATE OR REPLACE)
-- porque añadimos la columna 'estado' que no existia antes
-- =====================================================
DROP VIEW IF EXISTS vista_actividad_maestra_god_mode;

CREATE VIEW vista_actividad_maestra_god_mode AS
WITH actividad_unificada AS (
    SELECT ('J-'::text || (partes_de_trabajo.id)::text) AS event_id,
        partes_de_trabajo.fecha,
        partes_de_trabajo.id_trabajador AS id_usuario,
        partes_de_trabajo.id_tarea,
        'JORNAL'::text AS tipo_evento,
        partes_de_trabajo.tipo_jornada AS detalle_tipo,
        fn_calcular_costo_jornal(partes_de_trabajo.id_trabajador, partes_de_trabajo.tipo_jornada) AS monto,
        partes_de_trabajo.liquidado,
        partes_de_trabajo.id_liquidacion,
        partes_de_trabajo.comentarios AS descripcion,
        partes_de_trabajo.created_at,
        partes_de_trabajo.estado,
        NULL::text AS comprobante_url
       FROM partes_de_trabajo
    UNION ALL
     SELECT ('G-'::text || (gastos_tarea.id)::text) AS event_id,
        gastos_tarea.fecha_gasto AS fecha,
        gastos_tarea.id_usuario,
        gastos_tarea.id_tarea,
        'GASTO'::text AS tipo_evento,
        gastos_tarea.tipo_gasto AS detalle_tipo,
        (gastos_tarea.monto)::numeric AS monto,
        gastos_tarea.liquidado,
        gastos_tarea.id_liquidacion,
        gastos_tarea.descripcion,
        gastos_tarea.created_at,
        'confirmado'::text AS estado,
        gastos_tarea.comprobante_url
       FROM gastos_tarea
    )
 SELECT a.event_id,
    a.fecha,
    a.id_usuario,
    a.id_tarea,
    a.tipo_evento,
    a.detalle_tipo,
    a.monto,
    a.liquidado,
    a.id_liquidacion,
    a.descripcion,
    a.created_at,
    u.email AS email_usuario,
    u.nombre AS nombre_usuario,
    u.rol AS rol_usuario,
    t.titulo AS titulo_tarea,
    t.code AS codigo_tarea,
    e.nombre AS nombre_edificio,
    e.direccion AS direccion_edificio,
    st.id_supervisor,
    jsonb_build_object('color_perfil', u.color_perfil, 'icon',
        CASE
            WHEN (a.tipo_evento = 'JORNAL'::text) THEN 'calendar'::text
            ELSE 'receipt'::text
        END, 'status_color',
        CASE
            WHEN a.liquidado THEN '#10b981'::text
            ELSE '#f59e0b'::text
        END) AS ui_metadata,
    CASE
        WHEN a.tipo_evento = 'JORNAL' THEN (
            SELECT pt.estado FROM partes_de_trabajo pt WHERE pt.id = a.event_id
        )
        ELSE 'confirmado'::text
    END AS estado
   FROM ((((actividad_unificada a
     JOIN usuarios u ON ((a.id_usuario = u.id)))
     JOIN tareas t ON ((a.id_tarea = t.id)))
     JOIN edificios e ON ((t.id_edificio = e.id)))
     LEFT JOIN supervisores_tareas st ON ((st.id_tarea = t.id)));
