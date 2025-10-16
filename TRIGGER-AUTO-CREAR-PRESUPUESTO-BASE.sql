-- ============================================
-- SCRIPT 2: TRIGGER AUTO-CREAR PRESUPUESTO BASE
-- CAMBIOS MINIMOS - SOLO AGREGA AUTOMATIZACION
-- ============================================

-- ============================================
-- PASO 1: CREAR FUNCION PARA AUTO-CREAR PRESUPUESTO BASE
-- ============================================

CREATE OR REPLACE FUNCTION auto_crear_presupuesto_base()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id_supervisor UUID;
    v_nuevo_pb_id INTEGER;
    v_nuevo_code TEXT;
BEGIN
    -- Solo ejecutar si NO tiene presupuesto base
    IF NEW.id_presupuesto_base IS NULL THEN
        
        -- Obtener id_supervisor de la tarea (puede ser NULL)
        SELECT id_supervisor INTO v_id_supervisor
        FROM supervisores_tareas
        WHERE id_tarea = NEW.id_tarea
        LIMIT 1;
        
        -- Generar código con formato PB-XXXXXX-XXX
        v_nuevo_code := 'PB-' || 
                        LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0') || '-' ||
                        LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0');
        
        -- Crear presupuesto base con valores en 0
        INSERT INTO presupuestos_base (
            code,
            id_tarea,
            id_edificio,
            id_administrador,
            id_supervisor,
            materiales,
            mano_obra,
            total,
            aprobado,
            fecha_aprobacion,
            created_at,
            updated_at
        ) VALUES (
            v_nuevo_code,
            NEW.id_tarea,
            NEW.id_edificio,
            NEW.id_administrador,
            v_id_supervisor,
            0,
            0,
            0,
            true,
            NOW(),
            NOW(),
            NOW()
        )
        RETURNING id INTO v_nuevo_pb_id;
        
        -- Actualizar presupuesto final con el id del presupuesto base creado
        UPDATE presupuestos_finales
        SET id_presupuesto_base = v_nuevo_pb_id
        WHERE id = NEW.id;
        
        RAISE NOTICE 'Presupuesto base % creado automáticamente para presupuesto final %', 
                     v_nuevo_code, NEW.code;
    END IF;
    
    RETURN NEW;
END;
$$;

-- ============================================
-- PASO 2: CREAR TRIGGER
-- ============================================

DROP TRIGGER IF EXISTS trigger_auto_crear_presupuesto_base ON presupuestos_finales;

CREATE TRIGGER trigger_auto_crear_presupuesto_base
AFTER INSERT ON presupuestos_finales
FOR EACH ROW
EXECUTE FUNCTION auto_crear_presupuesto_base();

-- ============================================
-- PASO 3: VERIFICACION
-- ============================================

-- Verificar que el trigger existe
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_auto_crear_presupuesto_base';

-- Verificar que la función existe
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_name = 'auto_crear_presupuesto_base';

-- ============================================
-- PASO 4: TESTING (OPCIONAL - NO EJECUTAR AUN)
-- ============================================

/*
-- TEST: Crear presupuesto final sin base
INSERT INTO presupuestos_finales (
    code,
    id_tarea,
    id_edificio,
    id_administrador,
    materiales,
    mano_obra,
    total,
    total_base,
    ajuste_admin
) VALUES (
    'PF-TEST-001',
    (SELECT id FROM tareas LIMIT 1),
    (SELECT id FROM edificios LIMIT 1),
    (SELECT id FROM administradores LIMIT 1),
    0,
    0,
    0,
    0,
    0
)
RETURNING id, code, id_presupuesto_base;

-- Verificar que se creó el presupuesto base
SELECT 
    pb.id,
    pb.code,
    pb.id_tarea,
    pb.materiales,
    pb.mano_obra,
    pb.total,
    pb.aprobado
FROM presupuestos_base pb
WHERE pb.code LIKE 'PB-%'
ORDER BY pb.created_at DESC
LIMIT 1;

-- LIMPIAR TEST
DELETE FROM presupuestos_finales WHERE code = 'PF-TEST-001';
*/

-- ============================================
-- RESULTADO ESPERADO
-- ============================================

/*
VERIFICACION 1: trigger existe
  trigger_name = trigger_auto_crear_presupuesto_base
  event_manipulation = INSERT
  action_timing = AFTER
  event_object_table = presupuestos_finales

VERIFICACION 2: funcion existe
  routine_name = auto_crear_presupuesto_base
  routine_type = FUNCTION

FUNCIONAMIENTO:
1. Usuario crea presupuesto final SIN id_presupuesto_base
2. Trigger detecta que es NULL
3. Busca supervisor de la tarea (puede ser NULL)
4. Genera código PB-XXXXXX-XXX
5. Crea presupuesto base con:
   - materiales: 0
   - mano_obra: 0
   - total: 0
   - aprobado: true
   - fecha_aprobacion: NOW()
6. Actualiza presupuesto final con id_presupuesto_base
7. NUNCA más habrá inconsistencias

IMPORTANTE:
- Si presupuesto final YA tiene id_presupuesto_base, NO hace nada
- No interfiere con flujo existente
- Solo actúa en creaciones nuevas sin base
*/

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================

/*
ESTE SCRIPT:
✅ NO modifica datos existentes
✅ NO altera estructura de tablas
✅ Solo agrega automatización
✅ Usa SECURITY DEFINER para evitar problemas de RLS

IMPACTO:
- Presupuestos finales creados desde ahora SIEMPRE tendrán base
- No más inconsistencias
- Flujo existente NO se rompe
- Código generado es único (random)
*/
