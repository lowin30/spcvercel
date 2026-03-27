CREATE OR REPLACE VIEW vista_facturas_completa AS 
 WITH stats_gastos AS (
         SELECT f_sub.id AS id_factura,
            COALESCE(( SELECT bool_and(it.es_material) AS bool_and
                   FROM items_factura it
                  WHERE (it.id_factura = f_sub.id)), ( SELECT bool_and(it_pres.es_material) AS bool_and
                   FROM items it_pres
                  WHERE (it_pres.id_presupuesto = f_sub.id_presupuesto)), false) AS es_factura_materiales,
            COALESCE(( SELECT sum(ge.monto) AS sum
                   FROM gastos_extra_pdf_factura ge
                  WHERE (ge.id_factura = f_sub.id)), (0)::numeric) AS gastos_extra_total,
            COALESCE(( SELECT sum(gt.monto) AS sum
                   FROM (gastos_tarea gt
                     JOIN presupuestos_finales pf_sub ON ((f_sub.id_presupuesto_final = pf_sub.id)))
                  WHERE ((gt.id_tarea = pf_sub.id_tarea) AND ((gt.comprobante_url IS NOT NULL) OR (gt.imagen_procesada_url IS NOT NULL)) AND ((COALESCE(( SELECT bool_and(it.es_material) AS bool_and
                           FROM items_factura it
                          WHERE (it.id_factura = f_sub.id)), false) AND (gt.tipo_gasto = 'material'::text)) OR ((NOT COALESCE(( SELECT bool_and(it.es_material) AS bool_and
                           FROM items_factura it
                          WHERE (it.id_factura = f_sub.id)), false)) AND (gt.tipo_gasto = ANY (ARRAY['mano_de_obra'::text, 'manual'::text])))))), (0)::bigint) AS gastos_tarea_total
           FROM facturas f_sub
        )
 SELECT f.id,
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
    f.created_at,
    f.fecha_envio,
    f.fecha_pago,
    sg.es_factura_materiales,
    sg.gastos_extra_total,
    sg.gastos_tarea_total,
    (sg.gastos_extra_total + (sg.gastos_tarea_total)::numeric) AS gastos_sum_incl_extras,
    ((sg.gastos_extra_total + (sg.gastos_tarea_total)::numeric) > (0)::numeric) AS tiene_extras,
    f.total,
    f.total AS total_base_factura,
    f.saldo_pendiente,
    f.total_pagado,
    
    /* FIX AJUSTES v82: Sumatoria real sin importar 'aprobado' para paridad con detalle */
    COALESCE(( SELECT sum(aj.monto_ajuste) AS sum
           FROM ajustes_facturas aj
          WHERE (aj.id_factura = f.id)), (0)::numeric) AS total_ajustes,
          
    (((f.total)::numeric + (sg.gastos_extra_total + (sg.gastos_tarea_total)::numeric)) - COALESCE(( SELECT sum(aj.monto_ajuste) AS sum
           FROM ajustes_facturas aj
          WHERE ((aj.id_factura = f.id) AND (aj.aprobado = true))), (0)::numeric)) AS total_bruto_factura,
    
    ef.nombre AS estado_nombre,
    ef.codigo AS estado_codigo,
    ef.color AS estado_color,
    f.datos_afip,
    f.pdf_url,
    f.enviada,
    f.pagada,
    
    /* Ajustes Pendientes: Aprobados pero no pagados */
    COALESCE(( SELECT sum(aj.monto_ajuste) AS sum
           FROM ajustes_facturas aj
          WHERE ((aj.id_factura = f.id) AND (aj.aprobado = true) AND (aj.pagado = false))), (0)::numeric) AS total_ajustes_pendientes,
    
    /* Ajustes Liquidados: Ya pagados */      
    COALESCE(( SELECT sum(aj.monto_ajuste) AS sum
           FROM ajustes_facturas aj
          WHERE ((aj.id_factura = f.id) AND (aj.pagado = true))), (0)::numeric) AS total_ajustes_liquidados,
    
    /* Ajustes Calculados: Generados pero no aprobados */      
    COALESCE(( SELECT sum(aj.monto_ajuste) AS sum
           FROM ajustes_facturas aj
          WHERE ((aj.id_factura = f.id) AND (aj.aprobado = false) AND (aj.pagado = false))), (0)::numeric) AS total_ajustes_calculados,
          
    COALESCE(( SELECT sum(aj.monto_ajuste) AS sum
           FROM ajustes_facturas aj
          WHERE (aj.id_factura = f.id)), (0)::numeric) AS total_ajustes_todos
          
   FROM ((((((facturas f
     LEFT JOIN stats_gastos sg ON ((f.id = sg.id_factura)))
     LEFT JOIN estados_facturas ef ON ((f.id_estado_nuevo = ef.id)))
     LEFT JOIN presupuestos_finales pf ON ((f.id_presupuesto_final = pf.id)))
     LEFT JOIN tareas t ON ((pf.id_tarea = t.id)))
     LEFT JOIN edificios e ON ((pf.id_edificio = e.id)))
     LEFT JOIN administradores a ON ((f.id_administrador = a.id)))
  WHERE (a.estado = 'activo'::text);
