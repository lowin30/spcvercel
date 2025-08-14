-- Crear índices para mejorar el rendimiento de las consultas

-- Índices para presupuestos_base
CREATE INDEX IF NOT EXISTS idx_presupuestos_base_id_tarea ON presupuestos_base(id_tarea);
CREATE INDEX IF NOT EXISTS idx_presupuestos_base_id_supervisor ON presupuestos_base(id_supervisor);
CREATE INDEX IF NOT EXISTS idx_presupuestos_base_id_estado ON presupuestos_base(id_estado);
CREATE INDEX IF NOT EXISTS idx_presupuestos_base_created_at ON presupuestos_base(created_at);

-- Índices para presupuestos_finales
CREATE INDEX IF NOT EXISTS idx_presupuestos_finales_id_presupuesto_base ON presupuestos_finales(id_presupuesto_base);
CREATE INDEX IF NOT EXISTS idx_presupuestos_finales_id_estado ON presupuestos_finales(id_estado);
CREATE INDEX IF NOT EXISTS idx_presupuestos_finales_created_at ON presupuestos_finales(created_at);

-- Índices para liquidaciones_nuevas
CREATE INDEX IF NOT EXISTS idx_liquidaciones_nuevas_id_tarea ON liquidaciones_nuevas(id_tarea);
CREATE INDEX IF NOT EXISTS idx_liquidaciones_nuevas_id_presupuesto_base ON liquidaciones_nuevas(id_presupuesto_base);
CREATE INDEX IF NOT EXISTS idx_liquidaciones_nuevas_id_presupuesto_final ON liquidaciones_nuevas(id_presupuesto_final);
CREATE INDEX IF NOT EXISTS idx_liquidaciones_nuevas_id_factura ON liquidaciones_nuevas(id_factura);
CREATE INDEX IF NOT EXISTS idx_liquidaciones_nuevas_created_at ON liquidaciones_nuevas(created_at);

-- Índices para facturas
CREATE INDEX IF NOT EXISTS idx_facturas_id_presupuesto_final ON facturas(id_presupuesto_final);
CREATE INDEX IF NOT EXISTS idx_facturas_id_estado_nuevo ON facturas(id_estado_nuevo);
CREATE INDEX IF NOT EXISTS idx_facturas_created_at ON facturas(created_at);

-- Índices para items
CREATE INDEX IF NOT EXISTS idx_items_id_presupuesto_base ON items(id_presupuesto_base);
CREATE INDEX IF NOT EXISTS idx_items_id_presupuesto_final ON items(id_presupuesto_final);
CREATE INDEX IF NOT EXISTS idx_items_id_producto ON items(id_producto);
