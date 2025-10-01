-- Verificar qué datos trae la vista para la factura 65 específicamente
SELECT 
  id,
  code,
  total,
  saldo_pendiente,
  nombre_edificio,
  direccion_edificio,
  cuit_edificio,
  datos_afip,
  estado_nombre,
  pagada,
  id_presupuesto,
  presupuesto_final_id,
  edificio_id,
  tarea_id
FROM vista_facturas_completa
WHERE id = 65;

-- Ver todas las facturas con sus edificios
SELECT 
  f.id,
  f.code,
  f.id_presupuesto,
  pf.id_edificio,
  e.nombre AS edificio_nombre,
  e.direccion AS edificio_direccion,
  e.cuit AS edificio_cuit
FROM facturas f
LEFT JOIN presupuestos_finales pf ON f.id_presupuesto = pf.id
LEFT JOIN edificios e ON pf.id_edificio = e.id
WHERE f.id IN (61, 62, 65, 66)
ORDER BY f.id;

-- Verificar la vista completa para esas facturas
SELECT 
  id,
  code,
  nombre_edificio,
  direccion_edificio,
  cuit_edificio
FROM vista_facturas_completa
WHERE id IN (61, 62, 65, 66)
ORDER BY id;
