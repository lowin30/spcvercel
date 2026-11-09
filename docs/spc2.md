# spc2 — plan de migracion y arquitectura de la nueva aplicacion

fecha de creacion: 2026-11-09
estado: planificacion (no iniciado)

---

## 1. que es spc2

spc2 es una aplicacion **independiente y aislada** de spc. comparte la misma base de codigo como punto de partida pero tiene su propia base de datos, autenticacion y despliegue. introduce un modelo financiero de 3 niveles jerarquicos (admin, gerente, supervisor) con distribucion de ganancias diferenciada.

---

## 2. diferencias clave entre spc y spc2

| concepto | spc (actual) | spc2 (nueva) |
|---|---|---|
| jerarquia | admin → supervisor | admin → gerente → supervisor |
| ganancia del 50% de pb | admin de obra | gerente |
| canon fijo sobre mano de obra | no existe | 15% configurable para el admin (dueno de plataforma) |
| remanente comercial (pf - pb neto) | no se distribuye explicitamente | 50% gerente + 50% admin |
| multi-gerente | no (mono-empresa) | si (id_gerente en tablas clave, rls por gerente) |
| base de datos | fodyzgjwoccpsjmfinvm (supabase) | proyecto supabase nuevo e independiente |
| auth | descope proyecto spc | descope proyecto nuevo e independiente |
| deploy | vercel spc actual | vercel proyecto nuevo e independiente |

---

## 3. modelo financiero exacto de spc2

### 3.1 roles y visibilidad

- **admin (dueno de la plataforma / vos)**:
  - ve a todos los gerentes, todas las obras, toda la facturacion.
  - cobra el canon fijo configurable (por defecto 15%) sobre la mano de obra cobrada.
  - cobra el 50% del remanente comercial (sobreprecio pf vs pb).
  - configura los porcentajes de cada gerente y cada administrador de consorcio.

- **gerente (intermedio / tu companero)**:
  - coordina supervisores y cuadrillas.
  - arma el presupuesto base junto con el supervisor.
  - arma el presupuesto final junto con el admin.
  - cobra el 50% de (pb - gastos reales).
  - cobra el 50% del remanente comercial (sobreprecio pf vs pb).
  - no ve las obras ni supervisores de otros gerentes.

- **supervisor (operativo)**:
  - ejecuta la obra y paga materiales de su bolsillo (comprobantes en gastos_tarea).
  - cobra el 50% de (pb - gastos reales).
  - recupera el 100% de sus comprobantes de materiales al liquidar.
  - **ceguera comercial**: no ve presupuestos finales, facturas al cliente, comisiones ni sobreprecios.

- **administrador de consorcio (externo)**:
  - es quien trae el trabajo / consorcio.
  - cobra una comision configurable (por defecto 10%) sobre la factura de mano de obra.
  - configurado en la tabla `administradores`, columna `porcentaje_default`.

### 3.2 formula de distribucion por obra

```
factura materiales:  → sin comisiones, reembolso directo al supervisor.
factura mano de obra (pf_mo): → entra al esquema de distribucion:

paso 1: retenciones fijas sobre mano de obra cobrada
  (-) comision administrador consorcio: pf_mo × porcentaje_admin_consorcio (ej: 10%)
  (-) canon admin plataforma:           pf_mo × porcentaje_canon_admin (ej: 15%)
  (=) fondo neto de mano de obra:       pf_mo × (1 - %admin - %canon) (ej: 75%)

paso 2: separacion base vs remanente
  fondo neto de mano de obra:           $X
  (-) presupuesto base pactado (pb_mo): $Y
  (=) remanente comercial:              $X - $Y (puede ser >= 0)

paso 3: distribucion del presupuesto base
  ganancia supervisor:  (pb_mo - gastos_reales) / 2
  ganancia gerente:     (pb_mo - gastos_reales) / 2
  reembolso supervisor: gastos_reales (devolucion de comprobantes)

paso 4: distribucion del remanente comercial
  50% → gerente
  50% → admin (dueno plataforma)

resumen final por actor:
  supervisor:             reembolso materiales + 50% de (pb - gastos)
  gerente:                50% de (pb - gastos) + 50% del remanente
  admin (vos):            canon fijo (15% de mo) + 50% del remanente
  administrador consorcio: comision fija (10% de mo)
```

### 3.3 validacion de piso minimo (blindaje obligatorio)

al cargar el presupuesto final de mano de obra, el sistema debe validar:

```
pf_mo_minimo = pb_mo / (1 - porcentaje_admin_consorcio - porcentaje_canon_admin)
```

ejemplo: si pb_mo = $600.000, admin consorcio = 10%, canon = 15%:
pf_mo_minimo = 600.000 / (1 - 0.10 - 0.15) = 600.000 / 0.75 = $800.000

si el pf_mo ingresado es menor a $800.000, el sistema debe mostrar alerta:
"el precio no cubre el presupuesto base del supervisor y las comisiones fijas".

---

## 4. ejemplo numerico completo

obra: laprida 1004 9c plomeria
factura materiales cobrada: $100.000
factura mano de obra cobrada (pf_mo): $1.200.000
presupuesto base mano de obra (pb_mo): $600.000
gastos reales (comprobantes supervisor): $100.000
porcentaje admin consorcio: 10%
porcentaje canon admin: 15%

```
retenciones:
  admin consorcio (10%):          $120.000
  canon admin (15%):              $180.000
  fondo neto mo (75%):            $900.000

separacion:
  pb_mo:                          $600.000
  remanente comercial:            $300.000

distribucion del pb:
  ganancia supervisor:            (600.000 - 100.000) / 2 = $250.000
  ganancia gerente (de pb):       (600.000 - 100.000) / 2 = $250.000
  reembolso materiales sup:       $100.000

distribucion del remanente:
  gerente (50%):                  $150.000
  admin (50%):                    $150.000

totales finales:
  supervisor:                     $100.000 (reembolso) + $250.000 = $350.000
  gerente:                        $250.000 + $150.000 = $400.000
  admin (vos):                    $180.000 (canon) + $150.000 (remanente) = $330.000
  admin consorcio:                $120.000

verificacion: $100.000 + $350.000 + $400.000 + $330.000 + $120.000 = $1.300.000
facturado total: $100.000 (mat) + $1.200.000 (mo) = $1.300.000 ✓ cuadra al peso
```

---

## 5. cambios en el esquema de base de datos vs spc

### 5.1 tabla `usuarios` — nuevo rol
- agregar valor 'gerente' al campo `rol` (admin / gerente / supervisor / trabajador).

### 5.2 tabla `usuarios` — nuevo campo
- `porcentaje_canon_default` (numeric, default 15): porcentaje de canon configurable por gerente.

### 5.3 tablas con nuevo campo `id_gerente`
- `edificios`: id_gerente (uuid, fk → usuarios.id) — cada edificio asignado a un gerente.
- `tareas`: hereda el gerente del edificio via join.

### 5.4 tabla `administradores` — campo existente
- `porcentaje_default` (numeric): porcentaje configurable por administrador de consorcio (ya existe en spc).

### 5.5 tabla `liquidaciones_nuevas` — columnas nuevas
- `total_base_mo` (numeric): presupuesto base de mano de obra pactado.
- `fondo_neto_mo` (numeric): mano de obra despues de retenciones.
- `remanente_comercial` (numeric): sobrante comercial (fondo_neto - pb_mo).
- `ganancia_supervisor` (numeric): 50% de (pb_mo - gastos_reales). [ya existe]
- `ganancia_gerente` (numeric): 50% de (pb_mo - gastos_reales) + 50% remanente.
- `canon_admin` (numeric): porcentaje fijo sobre mano de obra cobrada.
- `ganancia_admin_remanente` (numeric): 50% del remanente comercial.
- `ganancia_admin_total` (numeric): canon + remanente.
- `comision_administrador_consorcio` (numeric): porcentaje fijo del administrador.

### 5.6 politicas rls multi-gerente
- todas las consultas de gerente filtran por `id_gerente = auth.uid()`.
- el admin ve todo sin filtro (como hoy en spc con supabaseAdmin).

---

## 6. infraestructura de la nueva aplicacion

### 6.1 repositorio git
- repositorio nuevo en github (ej: spc2 o nombre comercial).
- clonado desde el codigo fuente de spc como base.
- branch main independiente.

### 6.2 supabase
- proyecto nuevo e independiente (credenciales pendientes del usuario).
- esquema sql basado en spc + las modificaciones del punto 5.
- base de datos limpia sin datos de spc.

### 6.3 descope
- proyecto nuevo e independiente para auth.
- mismo flujo descope → supabase via rpc.

### 6.4 vercel
- proyecto nuevo vinculado al repositorio spc2.
- variables de entorno apuntando al supabase y descope nuevos.
- dominio propio (ej: spc2.vercel.app o dominio personalizado).

### 6.5 cloudinary
- evaluar si se comparte la cuenta existente (con carpeta separada) o se crea cuenta nueva.

---

## 7. reglas de negocio inmutables de spc2

1. **ceguera del supervisor**: el supervisor no ve presupuestos finales, facturas al cliente, comisiones del admin consorcio ni canon del admin plataforma.
2. **ceguera del gerente**: el gerente no ve las obras ni supervisores de otros gerentes.
3. **materiales sin comisiones**: la factura de materiales pasa directo como reembolso al supervisor. no lleva comision del 10% ni del 15%.
4. **porcentajes configurables**: el 15% del admin y el 10% del administrador de consorcio son configurables individualmente desde las tablas `usuarios.porcentaje_canon_default` y `administradores.porcentaje_default`.
5. **ciclo cerrado en auditoria**: los balances contables y reportes de rentabilidad solo incluyen tareas con liquidacion confirmada (id_liquidacion IS NOT NULL).
6. **validacion de piso minimo**: el sistema alerta si el presupuesto final de mano de obra no cubre el pb + comisiones fijas.

---

## 8. carpeta origen para duplicar

la carpeta del proyecto spc actual que sirve como base para clonar es:

```
c:\Users\Central 1\Downloads\spc7\spc\spc
```

se debe copiar a una carpeta nueva (ej: `c:\Users\Central 1\Downloads\spc2`) y trabajar desde ahi sin modificar la carpeta original.

---

## 9. checklist de arranque (pendiente)

- [ ] recibir credenciales del nuevo proyecto supabase.
- [ ] crear proyecto en descope para spc2.
- [ ] crear repositorio en github para spc2.
- [ ] crear proyecto en vercel para spc2.
- [ ] duplicar carpeta del proyecto a nueva ubicacion.
- [ ] limpiar variables de entorno (.env.local) con las credenciales nuevas.
- [ ] ejecutar script sql de estructura en el supabase nuevo.
- [ ] adaptar tabla usuarios para admitir rol 'gerente'.
- [ ] agregar campo id_gerente a edificios.
- [ ] adaptar liquidaciones_nuevas con las columnas del punto 5.5.
- [ ] adaptar vistas sql (vista_auditoria_admin_balances y derivadas).
- [ ] adaptar loader.ts y auditoria-client.tsx para el modelo de 3 niveles.
- [ ] crear panel de canon del admin (tu panel de cobro del 15%).
- [ ] implementar validacion de piso minimo en presupuesto final.
- [ ] configurar rls multi-gerente.
- [ ] pruebas de integracion con datos ficticios.
- [ ] deploy a produccion en vercel.
