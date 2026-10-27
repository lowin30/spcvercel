-- migracion: sincronizacion automatica y bidireccional de nombres entre tareas y facturas
-- respeta protocolo platinum: minusculas, 100% en base de datos postgres, blindaje anti-bucle

-- 1. funcion para sincronizar cambio de titulo en tareas hacia todas sus facturas arraigadas
CREATE OR REPLACE FUNCTION fn_sync_titulo_tarea_a_facturas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_nuevo_titulo text;
  r RECORD;
  v_es_material boolean;
  v_nuevo_nombre_factura text;
BEGIN
  -- evitar bucles infinitos en ejecucion de triggers en cascada
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  -- si el titulo no cambio, salir
  IF NEW.titulo IS NOT DISTINCT FROM OLD.titulo THEN
    RETURN NEW;
  END IF;

  -- normalizar titulo en minusculas segun protocolo platinum
  v_nuevo_titulo := TRIM(LOWER(COALESCE(NEW.titulo, '')));
  IF v_nuevo_titulo = '' THEN
    RETURN NEW;
  END IF;

  -- buscar y actualizar todas las facturas asociadas a esta tarea
  FOR r IN (
    SELECT DISTINCT f.id, f.nombre
    FROM facturas f
    LEFT JOIN presupuestos_finales pf ON pf.id = f.id_presupuesto_final
    LEFT JOIN presupuestos_base pb ON pb.id = f.id_presupuesto
    WHERE pf.id_tarea = NEW.id OR pb.id_tarea = NEW.id
  ) LOOP
    -- identificar si la factura corresponde a materiales:
    -- 1) su nombre actual termina en material/materiales
    -- 2) o contiene items marcados con es_material = true
    v_es_material := (
      TRIM(LOWER(COALESCE(r.nombre, ''))) ~* '\m(material|materiales)$'
      OR EXISTS (
        SELECT 1 FROM items_factura
        WHERE id_factura = r.id AND es_material = true
      )
    );

    IF v_es_material THEN
      v_nuevo_nombre_factura := v_nuevo_titulo || ' materiales';
    ELSE
      v_nuevo_nombre_factura := v_nuevo_titulo;
    END IF;

    -- actualizacion quirurgica solo si el nombre es diferente
    UPDATE facturas
    SET nombre = v_nuevo_nombre_factura
    WHERE id = r.id AND nombre IS DISTINCT FROM v_nuevo_nombre_factura;
  END LOOP;

  RETURN NEW;
END;
$$;

-- 2. trigger en tareas
DROP TRIGGER IF EXISTS trg_sync_titulo_tarea_a_facturas ON tareas;
CREATE TRIGGER trg_sync_titulo_tarea_a_facturas
AFTER UPDATE OF titulo ON tareas
FOR EACH ROW
EXECUTE FUNCTION fn_sync_titulo_tarea_a_facturas();

-- 3. funcion para sincronizar cambio de nombre en facturas hacia su tarea y facturas hermanas
CREATE OR REPLACE FUNCTION fn_sync_nombre_factura_a_tarea_y_facturas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_nombre_limpio text;
  v_nombre_base text;
  v_tarea_id integer;
  r RECORD;
  v_nuevo_nombre_hermana text;
  v_es_material boolean;
BEGIN
  -- evitar bucles infinitos en ejecucion de triggers en cascada
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  -- si el nombre no cambio, salir
  IF NEW.nombre IS NOT DISTINCT FROM OLD.nombre THEN
    RETURN NEW;
  END IF;

  v_nombre_limpio := TRIM(LOWER(COALESCE(NEW.nombre, '')));
  IF v_nombre_limpio = '' THEN
    RETURN NEW;
  END IF;

  -- si el nombre termina en material/materiales, extraer el nombre base limpio
  IF v_nombre_limpio ~* '\m(material|materiales)$' THEN
    v_nombre_base := TRIM(REGEXP_REPLACE(v_nombre_limpio, '\s*\m(material|materiales)$', '', 'i'));
  ELSE
    v_nombre_base := v_nombre_limpio;
  END IF;

  IF v_nombre_base = '' THEN
    RETURN NEW;
  END IF;

  -- buscar id_tarea vinculado a esta factura
  SELECT COALESCE(pf.id_tarea, pb.id_tarea)
  INTO v_tarea_id
  FROM facturas f
  LEFT JOIN presupuestos_finales pf ON pf.id = f.id_presupuesto_final
  LEFT JOIN presupuestos_base pb ON pb.id = f.id_presupuesto
  WHERE f.id = NEW.id
  LIMIT 1;

  IF v_tarea_id IS NOT NULL THEN
    -- actualizar titulo de la tarea arraigada (los presupuestos base y finales se actualizan dinamicamente)
    UPDATE tareas
    SET titulo = v_nombre_base
    WHERE id = v_tarea_id AND titulo IS DISTINCT FROM v_nombre_base;

    -- sincronizar cualquier factura hermana asociada a la misma tarea
    FOR r IN (
      SELECT DISTINCT f.id, f.nombre
      FROM facturas f
      LEFT JOIN presupuestos_finales pf ON pf.id = f.id_presupuesto_final
      LEFT JOIN presupuestos_base pb ON pb.id = f.id_presupuesto
      WHERE (pf.id_tarea = v_tarea_id OR pb.id_tarea = v_tarea_id)
        AND f.id <> NEW.id
    ) LOOP
      v_es_material := (
        TRIM(LOWER(COALESCE(r.nombre, ''))) ~* '\m(material|materiales)$'
        OR EXISTS (
          SELECT 1 FROM items_factura
          WHERE id_factura = r.id AND es_material = true
        )
      );

      IF v_es_material THEN
        v_nuevo_nombre_hermana := v_nombre_base || ' materiales';
      ELSE
        v_nuevo_nombre_hermana := v_nombre_base;
      END IF;

      UPDATE facturas
      SET nombre = v_nuevo_nombre_hermana
      WHERE id = r.id AND nombre IS DISTINCT FROM v_nuevo_nombre_hermana;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- 4. trigger en facturas
DROP TRIGGER IF EXISTS trg_sync_nombre_factura_a_tarea_y_facturas ON facturas;
CREATE TRIGGER trg_sync_nombre_factura_a_tarea_y_facturas
AFTER UPDATE OF nombre ON facturas
FOR EACH ROW
EXECUTE FUNCTION fn_sync_nombre_factura_a_tarea_y_facturas();
