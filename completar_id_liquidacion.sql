-- SOLUCIÓN PARA LLENAR EL CAMPO id_liquidacion
-- Este script:
-- 1. Crea registros en liquidaciones_nuevas para cada liquidación de trabajador
-- 2. Actualiza partes_de_trabajo con estos nuevos IDs

-- PARTE 1: EXPLORACIÓN DE LIQUIDACIONES_NUEVAS
-- Verificar exactamente qué columnas son obligatorias en esta tabla

SELECT 
  column_name, 
  data_type,
  is_nullable 
FROM 
  information_schema.columns 
WHERE 
  table_name = 'liquidaciones_nuevas' 
ORDER BY 
  ordinal_position;

-- PARTE 2: CREAR REGISTROS EN LIQUIDACIONES_NUEVAS

-- Creamos una tabla temporal para almacenar los mapeos
CREATE TEMPORARY TABLE temp_mapping_liquidaciones (
  id_liquidacion_trabajador INTEGER PRIMARY KEY,
  id_liquidacion_nueva INTEGER
);

-- Función para insertar en liquidaciones_nuevas de manera segura
CREATE OR REPLACE FUNCTION crear_liquidacion_nueva_para_trabajador(
  p_id_liquidacion_trabajador INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  v_liquidacion_nueva_id INTEGER;
  v_datos_liquidacion RECORD;
BEGIN
  -- Obtenemos los datos de la liquidación de trabajador
  SELECT 
    lt.id_trabajador, 
    lt.semana_inicio, 
    lt.semana_fin,
    lt.total_dias,
    lt.total_pagar,
    lt.observaciones
  INTO v_datos_liquidacion
  FROM liquidaciones_trabajadores lt
  WHERE lt.id = p_id_liquidacion_trabajador;
  
  -- Insertamos un registro en liquidaciones_nuevas con los campos mínimos necesarios
  -- Ajusta esta inserción según las columnas que existan y sean obligatorias en tu tabla
  INSERT INTO liquidaciones_nuevas(
    fecha_creacion
    -- Añade aquí otras columnas obligatorias
  ) VALUES (
    CURRENT_DATE
    -- Añade aquí los valores correspondientes
  )
  RETURNING id INTO v_liquidacion_nueva_id;
  
  -- Guardamos el mapeo en la tabla temporal
  INSERT INTO temp_mapping_liquidaciones (id_liquidacion_trabajador, id_liquidacion_nueva)
  VALUES (p_id_liquidacion_trabajador, v_liquidacion_nueva_id);
  
  RETURN v_liquidacion_nueva_id;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error al crear liquidación nueva: %', SQLERRM;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Creamos registros para todas las liquidaciones de trabajadores
DO $$
DECLARE
  liq RECORD;
  v_nueva_id INTEGER;
BEGIN
  FOR liq IN 
    SELECT id FROM liquidaciones_trabajadores
  LOOP
    v_nueva_id := crear_liquidacion_nueva_para_trabajador(liq.id);
    IF v_nueva_id IS NOT NULL THEN
      RAISE NOTICE 'Creada liquidación nueva ID: % para trabajador liquidación ID: %', 
                   v_nueva_id, liq.id;
    END IF;
  END LOOP;
END $$;

-- PARTE 3: ACTUALIZAR PARTES DE TRABAJO

DO $$
DECLARE
  liq RECORD;
  v_liquidacion_nueva_id INTEGER;
  registros_actualizados INTEGER;
BEGIN
  FOR liq IN 
    SELECT 
      lt.id, lt.id_trabajador, lt.semana_inicio, lt.semana_fin,
      tm.id_liquidacion_nueva
    FROM liquidaciones_trabajadores lt
    JOIN temp_mapping_liquidaciones tm ON lt.id = tm.id_liquidacion_trabajador
  LOOP
    -- Actualizamos partes_de_trabajo con el ID correcto
    UPDATE partes_de_trabajo
    SET 
      liquidado = true,
      id_liquidacion = liq.id_liquidacion_nueva
    WHERE 
      id_trabajador = liq.id_trabajador
      AND fecha BETWEEN liq.semana_inicio AND liq.semana_fin
      AND id_liquidacion IS NULL;
      
    GET DIAGNOSTICS registros_actualizados = ROW_COUNT;
    RAISE NOTICE 'Actualizados % partes para trabajador ID: %, con liquidación nueva ID: %', 
                 registros_actualizados, liq.id_trabajador, liq.id_liquidacion_nueva;
  END LOOP;
END $$;

-- PARTE 4: CREAR TRIGGER PARA AUTOMATIZACIÓN FUTURA

DROP TRIGGER IF EXISTS trigger_actualizar_partes_trabajo ON liquidaciones_trabajadores;
DROP FUNCTION IF EXISTS actualizar_partes_trabajo_por_liquidacion;

-- Función trigger mejorada
CREATE OR REPLACE FUNCTION actualizar_partes_trabajo_por_liquidacion()
RETURNS TRIGGER AS $$
DECLARE
  v_liquidacion_nueva_id INTEGER;
  registros_actualizados INTEGER;
BEGIN
  -- Crear liquidación nueva correspondiente
  INSERT INTO liquidaciones_nuevas(
    fecha_creacion
    -- Añadir otras columnas necesarias
  ) VALUES (
    CURRENT_DATE
    -- Añadir otros valores necesarios
  )
  RETURNING id INTO v_liquidacion_nueva_id;
  
  IF v_liquidacion_nueva_id IS NULL THEN
    RAISE NOTICE 'Error al crear liquidación nueva';
    
    -- Actualizar solo liquidado
    UPDATE partes_de_trabajo
    SET liquidado = true
    WHERE 
      id_trabajador = NEW.id_trabajador
      AND fecha BETWEEN NEW.semana_inicio AND NEW.semana_fin
      AND (liquidado = false OR liquidado IS NULL);
  ELSE
    -- Actualizar ambos campos
    UPDATE partes_de_trabajo
    SET 
      liquidado = true,
      id_liquidacion = v_liquidacion_nueva_id
    WHERE 
      id_trabajador = NEW.id_trabajador
      AND fecha BETWEEN NEW.semana_inicio AND NEW.semana_fin
      AND (liquidado = false OR liquidado IS NULL);
      
    GET DIAGNOSTICS registros_actualizados = ROW_COUNT;
    RAISE NOTICE 'Actualización completa - Liquidación nueva ID: %, Actualizados: % partes', 
                 v_liquidacion_nueva_id, registros_actualizados;
  END IF;
               
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error en actualización: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
CREATE TRIGGER trigger_actualizar_partes_trabajo
AFTER INSERT ON liquidaciones_trabajadores
FOR EACH ROW
EXECUTE FUNCTION actualizar_partes_trabajo_por_liquidacion();

-- PARTE 5: VERIFICACIÓN FINAL

-- Verificar partes de trabajo actualizados
SELECT 
  pt.id, 
  pt.fecha, 
  pt.liquidado, 
  pt.id_liquidacion,
  lt.id as id_liquidacion_trabajador,
  ln.id as id_liquidacion_nueva
FROM 
  partes_de_trabajo pt
  LEFT JOIN liquidaciones_trabajadores lt ON 
    pt.id_trabajador = lt.id_trabajador AND 
    pt.fecha BETWEEN lt.semana_inicio AND lt.semana_fin
  LEFT JOIN liquidaciones_nuevas ln ON
    pt.id_liquidacion = ln.id
WHERE 
  pt.id_trabajador::text = 'fc57e570-2950-4ed5-bfdc-d1bca5423c8e'
ORDER BY pt.fecha;
