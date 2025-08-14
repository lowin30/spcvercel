-- Función para validar que el presupuesto final sea mayor o igual al presupuesto base
CREATE OR REPLACE FUNCTION validar_presupuesto_final()
RETURNS TRIGGER AS $$
DECLARE
    total_base INTEGER;
BEGIN
    -- Obtener el total del presupuesto base
    SELECT total INTO total_base
    FROM presupuestos_base
    WHERE id = NEW.id_presupuesto_base;
    
    -- Validar que el total del presupuesto final sea mayor o igual al total del presupuesto base
    IF (NEW.materiales + NEW.mano_obra) < total_base THEN
        RAISE EXCEPTION 'El total del presupuesto final (%) debe ser mayor o igual al total del presupuesto base (%)', 
                        (NEW.materiales + NEW.mano_obra), total_base;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar el presupuesto final antes de insertar o actualizar
CREATE TRIGGER trigger_validar_presupuesto_final
BEFORE INSERT OR UPDATE ON presupuestos_finales
FOR EACH ROW
EXECUTE FUNCTION validar_presupuesto_final();

-- Función para validar que los gastos reales no excedan el presupuesto base
CREATE OR REPLACE FUNCTION validar_gastos_reales()
RETURNS TRIGGER AS $$
DECLARE
    total_base INTEGER;
BEGIN
    -- Obtener el total del presupuesto base
    SELECT total INTO total_base
    FROM presupuestos_base
    WHERE id = NEW.id_presupuesto_base;
    
    -- Validar que los gastos reales no excedan el presupuesto base
    IF NEW.gastos_reales > total_base THEN
        RAISE EXCEPTION 'Los gastos reales (%) no pueden exceder el presupuesto base (%)', 
                        NEW.gastos_reales, total_base;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar los gastos reales antes de insertar o actualizar
CREATE TRIGGER trigger_validar_gastos_reales
BEFORE INSERT OR UPDATE ON liquidaciones_nuevas
FOR EACH ROW
EXECUTE FUNCTION validar_gastos_reales();

-- Función para validar que solo se pueda crear un presupuesto final por presupuesto base
CREATE OR REPLACE FUNCTION validar_unico_presupuesto_final()
RETURNS TRIGGER AS $$
DECLARE
    existe BOOLEAN;
BEGIN
    -- Verificar si ya existe un presupuesto final para este presupuesto base
    SELECT EXISTS(
        SELECT 1 FROM presupuestos_finales
        WHERE id_presupuesto_base = NEW.id_presupuesto_base
        AND id != COALESCE(NEW.id, 0)
    ) INTO existe;
    
    IF existe THEN
        RAISE EXCEPTION 'Ya existe un presupuesto final para este presupuesto base';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar que solo haya un presupuesto final por presupuesto base
CREATE TRIGGER trigger_validar_unico_presupuesto_final
BEFORE INSERT OR UPDATE ON presupuestos_finales
FOR EACH ROW
EXECUTE FUNCTION validar_unico_presupuesto_final();

-- Función para validar que solo se pueda crear una liquidación por presupuesto final
CREATE OR REPLACE FUNCTION validar_unica_liquidacion()
RETURNS TRIGGER AS $$
DECLARE
    existe BOOLEAN;
BEGIN
    -- Verificar si ya existe una liquidación para este presupuesto final
    SELECT EXISTS(
        SELECT 1 FROM liquidaciones_nuevas
        WHERE id_presupuesto_final = NEW.id_presupuesto_final
        AND id != COALESCE(NEW.id, 0)
    ) INTO existe;
    
    IF existe THEN
        RAISE EXCEPTION 'Ya existe una liquidación para este presupuesto final';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar que solo haya una liquidación por presupuesto final
CREATE TRIGGER trigger_validar_unica_liquidacion
BEFORE INSERT OR UPDATE ON liquidaciones_nuevas
FOR EACH ROW
EXECUTE FUNCTION validar_unica_liquidacion();
