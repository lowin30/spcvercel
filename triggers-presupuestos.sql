-- Función para actualizar automáticamente los campos calculados en presupuestos_finales
CREATE OR REPLACE FUNCTION actualizar_presupuesto_final()
RETURNS TRIGGER AS $$
BEGIN
    -- Obtener el total del presupuesto base
    SELECT total INTO NEW.total_base
    FROM presupuestos_base
    WHERE id = NEW.id_presupuesto_base;
    
    -- Calcular el total y el ajuste admin
    NEW.total := NEW.materiales + NEW.mano_obra;
    NEW.ajuste_admin := NEW.total - NEW.total_base;
    
    -- Actualizar timestamp
    NEW.updated_at := CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar automáticamente los campos calculados antes de insertar o actualizar
CREATE TRIGGER trigger_actualizar_presupuesto_final
BEFORE INSERT OR UPDATE ON presupuestos_finales
FOR EACH ROW
EXECUTE FUNCTION actualizar_presupuesto_final();

-- Función para actualizar automáticamente los campos calculados en liquidaciones_nuevas
CREATE OR REPLACE FUNCTION actualizar_liquidacion()
RETURNS TRIGGER AS $$
BEGIN
    -- Obtener el total del presupuesto base
    SELECT total INTO NEW.total_base
    FROM presupuestos_base
    WHERE id = NEW.id_presupuesto_base;
    
    -- Obtener el ajuste admin del presupuesto final
    SELECT ajuste_admin INTO NEW.ajuste_admin
    FROM presupuestos_finales
    WHERE id = NEW.id_presupuesto_final;
    
    -- Calcular la ganancia neta
    NEW.ganancia_neta := NEW.total_base - NEW.gastos_reales;
    
    -- Calcular las ganancias según la distribución
    NEW.ganancia_supervisor := (NEW.ganancia_neta * NEW.porcentaje_distribucion) / 100;
    NEW.ganancia_admin := (NEW.ganancia_neta * (100 - NEW.porcentaje_distribucion) / 100) + NEW.ajuste_admin;
    
    -- Actualizar timestamp
    NEW.updated_at := CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar automáticamente los campos calculados antes de insertar o actualizar
CREATE TRIGGER trigger_actualizar_liquidacion
BEFORE INSERT OR UPDATE ON liquidaciones_nuevas
FOR EACH ROW
EXECUTE FUNCTION actualizar_liquidacion();

-- Función para generar códigos automáticos
CREATE OR REPLACE FUNCTION generar_codigo(prefijo TEXT, tabla TEXT)
RETURNS TEXT AS $$
DECLARE
    ultimo_id INTEGER;
    nuevo_codigo TEXT;
BEGIN
    EXECUTE format('SELECT COALESCE(MAX(id), 0) FROM %I', tabla) INTO ultimo_id;
    nuevo_codigo := prefijo || '-' || LPAD((ultimo_id + 1)::TEXT, 4, '0');
    RETURN nuevo_codigo;
END;
$$ LANGUAGE plpgsql;

-- Trigger para generar códigos automáticos para presupuestos_base
CREATE OR REPLACE FUNCTION generar_codigo_presupuesto_base()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.code IS NULL THEN
        NEW.code := generar_codigo('PB', 'presupuestos_base');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generar_codigo_presupuesto_base
BEFORE INSERT ON presupuestos_base
FOR EACH ROW
EXECUTE FUNCTION generar_codigo_presupuesto_base();

-- Trigger para generar códigos automáticos para presupuestos_finales
CREATE OR REPLACE FUNCTION generar_codigo_presupuesto_final()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.code IS NULL THEN
        NEW.code := generar_codigo('PF', 'presupuestos_finales');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generar_codigo_presupuesto_final
BEFORE INSERT ON presupuestos_finales
FOR EACH ROW
EXECUTE FUNCTION generar_codigo_presupuesto_final();

-- Trigger para generar códigos automáticos para liquidaciones_nuevas
CREATE OR REPLACE FUNCTION generar_codigo_liquidacion()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.code IS NULL THEN
        NEW.code := generar_codigo('LIQ', 'liquidaciones_nuevas');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generar_codigo_liquidacion
BEFORE INSERT ON liquidaciones_nuevas
FOR EACH ROW
EXECUTE FUNCTION generar_codigo_liquidacion();
