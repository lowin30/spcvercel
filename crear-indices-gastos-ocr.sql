-- Crear índices para optimizar consultas de gastos OCR
CREATE INDEX IF NOT EXISTS idx_gastos_tarea_metodo_fecha ON gastos_tarea(id_tarea, metodo_registro, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gastos_tarea_usuario_fecha ON gastos_tarea(id_usuario, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gastos_confianza_ocr ON gastos_tarea(confianza_ocr) WHERE confianza_ocr IS NOT NULL;

-- Crear vista para estadísticas de OCR
CREATE OR REPLACE VIEW vista_estadisticas_ocr AS
SELECT 
    t.id as tarea_id,
    t.code as tarea_codigo,
    t.titulo as tarea_titulo,
    COUNT(g.id) as total_gastos,
    COUNT(CASE WHEN g.metodo_registro = 'ocr_automatico' THEN 1 END) as gastos_ocr_auto,
    COUNT(CASE WHEN g.metodo_registro = 'manual' THEN 1 END) as gastos_manuales,
    SUM(g.monto) as total_monto,
    AVG(g.confianza_ocr) as promedio_confianza_ocr,
    MAX(g.created_at) as ultimo_gasto
FROM tareas t
LEFT JOIN gastos_tarea g ON t.id = g.id_tarea
GROUP BY t.id, t.code, t.titulo;

-- Comentarios en la vista
COMMENT ON VIEW vista_estadisticas_ocr IS 'Estadísticas de uso del sistema OCR por tarea';
