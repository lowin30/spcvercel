-- =====================================================
-- SUPER VISTA FACTURAS PLATINUM: RECONSTRUCCIÓN FORENSE
-- =====================================================

DROP VIEW IF EXISTS vista_facturas_completa CASCADE;

CREATE OR REPLACE VIEW vista_facturas_completa AS
WITH stats_gastos AS (
    -- Cálculo centralizado de gastos con filtros de calidad (comprobantes)
    SELECT 
        f_sub.id AS id_factura,
        -- Determinamos si la factura es de materiales
        COALESCE(
            (SELECT bool_and(it.es_material) 
             FROM items_factura it 
             WHERE it.id_factura = f_sub.id),
            (SELECT bool_and(it_pres.es_material) 
             FROM items it_pres 
             WHERE it_pres.id_presupuesto = f_sub.id_presupuesto),
            false
        ) AS es_factura_materiales,
        -- Gastos Extra PDF (específicos de la factura)
        COALESCE(
            (SELECT sum(ge.monto) 
             FROM gastos_extra_pdf_factura ge 
             WHERE ge.id_factura = f_sub.id), 
            0
        ) AS gastos_extra_total,
        -- Gastos de Tarea (FILTRO ESTRICTO: Solo con comprobante físico o digital)
        COALESCE(
            (SELECT sum(gt.monto) 
             FROM gastos_tarea gt
             JOIN presupuestos_finales pf_sub ON f_sub.id_presupuesto_final = pf_sub.id
             WHERE gt.id_tarea = pf_sub.id_tarea
               AND (gt.comprobante_url IS NOT NULL OR gt.imagen_procesada_url IS NOT NULL)
               -- Filtramos por tipo de gasto según el tipo de factura
               AND (
                 (COALESCE(
                    (SELECT bool_and(it.es_material) 
                     FROM items_factura it 
                     WHERE it.id_factura = f_sub.id),
                    false
                  ) AND gt.tipo_gasto = 'material')
                 OR 
                 (NOT COALESCE(
                    (SELECT bool_and(it.es_material) 
                     FROM items_factura it 
                     WHERE it.id_factura = f_sub.id),
                    false
                  ) AND gt.tipo_gasto IN ('mano_de_obra', 'manual'))
               )
            ), 
            0
        ) AS gastos_tarea_total
    FROM facturas f_sub
)
SELECT 
  -- 1. Campos Identificadores y Relacionales
  f.id,
  f.code,
  f.nombre,
  f.id_estado_nuevo,
  f.id_administrador,
  f.id_presupuesto_final AS id_presupuesto,
  pf.id AS presupuesto_final_id,
  pf.code AS presupuesto_final_code,
  t.id AS tarea_id,
  t.titulo AS titulo_tarea,
  t.code AS code_tarea,
  e.id AS edificio_id,
  e.nombre AS nombre_edificio,
  e.direccion AS direccion_edificio,
  
  -- 2. Fechas y Auditoría
  f.created_at,
  f.fecha_envio,
  f.fecha_pago,
  
  -- 3. Inteligencia de Gastos (Reportada por Usuario)
  sg.es_factura_materiales,
  sg.gastos_extra_total,
  sg.gastos_tarea_total,
  (sg.gastos_extra_total + sg.gastos_tarea_total) AS gastos_sum_incl_extras,
  ((sg.gastos_extra_total + sg.gastos_tarea_total) > 0) AS tiene_extras,

  -- 4. Finanzas y Ajustes (Aprobados vs Todos)
  f.total AS total_base_factura,
  f.saldo_pendiente,
  f.total_pagado,
  COALESCE(
    (SELECT sum(aj.monto_ajuste) 
     FROM ajustes_facturas aj 
     WHERE aj.id_factura = f.id AND aj.aprobado = true AND aj.pagado = false), 
    0
  ) AS total_ajustes, -- Backward compatible

  -- 5. Totales Platimum (Calculados on-the-fly)
  (
    f.total::numeric + 
    COALESCE((SELECT sum(aj.monto_ajuste) FROM ajustes_facturas aj WHERE aj.id_factura = f.id AND aj.aprobado = true), 0) +
    (sg.gastos_extra_total + sg.gastos_tarea_total)
  ) AS total_bruto_factura,

  -- 6. Metadatos de Estado
  ef.nombre AS estado_nombre,
  ef.codigo AS estado_codigo,
  ef.color AS estado_color,
  
  -- 7. Metadatos AFIP y PDF
  f.datos_afip,
  f.pdf_url,
  f.enviada,
  f.pagada

FROM facturas f
LEFT JOIN stats_gastos sg ON f.id = sg.id_factura
LEFT JOIN estados_facturas ef ON f.id_estado_nuevo = ef.id
LEFT JOIN presupuestos_finales pf ON f.id_presupuesto_final = pf.id
LEFT JOIN tareas t ON pf.id_tarea = t.id
LEFT JOIN edificios e ON pf.id_edificio = e.id
LEFT JOIN administradores a ON f.id_administrador = a.id
WHERE a.estado = 'activo'::text;

COMMENT ON VIEW vista_facturas_completa IS 'Super Vista Platinum: Agrega cálculos de gastos con comprobante, ajustes y totales financieros para administración.';
