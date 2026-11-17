-- ==============================================================================
-- SCHEMA MAESTRO SPC2 (PROYECTO: loizubsviqyurgmdvhuh)
-- EXTRACTO FORENSE 100% FIEL DE PRODUCCION CON ADAPTACIONES DE 3 NIVELES
-- GENERADO: 2026-11-09
-- ==============================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "vector";


-- 2. SECUENCIAS
CREATE SEQUENCE IF NOT EXISTS public.administradores_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.ajustes_facturas_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.alertas_sistema_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.auditoria_forense_logs_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.comentarios_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.departamentos_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.departamentos_tareas_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.edificios_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.estados_facturas_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.estados_presupuestos_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.estados_tareas_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.facturas_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.gastos_extra_pdf_factura_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.gastos_tarea_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.items_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.liquidaciones_nuevas_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.liquidaciones_trabajadores_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.micro_tareas_operativas_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.pagos_facturas_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.presupuestos_base_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.presupuestos_finales_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.productos_code_seq;
CREATE SEQUENCE IF NOT EXISTS public.supervisores_tareas_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.tareas_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.trabajadores_tareas_id_seq;


-- 3. TABLAS BASE (33 TABLAS)
CREATE TABLE IF NOT EXISTS public.adelantos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL,
  monto numeric(12,2) NOT NULL,
  descripcion text,
  fecha date DEFAULT CURRENT_DATE,
  estado_liquidado boolean DEFAULT false,
  liquidacion_id integer,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT adelantos_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.administradores (
  id integer NOT NULL DEFAULT nextval('administradores_id_seq'::regclass),
  code text GENERATED ALWAYS AS (('ADM-'::text || lpad((id)::text, 5, '0'::text))) STORED,
  nombre text NOT NULL,
  telefono text NOT NULL,
  estado text DEFAULT 'activo'::text,
  created_at timestamp without time zone DEFAULT now(),
  aplica_ajustes boolean DEFAULT false,
  porcentaje_default numeric DEFAULT 0,
  email1 text,
  email2 text,
  requiere_dos_facturas boolean DEFAULT true,
  CONSTRAINT administradores_code_key UNIQUE (code),
  CONSTRAINT administradores_estado_check CHECK (estado = ANY (ARRAY['activo'::text, 'inactivo'::text])),
  CONSTRAINT administradores_pkey PRIMARY KEY (id),
  CONSTRAINT administradores_telefono_check CHECK (telefono ~ '^[0-9]{10,15}$'::text)
);

CREATE TABLE IF NOT EXISTS public.ajustes_facturas (
  id integer NOT NULL DEFAULT nextval('ajustes_facturas_id_seq'::regclass),
  id_factura integer,
  id_item integer,
  descripcion_item text,
  monto_base numeric(12,2),
  porcentaje_ajuste numeric(5,2) DEFAULT 10.00,
  monto_ajuste numeric(12,2),
  aprobado boolean DEFAULT false,
  pagado boolean DEFAULT false,
  fecha_aprobacion timestamp without time zone,
  created_at timestamp without time zone DEFAULT now(),
  fecha_pago timestamp with time zone,
  CONSTRAINT ajustes_facturas_pkey PRIMARY KEY (id),
  CONSTRAINT chk_ajustes_pagado_implica_aprobado CHECK (NOT pagado OR aprobado)
);

CREATE TABLE IF NOT EXISTS public.alertas_sistema (
  id integer NOT NULL DEFAULT nextval('alertas_sistema_id_seq'::regclass),
  tipo_alerta text NOT NULL,
  mensaje text NOT NULL,
  id_entidad integer,
  tipo_entidad text,
  leida boolean DEFAULT false,
  id_usuario_destino uuid,
  fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT alertas_sistema_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.auditoria_forense_logs (
  id bigint NOT NULL DEFAULT nextval('auditoria_forense_logs_id_seq'::regclass),
  tabla_afectada character varying(60) NOT NULL,
  id_registro character varying(60) NOT NULL,
  operacion character varying(10) NOT NULL,
  datos_anteriores jsonb NOT NULL,
  datos_nuevos jsonb,
  usuario_id uuid,
  usuario_email character varying(255),
  ip_origen character varying(45),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT auditoria_forense_logs_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.categorias_productos (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  nombre character varying(100) NOT NULL,
  descripcion text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT categorias_productos_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.comentarios (
  id integer NOT NULL DEFAULT nextval('comentarios_id_seq'::regclass),
  code text GENERATED ALWAYS AS (('COM-'::text || lpad((id)::text, 5, '0'::text))) STORED,
  contenido text NOT NULL,
  id_tarea integer NOT NULL,
  id_usuario uuid,
  created_at timestamp without time zone DEFAULT now(),
  foto_url jsonb NOT NULL DEFAULT '[]'::jsonb,
  CONSTRAINT comentarios_code_key UNIQUE (code),
  CONSTRAINT comentarios_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.configuracion_trabajadores (
  id_trabajador uuid NOT NULL,
  salario_diario integer NOT NULL,
  activo boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT configuracion_trabajadores_pkey PRIMARY KEY (id_trabajador),
  CONSTRAINT configuracion_trabajadores_salario_diario_check CHECK (salario_diario > 0)
);

CREATE TABLE IF NOT EXISTS public.contactos (
  id bigint NOT NULL GENERATED BY DEFAULT AS IDENTITY,
  nombre text NOT NULL,
  "nombreReal" text,
  telefono text,
  email text,
  tipo_padre text NOT NULL,
  id_padre bigint NOT NULL,
  departamento text,
  notas text,
  relacion text,
  es_principal boolean DEFAULT false,
  departamento_id integer,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT contactos_pkey PRIMARY KEY (id),
  CONSTRAINT contactos_tipo_padre_check CHECK (tipo_padre = ANY (ARRAY['administrador'::text, 'edificio'::text, 'departamento'::text]))
);

CREATE TABLE IF NOT EXISTS public.departamentos (
  id integer NOT NULL DEFAULT nextval('departamentos_id_seq'::regclass),
  edificio_id integer NOT NULL,
  codigo text NOT NULL,
  propietario text,
  notas text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT departamentos_edificio_id_codigo_key UNIQUE (edificio_id, codigo),
  CONSTRAINT departamentos_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.departamentos_tareas (
  id integer NOT NULL DEFAULT nextval('departamentos_tareas_id_seq'::regclass),
  id_tarea integer NOT NULL,
  id_departamento integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT departamentos_tareas_id_tarea_id_departamento_key UNIQUE (id_tarea, id_departamento),
  CONSTRAINT departamentos_tareas_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.edificios (
  id integer NOT NULL DEFAULT nextval('edificios_id_seq'::regclass),
  code text GENERATED ALWAYS AS (('EDI-'::text || lpad((id)::text, 5, '0'::text))) STORED,
  nombre text NOT NULL,
  direccion text NOT NULL,
  mapa_url text,
  id_administrador integer,
  estado text DEFAULT 'activo'::text,
  latitud numeric(10,8),
  longitud numeric(11,8),
  created_at timestamp without time zone DEFAULT now(),
  cuit character varying(11),
  notas text,
  id_gerente uuid,
  CONSTRAINT edificios_code_key UNIQUE (code),
  CONSTRAINT edificios_estado_check CHECK (estado = ANY (ARRAY['activo'::text, 'en_obra'::text, 'finalizado'::text])),
  CONSTRAINT edificios_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.estados_facturas (
  id integer NOT NULL DEFAULT nextval('estados_facturas_id_seq'::regclass),
  codigo character varying(20) NOT NULL,
  nombre character varying(50) NOT NULL,
  descripcion text,
  color character varying(20) NOT NULL,
  orden integer NOT NULL,
  CONSTRAINT estados_facturas_codigo_key UNIQUE (codigo),
  CONSTRAINT estados_facturas_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.estados_presupuestos (
  id integer NOT NULL DEFAULT nextval('estados_presupuestos_id_seq'::regclass),
  codigo character varying(20) NOT NULL,
  nombre character varying(50) NOT NULL,
  descripcion text,
  color character varying(20) NOT NULL,
  orden integer NOT NULL,
  CONSTRAINT estados_presupuestos_codigo_key UNIQUE (codigo),
  CONSTRAINT estados_presupuestos_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.estados_tareas (
  id integer NOT NULL DEFAULT nextval('estados_tareas_id_seq'::regclass),
  codigo character varying(20) NOT NULL,
  nombre character varying(50) NOT NULL,
  descripcion text,
  color character varying(20) NOT NULL,
  orden integer NOT NULL,
  CONSTRAINT estados_tareas_codigo_key UNIQUE (codigo),
  CONSTRAINT estados_tareas_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.facturas (
  id integer NOT NULL DEFAULT nextval('facturas_id_seq'::regclass),
  code text GENERATED ALWAYS AS (('FAC-'::text || lpad((id)::text, 5, '0'::text))) STORED,
  id_presupuesto integer,
  total integer NOT NULL,
  pdf_url text,
  datos_afip numeric,
  created_at timestamp without time zone DEFAULT now(),
  id_estado_nuevo integer,
  id_presupuesto_final integer,
  tiene_ajustes boolean DEFAULT false,
  ajustes_aprobados boolean DEFAULT false,
  administrador_facturador character varying(100),
  id_administrador integer,
  total_pagado numeric DEFAULT 0,
  saldo_pendiente numeric,
  fecha_vencimiento date,
  fecha_ultimo_pago date,
  nombre text,
  enviada boolean DEFAULT false,
  fecha_envio timestamp with time zone,
  pagada boolean DEFAULT false,
  fecha_pago timestamp with time zone,
  afip_numero text,
  CONSTRAINT facturas_code_key UNIQUE (code),
  CONSTRAINT facturas_pkey PRIMARY KEY (id),
  CONSTRAINT facturas_total_check CHECK (total >= 0)
);

CREATE TABLE IF NOT EXISTS public.gastos_extra_pdf_factura (
  id bigint NOT NULL DEFAULT nextval('gastos_extra_pdf_factura_id_seq'::regclass),
  id_factura integer NOT NULL,
  id_tarea integer,
  id_usuario uuid NOT NULL,
  fecha date NOT NULL,
  monto numeric(12,2) NOT NULL,
  descripcion text NOT NULL,
  comprobante_url text,
  imagen_procesada_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT gastos_extra_pdf_factura_monto_check CHECK (monto >= 0::numeric),
  CONSTRAINT gastos_extra_pdf_factura_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.gastos_tarea (
  id integer NOT NULL DEFAULT nextval('gastos_tarea_id_seq'::regclass),
  id_tarea integer NOT NULL,
  id_usuario uuid NOT NULL,
  tipo_gasto text NOT NULL,
  monto integer NOT NULL,
  descripcion text NOT NULL,
  comprobante_url text,
  fecha_gasto date DEFAULT CURRENT_DATE,
  estado text DEFAULT 'aprobado'::text,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  metodo_registro character varying(20) DEFAULT 'manual'::character varying,
  datos_ocr jsonb,
  confianza_ocr numeric(5,2),
  imagen_procesada_url text,
  liquidado boolean DEFAULT false,
  id_liquidacion integer,
  CONSTRAINT gastos_tarea_monto_check CHECK (monto > 0),
  CONSTRAINT gastos_tarea_pkey PRIMARY KEY (id),
  CONSTRAINT gastos_tarea_tipo_gasto_check CHECK (tipo_gasto = ANY (ARRAY['material'::text, 'herramienta'::text, 'transporte'::text, 'otro'::text, 'mano_de_obra'::text]))
);

CREATE TABLE IF NOT EXISTS public.items (
  id integer NOT NULL DEFAULT nextval('items_id_seq'::regclass),
  code text GENERATED ALWAYS AS (('ITM-'::text || lpad((id)::text, 5, '0'::text))) STORED,
  descripcion text NOT NULL,
  cantidad integer DEFAULT 1,
  precio integer NOT NULL,
  id_presupuesto integer,
  producto_id uuid,
  es_material boolean NOT NULL DEFAULT false,
  CONSTRAINT items_cantidad_check CHECK (cantidad > 0),
  CONSTRAINT items_code_key UNIQUE (code),
  CONSTRAINT items_pkey PRIMARY KEY (id),
  CONSTRAINT items_precio_check CHECK (precio >= 0)
);

CREATE TABLE IF NOT EXISTS public.items_factura (
  id integer NOT NULL GENERATED BY DEFAULT AS IDENTITY,
  code text,
  descripcion text,
  cantidad integer NOT NULL DEFAULT 1,
  precio_unitario integer NOT NULL DEFAULT 0,
  subtotal_item integer NOT NULL DEFAULT 0,
  id_factura integer NOT NULL,
  producto_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  es_material boolean NOT NULL DEFAULT false,
  CONSTRAINT items_factura_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.liquidaciones_nuevas (
  id integer NOT NULL DEFAULT nextval('liquidaciones_nuevas_id_seq'::regclass),
  code text NOT NULL,
  id_tarea integer NOT NULL,
  id_presupuesto_base integer,
  id_presupuesto_final integer,
  id_factura integer,
  gastos_reales integer NOT NULL,
  total_base integer NOT NULL,
  ganancia_neta integer NOT NULL,
  porcentaje_distribucion integer DEFAULT 50,
  ganancia_supervisor integer NOT NULL,
  ajuste_admin integer NOT NULL,
  ganancia_admin integer NOT NULL,
  observaciones text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  sobrecosto boolean DEFAULT false,
  monto_sobrecosto integer DEFAULT 0,
  sobrecosto_supervisor integer DEFAULT 0,
  sobrecosto_admin integer DEFAULT 0,
  id_usuario_admin uuid,
  id_usuario_supervisor uuid,
  total_supervisor integer,
  url_pdf text,
  pagada boolean NOT NULL DEFAULT false,
  fecha_pago timestamp with time zone,
  detalle_gastos_json jsonb,
  total_base_mo numeric DEFAULT 0,
  fondo_neto_mo numeric DEFAULT 0,
  remanente_comercial numeric DEFAULT 0,
  ganancia_gerente numeric DEFAULT 0,
  canon_admin numeric DEFAULT 0,
  ganancia_admin_remanente numeric DEFAULT 0,
  ganancia_admin_total numeric DEFAULT 0,
  comision_administrador_consorcio numeric DEFAULT 0,
  CONSTRAINT liquidaciones_nuevas_code_key UNIQUE (code),
  CONSTRAINT liquidaciones_nuevas_gastos_reales_check CHECK (gastos_reales >= 0),
  CONSTRAINT liquidaciones_nuevas_pkey PRIMARY KEY (id),
  CONSTRAINT liquidaciones_nuevas_porcentaje_distribucion_check CHECK (porcentaje_distribucion >= 0 AND porcentaje_distribucion <= 100)
);

CREATE TABLE IF NOT EXISTS public.liquidaciones_trabajadores (
  id integer NOT NULL DEFAULT nextval('liquidaciones_trabajadores_id_seq'::regclass),
  id_trabajador uuid NOT NULL,
  semana_inicio date NOT NULL,
  semana_fin date NOT NULL,
  total_dias numeric(3,1) NOT NULL,
  salario_base integer NOT NULL,
  plus_manual integer DEFAULT 0,
  gastos_reembolsados integer DEFAULT 0,
  total_pagar integer NOT NULL,
  estado text DEFAULT 'pendiente'::text,
  observaciones text,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT liquidaciones_trabajadores_estado_check CHECK (estado = ANY (ARRAY['pendiente'::text, 'pagado'::text])),
  CONSTRAINT liquidaciones_trabajadores_gastos_reembolsados_check CHECK (gastos_reembolsados >= 0),
  CONSTRAINT liquidaciones_trabajadores_id_trabajador_semana_inicio_sema_key UNIQUE (id_trabajador, semana_inicio, semana_fin),
  CONSTRAINT liquidaciones_trabajadores_pkey PRIMARY KEY (id),
  CONSTRAINT liquidaciones_trabajadores_plus_manual_check CHECK (plus_manual >= 0),
  CONSTRAINT liquidaciones_trabajadores_salario_base_check CHECK (salario_base >= 0),
  CONSTRAINT liquidaciones_trabajadores_total_dias_check CHECK (total_dias >= 0::numeric),
  CONSTRAINT liquidaciones_trabajadores_total_pagar_check CHECK (total_pagar >= 0)
);

CREATE TABLE IF NOT EXISTS public.micro_tareas_operativas (
  id integer NOT NULL DEFAULT nextval('micro_tareas_operativas_id_seq'::regclass),
  titulo text NOT NULL,
  descripcion text,
  comentario text,
  id_edificio integer,
  id_departamento integer,
  id_asignado uuid,
  prioridad text DEFAULT 'media'::text,
  id_tarea_padre integer,
  promocionada boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  realizada boolean DEFAULT false,
  CONSTRAINT micro_tareas_operativas_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.pagos_facturas (
  id integer NOT NULL DEFAULT nextval('pagos_facturas_id_seq'::regclass),
  id_factura integer,
  modalidad_pago character varying(20),
  monto_pagado numeric(12,2) NOT NULL,
  fecha_pago date DEFAULT CURRENT_DATE,
  created_at timestamp without time zone DEFAULT now(),
  created_by uuid,
  id_administrador integer,
  CONSTRAINT pagos_facturas_modalidad_pago_check CHECK (modalidad_pago::text = ANY (ARRAY['total'::character varying::text, '50_porciento'::character varying::text, 'ajustable'::character varying::text])),
  CONSTRAINT pagos_facturas_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.partes_de_trabajo (
  id bigint NOT NULL GENERATED BY DEFAULT AS IDENTITY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  id_trabajador uuid NOT NULL,
  id_tarea bigint NOT NULL,
  fecha date NOT NULL,
  tipo_jornada text NOT NULL,
  id_registrador uuid NOT NULL DEFAULT auth.uid(),
  comentarios text,
  liquidado boolean DEFAULT false,
  id_liquidacion integer,
  estado text NOT NULL DEFAULT 'confirmado'::text,
  CONSTRAINT partes_de_trabajo_estado_check CHECK (estado = ANY (ARRAY['proyectado'::text, 'confirmado'::text])),
  CONSTRAINT partes_de_trabajo_pkey PRIMARY KEY (id),
  CONSTRAINT partes_de_trabajo_tipo_jornada_check CHECK (tipo_jornada = ANY (ARRAY['medio_dia'::text, 'dia_completo'::text]))
);

CREATE TABLE IF NOT EXISTS public.preferencias_usuarios (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  id_usuario uuid NOT NULL,
  tema character varying(10) DEFAULT 'system'::character varying,
  tamano_texto character varying(10) DEFAULT 'medium'::character varying,
  color_primario character varying(20) DEFAULT 'blue'::character varying,
  notificaciones_email boolean DEFAULT true,
  notificaciones_push boolean DEFAULT false,
  dashboard_layout character varying(20) DEFAULT 'default'::character varying,
  mostrar_graficos boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT preferencias_usuarios_id_usuario_key UNIQUE (id_usuario),
  CONSTRAINT preferencias_usuarios_pkey PRIMARY KEY (id),
  CONSTRAINT preferencias_usuarios_tamano_texto_check CHECK (tamano_texto::text = ANY (ARRAY['small'::character varying::text, 'medium'::character varying::text, 'large'::character varying::text])),
  CONSTRAINT preferencias_usuarios_tema_check CHECK (tema::text = ANY (ARRAY['light'::character varying::text, 'dark'::character varying::text, 'system'::character varying::text]))
);

CREATE TABLE IF NOT EXISTS public.presupuestos_base (
  id integer NOT NULL DEFAULT nextval('presupuestos_base_id_seq'::regclass),
  code text NOT NULL,
  id_tarea integer NOT NULL,
  materiales integer NOT NULL,
  mano_obra integer NOT NULL,
  total integer GENERATED ALWAYS AS ((materiales + mano_obra)) STORED,
  aprobado boolean DEFAULT false,
  id_supervisor uuid,
  fecha_aprobacion timestamp without time zone,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  nota_pb text,
  id_edificio integer,
  id_administrador integer,
  base_liquidada boolean DEFAULT false,
  CONSTRAINT presupuestos_base_code_key UNIQUE (code),
  CONSTRAINT presupuestos_base_mano_obra_check CHECK (mano_obra >= 0),
  CONSTRAINT presupuestos_base_materiales_check CHECK (materiales >= 0),
  CONSTRAINT presupuestos_base_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.presupuestos_finales (
  id integer NOT NULL DEFAULT nextval('presupuestos_finales_id_seq'::regclass),
  code text NOT NULL,
  id_presupuesto_base integer,
  materiales integer NOT NULL,
  mano_obra integer NOT NULL,
  total integer NOT NULL,
  total_base integer NOT NULL,
  ajuste_admin integer NOT NULL,
  observaciones_admin text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  id_estado integer DEFAULT 1,
  id_edificio integer,
  id_tarea integer,
  id_administrador integer,
  aprobado boolean DEFAULT false,
  rechazado boolean DEFAULT false,
  id_liquidacion_supervisor bigint,
  enviado boolean DEFAULT false,
  fecha_envio timestamp with time zone,
  fecha_aprobacion timestamp without time zone,
  descuento_monto integer DEFAULT 0,
  historial_versiones jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT chk_pf_no_aprobado_y_rechazado CHECK (NOT (aprobado AND rechazado)),
  CONSTRAINT presupuestos_finales_code_key UNIQUE (code),
  CONSTRAINT presupuestos_finales_descuento_monto_check CHECK (descuento_monto >= 0),
  CONSTRAINT presupuestos_finales_mano_obra_check CHECK (mano_obra >= 0),
  CONSTRAINT presupuestos_finales_materiales_check CHECK (materiales >= 0),
  CONSTRAINT presupuestos_finales_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.productos (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  code integer NOT NULL DEFAULT nextval('productos_code_seq'::regclass),
  nombre character varying(200) NOT NULL,
  descripcion text,
  precio integer NOT NULL,
  categoria_id uuid,
  activo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT productos_code_key UNIQUE (code),
  CONSTRAINT productos_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.supervisores_tareas (
  id integer NOT NULL DEFAULT nextval('supervisores_tareas_id_seq'::regclass),
  id_tarea integer,
  id_supervisor uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT supervisores_tareas_id_tarea_id_supervisor_key UNIQUE (id_tarea, id_supervisor),
  CONSTRAINT supervisores_tareas_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.tareas (
  id integer NOT NULL DEFAULT nextval('tareas_id_seq'::regclass),
  code text GENERATED ALWAYS AS (('TAR-'::text || lpad((id)::text, 5, '0'::text))) STORED,
  titulo text NOT NULL,
  descripcion text,
  id_edificio integer NOT NULL,
  fecha_visita timestamp without time zone,
  prioridad text DEFAULT 'media'::text,
  created_at timestamp without time zone DEFAULT now(),
  id_estado_nuevo integer,
  gastos_tarea_pdf text,
  id_administrador integer,
  finalizada boolean DEFAULT false,
  updated_at timestamp with time zone DEFAULT now(),
  se_trabajo boolean DEFAULT false,
  descripcion_trabajo_realizado text,
  fecha_finalizacion timestamp with time zone,
  es_particular boolean NOT NULL DEFAULT false,
  CONSTRAINT tareas_code_key UNIQUE (code),
  CONSTRAINT tareas_pkey PRIMARY KEY (id),
  CONSTRAINT tareas_prioridad_check CHECK (prioridad = ANY (ARRAY['baja'::text, 'media'::text, 'alta'::text]))
);

CREATE TABLE IF NOT EXISTS public.trabajadores_tareas (
  id integer NOT NULL DEFAULT nextval('trabajadores_tareas_id_seq'::regclass),
  id_tarea integer,
  id_trabajador uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT trabajadores_tareas_id_tarea_id_trabajador_key UNIQUE (id_tarea, id_trabajador),
  CONSTRAINT trabajadores_tareas_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.usuarios (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text GENERATED ALWAYS AS (('USU-'::text || "substring"((id)::text, 1, 5))) STORED,
  email text NOT NULL,
  rol text NOT NULL DEFAULT 'operario'::text,
  color_perfil text DEFAULT '#3498db'::text,
  last_login timestamp without time zone,
  nombre text,
  es_propietario boolean NOT NULL DEFAULT false,
  google_refresh_token text,
  google_access_token text,
  google_token_expiry bigint,
  webauthn_enabled boolean DEFAULT false,
  activo boolean DEFAULT true,
  webauthn_credentials jsonb NOT NULL DEFAULT '[]'::jsonb,
  telefono text,
  id_delegacion bigint,
  preferencias jsonb DEFAULT '{}'::jsonb,
  ultimo_acceso timestamp with time zone,
  porcentaje_canon_default numeric DEFAULT 15,
  CONSTRAINT usuarios_code_key UNIQUE (code),
  CONSTRAINT usuarios_color_perfil_check CHECK (color_perfil IS NULL OR color_perfil ~ '^#[0-9a-fA-F]{6}$'::text),
  CONSTRAINT usuarios_email_key UNIQUE (email),
  CONSTRAINT usuarios_pkey PRIMARY KEY (id),
  CONSTRAINT usuarios_rol_check CHECK (rol = ANY (ARRAY['trabajador'::text, 'supervisor'::text, 'gerente'::text, 'admin'::text]))
);

-- 4. CLAVES FORANEAS (RELACIONES)
ALTER TABLE public.adelantos ADD CONSTRAINT adelantos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id);
ALTER TABLE public.ajustes_facturas ADD CONSTRAINT ajustes_facturas_id_factura_fkey FOREIGN KEY (id_factura) REFERENCES facturas(id) ON DELETE CASCADE;
ALTER TABLE public.ajustes_facturas ADD CONSTRAINT ajustes_facturas_id_item_fkey FOREIGN KEY (id_item) REFERENCES items_factura(id);
ALTER TABLE public.comentarios ADD CONSTRAINT comentarios_id_tarea_fkey FOREIGN KEY (id_tarea) REFERENCES tareas(id) ON DELETE CASCADE;
ALTER TABLE public.comentarios ADD CONSTRAINT comentarios_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE public.configuracion_trabajadores ADD CONSTRAINT configuracion_trabajadores_id_trabajador_fkey FOREIGN KEY (id_trabajador) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE public.contactos ADD CONSTRAINT contactos_departamento_id_fkey FOREIGN KEY (departamento_id) REFERENCES departamentos(id) ON DELETE SET NULL;
ALTER TABLE public.departamentos ADD CONSTRAINT departamentos_edificio_id_fkey FOREIGN KEY (edificio_id) REFERENCES edificios(id) ON DELETE CASCADE;
ALTER TABLE public.departamentos_tareas ADD CONSTRAINT departamentos_tareas_id_departamento_fkey FOREIGN KEY (id_departamento) REFERENCES departamentos(id) ON DELETE CASCADE;
ALTER TABLE public.departamentos_tareas ADD CONSTRAINT departamentos_tareas_id_tarea_fkey FOREIGN KEY (id_tarea) REFERENCES tareas(id) ON DELETE CASCADE;
ALTER TABLE public.edificios ADD CONSTRAINT edificios_id_administrador_fkey FOREIGN KEY (id_administrador) REFERENCES administradores(id) ON DELETE CASCADE;
ALTER TABLE public.facturas ADD CONSTRAINT facturas_id_estado_nuevo_fkey FOREIGN KEY (id_estado_nuevo) REFERENCES estados_facturas(id);
ALTER TABLE public.facturas ADD CONSTRAINT facturas_id_presupuesto_final_fkey FOREIGN KEY (id_presupuesto_final) REFERENCES presupuestos_finales(id);
ALTER TABLE public.facturas ADD CONSTRAINT facturas_id_presupuesto_fkey FOREIGN KEY (id_presupuesto) REFERENCES presupuestos_base(id);
ALTER TABLE public.facturas ADD CONSTRAINT fk_facturas_administrador FOREIGN KEY (id_administrador) REFERENCES administradores(id) ON DELETE SET NULL;
ALTER TABLE public.gastos_extra_pdf_factura ADD CONSTRAINT gastos_extra_pdf_factura_id_factura_fkey FOREIGN KEY (id_factura) REFERENCES facturas(id) ON DELETE CASCADE;
ALTER TABLE public.gastos_extra_pdf_factura ADD CONSTRAINT gastos_extra_pdf_factura_id_tarea_fkey FOREIGN KEY (id_tarea) REFERENCES tareas(id) ON DELETE SET NULL;
ALTER TABLE public.gastos_extra_pdf_factura ADD CONSTRAINT gastos_extra_pdf_factura_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES usuarios(id);
ALTER TABLE public.gastos_tarea ADD CONSTRAINT gastos_tarea_id_liquidacion_fkey FOREIGN KEY (id_liquidacion) REFERENCES liquidaciones_nuevas(id);
ALTER TABLE public.gastos_tarea ADD CONSTRAINT gastos_tarea_id_tarea_fkey FOREIGN KEY (id_tarea) REFERENCES tareas(id) ON DELETE CASCADE;
ALTER TABLE public.gastos_tarea ADD CONSTRAINT gastos_tarea_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE public.items ADD CONSTRAINT items_id_presupuesto_final_fkey FOREIGN KEY (id_presupuesto) REFERENCES presupuestos_finales(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.items ADD CONSTRAINT items_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES productos(id);
ALTER TABLE public.items_factura ADD CONSTRAINT fk_items_factura_to_factura FOREIGN KEY (id_factura) REFERENCES facturas(id) ON DELETE CASCADE;
ALTER TABLE public.items_factura ADD CONSTRAINT fk_items_factura_to_producto FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL;
ALTER TABLE public.liquidaciones_nuevas ADD CONSTRAINT fk_usuario_admin FOREIGN KEY (id_usuario_admin) REFERENCES auth.users(id);
ALTER TABLE public.liquidaciones_nuevas ADD CONSTRAINT fk_usuario_supervisor FOREIGN KEY (id_usuario_supervisor) REFERENCES auth.users(id);
ALTER TABLE public.liquidaciones_nuevas ADD CONSTRAINT liquidaciones_nuevas_id_factura_fkey FOREIGN KEY (id_factura) REFERENCES facturas(id);
ALTER TABLE public.liquidaciones_nuevas ADD CONSTRAINT liquidaciones_nuevas_id_presupuesto_base_fkey FOREIGN KEY (id_presupuesto_base) REFERENCES presupuestos_base(id);
ALTER TABLE public.liquidaciones_nuevas ADD CONSTRAINT liquidaciones_nuevas_id_presupuesto_final_fkey FOREIGN KEY (id_presupuesto_final) REFERENCES presupuestos_finales(id);
ALTER TABLE public.liquidaciones_nuevas ADD CONSTRAINT liquidaciones_nuevas_id_tarea_fkey FOREIGN KEY (id_tarea) REFERENCES tareas(id);
ALTER TABLE public.liquidaciones_trabajadores ADD CONSTRAINT liquidaciones_trabajadores_id_trabajador_fkey FOREIGN KEY (id_trabajador) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE public.micro_tareas_operativas ADD CONSTRAINT micro_tareas_operativas_id_asignado_fkey FOREIGN KEY (id_asignado) REFERENCES usuarios(id);
ALTER TABLE public.micro_tareas_operativas ADD CONSTRAINT micro_tareas_operativas_id_departamento_fkey FOREIGN KEY (id_departamento) REFERENCES departamentos(id) ON DELETE SET NULL;
ALTER TABLE public.micro_tareas_operativas ADD CONSTRAINT micro_tareas_operativas_id_edificio_fkey FOREIGN KEY (id_edificio) REFERENCES edificios(id) ON DELETE CASCADE;
ALTER TABLE public.micro_tareas_operativas ADD CONSTRAINT micro_tareas_operativas_id_tarea_padre_fkey FOREIGN KEY (id_tarea_padre) REFERENCES tareas(id) ON DELETE SET NULL;
ALTER TABLE public.pagos_facturas ADD CONSTRAINT fk_pagos_facturas_administrador FOREIGN KEY (id_administrador) REFERENCES administradores(id) ON DELETE SET NULL;
ALTER TABLE public.pagos_facturas ADD CONSTRAINT pagos_facturas_created_by_fkey FOREIGN KEY (created_by) REFERENCES usuarios(id);
ALTER TABLE public.pagos_facturas ADD CONSTRAINT pagos_facturas_id_factura_fkey FOREIGN KEY (id_factura) REFERENCES facturas(id) ON DELETE CASCADE;
ALTER TABLE public.partes_de_trabajo ADD CONSTRAINT partes_de_trabajo_id_registrador_fkey FOREIGN KEY (id_registrador) REFERENCES usuarios(id);
ALTER TABLE public.partes_de_trabajo ADD CONSTRAINT partes_de_trabajo_id_tarea_fkey FOREIGN KEY (id_tarea) REFERENCES tareas(id);
ALTER TABLE public.partes_de_trabajo ADD CONSTRAINT partes_de_trabajo_id_trabajador_fkey FOREIGN KEY (id_trabajador) REFERENCES usuarios(id);
ALTER TABLE public.preferencias_usuarios ADD CONSTRAINT preferencias_usuarios_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE public.presupuestos_base ADD CONSTRAINT fk_presupuestos_base_administrador FOREIGN KEY (id_administrador) REFERENCES administradores(id) ON DELETE SET NULL;
ALTER TABLE public.presupuestos_base ADD CONSTRAINT fk_presupuestos_base_id_edificio FOREIGN KEY (id_edificio) REFERENCES edificios(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE public.presupuestos_base ADD CONSTRAINT presupuestos_base_id_supervisor_fkey FOREIGN KEY (id_supervisor) REFERENCES auth.users(id);
ALTER TABLE public.presupuestos_base ADD CONSTRAINT presupuestos_base_id_tarea_fkey FOREIGN KEY (id_tarea) REFERENCES tareas(id);
ALTER TABLE public.presupuestos_finales ADD CONSTRAINT fk_presupuestos_finales_administrador FOREIGN KEY (id_administrador) REFERENCES administradores(id) ON DELETE SET NULL;
ALTER TABLE public.presupuestos_finales ADD CONSTRAINT fk_presupuestos_finales_id_edificio FOREIGN KEY (id_edificio) REFERENCES edificios(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE public.presupuestos_finales ADD CONSTRAINT fk_presupuestos_finales_id_tarea FOREIGN KEY (id_tarea) REFERENCES tareas(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.presupuestos_finales ADD CONSTRAINT presupuestos_finales_id_estado_fkey FOREIGN KEY (id_estado) REFERENCES estados_presupuestos(id);
ALTER TABLE public.presupuestos_finales ADD CONSTRAINT presupuestos_finales_id_liquidacion_supervisor_fkey FOREIGN KEY (id_liquidacion_supervisor) REFERENCES liquidaciones_nuevas(id);
ALTER TABLE public.presupuestos_finales ADD CONSTRAINT presupuestos_finales_id_presupuesto_base_fkey FOREIGN KEY (id_presupuesto_base) REFERENCES presupuestos_base(id);
ALTER TABLE public.productos ADD CONSTRAINT productos_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES categorias_productos(id);
ALTER TABLE public.supervisores_tareas ADD CONSTRAINT supervisores_tareas_id_supervisor_fkey FOREIGN KEY (id_supervisor) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE public.supervisores_tareas ADD CONSTRAINT supervisores_tareas_id_tarea_fkey FOREIGN KEY (id_tarea) REFERENCES tareas(id) ON DELETE CASCADE;
ALTER TABLE public.tareas ADD CONSTRAINT fk_tareas_administrador FOREIGN KEY (id_administrador) REFERENCES administradores(id) ON DELETE SET NULL;
ALTER TABLE public.tareas ADD CONSTRAINT tareas_id_edificio_fkey FOREIGN KEY (id_edificio) REFERENCES edificios(id) ON DELETE CASCADE;
ALTER TABLE public.tareas ADD CONSTRAINT tareas_id_estado_nuevo_fkey FOREIGN KEY (id_estado_nuevo) REFERENCES estados_tareas(id);
ALTER TABLE public.trabajadores_tareas ADD CONSTRAINT trabajadores_tareas_id_tarea_fkey FOREIGN KEY (id_tarea) REFERENCES tareas(id) ON DELETE CASCADE;
ALTER TABLE public.trabajadores_tareas ADD CONSTRAINT trabajadores_tareas_id_trabajador_fkey FOREIGN KEY (id_trabajador) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE public.edificios ADD CONSTRAINT edificios_id_gerente_fkey FOREIGN KEY (id_gerente) REFERENCES usuarios(id) ON DELETE SET NULL;

-- 5. FUNCIONES Y PROCEDIMIENTOS ALMACENADOS (107 FUNCIONES)
CREATE OR REPLACE FUNCTION public.actualizar_fecha_tarea(tarea_id integer, nueva_fecha text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_rol TEXT;
    v_user_id UUID;
    es_trabajador BOOLEAN := FALSE;
    es_supervisor BOOLEAN := FALSE;
    es_admin BOOLEAN := FALSE;
    resultado JSONB;
    fecha_timestamp TIMESTAMP;
    tarea_existente BOOLEAN;
    fecha_verificada TIMESTAMP;
BEGIN
    -- Registrar información para diagnóstico
    RAISE LOG 'Actualizar fecha: ID=%', tarea_id;
    RAISE LOG 'Actualizar fecha: Nueva fecha=%', nueva_fecha;

    -- Verificar que la tarea exista
    SELECT EXISTS(SELECT 1 FROM tareas WHERE id = tarea_id) INTO tarea_existente;
    
    IF NOT tarea_existente THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Tarea no existe', 'codigo', 'NOT_FOUND');
    END IF;

    -- Convertir texto a timestamp con manejo de formato
    BEGIN
        -- Si es null o vacío, establecer como null
        IF nueva_fecha IS NULL OR nueva_fecha = '' THEN
            fecha_timestamp := NULL;
        ELSE
            -- Intentar convertir el texto a timestamp
            fecha_timestamp := nueva_fecha::TIMESTAMP;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', FALSE, 
            'error', 'Formato de fecha inválido: ' || nueva_fecha, 
            'codigo', 'INVALID_FORMAT'
        );
    END;

    -- Obtener ID y rol del usuario actual
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Usuario no autenticado', 'codigo', 'NO_AUTH');
    END IF;
    
    SELECT rol INTO v_rol FROM public.usuarios WHERE id = v_user_id;
    RAISE LOG 'Usuario: ID=%, Rol=%', v_user_id, v_rol;
    
    -- Verificar si es admin
    IF v_rol = 'admin' THEN
        es_admin := TRUE;
    END IF;
    
    -- Verificar si es trabajador asignado a la tarea usando la tabla relacional
    SELECT EXISTS (
        SELECT 1 FROM trabajadores_tareas WHERE id_tarea = tarea_id AND id_trabajador = v_user_id
    ) INTO es_trabajador;
    
    -- Verificar si es supervisor de la tarea usando la tabla relacional
    SELECT EXISTS (
        SELECT 1 FROM supervisores_tareas WHERE id_tarea = tarea_id AND id_supervisor = v_user_id
    ) INTO es_supervisor;
    
    RAISE LOG 'Permisos: admin=%, supervisor=%, trabajador=%', es_admin, es_supervisor, es_trabajador;
    
    -- Actualizar la fecha si tiene permisos
    IF es_admin OR es_supervisor OR es_trabajador THEN
        -- SOLUCIÓN CLAVE: Desactivar temporalmente el trigger específico para esta operación
        ALTER TABLE tareas DISABLE TRIGGER trigger_set_fecha_visita_on_tareas_change;
        
        UPDATE tareas 
        SET fecha_visita = fecha_timestamp
        WHERE id = tarea_id;
        
        -- Reactivar el trigger
        ALTER TABLE tareas ENABLE TRIGGER trigger_set_fecha_visita_on_tareas_change;
        
        -- Verificar que el cambio se realizó correctamente
        SELECT fecha_visita INTO fecha_verificada FROM tareas WHERE id = tarea_id;
        
        resultado := jsonb_build_object(
            'success', TRUE,
            'nueva_fecha', fecha_timestamp,
            'fecha_verificada', fecha_verificada,
            'rol', v_rol,
            'es_admin', es_admin,
            'es_supervisor', es_supervisor,
            'es_trabajador', es_trabajador
        );
    ELSE
        resultado := jsonb_build_object(
            'success', FALSE, 
            'error', 'Sin permisos para esta acción',
            'rol', v_rol,
            'es_admin', es_admin,
            'es_supervisor', es_supervisor,
            'es_trabajador', es_trabajador
        );
    END IF;
    
    RETURN resultado;
END;
$function$;

CREATE OR REPLACE FUNCTION public.actualizar_fecha_visita_trigger_function()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    es_cambio_explicito BOOLEAN;
BEGIN
    -- Determinar si es un cambio explícito (comparando solo día para evitar falsos positivos)
    IF TG_OP = 'INSERT' THEN
        es_cambio_explicito := NEW.fecha_visita IS NOT NULL;
    ELSE -- UPDATE
        es_cambio_explicito :=
            ((OLD.fecha_visita IS NULL AND NEW.fecha_visita IS NULL) = FALSE)
            AND (
                (OLD.fecha_visita IS NULL AND NEW.fecha_visita IS NOT NULL) OR
                (OLD.fecha_visita IS NOT NULL AND NEW.fecha_visita IS NULL) OR
                (
                    OLD.fecha_visita IS NOT NULL AND 
                    NEW.fecha_visita IS NOT NULL AND
                    DATE_TRUNC('day', OLD.fecha_visita) <> DATE_TRUNC('day', NEW.fecha_visita)
                )
            );
    END IF;
    
    RAISE LOG 'Trigger evaluación: OP=%, ID=%, es_cambio_explicito=%',
              TG_OP, NEW.id, es_cambio_explicito;

    -- Nuevo comportamiento: NO autogenerar fecha_visita
    IF TG_OP = 'INSERT' THEN
        IF NEW.fecha_visita IS NULL THEN
            RAISE LOG 'Trigger: INSERT sin fecha_visita, se conserva NULL para tarea ID=%', NEW.id;
        ELSE
            RAISE LOG 'Trigger: INSERT con fecha_visita explícita, se respeta para tarea ID=%', NEW.id;
        END IF;
        RETURN NEW;
    ELSE
        IF es_cambio_explicito THEN
            RAISE LOG 'Trigger: UPDATE con cambio explícito en fecha_visita, se respeta valor para tarea ID=%', NEW.id;
        ELSE
            RAISE LOG 'Trigger: UPDATE sin cambio explícito, no se modifica fecha_visita para tarea ID=%', NEW.id;
        END IF;
        RETURN NEW;
    END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.actualizar_gastos_liquidados(p_tarea_id integer, p_fecha_inicio date, p_fecha_fin date, p_liquidacion_id integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  registros_actualizados INTEGER;
BEGIN
  -- Actualizar los gastos
  UPDATE gastos_tarea
  SET 
    liquidado = TRUE, 
    id_liquidacion = p_liquidacion_id
  WHERE id_tarea = p_tarea_id
    AND fecha_gasto BETWEEN p_fecha_inicio AND p_fecha_fin
    AND (liquidado = FALSE OR liquidado IS NULL);

  GET DIAGNOSTICS registros_actualizados = ROW_COUNT;
  RETURN registros_actualizados;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error en actualizar_gastos_liquidados: %', SQLERRM;
  RETURN 0;
END;
$function$;

CREATE OR REPLACE FUNCTION public.actualizar_gastos_tarea_liquidados(id_tarea_param integer, id_liquidacion_param integer)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  registros_actualizados INTEGER;
BEGIN
  -- Convertimos explícitamente los tipos para evitar problemas de cast
  UPDATE gastos_tarea 
  SET 
    liquidado = TRUE,
    id_liquidacion = id_liquidacion_param
  WHERE 
    id_tarea = id_tarea_param
    AND (liquidado IS NULL OR liquidado = FALSE);
    
  GET DIAGNOSTICS registros_actualizados = ROW_COUNT;
  RETURN registros_actualizados;
END;
$function$;

CREATE OR REPLACE FUNCTION public.actualizar_liquidacion_completa(p_trabajador_id uuid, p_tareas integer[], p_fecha_inicio date, p_fecha_fin date, p_liquidacion_id integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  partes_actualizados INTEGER := 0;
  gastos_actualizados INTEGER := 0;
  tarea_id INTEGER;
  tarea_result INTEGER;
BEGIN
  -- Actualizar partes de trabajo
  partes_actualizados := actualizar_partes_trabajo_liquidados(
    p_trabajador_id,
    p_fecha_inicio,
    p_fecha_fin,
    p_liquidacion_id
  );

  -- Actualizar gastos para cada tarea
  FOREACH tarea_id IN ARRAY p_tareas
  LOOP
    tarea_result := actualizar_gastos_liquidados(
      tarea_id,
      p_fecha_inicio,
      p_fecha_fin,
      p_liquidacion_id
    );
    
    gastos_actualizados := gastos_actualizados + tarea_result;
  END LOOP;

  -- Devolver resultado como JSON
  RETURN jsonb_build_object(
    'partes_actualizados', partes_actualizados,
    'gastos_actualizados', gastos_actualizados,
    'trabajador_id', p_trabajador_id,
    'fecha_inicio', p_fecha_inicio,
    'fecha_fin', p_fecha_fin,
    'liquidacion_id', p_liquidacion_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'error', SQLERRM,
    'trabajador_id', p_trabajador_id,
    'liquidacion_id', p_liquidacion_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.actualizar_liquidacion_trabajador(p_trabajador_id uuid, p_fecha_inicio date, p_fecha_fin date, p_liquidacion_id integer, p_tareas integer[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  partes_actualizados INTEGER := 0;
  gastos_actualizados INTEGER := 0;
  tarea_id INTEGER;
  parte RECORD;
  gasto RECORD;
  resultado_detalle JSONB := '[]'::JSONB;
  parte_ids INTEGER[] := '{}';
  gasto_ids INTEGER[] := '{}';
  log_msg TEXT;
BEGIN
  -- 1. Registrar inicio de la función
  RAISE LOG 'Iniciando actualización de liquidación % para trabajador % del % al %',
    p_liquidacion_id, p_trabajador_id, p_fecha_inicio, p_fecha_fin;

  -- 2. Actualizar partes_de_trabajo
  FOR parte IN 
    SELECT id, fecha, liquidado
    FROM partes_de_trabajo
    WHERE id_trabajador = p_trabajador_id
      AND fecha BETWEEN p_fecha_inicio AND p_fecha_fin
      AND (liquidado IS NULL OR liquidado = FALSE)
  LOOP
    -- Actualizar cada parte individualmente
    UPDATE partes_de_trabajo
    SET liquidado = TRUE
    WHERE id = parte.id;
    
    -- Guardar ID para el reporte
    parte_ids := array_append(parte_ids, parte.id);
    
    -- Incrementar contador
    partes_actualizados := partes_actualizados + 1;
    
    -- Agregar al detalle
    resultado_detalle := resultado_detalle || jsonb_build_object(
      'tipo', 'parte',
      'id', parte.id,
      'fecha', parte.fecha,
      'actualizado', TRUE
    );
    
    -- Log para depuración
    RAISE LOG 'Parte % actualizado: fecha=%', parte.id, parte.fecha;
  END LOOP;

  -- 3. Actualizar gastos_tarea para cada tarea
  FOREACH tarea_id IN ARRAY p_tareas
  LOOP
    FOR gasto IN 
      SELECT id, fecha_gasto
      FROM gastos_tarea
      WHERE id_tarea = tarea_id
        AND fecha_gasto BETWEEN p_fecha_inicio AND p_fecha_fin
        AND (liquidado IS NULL OR liquidado = FALSE)
    LOOP
      -- Actualizar cada gasto individualmente (SIN asignar id_liquidacion)
      UPDATE gastos_tarea
      SET liquidado = TRUE
      -- Ya NO asignamos id_liquidacion = p_liquidacion_id (para evitar error de FK)
      WHERE id = gasto.id;
      
      -- Guardar ID para el reporte
      gasto_ids := array_append(gasto_ids, gasto.id);
      
      -- Incrementar contador
      gastos_actualizados := gastos_actualizados + 1;
      
      -- Agregar al detalle
      resultado_detalle := resultado_detalle || jsonb_build_object(
        'tipo', 'gasto',
        'id', gasto.id,
        'fecha', gasto.fecha_gasto,
        'tarea', tarea_id,
        'actualizado', TRUE
      );
      
      -- Log para depuración
      RAISE LOG 'Gasto % actualizado: fecha=%, tarea=%', 
        gasto.id, gasto.fecha_gasto, tarea_id;
    END LOOP;
  END LOOP;

  -- 4. Registrar finalización y devolver resultado
  log_msg := format('Actualización completada - Resultados: %s partes, %s gastos', 
                    partes_actualizados, gastos_actualizados);
  RAISE LOG '%', log_msg;
  
  -- Devolver resultado completo
  RETURN jsonb_build_object(
    'partes_actualizados', partes_actualizados,
    'gastos_actualizados', gastos_actualizados,
    'trabajador_id', p_trabajador_id,
    'liquidacion_id', p_liquidacion_id,
    'parte_ids', parte_ids,
    'gasto_ids', gasto_ids,
    'detalle', resultado_detalle,
    'mensaje', log_msg
  );
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error en actualizar_liquidacion_trabajador: %', SQLERRM;
  RETURN jsonb_build_object(
    'error', SQLERRM,
    'trabajador_id', p_trabajador_id,
    'liquidacion_id', p_liquidacion_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.actualizar_liquidaciones_automatico()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  gastos_calculados INTEGER;
  presupuesto_base INTEGER;
  ganancia_calculada INTEGER;
  tarea_id INTEGER;
BEGIN
  -- Determinar el ID de la tarea
  tarea_id := COALESCE(NEW.id_tarea, OLD.id_tarea);
  
  -- Solo procesar si hay una tarea asociada (no "otros trabajos")
  IF tarea_id IS NOT NULL THEN
    -- Obtener el presupuesto base de la tarea
    SELECT COALESCE(p.materiales + p.mano_obra, 0) INTO presupuesto_base
    FROM presupuestos p
    WHERE p.id_tarea = tarea_id 
    AND p.tipo = 'base'
    LIMIT 1;
    
    -- Si no encontramos presupuesto base, usar total_base de liquidaciones_nuevas
    IF presupuesto_base = 0 THEN
      SELECT COALESCE(ln.total_base, 0) INTO presupuesto_base
      FROM liquidaciones_nuevas ln
      WHERE ln.id_tarea = tarea_id
      LIMIT 1;
    END IF;
    
    -- Calcular gastos reales
    gastos_calculados := calcular_gastos_reales_tarea(tarea_id);
    
    -- Calcular ganancia
    ganancia_calculada := presupuesto_base - gastos_calculados;
    
    -- Actualizar liquidaciones_nuevas si existe
    UPDATE liquidaciones_nuevas 
    SET 
      gastos_reales = gastos_calculados,
      ganancia_neta = ganancia_calculada,
      ganancia_supervisor = ganancia_calculada / 2,
      ganancia_admin = ganancia_calculada / 2,
      updated_at = NOW()
    WHERE id_tarea = tarea_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.actualizar_partes_trabajo_liquidados(p_trabajador_id uuid, p_fecha_inicio date, p_fecha_fin date, p_liquidacion_id integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  registros_actualizados INTEGER;
BEGIN
  -- Actualizar los partes de trabajo
  UPDATE partes_de_trabajo
  SET liquidado = TRUE
  WHERE id_trabajador = p_trabajador_id
    AND fecha BETWEEN p_fecha_inicio AND p_fecha_fin
    AND (liquidado = FALSE OR liquidado IS NULL);

  GET DIAGNOSTICS registros_actualizados = ROW_COUNT;
  RETURN registros_actualizados;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error en actualizar_partes_trabajo_liquidados: %', SQLERRM;
  RETURN 0;
END;
$function$;

CREATE OR REPLACE FUNCTION public.actualizar_partes_trabajo_liquidados(id_tarea_param bigint, id_liquidacion_param integer)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  registros_actualizados INTEGER;
BEGIN
  -- Convertimos explícitamente los tipos para evitar problemas de cast
  UPDATE partes_de_trabajo 
  SET 
    liquidado = TRUE,
    id_liquidacion = id_liquidacion_param
  WHERE 
    id_tarea = id_tarea_param
    AND (liquidado IS NULL OR liquidado = FALSE);
    
  GET DIAGNOSTICS registros_actualizados = ROW_COUNT;
  RETURN registros_actualizados;
END;
$function$;

CREATE OR REPLACE FUNCTION public.actualizar_partes_trabajo_por_liquidacion()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  registros_actualizados INTEGER;
BEGIN
  -- Actualizar solamente el campo liquidado
  UPDATE partes_de_trabajo
  SET liquidado = true
  WHERE id_trabajador = NEW.id_trabajador
    AND fecha BETWEEN NEW.semana_inicio AND NEW.semana_fin
    AND (liquidado = false OR liquidado IS NULL);
    
  GET DIAGNOSTICS registros_actualizados = ROW_COUNT;
  RAISE NOTICE 'Trigger: Actualización automática para Liquidación ID: %, Actualizados: % registros', 
               NEW.id, registros_actualizados;
               
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error en actualización: %', SQLERRM;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.actualizar_saldo_pendiente_factura()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Recalcula el saldo pendiente usando el nuevo total y el total pagado existente.
    -- Usamos COALESCE para tratar los valores nulos de total_pagado como 0.
    NEW.saldo_pendiente := NEW.total - COALESCE(NEW.total_pagado, 0);
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.actualizar_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.agregar_departamento_tarea(p_tarea_id integer, p_departamento_id integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result json;
BEGIN
  -- Verificar que la tarea existe
  IF NOT EXISTS (SELECT 1 FROM tareas WHERE id = p_tarea_id) THEN
    RAISE EXCEPTION 'Tarea no encontrada';
  END IF;
  
  -- Verificar que el departamento existe
  IF NOT EXISTS (SELECT 1 FROM departamentos WHERE id = p_departamento_id) THEN
    RAISE EXCEPTION 'Departamento no encontrado';
  END IF;
  
  -- Verificar si la relación ya existe
  IF EXISTS (
    SELECT 1 FROM departamentos_tareas 
    WHERE id_tarea = p_tarea_id AND id_departamento = p_departamento_id
  ) THEN
    RAISE EXCEPTION 'Este departamento ya está asociado a la tarea';
  END IF;
  
  -- Insertar la relación
  INSERT INTO departamentos_tareas (id_tarea, id_departamento)
  VALUES (p_tarea_id, p_departamento_id);
  
  -- Retornar resultado exitoso
  SELECT json_build_object(
    'success', true,
    'tarea_id', p_tarea_id,
    'departamento_id', p_departamento_id
  ) INTO v_result;
  
  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.alerta_sobrecosto()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.sobrecosto = TRUE THEN
    -- Alerta para supervisor (obtenemos el id_supervisor del presupuesto base)
    PERFORM registrar_alerta(
      'sobrecosto',
      'Se ha detectado un sobrecosto de $' || NEW.monto_sobrecosto || ' en la liquidación ' || NEW.code,
      NEW.id,
      'liquidacion',
      (SELECT id_supervisor FROM presupuestos_base WHERE id = NEW.id_presupuesto_base)
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.aprobar_ajustes_al_pagar()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_factura_pagada BOOLEAN;
    v_ajustes_actualizados INTEGER;
BEGIN
    -- Verificar si la factura está completamente pagada
    v_factura_pagada := (NEW.saldo_pendiente <= 0);
    
    -- Si se pagó completamente Y antes tenía saldo pendiente
    IF v_factura_pagada AND (OLD.saldo_pendiente IS NULL OR OLD.saldo_pendiente > 0) THEN
        -- Aprobar los ajustes que están pendientes
        UPDATE ajustes_facturas
        SET aprobado = true
        WHERE id_factura = NEW.id
        AND aprobado = false;
        
        GET DIAGNOSTICS v_ajustes_actualizados = ROW_COUNT;
        
        IF v_ajustes_actualizados > 0 THEN
            RAISE NOTICE 'Ajustes aprobados automáticamente para factura % (% ajustes)', NEW.id, v_ajustes_actualizados;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_aprobar_ajustes_factura_pagada()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_estado_factura INTEGER;
  v_saldo_pendiente NUMERIC;
  v_pagada BOOLEAN;
BEGIN
  -- Obtener el estado, saldo y bandera de la factura
  SELECT id_estado_nuevo, COALESCE(saldo_pendiente, 0), COALESCE(pagada, false)
  INTO v_estado_factura, v_saldo_pendiente, v_pagada
  FROM facturas 
  WHERE id = NEW.id_factura;
  
  -- Si la factura está pagada (id_estado_nuevo = 5, o saldo <= 0.01, o pagada = true), auto-aprobar
  IF v_estado_factura = 5 OR v_saldo_pendiente <= 0.01 OR v_pagada = true THEN
    NEW.aprobado := true;
    NEW.fecha_aprobacion := COALESCE(NEW.fecha_aprobacion, NOW());
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_finalizar_tareas_por_pf_enviado_sin_actividad()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_rows integer := 0;
  v_system_user_id uuid := '00000000-0000-0000-0000-000000000000';
BEGIN
  -- 1. Seguridad: Solo admins o el propio sistema (postgres)
  IF NOT (COALESCE(public.get_my_role(), '') = 'admin' OR current_user = 'postgres') THEN
    RETURN 0;
  END IF;

  WITH candidatos AS (
    -- Obtenemos tareas con PF enviado hace >= 30 días
    SELECT v.id_presupuesto_final, v.id_tarea, v.fecha_envio
    FROM public.vista_admin_pf_enviado_sin_actividad v
    WHERE v.umbral = 'auto_cierre_30d'
  ),
  para_cerrar AS (
    SELECT c.id_tarea, c.fecha_envio
    FROM candidatos c
    JOIN public.tareas t ON t.id = c.id_tarea
    WHERE 
      -- A. Solo tareas NO finalizadas
      COALESCE(t.finalizada, false) = false
      -- B. REGLA ORO: Tareas en estado 'Presupuestado' (3) o 'Enviado' (4)
      -- Si están en 'Aprobado' o cualquier otro estado posterior, NO se cierran.
      AND t.id_estado_nuevo IN (3, 4)
      -- C. REGLA ROBUSTEZ: updated_at debe ser antiguo (mínimo 30 días)
      AND t.updated_at < (NOW() - INTERVAL '30 days')
      -- D. NO hay Partes de Trabajo nuevos
      AND NOT EXISTS (
        SELECT 1 FROM public.partes_de_trabajo pdt
        WHERE pdt.id_tarea = c.id_tarea
          AND (pdt.created_at >= c.fecha_envio OR (pdt.fecha IS NOT NULL AND pdt.fecha >= c.fecha_envio::date))
      )
      -- E. NO hay Gastos nuevos
      AND NOT EXISTS (
        SELECT 1 FROM public.gastos_tarea gt
        WHERE gt.id_tarea = c.id_tarea
          AND gt.created_at >= c.fecha_envio
      )
      -- F. NUEVO: NO hay Comentarios de humanos nuevos
      AND NOT EXISTS (
        SELECT 1 FROM public.comentarios com
        WHERE com.id_tarea = c.id_tarea
          AND com.created_at >= c.fecha_envio
          AND com.id_usuario IS DISTINCT FROM v_system_user_id
      )
  ),
  consolidated AS (
    SELECT id_tarea, MIN(fecha_envio) AS fecha_envio
    FROM para_cerrar
    GROUP BY id_tarea
  ),
  updated AS (
    UPDATE public.tareas t
    SET finalizada = true,
        id_estado_nuevo = (SELECT id FROM public.estados_tareas WHERE codigo = 'vencido' LIMIT 1),
        updated_at = NOW()
    FROM consolidated pc
    WHERE t.id = pc.id_tarea
    RETURNING t.id AS id_tarea, pc.fecha_envio
  ),
  rechazar_pf AS (
    UPDATE public.presupuestos_finales pf
    SET id_estado = (SELECT id FROM public.estados_presupuestos WHERE codigo = 'rechazado' LIMIT 1)
    FROM updated u
    WHERE pf.id_tarea = u.id_tarea
    RETURNING pf.id
  ),
  ins_comments AS (
    INSERT INTO public.comentarios (contenido, id_tarea, id_usuario)
    SELECT
      'AUTO-FINALIZADA: 30 días desde PF enviado sin actividad humana detectada.' ||
      E'\n\nResumen: Sin comentarios, sin gastos y sin partes registros en el periodo de gracia.' ||
      E'\nFecha original envío PF: ' || to_char(u.fecha_envio, 'YYYY-MM-DD'),
      u.id_tarea,
      v_system_user_id
    FROM updated u
  )
  SELECT COUNT(*) INTO v_rows FROM updated;

  RETURN v_rows;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_marcar_pf_borrador_como_enviado()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_estado_borrador_id INTEGER;
  v_estado_enviado_id INTEGER;
  v_pfs_actualizados INTEGER := 0;
BEGIN
  SELECT id INTO v_estado_borrador_id
  FROM estados_presupuestos
  WHERE codigo = 'borrador'
  LIMIT 1;
  
  SELECT id INTO v_estado_enviado_id
  FROM estados_presupuestos
  WHERE codigo = 'enviado'
  LIMIT 1;
  
  IF v_estado_borrador_id IS NOT NULL AND v_estado_enviado_id IS NOT NULL THEN
    WITH pfs_actualizados AS (
      UPDATE presupuestos_finales
      SET id_estado = v_estado_enviado_id,
          enviado = true, -- Sincronización booleana para disparar trigger de tareas
          updated_at = NOW()
      WHERE id_estado = v_estado_borrador_id
        AND EXTRACT(DAY FROM NOW() - created_at) > 5
      RETURNING id
    )
    SELECT COUNT(*) INTO v_pfs_actualizados FROM pfs_actualizados;
    
    IF v_pfs_actualizados > 0 THEN
      RAISE NOTICE 'AUTO-ENVIADO: % presupuesto(s) final(es) marcado(s) como Enviado (>5 días en Borrador)', 
        v_pfs_actualizados;
    END IF;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_rechazar_pf_al_finalizar_tarea()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_estado_rechazado_id INTEGER;
  v_estado_facturado_id INTEGER;
  v_estado_vencido_id INTEGER;
  v_pf_afectados INTEGER := 0;
BEGIN
  -- Obtener IDs de estados relevantes
  SELECT id INTO v_estado_rechazado_id
  FROM public.estados_presupuestos
  WHERE codigo = 'rechazado'
  LIMIT 1;

  SELECT id INTO v_estado_facturado_id
  FROM public.estados_presupuestos
  WHERE codigo = 'facturado'
  LIMIT 1;
  
  SELECT id INTO v_estado_vencido_id
  FROM public.estados_tareas
  WHERE codigo = 'vencido'
  LIMIT 1;

  -- ÚNICA CONDICIÓN: Estado cambió a 'vencido' (Cerrado sin respuesta)
  IF v_estado_vencido_id IS NOT NULL 
     AND NEW.id_estado_nuevo = v_estado_vencido_id 
     AND OLD.id_estado_nuevo IS DISTINCT FROM NEW.id_estado_nuevo 
     AND v_estado_rechazado_id IS NOT NULL THEN
    -- Auto-rechazar todos los PF de esta tarea que NO estén ya rechazados Y NO estén facturados
    UPDATE public.presupuestos_finales
    SET id_estado = v_estado_rechazado_id,
        updated_at = NOW()
    WHERE id_tarea = NEW.id
      AND id_estado IS DISTINCT FROM v_estado_rechazado_id
      AND (v_estado_facturado_id IS NULL OR id_estado IS DISTINCT FROM v_estado_facturado_id);
    
    GET DIAGNOSTICS v_pf_afectados = ROW_COUNT;
    
    -- Log informativo
    IF v_pf_afectados > 0 THEN
      RAISE NOTICE 'AUTO-RECHAZAR: Tarea #% finalizada → % presupuesto(s) final(es) auto-rechazado(s)', 
        NEW.id, v_pf_afectados;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.buscar_edificios_super_inteligente(p_query text, p_id_administrador integer DEFAULT NULL::integer, p_estado text DEFAULT NULL::text, p_limit integer DEFAULT 50)
 RETURNS TABLE(id integer, code text, nombre text, direccion text, cuit text, administrador_nombre text, estado text, relevancia real)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.code::TEXT,
    b.nombre::TEXT,
    b.direccion::TEXT,
    b.cuit::TEXT,
    b.administrador_nombre::TEXT,
    b.estado::TEXT,
    b.calc_relevancia::REAL as relevancia
  FROM (
    SELECT 
      e.id,
      e.code,
      e.nombre,
      e.direccion,
      e.cuit,
      a.nombre as administrador_nombre,
      e.estado,
      GREATEST(
        -- Match exacto en nombre (peso 10)
        CASE WHEN f_unaccent_lower(e.nombre) = f_unaccent_lower(p_query) THEN 10.0 ELSE 0.0 END,
        -- Nombre contiene query (peso 8)
        CASE WHEN f_unaccent_lower(e.nombre) LIKE '%' || f_unaccent_lower(p_query) || '%' THEN 8.0 ELSE 0.0 END,
        -- Similitud en nombre (peso 7)
        similarity(f_unaccent_lower(e.nombre), f_unaccent_lower(p_query)) * 7.0,
        -- Match en dirección (peso 6)
        CASE 
          WHEN e.direccion IS NOT NULL AND 
               f_unaccent_lower(e.direccion) LIKE '%' || f_unaccent_lower(p_query) || '%' 
          THEN 6.0 ELSE 0.0 
        END,
        -- Similitud en dirección (peso 5)
        CASE 
          WHEN e.direccion IS NOT NULL 
          THEN similarity(f_unaccent_lower(e.direccion), f_unaccent_lower(p_query)) * 5.0
          ELSE 0.0 
        END,
        -- Match exacto en CUIT (peso 9)
        CASE WHEN e.cuit = p_query THEN 9.0 ELSE 0.0 END,
        -- Match parcial en CUIT (peso 7)
        CASE WHEN e.cuit LIKE '%' || p_query || '%' THEN 7.0 ELSE 0.0 END,
        -- Match en administrador (peso 4)
        CASE WHEN f_unaccent_lower(a.nombre) LIKE '%' || f_unaccent_lower(p_query) || '%' THEN 4.0 ELSE 0.0 END,
        -- Similitud en administrador (peso 3)
        similarity(f_unaccent_lower(a.nombre), f_unaccent_lower(p_query)) * 3.0
      ) as calc_relevancia
    FROM edificios e
    LEFT JOIN administradores a ON e.id_administrador = a.id
    WHERE 
      (p_id_administrador IS NULL OR e.id_administrador = p_id_administrador)
      AND (p_estado IS NULL OR e.estado = p_estado)
      AND (
        f_unaccent_lower(e.nombre) LIKE '%' || f_unaccent_lower(p_query) || '%'
        OR similarity(f_unaccent_lower(e.nombre), f_unaccent_lower(p_query)) > 0.3
        OR (e.direccion IS NOT NULL AND f_unaccent_lower(e.direccion) LIKE '%' || f_unaccent_lower(p_query) || '%')
        OR e.cuit LIKE '%' || p_query || '%'
        OR f_unaccent_lower(a.nombre) LIKE '%' || f_unaccent_lower(p_query) || '%'
        OR similarity(f_unaccent_lower(a.nombre), f_unaccent_lower(p_query)) > 0.3
      )
  ) b
  WHERE b.calc_relevancia > 0.2
  ORDER BY b.calc_relevancia DESC, b.nombre ASC
  LIMIT p_limit;
END;
$function$;

CREATE OR REPLACE FUNCTION public.buscar_facturas_super_inteligente(p_query text, p_id_administrador integer DEFAULT NULL::integer, p_id_estado integer DEFAULT NULL::integer, p_enviada boolean DEFAULT NULL::boolean, p_pagada boolean DEFAULT NULL::boolean, p_limit integer DEFAULT 50)
 RETURNS TABLE(id integer, code text, nombre text, total bigint, fecha_vencimiento date, administrador_nombre text, estado_nombre text, enviada boolean, pagada boolean, relevancia real)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.code::TEXT,
    b.nombre::TEXT,
    b.total::BIGINT,
    b.fecha_vencimiento::DATE,
    b.administrador_nombre::TEXT,
    b.estado_nombre::TEXT,
    b.enviada,
    b.pagada,
    b.calc_relevancia::REAL as relevancia
  FROM (
    SELECT 
      f.id,
      f.code,
      f.nombre,
      f.total,
      f.fecha_vencimiento,
      a.nombre as administrador_nombre,
      ef.nombre as estado_nombre,
      f.enviada,
      f.pagada,
      GREATEST(
        -- Match exacto en código (peso 10)
        CASE WHEN f.code = p_query THEN 10.0 ELSE 0.0 END,
        -- Similitud en código (peso 7)
        similarity(f_unaccent_lower(f.code), f_unaccent_lower(p_query)) * 7.0,
        -- Match exacto en nombre (peso 8)
        CASE WHEN f_unaccent_lower(f.nombre) = f_unaccent_lower(p_query) THEN 8.0 ELSE 0.0 END,
        -- Nombre contiene query (peso 6)
        CASE WHEN f_unaccent_lower(f.nombre) LIKE '%' || f_unaccent_lower(p_query) || '%' THEN 6.0 ELSE 0.0 END,
        -- Similitud en nombre (peso 5)
        similarity(f_unaccent_lower(f.nombre), f_unaccent_lower(p_query)) * 5.0,
        -- Match en administrador (peso 4)
        CASE WHEN f_unaccent_lower(a.nombre) LIKE '%' || f_unaccent_lower(p_query) || '%' THEN 4.0 ELSE 0.0 END,
        -- Similitud en administrador (peso 3)
        similarity(f_unaccent_lower(a.nombre), f_unaccent_lower(p_query)) * 3.0,
        -- Match exacto en datos_afip (peso 10)
        CASE WHEN f.datos_afip IS NOT NULL AND f.datos_afip::TEXT = p_query THEN 10.0 ELSE 0.0 END,
        -- Parcial en datos_afip (peso 8)
        CASE WHEN f.datos_afip IS NOT NULL AND f.datos_afip::TEXT LIKE '%' || p_query || '%' THEN 8.0 ELSE 0.0 END
      ) as calc_relevancia
    FROM facturas f
    LEFT JOIN administradores a ON f.id_administrador = a.id
    LEFT JOIN estados_facturas ef ON f.id_estado_nuevo = ef.id
    WHERE 
      (p_id_administrador IS NULL OR f.id_administrador = p_id_administrador)
      AND (p_id_estado IS NULL OR f.id_estado_nuevo = p_id_estado)
      AND (p_enviada IS NULL OR f.enviada = p_enviada)
      AND (p_pagada IS NULL OR f.pagada = p_pagada)
      AND (
        f.code = p_query
        OR similarity(f_unaccent_lower(f.code), f_unaccent_lower(p_query)) > 0.3
        OR f_unaccent_lower(f.nombre) LIKE '%' || f_unaccent_lower(p_query) || '%'
        OR similarity(f_unaccent_lower(f.nombre), f_unaccent_lower(p_query)) > 0.3
        OR f_unaccent_lower(a.nombre) LIKE '%' || f_unaccent_lower(p_query) || '%'
        OR similarity(f_unaccent_lower(a.nombre), f_unaccent_lower(p_query)) > 0.3
        OR (f.datos_afip IS NOT NULL AND f.datos_afip::TEXT LIKE '%' || p_query || '%')
      )
  ) b
  WHERE b.calc_relevancia > 0.2
  ORDER BY b.calc_relevancia DESC, b.fecha_vencimiento DESC NULLS LAST
  LIMIT p_limit;
END;
$function$;

CREATE OR REPLACE FUNCTION public.buscar_productos_super_inteligente(p_query text, p_categoria_id uuid DEFAULT NULL::uuid, p_activo boolean DEFAULT true, p_limit integer DEFAULT 100)
 RETURNS TABLE(id uuid, code integer, nombre text, descripcion text, precio integer, categoria_id uuid, categoria_nombre text, activo boolean, relevancia real, razon_match text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.code,
    b.nombre::TEXT,
    b.descripcion::TEXT,
    b.precio,
    b.categoria_id,
    b.categoria_nombre::TEXT,
    b.activo,
    b.calc_relevancia::REAL as relevancia,
    b.razon_match::TEXT
  FROM (
    SELECT 
      p.id,
      p.code,
      p.nombre,
      p.descripcion,
      p.precio,
      p.categoria_id,
      c.nombre as categoria_nombre,
      p.activo,
      GREATEST(
        CASE WHEN p.code::TEXT = p_query THEN 10.0 ELSE 0.0 END,
        similarity(p.code::TEXT, p_query) * 5.0,
        CASE WHEN f_unaccent_lower(p.nombre) = f_unaccent_lower(p_query) THEN 8.0 ELSE 0.0 END,
        CASE WHEN f_unaccent_lower(p.nombre) LIKE '%' || f_unaccent_lower(p_query) || '%' THEN 7.0 ELSE 0.0 END,
        similarity(f_unaccent_lower(p.nombre), f_unaccent_lower(p_query)) * 6.0,
        CASE WHEN f_unaccent_lower(c.nombre) LIKE '%' || f_unaccent_lower(p_query) || '%' THEN 4.0 ELSE 0.0 END,
        similarity(f_unaccent_lower(c.nombre), f_unaccent_lower(p_query)) * 3.0,
        CASE 
          WHEN p.descripcion IS NOT NULL AND f_unaccent_lower(p.descripcion) LIKE '%' || f_unaccent_lower(p_query) || '%' 
          THEN 2.0 ELSE 0.0 
        END,
        CASE 
          WHEN p.descripcion IS NOT NULL 
          THEN similarity(f_unaccent_lower(p.descripcion), f_unaccent_lower(p_query)) * 1.0
          ELSE 0.0 
        END
      ) as calc_relevancia,
      CASE
        WHEN p.code::TEXT = p_query THEN 'Código exacto'
        WHEN f_unaccent_lower(p.nombre) = f_unaccent_lower(p_query) THEN 'Nombre exacto'
        WHEN f_unaccent_lower(p.nombre) LIKE '%' || f_unaccent_lower(p_query) || '%' THEN 'Nombre contiene'
        WHEN f_unaccent_lower(c.nombre) LIKE '%' || f_unaccent_lower(p_query) || '%' THEN 'Por categoría'
        WHEN similarity(f_unaccent_lower(p.nombre), f_unaccent_lower(p_query)) > 0.5 THEN 'Nombre similar'
        WHEN p.descripcion IS NOT NULL AND f_unaccent_lower(p.descripcion) LIKE '%' || f_unaccent_lower(p_query) || '%' 
        THEN 'En descripción'
        ELSE 'Coincidencia parcial'
      END as razon_match
    FROM productos p
    LEFT JOIN categorias_productos c ON p.categoria_id = c.id
    WHERE 
      (p_activo IS NULL OR p.activo = p_activo)
      AND (p_categoria_id IS NULL OR p.categoria_id = p_categoria_id)
      AND (
        p.code::TEXT = p_query
        OR similarity(p.code::TEXT, p_query) > 0.5
        OR f_unaccent_lower(p.nombre) LIKE '%' || f_unaccent_lower(p_query) || '%'
        OR similarity(f_unaccent_lower(p.nombre), f_unaccent_lower(p_query)) > 0.3
        OR (p.descripcion IS NOT NULL AND f_unaccent_lower(p.descripcion) LIKE '%' || f_unaccent_lower(p_query) || '%')
        OR f_unaccent_lower(c.nombre) LIKE '%' || f_unaccent_lower(p_query) || '%'
        OR similarity(f_unaccent_lower(c.nombre), f_unaccent_lower(p_query)) > 0.4
      )
  ) b
  WHERE b.calc_relevancia > 0.2
  ORDER BY b.calc_relevancia DESC, b.nombre ASC
  LIMIT p_limit;
END;
$function$;

CREATE OR REPLACE FUNCTION public.buscar_tareas_super_inteligente(p_query text, p_id_edificio integer DEFAULT NULL::integer, p_id_estado integer DEFAULT NULL::integer, p_finalizada boolean DEFAULT NULL::boolean, p_id_usuario uuid DEFAULT NULL::uuid, p_rol_usuario text DEFAULT NULL::text, p_limit integer DEFAULT 50)
 RETURNS TABLE(id integer, titulo text, descripcion text, fecha_visita date, edificio_nombre text, estado_nombre text, finalizada boolean, relevancia real)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.titulo::TEXT,
    b.descripcion::TEXT,
    b.fecha_visita,
    b.edificio_nombre::TEXT,
    b.estado_nombre::TEXT,
    b.finalizada,
    b.calc_relevancia::REAL as relevancia
  FROM (
    SELECT 
      t.id,
      t.titulo,
      t.descripcion,
      t.fecha_visita,
      e.nombre as edificio_nombre,
      et.nombre as estado_nombre,
      t.finalizada,
      GREATEST(
        -- Match exacto en título (peso 10)
        CASE WHEN f_unaccent_lower(t.titulo) = f_unaccent_lower(p_query) THEN 10.0 ELSE 0.0 END,
        -- Título contiene query (peso 8)
        CASE WHEN f_unaccent_lower(t.titulo) LIKE '%' || f_unaccent_lower(p_query) || '%' THEN 8.0 ELSE 0.0 END,
        -- Similitud en título (peso 7)
        similarity(f_unaccent_lower(t.titulo), f_unaccent_lower(p_query)) * 7.0,
        -- Match en descripción (peso 5)
        CASE 
          WHEN t.descripcion IS NOT NULL AND 
               f_unaccent_lower(t.descripcion) LIKE '%' || f_unaccent_lower(p_query) || '%' 
          THEN 5.0 ELSE 0.0 
        END,
        -- Similitud en descripción (peso 3)
        CASE 
          WHEN t.descripcion IS NOT NULL 
          THEN similarity(f_unaccent_lower(t.descripcion), f_unaccent_lower(p_query)) * 3.0
          ELSE 0.0 
        END,
        -- Match en edificio (peso 4)
        CASE WHEN f_unaccent_lower(e.nombre) LIKE '%' || f_unaccent_lower(p_query) || '%' THEN 4.0 ELSE 0.0 END,
        -- Similitud en edificio (peso 2)
        similarity(f_unaccent_lower(e.nombre), f_unaccent_lower(p_query)) * 2.0
      ) as calc_relevancia
    FROM tareas t
    LEFT JOIN edificios e ON t.id_edificio = e.id
    LEFT JOIN estados_tareas et ON t.id_estado_nuevo = et.id
    LEFT JOIN supervisores_tareas st ON t.id = st.id_tarea
    LEFT JOIN trabajadores_tareas tt ON t.id = tt.id_tarea
    WHERE 
      -- SEGURIDAD POR ROL (CRÍTICO - NO ROMPER)
      (p_rol_usuario = 'admin' OR 
       (p_rol_usuario = 'supervisor' AND st.id_supervisor = p_id_usuario) OR
       (p_rol_usuario = 'trabajador' AND tt.id_trabajador = p_id_usuario))
      -- Filtros opcionales
      AND (p_id_edificio IS NULL OR t.id_edificio = p_id_edificio)
      AND (p_id_estado IS NULL OR t.id_estado_nuevo = p_id_estado)
      AND (p_finalizada IS NULL OR t.finalizada = p_finalizada)
      -- Búsqueda
      AND (
        f_unaccent_lower(t.titulo) LIKE '%' || f_unaccent_lower(p_query) || '%'
        OR similarity(f_unaccent_lower(t.titulo), f_unaccent_lower(p_query)) > 0.3
        OR (t.descripcion IS NOT NULL AND f_unaccent_lower(t.descripcion) LIKE '%' || f_unaccent_lower(p_query) || '%')
        OR f_unaccent_lower(e.nombre) LIKE '%' || f_unaccent_lower(p_query) || '%'
        OR similarity(f_unaccent_lower(e.nombre), f_unaccent_lower(p_query)) > 0.3
      )
  ) b
  WHERE b.calc_relevancia > 0.2
  ORDER BY b.calc_relevancia DESC, b.fecha_visita DESC NULLS LAST
  LIMIT p_limit;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calcular_ajustes_factura()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_id_factura INTEGER;
    v_id_administrador INTEGER;
    v_aplica_ajustes BOOLEAN;
    v_porcentaje NUMERIC;
    v_total_factura NUMERIC;
    v_suma_items_bruta NUMERIC;
    v_descuento_real NUMERIC := 0;
    v_suma_mo_bruta NUMERIC;
    v_base_ajuste_neta NUMERIC;
    v_factor_ajuste NUMERIC;
    v_id_pf INTEGER;
BEGIN
    -- Evitar recursion
    IF pg_trigger_depth() > 1 THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Determinar qué factura procesar
    IF TG_TABLE_NAME = 'items_factura' THEN
        IF TG_OP = 'DELETE' THEN
            v_id_factura := OLD.id_factura;
        ELSE
            v_id_factura := NEW.id_factura;
        END IF;
    ELSE  -- 'facturas'
        IF TG_OP = 'DELETE' THEN
            v_id_factura := OLD.id;
        ELSE
            v_id_factura := NEW.id;
        END IF;
    END IF;

    IF v_id_factura IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Obtener información del administrador y de la factura
    SELECT f.id_administrador, f.id_presupuesto_final, a.aplica_ajustes, a.porcentaje_default, f.total
    INTO v_id_administrador, v_id_pf, v_aplica_ajustes, v_porcentaje, v_total_factura
    FROM facturas f
    JOIN administradores a ON f.id_administrador = a.id
    WHERE f.id = v_id_factura;
    
    -- Si el administrador aplica ajustes
    IF v_aplica_ajustes AND v_porcentaje > 0 THEN
        
        -- 1. Calcular sumas brutas de la factura desde items_factura
        SELECT 
            COALESCE(SUM(subtotal_item), 0),
            COALESCE(SUM(CASE WHEN es_material = false THEN subtotal_item ELSE 0 END), 0)
        INTO v_suma_items_bruta, v_suma_mo_bruta
        FROM items_factura
        WHERE id_factura = v_id_factura;

        -- 2. Determinar el descuento real de manera certera:
        -- Si viene de un presupuesto final, el descuento oficial es el guardado en presupuestos_finales.descuento_monto
        IF v_id_pf IS NOT NULL THEN
            SELECT COALESCE(descuento_monto, 0) INTO v_descuento_real
            FROM presupuestos_finales
            WHERE id = v_id_pf;
        ELSE
            -- Para facturas libres, si el total es menor a la suma de items, la diferencia es el descuento
            IF v_total_factura > 0 AND v_suma_items_bruta > v_total_factura THEN
                v_descuento_real := v_suma_items_bruta - v_total_factura;
            ELSE
                v_descuento_real := 0;
            END IF;
        END IF;
        
        -- 3. Calcular la base neta de MO (Suma MO - Descuento aplicable a MO)
        v_base_ajuste_neta := GREATEST(v_suma_mo_bruta - v_descuento_real, 0);

        -- 4. Calcular factor de ajuste para distribuir el descuento entre los items de MO
        IF v_suma_mo_bruta > 0 THEN
            v_factor_ajuste := v_base_ajuste_neta / v_suma_mo_bruta;
        ELSE
            v_factor_ajuste := 0;
        END IF;

        -- Eliminar ajustes anteriores para recalcular
        DELETE FROM ajustes_facturas WHERE id_factura = v_id_factura;
        
        -- Insertar nuevos ajustes usando la base neta (redondeado a enteros, regla platinum de cero decimales)
        IF v_base_ajuste_neta > 0 THEN
            INSERT INTO ajustes_facturas (
                id_factura, 
                id_item, 
                monto_base, 
                porcentaje_ajuste, 
                monto_ajuste, 
                aprobado, 
                pagado,
                created_at,
                descripcion_item
            )
            SELECT
                id_factura,
                id,
                ROUND(subtotal_item * v_factor_ajuste), -- Base neta por item redondeada
                v_porcentaje,
                ROUND((subtotal_item * v_factor_ajuste) * (v_porcentaje / 100.0)), -- Ajuste entero en pesos
                false,
                false,
                NOW(),
                descripcion
            FROM items_factura
            WHERE id_factura = v_id_factura AND es_material = false;
        END IF;
        
        -- Actualizar estado de la factura (sin disparar trigger recursivo)
        UPDATE facturas
        SET tiene_ajustes = (v_base_ajuste_neta > 0)
        WHERE id = v_id_factura
          AND tiene_ajustes IS DISTINCT FROM (v_base_ajuste_neta > 0);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.calcular_estado_pago_factura(p_id_factura integer)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_total_factura DECIMAL;
    v_total_pagado DECIMAL;
    v_tiene_ajustes BOOLEAN;
    v_ajustes_aprobados BOOLEAN;
BEGIN
    -- Obtener datos de la factura
    SELECT total, tiene_ajustes, ajustes_aprobados 
    INTO v_total_factura, v_tiene_ajustes, v_ajustes_aprobados
    FROM facturas WHERE id = p_id_factura;
    
    -- Calcular total pagado
    SELECT COALESCE(SUM(monto_pagado), 0) 
    INTO v_total_pagado
    FROM pagos_facturas WHERE id_factura = p_id_factura;
    
    -- Determinar estado
    IF v_total_pagado = 0 THEN
        RETURN 'pendiente';
    ELSIF v_total_pagado < v_total_factura THEN
        RETURN 'parcial';
    ELSIF v_total_pagado >= v_total_factura THEN
        IF v_tiene_ajustes AND NOT v_ajustes_aprobados THEN
            RETURN 'pagada_ajustes_pendientes';
        ELSE
            RETURN 'completa';
        END IF;
    END IF;
    
    RETURN 'pendiente';
END;
$function$;

CREATE OR REPLACE FUNCTION public.calcular_gastos_reales_de_tarea(p_id_tarea integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_costo_mano_obra INTEGER;
    v_costo_gastos_adicionales INTEGER;
BEGIN
    -- Paso 1: Calcular el costo total de la mano de obra para la tarea.
    -- Se une con configuracion_trabajadores para obtener el salario de cada trabajador
    -- y se multiplica por la jornada (1.0 para día completo, 0.5 para medio día).
    SELECT COALESCE(SUM(ct.salario_diario * CASE WHEN pt.tipo_jornada = 'dia_completo' THEN 1.0 WHEN pt.tipo_jornada = 'medio_dia' THEN 0.5 ELSE 0 END), 0)::integer
    INTO v_costo_mano_obra
    FROM public.partes_de_trabajo AS pt
    JOIN public.configuracion_trabajadores AS ct ON pt.id_trabajador = ct.id_trabajador
    WHERE pt.id_tarea = p_id_tarea;

    -- Paso 2: Calcular el costo total de los gastos adicionales aprobados para la tarea.
    SELECT COALESCE(SUM(gt.monto), 0)
    INTO v_costo_gastos_adicionales
    FROM public.gastos_tarea AS gt
    WHERE gt.id_tarea = p_id_tarea AND gt.estado = 'aprobado';

    -- Paso 3: Devolver la suma de ambos costos.
    RETURN v_costo_mano_obra + v_costo_gastos_adicionales;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calcular_gastos_reales_tarea(tarea_id integer)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  total_mano_obra INTEGER := 0;
  total_materiales INTEGER := 0;
BEGIN
  -- Sumar mano de obra de trabajadores
  SELECT COALESCE(SUM(dt.jornada * dt.salario_dia), 0)
  INTO total_mano_obra
  FROM dias_trabajados dt
  WHERE dt.id_tarea = tarea_id;
  
  -- Sumar gastos de materiales (todos los roles)
  SELECT COALESCE(SUM(gt.monto), 0)
  INTO total_materiales
  FROM gastos_tarea gt
  WHERE gt.id_tarea = tarea_id;
  
  RETURN total_mano_obra + total_materiales;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calcular_liquidacion_semanal(p_trabajador_id uuid, p_fecha_inicio date, p_fecha_fin date)
 RETURNS TABLE(total_dias numeric, salario_base numeric, gastos_reembolsados numeric, total_pagar numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_salario_diario NUMERIC;
  v_dias_trabajados DECIMAL;
  v_total_gastos_reembolsados NUMERIC;
BEGIN
  -- 1. Obtener el salario diario del trabajador
  SELECT ct.salario_diario INTO v_salario_diario
  FROM public.configuracion_trabajadores ct
  WHERE ct.id_trabajador = p_trabajador_id;

  IF NOT FOUND THEN
    v_salario_diario := 0;
  END IF;

  -- 2. Calcular el total de días trabajados (con la corrección final en el nombre de la jornada)
  SELECT COALESCE(SUM(
    CASE
      -- CORRECCIÓN FINAL: Usar los valores exactos de la base de datos
      WHEN pt.tipo_jornada = 'dia_completo' THEN 1.0
      WHEN pt.tipo_jornada = 'medio_dia' THEN 0.5
      ELSE 0.0
    END
  ), 0.0)
  INTO v_dias_trabajados
  FROM public.partes_de_trabajo pt
  WHERE pt.id_trabajador = p_trabajador_id
    AND pt.fecha BETWEEN p_fecha_inicio AND p_fecha_fin
    AND (pt.liquidado IS NULL OR pt.liquidado = false); -- FILTRO AGREGADO

  -- 3. Calcular el total de gastos reembolsables
  SELECT COALESCE(SUM(gt.monto), 0)
  INTO v_total_gastos_reembolsados
  FROM public.gastos_tarea gt
  WHERE gt.id_usuario = p_trabajador_id
    AND gt.fecha_gasto BETWEEN p_fecha_inicio AND p_fecha_fin
    AND gt.estado = 'aprobado'
    AND (gt.liquidado IS NULL OR gt.liquidado = false); -- FILTRO AGREGADO

  -- 4. Devolver la tabla de resultados
  RETURN QUERY
  SELECT
    v_dias_trabajados AS total_dias,
    (v_dias_trabajados * v_salario_diario) AS salario_base,
    v_total_gastos_reembolsados AS gastos_reembolsados,
    (v_dias_trabajados * v_salario_diario) + v_total_gastos_reembolsados AS total_pagar;

END;
$function$;

CREATE OR REPLACE FUNCTION public.calcular_pendiente_global_v2()
 RETURNS TABLE(total_pendiente_partes numeric, total_pendiente_gastos numeric, total_pagado_partes numeric, total_pagado_gastos numeric, liquidaciones_pendientes integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    WITH partes_summary AS (
        SELECT
            -- Para partes pendientes
            COALESCE(SUM(
                CASE 
                    WHEN pt.liquidado = false THEN 
                        CASE
                            WHEN pt.tipo_jornada = 'dia_completo' THEN COALESCE(ct.salario_diario, 0)::numeric
                            WHEN pt.tipo_jornada = 'medio_dia' THEN (COALESCE(ct.salario_diario, 0)::numeric / 2)
                            ELSE 0::numeric
                        END
                    ELSE 0::numeric
                END
            ), 0::numeric) AS pendiente,
            
            -- Para partes pagadas
            COALESCE(SUM(
                CASE 
                    WHEN pt.liquidado = true THEN 
                        CASE
                            WHEN pt.tipo_jornada = 'dia_completo' THEN COALESCE(ct.salario_diario, 0)::numeric
                            WHEN pt.tipo_jornada = 'medio_dia' THEN (COALESCE(ct.salario_diario, 0)::numeric / 2)
                            ELSE 0::numeric
                        END
                    ELSE 0::numeric
                END
            ), 0::numeric) AS pagado
        FROM 
            partes_de_trabajo pt
        LEFT JOIN 
            configuracion_trabajadores ct ON pt.id_trabajador = ct.id_trabajador
    ),
    gastos_summary AS (
        SELECT
            COALESCE(SUM(CASE WHEN liquidado = false THEN monto ELSE 0 END), 0)::numeric AS pendiente,
            COALESCE(SUM(CASE WHEN liquidado = true THEN monto ELSE 0 END), 0)::numeric AS pagado
        FROM 
            gastos_tarea
    ),
    -- Calcular liquidaciones potenciales (supervisores distintos con trabajadores que tienen partes pendientes)
    liquidaciones_pendientes AS (
        SELECT 
            COUNT(DISTINCT st.id_supervisor)::integer AS num_liquidaciones
        FROM 
            supervisores_tareas st
        JOIN 
            trabajadores_tareas tt ON st.id_tarea = tt.id_tarea
        JOIN 
            partes_de_trabajo pt ON tt.id_trabajador = pt.id_trabajador
        WHERE 
            pt.liquidado = false
    )
    SELECT
        ps.pendiente AS total_pendiente_partes,
        gs.pendiente AS total_pendiente_gastos,
        ps.pagado AS total_pagado_partes,
        gs.pagado AS total_pagado_gastos,
        COALESCE(lp.num_liquidaciones, 0) AS liquidaciones_pendientes  -- Cambio de nombre aquí
    FROM
        partes_summary ps,
        gastos_summary gs,
        liquidaciones_pendientes lp;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calcular_pendiente_supervisor(p_id_supervisor uuid)
 RETURNS TABLE(total_pendiente_partes numeric, total_pendiente_gastos numeric, total_pagado_partes numeric, total_pagado_gastos numeric, trabajadores_pendientes integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    WITH tareas_supervisadas AS (
        SELECT id_tarea
        FROM supervisores_tareas
        WHERE id_supervisor = p_id_supervisor
    ),
    partes_summary AS (
        SELECT 
            COALESCE(SUM(
                CASE 
                    WHEN pt.liquidado = false THEN 
                        CASE
                            WHEN pt.tipo_jornada = 'dia_completo' THEN COALESCE(ct.salario_diario, 0)::numeric
                            WHEN pt.tipo_jornada = 'medio_dia' THEN (COALESCE(ct.salario_diario, 0)::numeric / 2)
                            ELSE 0::numeric
                        END
                    ELSE 0::numeric
                END
            ), 0::numeric) AS pendiente,
            
            COALESCE(SUM(
                CASE 
                    WHEN pt.liquidado = true THEN 
                        CASE
                            WHEN pt.tipo_jornada = 'dia_completo' THEN COALESCE(ct.salario_diario, 0)::numeric
                            WHEN pt.tipo_jornada = 'medio_dia' THEN (COALESCE(ct.salario_diario, 0)::numeric / 2)
                            ELSE 0::numeric
                        END
                    ELSE 0::numeric
                END
            ), 0::numeric) AS pagado
        FROM 
            partes_de_trabajo pt
        LEFT JOIN 
            configuracion_trabajadores ct ON pt.id_trabajador = ct.id_trabajador
        WHERE 
            pt.id_tarea IN (SELECT id_tarea FROM tareas_supervisadas)
    ),
    gastos_summary AS (
        SELECT
            COALESCE(SUM(CASE WHEN liquidado = false THEN monto ELSE 0 END), 0)::numeric AS pendiente,
            COALESCE(SUM(CASE WHEN liquidado = true THEN monto ELSE 0 END), 0)::numeric AS pagado
        FROM 
            gastos_tarea
        WHERE 
            id_tarea IN (SELECT id_tarea FROM tareas_supervisadas)
    ),
    trabajadores_count AS (
        SELECT
            COUNT(DISTINCT pt.id_trabajador)::integer AS count
        FROM 
            partes_de_trabajo pt
        WHERE 
            pt.id_tarea IN (SELECT id_tarea FROM tareas_supervisadas)
        AND 
            pt.liquidado = false
    )
    SELECT
        ps.pendiente AS total_pendiente_partes,
        gs.pendiente AS total_pendiente_gastos,
        ps.pagado AS total_pagado_partes,
        gs.pagado AS total_pagado_gastos,
        tc.count AS trabajadores_pendientes
    FROM
        partes_summary ps,
        gastos_summary gs,
        trabajadores_count tc;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calcular_pendiente_trabajador(p_id_trabajador uuid)
 RETURNS TABLE(total_pendiente_partes numeric, total_pendiente_gastos numeric, partes_pendientes integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    WITH tareas_del_trabajador AS (
        SELECT id_tarea
        FROM trabajadores_tareas
        WHERE id_trabajador = p_id_trabajador
    ),
    partes_summary AS (
        SELECT
            -- Para partes pendientes
            COALESCE(SUM(
                CASE 
                    WHEN pt.liquidado = false THEN 
                        CASE
                            WHEN pt.tipo_jornada = 'dia_completo' THEN COALESCE(ct.salario_diario, 0)::numeric
                            WHEN pt.tipo_jornada = 'medio_dia' THEN (COALESCE(ct.salario_diario, 0)::numeric / 2)
                            ELSE 0::numeric
                        END
                    ELSE 0::numeric
                END
            ), 0::numeric) AS pendiente,
            
            -- Número de partes pendientes
            COUNT(CASE WHEN pt.liquidado = false THEN 1 END)::integer AS num_partes_pendientes
        FROM 
            partes_de_trabajo pt
        LEFT JOIN 
            configuracion_trabajadores ct ON pt.id_trabajador = ct.id_trabajador
        WHERE 
            pt.id_trabajador = p_id_trabajador
    ),
    gastos_summary AS (
        SELECT
            COALESCE(SUM(CASE WHEN liquidado = false THEN monto ELSE 0 END), 0)::numeric AS pendiente
        FROM 
            gastos_tarea
        WHERE 
            id_tarea IN (SELECT id_tarea FROM tareas_del_trabajador)
    )
    SELECT
        ps.pendiente AS total_pendiente_partes,
        gs.pendiente AS total_pendiente_gastos,
        ps.num_partes_pendientes AS partes_pendientes
    FROM
        partes_summary ps,
        gastos_summary gs;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_state_update_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Detectar cambios en estado o finalización
  IF OLD.id_estado_nuevo IS DISTINCT FROM NEW.id_estado_nuevo OR OLD.finalizada IS DISTINCT FROM NEW.finalizada THEN
    -- PERMITIR SI: 
    -- 1. El rol del usuario es admin o supervisor (según tabla usuarios)
    -- 2. O la conexión es via service_role (usado por supabaseAdmin en Vercel)
    -- 3. O la conexión es iniciada por el superusuario del sistema (postgres)
    IF NOT (
      COALESCE(public.get_my_role(), '') = ANY (ARRAY['admin'::text, 'supervisor'::text]) 
      OR current_setting('role') = 'service_role'
      OR current_user = 'postgres'
    ) THEN
      RAISE EXCEPTION 'acceso denegado: solo admin, supervisor o sistema pueden cambiar el estado de la tarea (rol detectado: %)', current_setting('role');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.contar_tareas_por_estado()
 RETURNS TABLE(id_estado integer, conteo bigint)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    t.id_estado_nuevo AS id_estado,
    COUNT(*) AS conteo
  FROM 
    tareas t
  WHERE 
    t.id_estado_nuevo IS NOT NULL
  GROUP BY 
    t.id_estado_nuevo;
END;
$function$;

CREATE OR REPLACE FUNCTION public.count_tareas_pendientes(p_user_id uuid, p_user_role text)
 RETURNS TABLE(count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Admin: ve todas las tareas
  IF p_user_role = 'admin' THEN
    RETURN QUERY
    SELECT COUNT(*)::BIGINT
    FROM tareas
    WHERE finalizada = false;
    
  -- Supervisor: solo sus tareas
  ELSIF p_user_role = 'supervisor' THEN
    RETURN QUERY
    SELECT COUNT(*)::BIGINT
    FROM tareas t
    WHERE t.finalizada = false
      AND EXISTS (
        SELECT 1 
        FROM supervisores_tareas st 
        WHERE st.id_tarea = t.id 
          AND st.id_supervisor = p_user_id
      );
      
  -- Trabajador: solo donde está asignado
  ELSIF p_user_role = 'trabajador' THEN
    RETURN QUERY
    SELECT COUNT(*)::BIGINT
    FROM tareas t
    WHERE t.finalizada = false
      AND EXISTS (
        SELECT 1 
        FROM trabajadores_tareas tt 
        WHERE tt.id_tarea = t.id 
          AND tt.id_trabajador = p_user_id
      );
      
  -- Rol desconocido: 0 tareas
  ELSE
    RETURN QUERY SELECT 0::BIGINT;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.crear_tarea_con_asignaciones(p_titulo text, p_descripcion text, p_id_administrador integer, p_id_edificio integer, p_prioridad text, p_id_estado_nuevo integer, p_fecha_visita timestamp without time zone, p_id_supervisor uuid, p_id_trabajador uuid, p_departamentos_ids integer[])
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_tarea_id integer;
    v_tarea_code text;
    v_departamento_id integer;
BEGIN
    -- Insertar la tarea
    INSERT INTO tareas (
        titulo,
        descripcion,
        id_administrador,
        id_edificio,
        id_estado_nuevo,
        fecha_visita,
        prioridad
    )
    VALUES (
        p_titulo,
        p_descripcion,
        p_id_administrador,
        p_id_edificio,
        p_id_estado_nuevo,
        p_fecha_visita,
        p_prioridad
    )
    RETURNING id, code INTO v_tarea_id, v_tarea_code;

    -- Asignar supervisor si se proporcionó (CORREGIDO: Insertar en supervisores_tareas)
    IF p_id_supervisor IS NOT NULL THEN
        INSERT INTO supervisores_tareas (id_tarea, id_supervisor)
        VALUES (v_tarea_id, p_id_supervisor);
    END IF;

    -- Asignar trabajador adicional si se proporcionó
    -- (Ya no verificamos duplicidad con supervisor porque van a tablas distintas)
    IF p_id_trabajador IS NOT NULL THEN
        INSERT INTO trabajadores_tareas (id_tarea, id_trabajador)
        VALUES (v_tarea_id, p_id_trabajador);
    END IF;

    -- Asignar departamentos
    IF p_departamentos_ids IS NOT NULL AND array_length(p_departamentos_ids, 1) > 0 THEN
        FOREACH v_departamento_id IN ARRAY p_departamentos_ids
        LOOP
            INSERT INTO departamentos_tareas (id_departamento, id_tarea)
            VALUES (v_departamento_id, v_tarea_id);
        END LOOP;
    END IF;

    -- Retornar resultado
    RETURN json_build_object(
        'id', v_tarea_id,
        'code', v_tarea_code
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.crear_tarea_con_asignaciones(p_titulo text, p_descripcion text, p_id_administrador integer, p_id_edificio integer, p_prioridad text, p_id_estado_nuevo integer, p_fecha_visita timestamp without time zone, p_id_supervisor uuid, p_id_trabajador uuid, p_departamentos_ids integer[], p_es_particular boolean DEFAULT false)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_tarea_id integer;
    v_tarea_code text;
    v_departamento_id integer;
BEGIN
    INSERT INTO tareas (
        titulo,
        descripcion,
        id_administrador,
        id_edificio,
        id_estado_nuevo,
        fecha_visita,
        prioridad,
        es_particular
    )
    VALUES (
        p_titulo,
        p_descripcion,
        p_id_administrador,
        p_id_edificio,
        p_id_estado_nuevo,
        p_fecha_visita,
        p_prioridad,
        COALESCE(p_es_particular, false)
    )
    RETURNING id, code INTO v_tarea_id, v_tarea_code;

    IF p_id_supervisor IS NOT NULL THEN
        INSERT INTO supervisores_tareas (id_tarea, id_supervisor)
        VALUES (v_tarea_id, p_id_supervisor);
    END IF;

    IF p_id_trabajador IS NOT NULL THEN
        INSERT INTO trabajadores_tareas (id_tarea, id_trabajador)
        VALUES (v_tarea_id, p_id_trabajador);
    END IF;

    IF p_departamentos_ids IS NOT NULL AND array_length(p_departamentos_ids, 1) > 0 THEN
        FOREACH v_departamento_id IN ARRAY p_departamentos_ids
        LOOP
            INSERT INTO departamentos_tareas (id_departamento, id_tarea)
            VALUES (v_departamento_id, v_tarea_id);
        END LOOP;
    END IF;

    RETURN json_build_object(
        'id', v_tarea_id,
        'code', v_tarea_code
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.crear_tarea_con_asignaciones(p_titulo text, p_descripcion text, p_id_edificio integer, p_id_administrador integer, p_id_supervisor uuid, p_id_estado_nuevo integer, p_fecha_estimada_finalizacion date, p_departamentos integer[])
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_tarea_id integer;
    v_tarea_code text;
    v_departamento_id integer;
BEGIN
    -- Insertar la tarea (usar fecha_visita en lugar de fecha_estimada_finalizacion)
    INSERT INTO tareas (
        titulo,
        descripcion,
        id_edificio,
        id_administrador,
        id_estado_nuevo,
        fecha_visita
    )
    VALUES (
        p_titulo,
        p_descripcion,
        p_id_edificio,
        p_id_administrador,
        p_id_estado_nuevo,
        p_fecha_estimada_finalizacion::timestamp
    )
    RETURNING id, code INTO v_tarea_id, v_tarea_code;

    -- Asignar supervisor si se proporcionó
    IF p_id_supervisor IS NOT NULL THEN
        INSERT INTO trabajadores_tareas (id_tarea, id_trabajador)
        VALUES (v_tarea_id, p_id_supervisor);
    END IF;

    -- Asignar departamentos
    IF p_departamentos IS NOT NULL AND array_length(p_departamentos, 1) > 0 THEN
        FOREACH v_departamento_id IN ARRAY p_departamentos
        LOOP
            INSERT INTO departamentos_tareas (id_departamento, id_tarea)
            VALUES (v_departamento_id, v_tarea_id);
        END LOOP;
    END IF;

    -- Retornar resultado
    RETURN json_build_object(
        'id', v_tarea_id,
        'code', v_tarea_code
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_default_preferencias()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO preferencias_usuarios (id_usuario, tema, tamano_texto, color_primario)
  VALUES (NEW.id, 'system', 'medium', 'blue')
  ON CONFLICT (id_usuario) DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    claims jsonb;
    user_role text;
BEGIN
    -- 1. Extraer el rol del usuario de nuestra tabla "usuarios"
    -- event->>'user_id' contiene el UUID del usuario logueado.
    SELECT rol INTO user_role 
    FROM public.usuarios 
    WHERE id = (event->>'user_id')::uuid;

    -- 2. Obtener los claims actuales (o inicializar un objeto jsonb vacío si es null)
    claims := event->'claims';
    IF claims IS NULL THEN
        claims := '{}'::jsonb;
    END IF;

    -- 3. Inyectar el rol en el área 'app_metadata'
    -- (Nota: 'app_metadata' no puede ser modificado por el usuario cliente, a diferencia de 'user_metadata')
    IF user_role IS NOT NULL THEN
        -- Combinar los claims actuales asegurando la llave app_metadata
        claims := jsonb_set(
            claims, 
            '{app_metadata, rol}', 
            to_jsonb(user_role)
        );
    ELSE
        -- Fallback de seguridad: si el usuario no existe en nuestra tabla (raro), asignarle trabajador.
        claims := jsonb_set(
            claims, 
            '{app_metadata, rol}', 
            '"trabajador"'::jsonb
        );
    END IF;

    -- 4. Actualizar el evento original devolviendo los claims modificados
    RETURN jsonb_set(event, '{claims}', claims);
END;
$function$;

CREATE OR REPLACE FUNCTION public.eliminar_departamento_tarea(p_tarea_id integer, p_departamento_id integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  filas_afectadas int;
BEGIN
  DELETE FROM departamentos_tareas
  WHERE id_tarea = p_tarea_id AND id_departamento = p_departamento_id;
  
  GET DIAGNOSTICS filas_afectadas = ROW_COUNT;
  RETURN filas_afectadas > 0;
END;
$function$;

CREATE OR REPLACE FUNCTION public.eliminar_parte_de_trabajo(p_id_parte integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    usuario_id uuid;
    usuario_rol text;
    id_tarea_parte integer;
    id_trabajador_parte uuid;
    es_supervisor_de_tarea boolean;
    parte_existe boolean;
BEGIN
    -- 1. Obtener el ID y rol del usuario que llama a la función
    usuario_id := auth.uid();
    SELECT rol INTO usuario_rol FROM public.usuarios WHERE id = usuario_id;

    -- Si no se encuentra el rol, denegar el acceso
    IF usuario_rol IS NULL THEN
        RAISE EXCEPTION 'No se pudo verificar el rol del usuario.';
    END IF;

    -- 2. Verificar que el parte existe y obtener su información
    SELECT EXISTS(
        SELECT 1 FROM public.partes_de_trabajo WHERE id = p_id_parte
    ) INTO parte_existe;

    IF NOT parte_existe THEN
        RAISE EXCEPTION 'El parte de trabajo no existe.';
    END IF;

    -- Obtener la tarea y el trabajador del parte
    SELECT id_tarea, id_trabajador 
    INTO id_tarea_parte, id_trabajador_parte 
    FROM public.partes_de_trabajo 
    WHERE id = p_id_parte;

    -- 3. Lógica de permisos
    IF usuario_rol = 'admin' THEN
        -- El admin puede eliminar cualquier parte
        NULL;
    ELSIF usuario_rol = 'supervisor' THEN
        -- Verificar si es supervisor de la tarea
        SELECT EXISTS (
            SELECT 1
            FROM public.supervisores_tareas
            WHERE id_tarea = id_tarea_parte AND id_supervisor = usuario_id
        ) INTO es_supervisor_de_tarea;

        IF NOT es_supervisor_de_tarea THEN
            RAISE EXCEPTION 'Acceso denegado: No eres el supervisor de esta tarea.';
        END IF;
    ELSIF usuario_rol = 'trabajador' THEN
        -- Un trabajador solo puede eliminar sus propios partes
        IF usuario_id != id_trabajador_parte THEN
            RAISE EXCEPTION 'Acceso denegado: Solo puedes eliminar tus propios partes de trabajo.';
        END IF;
    ELSE
        -- Otros roles no tienen permiso
        RAISE EXCEPTION 'Acceso denegado: Tu rol no tiene permisos para realizar esta acción.';
    END IF;

    -- 4. Si todas las verificaciones pasan, eliminar el registro
    DELETE FROM public.partes_de_trabajo WHERE id = p_id_parte;
    
    RETURN TRUE;
EXCEPTION
    WHEN others THEN
        RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.es_admin(user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios
    WHERE id = user_id AND rol = 'admin'
  );
$function$;

CREATE OR REPLACE FUNCTION public.estimar_costo_tarea(termino text)
 RETURNS TABLE(avg_materiales numeric, avg_mano_obra numeric, count bigint, min_total numeric, max_total numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_rol text;
BEGIN
  -- Verify user role
  SELECT rol INTO v_rol FROM usuarios WHERE id = auth.uid();
  
  IF v_rol IS NULL OR v_rol != 'admin' THEN
    RAISE EXCEPTION 'Acceso denegado: Solo administradores pueden realizar estimaciones.';
  END IF;

  RETURN QUERY
  SELECT
    ROUND(AVG(pb.materiales), 2) as avg_materiales,
    ROUND(AVG(pb.mano_obra), 2) as avg_mano_obra,
    COUNT(t.id) as count,
    MIN(pb.total) as min_total,
    MAX(pb.total) as max_total
  FROM tareas t
  JOIN presupuestos_base pb ON t.id = pb.id_tarea
  WHERE
    (t.titulo ILIKE '%' || termino || '%' OR t.descripcion ILIKE '%' || termino || '%')
    AND pb.aprobado = true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.f_unaccent_lower(text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE STRICT
 SET search_path TO 'public'
AS $function$
  SELECT unaccent(LOWER($1))
$function$;

CREATE OR REPLACE FUNCTION public.fn_auditoria_forense_captura()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_usuario_id UUID;
    v_usuario_email VARCHAR(255);
    v_id_registro VARCHAR(60);
BEGIN
    v_usuario_id := auth.uid();
    
    IF v_usuario_id IS NOT NULL THEN
        SELECT email INTO v_usuario_email FROM public.usuarios WHERE id = v_usuario_id LIMIT 1;
    END IF;

    IF TG_OP = 'DELETE' THEN
        v_id_registro := OLD.id::text;
        INSERT INTO public.auditoria_forense_logs (
            tabla_afectada,
            id_registro,
            operacion,
            datos_anteriores,
            datos_nuevos,
            usuario_id,
            usuario_email
        ) VALUES (
            TG_TABLE_NAME,
            v_id_registro,
            'DELETE',
            to_jsonb(OLD),
            NULL,
            v_usuario_id,
            v_usuario_email
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        v_id_registro := NEW.id::text;
        IF to_jsonb(OLD) IS DISTINCT FROM to_jsonb(NEW) THEN
            INSERT INTO public.auditoria_forense_logs (
                tabla_afectada,
                id_registro,
                operacion,
                datos_anteriores,
                datos_nuevos,
                usuario_id,
                usuario_email
            ) VALUES (
                TG_TABLE_NAME,
                v_id_registro,
                'UPDATE',
                to_jsonb(OLD),
                to_jsonb(NEW),
                v_usuario_id,
                v_usuario_email
            );
        END IF;
        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_calcular_costo_jornal(p_id_trabajador uuid, p_tipo_jornada text)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
    v_salario_base INTEGER;
BEGIN
    SELECT COALESCE(salario_diario, 0) INTO v_salario_base
    FROM configuracion_trabajadores
    WHERE id_trabajador = p_id_trabajador;

    RETURN CASE 
        WHEN p_tipo_jornada = 'dia_completo' THEN v_salario_base::NUMERIC
        WHEN p_tipo_jornada = 'medio_dia'    THEN (v_salario_base::NUMERIC * 0.5)
        ELSE 0::NUMERIC
    END;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_facturas_sincronizar_pagada()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Si el saldo pendiente es cero y no es borrador ni anulada
  IF COALESCE(NEW.saldo_pendiente, 0) <= 0.01 AND NEW.id_estado_nuevo NOT IN (1, 6) THEN
    NEW.pagada := true;
    NEW.fecha_pago := COALESCE(NEW.fecha_pago, NOW());
    NEW.fecha_ultimo_pago := COALESCE(NEW.fecha_ultimo_pago, CURRENT_DATE);
  ELSE
    NEW.pagada := false;
    NEW.fecha_pago := NULL;
    NEW.fecha_ultimo_pago := NULL;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_liquidacion_pagada_actualiza_pb_y_tarea()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_all_invoices_paid BOOLEAN;
  v_estado_liquidada_id INTEGER;
BEGIN
  -- Solo actuar cuando pagada pasa a true (sea INSERT o UPDATE)
  IF (TG_OP = 'INSERT' AND NEW.pagada = true) OR (TG_OP = 'UPDATE' AND NEW.pagada = true AND (OLD.pagada IS NULL OR OLD.pagada = false)) THEN
    -- 1. Marcar el presupuesto base como liquidado
    IF NEW.id_presupuesto_base IS NOT NULL THEN
      UPDATE public.presupuestos_base
         SET base_liquidada = true,
             updated_at = NOW()
       WHERE id = NEW.id_presupuesto_base;
    END IF;

    -- 2. Validar si el cliente ya pago todo
    SELECT NOT EXISTS (
      SELECT 1 
        FROM public.facturas f
        JOIN public.presupuestos_finales pf ON f.id_presupuesto_final = pf.id
       WHERE pf.id_tarea = NEW.id_tarea
         AND COALESCE(f.pagada, false) = false
    ) INTO v_all_invoices_paid;

    -- Si el cliente ya pago, pasamos la tarea a "liquidada" (9)
    IF v_all_invoices_paid THEN
      SELECT id INTO v_estado_liquidada_id
        FROM public.estados_tareas
       WHERE codigo = 'liquidada'
       LIMIT 1;

      IF v_estado_liquidada_id IS NOT NULL THEN
        UPDATE public.tareas
           SET id_estado_nuevo = v_estado_liquidada_id,
               updated_at = NOW()
         WHERE id = NEW.id_tarea;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_marcar_tarea_liquidada()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  update public.tareas
     set id_estado_nuevo = 9,        -- 9 = Liquidada (ver lib/estados-service.ts)
         finalizada = true,
         updated_at = now()
   where id = new.id_tarea;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.fn_recalcular_totales_pf()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id_presupuesto INTEGER;
  v_materiales NUMERIC;
  v_mano_obra_bruta NUMERIC;
  v_descuento NUMERIC;
BEGIN
  -- Determinar el id_presupuesto afectado según la operacion
  IF TG_OP = 'DELETE' THEN
    v_id_presupuesto := OLD.id_presupuesto;
  ELSE
    v_id_presupuesto := NEW.id_presupuesto;
  END IF;

  -- Solo actuar si el id_presupuesto corresponde a un presupuesto_final
  IF NOT EXISTS (SELECT 1 FROM presupuestos_finales WHERE id = v_id_presupuesto) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- 1. Obtener el descuento guardado en la cabecera (platinum v2.1)
  SELECT COALESCE(descuento_monto, 0) INTO v_descuento 
  FROM presupuestos_finales 
  WHERE id = v_id_presupuesto;

  -- 2. Recalcular sumas brutas reales desde todos los items del PF
  SELECT
    COALESCE(SUM(CASE WHEN es_material = true THEN cantidad * precio ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN es_material = false THEN cantidad * precio ELSE 0 END), 0)
  INTO v_materiales, v_mano_obra_bruta
  FROM items
  WHERE id_presupuesto = v_id_presupuesto;

  -- 3. Actualizar la cabecera restando el descuento de la mano de obra y el total
  UPDATE presupuestos_finales
  SET
    materiales = v_materiales,
    mano_obra  = v_mano_obra_bruta - v_descuento,
    total      = (v_materiales + v_mano_obra_bruta) - v_descuento,
    updated_at = NOW()
  WHERE id = v_id_presupuesto;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_sincronizar_factura_a_presupuesto_final()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_factura_id     INTEGER;
  v_pf_id          INTEGER;
  v_old_pf_id      INTEGER;
  v_sum_materiales NUMERIC;
  v_sum_mano_obra  NUMERIC;
  v_desc_monto     NUMERIC;
  v_facturas_restantes INTEGER;
  v_pf_actual      presupuestos_finales%ROWTYPE;
  v_items_actuales JSONB;
  v_versiones      JSONB;
  v_snapshot       JSONB;
  v_id_tarea       INTEGER;
  v_estado_presupuestado_id INTEGER;
BEGIN
  -- Blindaje anti-recursion
  IF pg_trigger_depth() > 1 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Determinar id_presupuesto_final segun tabla y operacion
  IF TG_TABLE_NAME = 'items_factura' THEN
    IF TG_OP = 'DELETE' THEN
      v_factura_id := OLD.id_factura;
    ELSE
      v_factura_id := NEW.id_factura;
    END IF;
    SELECT id_presupuesto_final INTO v_pf_id FROM facturas WHERE id = v_factura_id;
  ELSIF TG_TABLE_NAME = 'facturas' THEN
    IF TG_OP = 'DELETE' THEN
      v_pf_id := OLD.id_presupuesto_final;
      v_factura_id := OLD.id;
    ELSE
      v_pf_id     := NEW.id_presupuesto_final;
      v_old_pf_id := OLD.id_presupuesto_final;
      v_factura_id := NEW.id;
    END IF;
  END IF;

  IF v_pf_id IS NULL AND v_old_pf_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- === CASO 1: SINCRONIZAR v_pf_id ===
  IF v_pf_id IS NOT NULL AND EXISTS (SELECT 1 FROM presupuestos_finales WHERE id = v_pf_id) THEN

    -- Contar cuantas facturas existen AHORA para este PF (excluyendo la que se este borrando)
    IF TG_TABLE_NAME = 'facturas' AND TG_OP = 'DELETE' THEN
      SELECT COUNT(*) INTO v_facturas_restantes FROM facturas WHERE id_presupuesto_final = v_pf_id AND id <> v_factura_id;
    ELSE
      SELECT COUNT(*) INTO v_facturas_restantes FROM facturas WHERE id_presupuesto_final = v_pf_id;
    END IF;

    -- SUB-CASO A: YA NO QUEDAN FACTURAS (se borraron todas)
    IF v_facturas_restantes = 0 THEN
      -- Restaurar totales del presupuesto final directamente desde su tabla items (valores presupuestados originales)
      SELECT
        COALESCE(SUM(CASE WHEN es_material = true  THEN cantidad * precio ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN es_material = false THEN cantidad * precio ELSE 0 END), 0)
      INTO v_sum_materiales, v_sum_mano_obra
      FROM items
      WHERE id_presupuesto = v_pf_id;

      SELECT COALESCE(descuento_monto, 0), id_tarea 
      INTO v_desc_monto, v_id_tarea 
      FROM presupuestos_finales WHERE id = v_pf_id;

      -- Resetear presupuesto final a borrador y restaurar montos
      UPDATE presupuestos_finales
      SET
        materiales = v_sum_materiales,
        mano_obra  = GREATEST(0, v_sum_mano_obra - v_desc_monto),
        total      = (v_sum_materiales + v_sum_mano_obra) - v_desc_monto,
        id_estado  = 1, -- borrador
        aprobado   = false,
        enviado    = false,
        updated_at = NOW()
      WHERE id = v_pf_id;

      -- Resetear tarea asociada a estado 'presupuestado' (id: 3)
      IF v_id_tarea IS NOT NULL THEN
        SELECT id INTO v_estado_presupuestado_id FROM estados_tareas WHERE codigo = 'presupuestado' LIMIT 1;
        IF v_estado_presupuestado_id IS NOT NULL THEN
          UPDATE tareas
          SET id_estado_nuevo = v_estado_presupuestado_id,
              updated_at = NOW()
          WHERE id = v_id_tarea
            AND id_estado_nuevo NOT IN (7, 9, 11)
            AND COALESCE(finalizada, false) = false;
        END IF;
      END IF;

    -- SUB-CASO B: TODAVIA EXISTEN FACTURAS (sincronizar segun facturas activas)
    ELSE
      -- Calcular sumas de todas las facturas que quedan
      SELECT
        COALESCE(SUM(CASE WHEN itf.es_material = true  THEN itf.subtotal_item ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN itf.es_material = false THEN itf.subtotal_item ELSE 0 END), 0)
      INTO v_sum_materiales, v_sum_mano_obra
      FROM items_factura itf
      JOIN facturas f ON f.id = itf.id_factura
      WHERE f.id_presupuesto_final = v_pf_id
        AND (TG_TABLE_NAME <> 'facturas' OR TG_OP <> 'DELETE' OR f.id <> v_factura_id);

      SELECT * INTO v_pf_actual FROM presupuestos_finales WHERE id = v_pf_id;
      v_desc_monto := COALESCE(v_pf_actual.descuento_monto, 0);

      -- Si los valores cambian legítimamente Y NO es una operacion de borrado intermedio
      IF TG_OP <> 'DELETE' AND (
         v_pf_actual.materiales IS DISTINCT FROM v_sum_materiales
         OR v_pf_actual.mano_obra IS DISTINCT FROM GREATEST(0, v_sum_mano_obra - v_desc_monto)) THEN

        SELECT COALESCE(
          jsonb_agg(jsonb_build_object(
            'descripcion', descripcion,
            'cantidad',    cantidad,
            'precio',      precio,
            'es_material', es_material
          ) ORDER BY id),
          '[]'::jsonb
        )
        INTO v_items_actuales
        FROM items
        WHERE id_presupuesto = v_pf_id;

        v_versiones := COALESCE(v_pf_actual.historial_versiones, '[]'::jsonb);

        v_snapshot := jsonb_build_object(
          'version',             jsonb_array_length(v_versiones) + 1,
          'fecha',               to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
          'origen',              'factura',
          'materiales',          v_pf_actual.materiales,
          'mano_obra',           v_pf_actual.mano_obra,
          'total',               v_pf_actual.total,
          'descuento_monto',     v_desc_monto,
          'observaciones_admin', v_pf_actual.observaciones_admin,
          'items',               COALESCE(v_items_actuales, '[]'::jsonb)
        );

        UPDATE presupuestos_finales
        SET
          materiales          = v_sum_materiales,
          mano_obra           = GREATEST(0, v_sum_mano_obra - v_desc_monto),
          total               = (v_sum_materiales + v_sum_mano_obra) - v_desc_monto,
          historial_versiones = v_versiones || jsonb_build_array(v_snapshot),
          updated_at          = NOW()
        WHERE id = v_pf_id;

      ELSE
        -- Actualizacion directa de totales sin ensuciar historial con estados transitorios
        UPDATE presupuestos_finales
        SET
          materiales = CASE WHEN v_sum_materiales > 0 THEN v_sum_materiales ELSE materiales END,
          mano_obra  = CASE WHEN v_sum_mano_obra > 0 THEN GREATEST(0, v_sum_mano_obra - v_desc_monto) ELSE mano_obra END,
          total      = (CASE WHEN v_sum_materiales > 0 THEN v_sum_materiales ELSE materiales END +
                        CASE WHEN v_sum_mano_obra > 0 THEN GREATEST(0, v_sum_mano_obra - v_desc_monto) ELSE mano_obra END) - v_desc_monto,
          updated_at = NOW()
        WHERE id = v_pf_id;
      END IF;

      -- REGLA DE ORO DE ITEMS: NUNCA pisar con 0 un item si una factura es eliminada o si no hay factura de ese tipo
      IF v_sum_materiales > 0 AND (SELECT COUNT(*) FROM items WHERE id_presupuesto = v_pf_id AND es_material = true) = 1 THEN
        UPDATE items SET precio = v_sum_materiales, cantidad = 1
        WHERE id_presupuesto = v_pf_id AND es_material = true;
      END IF;

      IF v_sum_mano_obra > 0 AND (SELECT COUNT(*) FROM items WHERE id_presupuesto = v_pf_id AND es_material = false) = 1 THEN
        UPDATE items SET precio = v_sum_mano_obra, cantidad = 1
        WHERE id_presupuesto = v_pf_id AND es_material = false;
      END IF;

    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_sync_nombre_factura_a_tarea_y_facturas()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_sync_pago_a_factura()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_factura_id INTEGER;
  v_total_pagado NUMERIC;
  v_total_factura NUMERIC;
  v_nuevo_saldo NUMERIC;
  v_nuevo_estado INTEGER;
BEGIN
  v_factura_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.id_factura ELSE NEW.id_factura END;

  IF v_factura_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT total INTO v_total_factura
  FROM facturas
  WHERE id = v_factura_id;

  IF v_total_factura IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(SUM(monto_pagado), 0)
  INTO v_total_pagado
  FROM pagos_facturas
  WHERE id_factura = v_factura_id;

  v_nuevo_saldo := GREATEST(0, v_total_factura - v_total_pagado);

  IF v_nuevo_saldo <= 0.01 THEN
    v_nuevo_estado := 5; -- Pagado
  ELSIF v_total_pagado > 0 THEN
    v_nuevo_estado := 3; -- Parcialmente pagado
  ELSE
    v_nuevo_estado := 2; -- No pagado
  END IF;

  UPDATE facturas
  SET 
    total_pagado = v_total_pagado,
    saldo_pendiente = v_nuevo_saldo,
    id_estado_nuevo = v_nuevo_estado,
    pagada = (v_nuevo_saldo <= 0.01)
  WHERE id = v_factura_id
    AND (
      total_pagado IS DISTINCT FROM v_total_pagado OR
      saldo_pendiente IS DISTINCT FROM v_nuevo_saldo OR
      id_estado_nuevo IS DISTINCT FROM v_nuevo_estado OR
      pagada IS DISTINCT FROM (v_nuevo_saldo <= 0.01)
    );

  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_sync_titulo_tarea_a_facturas()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_tareas_sincronizar_finalizada()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_estado_vencido_id INTEGER;
  v_estado_terminado_id INTEGER;
  v_estado_liquidada_id INTEGER;
BEGIN
  -- Obtener los IDs de estados de finalizacion
  SELECT id INTO v_estado_vencido_id FROM public.estados_tareas WHERE codigo = 'vencido' LIMIT 1;
  SELECT id INTO v_estado_terminado_id FROM public.estados_tareas WHERE codigo = 'terminado' LIMIT 1;
  SELECT id INTO v_estado_liquidada_id FROM public.estados_tareas WHERE codigo = 'liquidada' LIMIT 1;

  -- Si el estado nuevo es uno de los estados de finalizacion, validar si tiene presupuesto base pendiente de liquidar
  IF NEW.id_estado_nuevo IN (v_estado_terminado_id, v_estado_liquidada_id) THEN
    IF EXISTS (
      SELECT 1 
        FROM public.presupuestos_base 
       WHERE id_tarea = NEW.id 
         AND COALESCE(base_liquidada, false) = false
    ) THEN
      NEW.finalizada := false; -- Queda viva
    ELSE
      NEW.finalizada := true;
    END IF;
  ELSIF NEW.id_estado_nuevo = v_estado_vencido_id THEN
    NEW.finalizada := true;
  -- Si no, y el estado cambio, forzar finalizada = false (reactivacion)
  ELSIF OLD.id_estado_nuevo IS DISTINCT FROM NEW.id_estado_nuevo THEN
    NEW.finalizada := false;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.force_jwt_refresh(target_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Al actualizar el campo updated_at en auth.users, GoTrue nota el cambio de 
  -- seguridad y puede invalidar tokens / requerir nuevo login.
  UPDATE auth.users 
  SET updated_at = now() 
  WHERE id = target_user_id;

  -- Alternativamente (o sumado), borrar las sesiones (hace log out forzado al instante):
  DELETE FROM auth.sessions WHERE user_id = target_user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generar_codigo_contacto()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.code := 'CON-' || LPAD(NEW.id::TEXT, 5, '0');
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_pb_code()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Asegurar que el ID esté disponible antes de generar el code
    IF NEW.id IS NULL THEN
        NEW.id := nextval('presupuestos_base_id_seq');
    END IF;
    
    -- Siempre sobrescribir el code con el formato estándar
    NEW.code := 'PB-' || lpad(NEW.id::text, 7, '0');
    
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_pf_code()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NEW.id IS NULL THEN
        NEW.id := nextval('presupuestos_finales_id_seq');
    END IF;
    NEW.code := 'PF-' || LPAD(NEW.id::text, 9, '0');
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_comprobantes_stats()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total', COUNT(*),
        'sinFoto', COUNT(*) FILTER (WHERE comprobante_url IS NULL AND imagen_procesada_url IS NULL),
        'montoRiesgo', COALESCE(SUM(monto) FILTER (WHERE comprobante_url IS NULL AND imagen_procesada_url IS NULL), 0),
        'eficiencia', CASE WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE comprobante_url IS NOT NULL OR imagen_procesada_url IS NOT NULL))::numeric / COUNT(*)::numeric * 100) ELSE 0 END
    ) INTO result
    FROM gastos_tarea
    WHERE created_at >= NOW() - INTERVAL '3 months';
    
    RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_authenticators()
 RETURNS TABLE(id uuid, friendly_name text, device_type text, created_at timestamp with time zone, last_used_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY SELECT ua.id, ua.friendly_name, ua.device_type, ua.created_at, ua.last_used_at
    FROM public.user_authenticators ua WHERE ua.user_id = auth.uid()
    ORDER BY ua.last_used_at DESC NULLS LAST, ua.created_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT rol FROM public.usuarios WHERE id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.get_tarea_details(tarea_id_param integer)
 RETURNS TABLE(id integer, titulo text, descripcion text, fecha_creacion timestamp with time zone, id_estado_nuevo integer, finalizada boolean, prioridad text, id_edificio integer, edificio_nombre text, edificio_direccion text, cuit_edificio character varying, estado text, nombre_administrador text, telefono_administrador text, trabajadores_emails text, supervisores_emails text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY 
    SELECT 
        t.id::integer,
        t.titulo::text,
        t.descripcion::text,
        t.created_at::timestamp with time zone,
        t.id_estado_nuevo::integer,
        t.finalizada::boolean,
        t.prioridad::text,
        t.id_edificio::integer,
        e.nombre::text AS edificio_nombre,
        e.direccion::text AS edificio_direccion,
        e.cuit::character varying AS cuit_edificio,
        COALESCE(et.nombre, 'Sin Estado')::text AS estado,
        COALESCE(a.nombre, 'No asignado')::text AS nombre_administrador,
        COALESCE(a.telefono, 'Sin teléfono')::text AS telefono_administrador,
        -- Subconsultas para emails con referencias explícitas
        (SELECT string_agg(u.email, ', ')
         FROM trabajadores_tareas tt
         JOIN usuarios u ON tt.id_trabajador = u.id
         WHERE tt.id_tarea = t.id
        )::text AS trabajadores_emails,
        (SELECT string_agg(u.email, ', ')
         FROM supervisores_tareas st
         JOIN usuarios u ON st.id_supervisor = u.id
         WHERE st.id_tarea = t.id
        )::text AS supervisores_emails
    FROM 
        tareas t
    LEFT JOIN edificios e ON t.id_edificio = e.id
    LEFT JOIN estados_tareas et ON t.id_estado_nuevo = et.id
    LEFT JOIN administradores a ON e.id_administrador = a.id
    WHERE 
        t.id = tarea_id_param;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_tareas_sin_presupuesto_final()
 RETURNS TABLE(id integer, code text, titulo text, descripcion text, id_edificio integer, fecha_visita timestamp without time zone, prioridad text, created_at timestamp without time zone, id_estado_nuevo integer, gastos_tarea_pdf text, id_administrador integer, finalizada boolean, estado_nombre text, edificio_nombre text)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.code,
    t.titulo,
    t.descripcion,
    t.id_edificio,
    t.fecha_visita,
    t.prioridad,
    t.created_at,
    t.id_estado_nuevo,
    t.gastos_tarea_pdf,
    t.id_administrador,
    t.finalizada,
    et.nombre::text AS estado_nombre, -- CORRECCIÓN: Convertir a TEXT
    ed.nombre::text AS edificio_nombre  -- CORRECCIÓN: Convertir a TEXT
  FROM tareas t
  LEFT JOIN estados_tareas et ON t.id_estado_nuevo = et.id
  LEFT JOIN edificios ed ON t.id_edificio = ed.id
  WHERE NOT EXISTS (
    SELECT 1
    FROM presupuestos_finales pf
    WHERE pf.id_tarea = t.id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_telefonos_departamento(dep_id integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', id,
        'numero', numero,
        'relacion', relacion,
        'nombre_contacto', nombre_contacto,
        'es_principal', es_principal
      )
    )
    FROM telefonos_departamento
    WHERE departamento_id = dep_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_rol TEXT;
  v_permisos JSONB;
BEGIN
  -- Obtener rol del usuario
  SELECT rol INTO v_rol FROM usuarios WHERE id = p_user_id;
  
  -- Configurar permisos según rol
  IF v_rol = 'admin' THEN
    v_permisos := '{"ver_todo": true, "editar_todo": true}';
  ELSIF v_rol = 'supervisor' THEN
    v_permisos := '{"ver_presupuestos_base": true, "crear_presupuestos_base": true}';
  ELSIF v_rol = 'trabajador' THEN
    v_permisos := '{"ver_tareas_asignadas": true, "ver_edificios": true}';
  ELSE
    v_permisos := '{}';
  END IF;
  
  RETURN v_permisos;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.usuarios (id, email, rol)
  VALUES (NEW.id, NEW.email, 'trabajador')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.jwt_rol()
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _rol text;
  _claims jsonb;
BEGIN
  -- 1. Intentar obtener de los claims del JWT (Respuesta ultra-rápida)
  BEGIN
    _claims := current_setting('request.jwt.claims', true)::jsonb;
    _rol := _claims -> 'app_metadata' ->> 'rol';
  EXCEPTION WHEN OTHERS THEN
    _rol := NULL;
  END;
  
  IF _rol IS NOT NULL THEN
    RETURN _rol;
  END IF;

  -- 2. Fallback: Consultar la tabla de usuarios (Respaldo garantizado)
  -- Solo si hay un UID autenticado en la sesión de Supabase
  IF auth.uid() IS NOT NULL THEN
    SELECT rol INTO _rol FROM public.usuarios WHERE id = auth.uid();
    RETURN _rol;
  END IF;

  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.liquidar_gastos_supervision(p_id_tarea integer, p_id_liquidacion integer)
 RETURNS TABLE(gastos_actualizados integer)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_count_gastos int := 0;
  v_count_jornales int := 0;
begin
  -- 1. Vincular Gastos (Materiales, etc)
  update public.gastos_tarea g
    set liquidado = true,
        estado = 'pagado',
        id_liquidacion = p_id_liquidacion,
        updated_at = now()
  from public.usuarios u
  where g.id_tarea = p_id_tarea
    and g.id_usuario = u.id
    and u.rol in ('admin','supervisor')
    and (g.id_liquidacion IS NULL OR g.id_liquidacion = p_id_liquidacion) -- Permitir re-liquidar si ya esta vinculada a esta misma
    and coalesce(g.liquidado, false) = false;

  get diagnostics v_count_gastos = row_count;

  -- 2. Vincular Jornales (Partes de Trabajo)
  update public.partes_de_trabajo
    set liquidado = true,
        id_liquidacion = p_id_liquidacion
  where id_tarea = p_id_tarea
    and (id_liquidacion IS NULL OR id_liquidacion = p_id_liquidacion)
    and coalesce(liquidado, false) = false
    and estado = 'confirmado'; -- Solo los confirmados!

  get diagnostics v_count_jornales = row_count;

  -- 3. ESTAMPAR SNAPSHOT INMUTABLE (Phase 3.0)
  -- Guardamos la foto del momento para que el PDF y la UI sean inmutables
  update public.liquidaciones_nuevas l
  set detalle_gastos_json = (
    SELECT jsonb_agg(sub.item)
    FROM (
        SELECT jsonb_build_object('tipo', 'material', 'fecha', g.fecha_gasto, 'descripcion', g.descripcion, 'monto', g.monto) AS item,
               g.fecha_gasto AS order_date
        FROM public.gastos_tarea g
        WHERE g.id_liquidacion = l.id
        UNION ALL
        SELECT jsonb_build_object('tipo', 'jornal', 'fecha', pt.fecha, 'descripcion', (u.nombre || ' - ' || pt.tipo_jornada), 'monto', (ct.salario_diario * CASE WHEN pt.tipo_jornada = 'dia_completo' THEN 1.0 WHEN pt.tipo_jornada = 'medio_dia' THEN 0.5 ELSE 0 END)::int) AS item,
               pt.fecha AS order_date
        FROM public.partes_de_trabajo pt
        JOIN public.usuarios u ON pt.id_trabajador = u.id
        JOIN public.configuracion_trabajadores ct ON pt.id_trabajador = ct.id_trabajador
        WHERE pt.id_liquidacion = l.id
        ORDER BY 2
    ) sub
  )
  where l.id = p_id_liquidacion;

  return query select (v_count_gastos + v_count_jornales)::int as gastos_actualizados;
end;
$function$;

CREATE OR REPLACE FUNCTION public.obtener_administradores_con_edificios()
 RETURNS TABLE(id integer, code text, nombre text, telefono text, estado text, aplica_ajustes boolean, porcentaje_default numeric, email1 text, email2 text, created_at timestamp without time zone, total_edificios bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    a.id,
    a.code,
    a.nombre,
    a.telefono,
    a.estado,
    a.aplica_ajustes,
    a.porcentaje_default,
    a.email1,
    a.email2,
    a.created_at,
    COUNT(e.id) as total_edificios
  FROM administradores a
  LEFT JOIN edificios e ON e.id_administrador = a.id
  GROUP BY a.id, a.code, a.nombre, a.telefono, a.estado, a.aplica_ajustes, 
           a.porcentaje_default, a.email1, a.email2, a.created_at
  ORDER BY a.nombre ASC;
$function$;

CREATE OR REPLACE FUNCTION public.obtener_desglose_gastos_para_liquidacion(p_id_tarea integer)
 RETURNS TABLE(categoria text, cantidad_registros integer, monto_total integer, detalle jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- CATEGORÍA 1: MATERIALES
  RETURN QUERY
  SELECT 
    'materiales'::TEXT,
    COUNT(*)::INTEGER,
    COALESCE(SUM(gt.monto), 0)::INTEGER,
    CASE 
      WHEN COUNT(*) > 0 THEN
        (SELECT jsonb_agg(
          jsonb_build_object(
            'id', sub.id,
            'fecha', sub.fecha_gasto,
            'descripcion', sub.descripcion,
            'monto', sub.monto,
            'comprobante_url', sub.comprobante_url
          ) ORDER BY sub.fecha_gasto
        )
        FROM (
          SELECT id, fecha_gasto, descripcion, monto, comprobante_url
          FROM gastos_tarea
          WHERE id_tarea = p_id_tarea
            AND estado = 'aprobado'
            AND tipo_gasto = 'material'
          ORDER BY fecha_gasto
        ) sub)
      ELSE '[]'::JSONB
    END
  FROM gastos_tarea gt
  WHERE gt.id_tarea = p_id_tarea
    AND gt.estado = 'aprobado'
    AND gt.tipo_gasto = 'material';
  
  -- CATEGORÍA 2: JORNALES
  RETURN QUERY
  SELECT 
    'jornales'::TEXT,
    COUNT(*)::INTEGER,
    COALESCE(
      SUM(
        ct.salario_diario * 
        CASE 
          WHEN pt.tipo_jornada = 'dia_completo' THEN 1.0 
          WHEN pt.tipo_jornada = 'medio_dia' THEN 0.5 
          ELSE 0 
        END
      ), 0
    )::INTEGER,
    CASE 
      WHEN COUNT(*) > 0 THEN
        (SELECT jsonb_agg(
          jsonb_build_object(
            'id', sub.id,
            'fecha', sub.fecha,
            'id_trabajador', sub.id_trabajador,
            'tipo_jornada', sub.tipo_jornada,
            'salario_diario', sub.salario_diario,
            'monto_calculado', sub.monto_calculado
          ) ORDER BY sub.fecha
        )
        FROM (
          SELECT 
            pt2.id,
            pt2.fecha,
            pt2.id_trabajador,
            pt2.tipo_jornada,
            ct2.salario_diario,
            (ct2.salario_diario * 
              CASE 
                WHEN pt2.tipo_jornada = 'dia_completo' THEN 1.0 
                WHEN pt2.tipo_jornada = 'medio_dia' THEN 0.5 
                ELSE 0 
              END
            )::INTEGER as monto_calculado
          FROM partes_de_trabajo pt2
          JOIN configuracion_trabajadores ct2 ON pt2.id_trabajador = ct2.id_trabajador
          WHERE pt2.id_tarea = p_id_tarea
          ORDER BY pt2.fecha
        ) sub)
      ELSE '[]'::JSONB
    END
  FROM partes_de_trabajo pt
  JOIN configuracion_trabajadores ct ON pt.id_trabajador = ct.id_trabajador
  WHERE pt.id_tarea = p_id_tarea;
END;
$function$;

CREATE OR REPLACE FUNCTION public.obtener_detalle_liquidacion(p_liquidacion_id integer, p_usuario_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_resultado json;
  v_id_trabajador uuid;
  v_rol varchar;
BEGIN
  -- Obtener rol del usuario
  SELECT rol INTO v_rol
  FROM usuarios
  WHERE id = p_usuario_id;
  
  -- Obtener id_trabajador de la liquidación
  SELECT id_trabajador INTO v_id_trabajador
  FROM liquidaciones_trabajadores
  WHERE id = p_liquidacion_id;
  
  -- Verificar que el trabajador solo pueda ver sus liquidaciones
  IF v_rol = 'trabajador' AND v_id_trabajador <> p_usuario_id THEN
    RETURN json_build_object('error', 'No autorizado');
  END IF;
  
  -- Construir el resultado con todos los datos necesarios
  SELECT json_build_object(
    'liquidacion', (
      SELECT row_to_json(liq)
      FROM (
        SELECT 
          lt.*,
          u.email as trabajador_email,
          u.nombre as trabajador_nombre
        FROM liquidaciones_trabajadores lt
        JOIN usuarios u ON lt.id_trabajador = u.id
        WHERE lt.id = p_liquidacion_id
      ) liq
    ),
    'partes_trabajo', (
      SELECT json_agg(pt)
      FROM (
        SELECT 
          pt.*,
          t.nombre AS tarea_nombre,
          p.nombre AS proyecto_nombre
        FROM partes_de_trabajo pt
        LEFT JOIN tareas t ON pt.id_tarea = t.id
        LEFT JOIN proyectos p ON t.id_proyecto = p.id
        WHERE 
          pt.id_trabajador = v_id_trabajador AND
          pt.liquidado = true AND
          pt.fecha BETWEEN 
            (SELECT semana_inicio FROM liquidaciones_trabajadores WHERE id = p_liquidacion_id) AND
            (SELECT semana_fin FROM liquidaciones_trabajadores WHERE id = p_liquidacion_id)
        ORDER BY pt.fecha ASC
      ) pt
    ),
    'gastos', (
      SELECT json_agg(g)
      FROM (
        SELECT 
          g.*,
          t.nombre AS tarea_nombre,
          p.nombre AS proyecto_nombre
        FROM gastos_tarea g
        LEFT JOIN tareas t ON g.id_tarea = t.id
        LEFT JOIN proyectos p ON t.id_proyecto = p.id
        WHERE 
          g.id_usuario = v_id_trabajador AND
          g.liquidado = true AND
          g.fecha_gasto BETWEEN 
            (SELECT semana_inicio FROM liquidaciones_trabajadores WHERE id = p_liquidacion_id) AND
            (SELECT semana_fin FROM liquidaciones_trabajadores WHERE id = p_liquidacion_id)
        ORDER BY g.fecha_gasto ASC
      ) g
    )
  ) INTO v_resultado;
  
  RETURN v_resultado;
END;
$function$;

CREATE OR REPLACE FUNCTION public.obtener_estadisticas_gastos_tarea(p_id_tarea integer)
 RETURNS TABLE(total_gastos numeric, cantidad_gastos integer, gastos_ocr integer, gastos_manuales integer, promedio_confianza_ocr numeric)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(monto), 0) as total_gastos,
        COUNT(*)::INTEGER as cantidad_gastos,
        COUNT(CASE WHEN metodo_registro LIKE 'ocr%' THEN 1 END)::INTEGER as gastos_ocr,
        COUNT(CASE WHEN metodo_registro = 'manual' THEN 1 END)::INTEGER as gastos_manuales,
        COALESCE(AVG(confianza_ocr), 0) as promedio_confianza_ocr
    FROM gastos_tarea 
    WHERE id_tarea = p_id_tarea;
END;
$function$;

CREATE OR REPLACE FUNCTION public.obtener_estadisticas_pagos()
 RETURNS TABLE(total_facturas integer, facturas_pendientes integer, facturas_pagadas integer, monto_total_facturado numeric, monto_total_pagado numeric)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_facturas,
        COUNT(CASE WHEN f.estado = 'pendiente' THEN 1 END)::INTEGER as facturas_pendientes,
        COUNT(CASE WHEN f.estado = 'pagada' THEN 1 END)::INTEGER as facturas_pagadas,
        COALESCE(SUM(f.total), 0) as monto_total_facturado,
        COALESCE(SUM(p.total_pagado), 0) as monto_total_pagado
    FROM facturas f
    LEFT JOIN (
        SELECT id_factura, SUM(monto_pagado) as total_pagado
        FROM pagos_facturas 
        GROUP BY id_factura
    ) p ON f.id = p.id_factura;
END;
$function$;

CREATE OR REPLACE FUNCTION public.obtener_partes_de_trabajo(p_id_tarea integer, p_id_trabajador uuid)
 RETURNS SETOF partes_de_trabajo
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    usuario_id uuid;
    usuario_rol text;
    es_supervisor_de_tarea boolean;
    es_trabajador_de_tarea boolean;
BEGIN
    -- 1. Obtener el ID y rol del usuario que llama a la función
    usuario_id := auth.uid();
    SELECT rol INTO usuario_rol FROM public.usuarios WHERE id = usuario_id;

    -- Si no se encuentra el rol, denegar el acceso
    IF usuario_rol IS NULL THEN
        RAISE EXCEPTION 'No se pudo verificar el rol del usuario.';
    END IF;

    -- 2. Lógica de permisos
    IF usuario_rol = 'admin' THEN
        -- El admin puede ver todo
        RETURN QUERY 
        SELECT * 
        FROM public.partes_de_trabajo 
        WHERE id_tarea = p_id_tarea AND id_trabajador = p_id_trabajador;
        
    ELSIF usuario_rol = 'supervisor' THEN
        -- Verificar si el supervisor está asignado a esta tarea
        SELECT EXISTS (
            SELECT 1
            FROM public.supervisores_tareas
            WHERE id_tarea = p_id_tarea AND id_supervisor = usuario_id
        ) INTO es_supervisor_de_tarea;

        IF NOT es_supervisor_de_tarea THEN
            RAISE EXCEPTION 'Acceso denegado: No eres el supervisor de esta tarea.';
        END IF;

        -- El supervisor puede ver los partes de la tarea que supervisa
        RETURN QUERY 
        SELECT * 
        FROM public.partes_de_trabajo 
        WHERE id_tarea = p_id_tarea AND id_trabajador = p_id_trabajador;
        
    ELSIF usuario_rol = 'trabajador' THEN
        -- Un trabajador solo puede ver sus propios partes
        IF usuario_id != p_id_trabajador THEN
            RAISE EXCEPTION 'Acceso denegado: Solo puedes ver tus propios partes de trabajo.';
        END IF;

        -- Verificar si el trabajador está asignado a esta tarea
        SELECT EXISTS (
            SELECT 1
            FROM public.trabajadores_tareas
            WHERE id_tarea = p_id_tarea AND id_trabajador = usuario_id
        ) INTO es_trabajador_de_tarea;

        IF NOT es_trabajador_de_tarea THEN
            RAISE EXCEPTION 'Acceso denegado: No estás asignado a esta tarea.';
        END IF;

        -- El trabajador puede ver sus propios partes para la tarea
        RETURN QUERY 
        SELECT * 
        FROM public.partes_de_trabajo 
        WHERE id_tarea = p_id_tarea AND id_trabajador = p_id_trabajador;
        
    ELSE
        -- Otros roles no tienen permiso
        RAISE EXCEPTION 'Acceso denegado: Tu rol no tiene permisos para realizar esta acción.';
    END IF;

    RETURN;
END;
$function$;

CREATE OR REPLACE FUNCTION public.obtener_pb_supervisor_con_flags(p_id_supervisor uuid)
 RETURNS TABLE(id integer, code text, id_tarea integer, nota_pb text, materiales integer, mano_obra integer, total integer, aprobado boolean, created_at timestamp without time zone, updated_at timestamp without time zone, titulo_tarea text, code_tarea text, id_estado_tarea integer, estado_tarea character varying, id_edificio integer, nombre_edificio text, direccion_edificio text, esta_liquidado boolean, tiene_pf_pausado boolean, dias_desde_creacion integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    pb.id,
    pb.code,
    pb.id_tarea,
    pb.nota_pb,
    pb.materiales,
    pb.mano_obra,
    pb.total,
    pb.aprobado,
    pb.created_at,
    pb.updated_at,
    t.titulo AS titulo_tarea,
    t.code AS code_tarea,
    t.id_estado_nuevo AS id_estado_tarea,
    et.nombre AS estado_tarea,
    t.id_edificio,
    e.nombre AS nombre_edificio,
    e.direccion AS direccion_edificio,
    
    -- Flag: está liquidado
    (EXISTS (
      SELECT 1
      FROM liquidaciones_nuevas ln
      WHERE ln.id_tarea = pb.id_tarea
    )) AS esta_liquidado,
    
    -- Flag: tiene PF en pausa
    (EXISTS (
      SELECT 1
      FROM presupuestos_finales pf
      JOIN estados_presupuestos ep ON pf.id_estado = ep.id
      WHERE pf.id_tarea = pb.id_tarea
      AND ep.codigo IN ('borrador', 'enviado')
    )) AS tiene_pf_pausado,
    
    EXTRACT(day FROM (NOW() - pb.created_at::timestamptz))::integer AS dias_desde_creacion
    
  FROM presupuestos_base pb
  LEFT JOIN tareas t ON pb.id_tarea = t.id
  LEFT JOIN estados_tareas et ON t.id_estado_nuevo = et.id
  LEFT JOIN edificios e ON t.id_edificio = e.id
  WHERE pb.id_tarea IN (
    SELECT st.id_tarea 
    FROM supervisores_tareas st
    WHERE st.id_supervisor = p_id_supervisor
  )
  ORDER BY pb.created_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.obtener_tareas_supervisor(p_estado text DEFAULT 'todas'::text, p_limit integer DEFAULT 10)
 RETURNS TABLE(id uuid, titulo text, descripcion text, finalizada boolean, fecha_visita timestamp with time zone, edificio_nombre text, edificio_direccion text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Verificar que el usuario esté autenticado
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  -- Retornar solo las tareas del supervisor actual (RLS automático)
  RETURN QUERY
  SELECT 
    t.id,
    t.titulo,
    t.descripcion,
    t.finalizada,
    t.fecha_visita,
    e.nombre as edificio_nombre,
    e.direccion as edificio_direccion
  FROM tareas t
  INNER JOIN supervisores_tareas st ON st.id_tarea = t.id
  LEFT JOIN edificios e ON e.id = t.id_edificio
  WHERE st.id_supervisor = auth.uid()
    AND (
      p_estado = 'todas' 
      OR (p_estado = 'activas' AND t.finalizada = false)
      OR (p_estado = 'finalizadas' AND t.finalizada = true)
    )
  ORDER BY t.fecha_visita DESC
  LIMIT p_limit;
END;
$function$;

CREATE OR REPLACE FUNCTION public.pagar_liquidaciones_supervisores(p_ids uuid[], p_fecha date DEFAULT now())
 RETURNS TABLE(cantidad_actualizadas integer, total_pagado numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total numeric := 0;
  v_count int := 0;
BEGIN
  -- Autorización: solo admin
  IF public.get_my_role() <> 'admin' THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  -- 1. Sumar total de las liquidaciones que se van a pagar
  SELECT COALESCE(SUM(ln.total_supervisor), 0)
    INTO v_total
  FROM public.liquidaciones_nuevas ln
  WHERE ln.id = ANY(p_ids)
    AND COALESCE(ln.pagada, false) = false;

  -- 2. Marcar liquidaciones como pagadas
  UPDATE public.liquidaciones_nuevas ln
     SET pagada = true,
         fecha_pago = COALESCE(p_fecha, now()),
         updated_at = now()
   WHERE ln.id = ANY(p_ids)
     AND COALESCE(ln.pagada, false) = false;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- 3. Vincular y liquidar adelantos relacionados
  -- Un adelanto se liquida si pertenece a un supervisor que está recibiendo un pago hoy.
  -- Usamos la primera liquidación del array como referencia para el liquidacion_id del adelanto (simplificación lógica).
  UPDATE public.adelantos a
     SET estado_liquidado = true,
         liquidacion_id = p_ids[1], -- Vinculamos a la primera del lote
         updated_at = now()
   FROM public.liquidaciones_nuevas ln
   WHERE a.usuario_id = ln.id_usuario_supervisor
     AND ln.id = ANY(p_ids)
     AND a.estado_liquidado = false;

  RETURN QUERY SELECT v_count::int, v_total::numeric;
END;
$function$;

CREATE OR REPLACE FUNCTION public.pagar_liquidaciones_supervisores(p_ids integer[], p_fecha date DEFAULT NULL::date, p_saldar_adelantos boolean DEFAULT false)
 RETURNS TABLE(cantidad_actualizadas integer, total_pagado numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total numeric := 0;
  v_count int := 0;
BEGIN
  -- Autorización: solo admin
  IF public.get_my_role() <> 'admin' THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  -- 1. Sumar total de las liquidaciones que se van a pagar
  SELECT COALESCE(SUM(ln.total_supervisor), 0)
    INTO v_total
  FROM public.liquidaciones_nuevas ln
  WHERE ln.id = ANY(p_ids)
    AND COALESCE(ln.pagada, false) = false;

  -- 2. Marcar liquidaciones como pagadas
  UPDATE public.liquidaciones_nuevas ln
     SET pagada = true,
         fecha_pago = COALESCE(p_fecha, now()::date),
         updated_at = now()
   WHERE ln.id = ANY(p_ids)
     AND COALESCE(ln.pagada, false) = false;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- 3. Vincular y liquidar adelantos SOLO si el flag está activo
  IF p_saldar_adelantos THEN
    UPDATE public.adelantos a
       SET estado_liquidado = true,
           liquidacion_id = (SELECT id FROM public.liquidaciones_nuevas WHERE id = ANY(p_ids) LIMIT 1),
           updated_at = now()
     FROM public.liquidaciones_nuevas ln
     WHERE a.usuario_id = ln.id_usuario_supervisor
       AND ln.id = ANY(p_ids)
       AND a.estado_liquidado = false;
  END IF;

  RETURN QUERY SELECT v_count::int, v_total::numeric;
END;
$function$;

CREATE OR REPLACE FUNCTION public.pagar_liquidaciones_supervisores(p_ids integer[], p_adelantos_ids uuid[] DEFAULT NULL::uuid[], p_fecha date DEFAULT NULL::date)
 RETURNS TABLE(cantidad_actualizadas integer, total_pagado numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total numeric := 0;
  v_count int := 0;
BEGIN
  -- Autorización: solo admin
  IF public.get_my_role() <> 'admin' THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  -- 1. Sumar total de las liquidaciones que se van a pagar
  SELECT COALESCE(SUM(ln.total_supervisor), 0)
    INTO v_total
  FROM public.liquidaciones_nuevas ln
  WHERE ln.id = ANY(p_ids)
    AND COALESCE(ln.pagada, false) = false;

  -- 2. Marcar liquidaciones como pagadas
  UPDATE public.liquidaciones_nuevas ln
     SET pagada = true,
         fecha_pago = COALESCE(p_fecha, now()::date),
         updated_at = now()
   WHERE ln.id = ANY(p_ids)
     AND COALESCE(ln.pagada, false) = false;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- 3. Vincular y liquidar adelantos seleccionados INDIVIDUALMENTE (Phase 2.2)
  -- NOTA: Eliminamos updated_at pues la tabla adelantos no tiene esa columna
  IF p_adelantos_ids IS NOT NULL AND array_length(p_adelantos_ids, 1) > 0 THEN
    UPDATE public.adelantos a
       SET estado_liquidado = true,
           liquidacion_id = (SELECT id FROM public.liquidaciones_nuevas WHERE id = ANY(p_ids) LIMIT 1)
           -- updated_at = now() <-- Columna inexistente
     WHERE a.id = ANY(p_adelantos_ids)
       AND a.estado_liquidado = false;
  END IF;

  RETURN QUERY SELECT v_count::int, v_total::numeric;
END;
$function$;

CREATE OR REPLACE FUNCTION public.pagar_liquidaciones_supervisores(p_ids integer[], p_fecha timestamp with time zone DEFAULT now())
 RETURNS TABLE(cantidad_actualizadas integer, total_pagado numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total numeric := 0;
  v_count int := 0;
BEGIN
  -- Autorización: solo admin
  IF public.get_my_role() <> 'admin' THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  -- Sumar solo impagas a pagar
  SELECT COALESCE(SUM(ln.total_supervisor), 0)
    INTO v_total
  FROM public.liquidaciones_nuevas ln
  WHERE ln.id = ANY(p_ids)
    AND COALESCE(ln.pagada, false) = false;

  -- Marcar como pagadas solo las impagas
  UPDATE public.liquidaciones_nuevas ln
     SET pagada = true,
         fecha_pago = COALESCE(p_fecha, now()),
         updated_at = now()
   WHERE ln.id = ANY(p_ids)
     AND COALESCE(ln.pagada, false) = false;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN QUERY SELECT v_count::int, v_total::numeric;
END;
$function$;

CREATE OR REPLACE FUNCTION public.pb_creado_actualizar_estado_tarea()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Si el estado actual de la tarea es organizar (1) o preguntar (2), actualizar a presupuesto base (12)
  UPDATE public.tareas
     SET id_estado_nuevo = 12,
         updated_at = NOW()
   WHERE id = NEW.id_tarea
     AND id_estado_nuevo IN (1, 2);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.registrar_alerta(p_tipo_alerta text, p_mensaje text, p_id_entidad integer, p_tipo_entidad text, p_id_usuario_destino uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id INTEGER;
BEGIN
  INSERT INTO alertas_sistema (
    tipo_alerta, mensaje, id_entidad, tipo_entidad, id_usuario_destino
  ) VALUES (
    p_tipo_alerta, p_mensaje, p_id_entidad, p_tipo_entidad, p_id_usuario_destino
  ) RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.registrar_parte_de_trabajo(p_id_tarea integer, p_id_trabajador uuid, p_fecha date, p_tipo_jornada text, p_comentarios text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    registrador_id uuid;
    registrador_rol text;
    es_supervisor_de_tarea boolean;
    es_trabajador_de_tarea boolean;
BEGIN
    -- 1. Obtener el ID y rol del usuario que llama a la función
    registrador_id := auth.uid();
    SELECT rol INTO registrador_rol FROM public.usuarios WHERE id = registrador_id;

    -- Si no se encuentra el rol, denegar el acceso
    IF registrador_rol IS NULL THEN
        RAISE EXCEPTION 'No se pudo verificar el rol del usuario.';
    END IF;

    -- 2. Lógica de permisos
    IF registrador_rol = 'admin' THEN
        -- El admin puede hacer todo, no se necesitan más verificaciones.
        NULL;
    ELSIF registrador_rol = 'supervisor' THEN
        -- Verificar si el supervisor está asignado a esta tarea
        SELECT EXISTS (
            SELECT 1
            FROM public.supervisores_tareas
            WHERE id_tarea = p_id_tarea AND id_supervisor = registrador_id
        ) INTO es_supervisor_de_tarea;

        IF NOT es_supervisor_de_tarea THEN
            RAISE EXCEPTION 'Acceso denegado: No eres el supervisor de esta tarea.';
        END IF;
    ELSIF registrador_rol = 'trabajador' THEN
        -- Un trabajador solo puede registrar partes para sí mismo
        IF registrador_id != p_id_trabajador THEN
            RAISE EXCEPTION 'Acceso denegado: Solo puedes registrar tus propios partes de trabajo.';
        END IF;

        -- Verificar si el trabajador está asignado a esta tarea
        SELECT EXISTS (
            SELECT 1
            FROM public.trabajadores_tareas
            WHERE id_tarea = p_id_tarea AND id_trabajador = registrador_id
        ) INTO es_trabajador_de_tarea;

        IF NOT es_trabajador_de_tarea THEN
            RAISE EXCEPTION 'Acceso denegado: No estás asignado a esta tarea.';
        END IF;
    ELSE
        -- Otros roles no tienen permiso
        RAISE EXCEPTION 'Acceso denegado: Tu rol no tiene permisos para realizar esta acción.';
    END IF;

    -- 3. Si todas las verificaciones pasan, insertar el registro
    INSERT INTO public.partes_de_trabajo (
        id_tarea,
        id_trabajador,
        fecha,
        tipo_jornada,
        comentarios,
        id_registrador
    ) VALUES (
        p_id_tarea,
        p_id_trabajador,
        p_fecha,
        p_tipo_jornada,
        p_comentarios,
        registrador_id
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.spc_enforce_capacidad_diaria_v1()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  suma_existente NUMERIC := 0;
  valor_nuevo    NUMERIC := 0;
BEGIN
  -- los registros proyectados no consumen capacidad diaria
  IF NEW.estado = 'proyectado' THEN
    RETURN NEW;
  END IF;

  IF NEW.tipo_jornada = 'dia_completo' THEN
    valor_nuevo := 1;
  ELSIF NEW.tipo_jornada = 'medio_dia' THEN
    valor_nuevo := 0.5;
  ELSE
    valor_nuevo := 0;
  END IF;

  -- lock transaccional por (id_trabajador, fecha)
  PERFORM pg_advisory_xact_lock(
    (('x' || substr(md5(NEW.id_trabajador::text || '|' || NEW.fecha::text), 1, 16))::bit(64))::bigint
  );

  -- solo contar registros CONFIRMADOS
  SELECT COALESCE(SUM(
           CASE
             WHEN tipo_jornada = 'dia_completo' THEN 1::NUMERIC
             WHEN tipo_jornada = 'medio_dia'    THEN 0.5::NUMERIC
             ELSE 0::NUMERIC
           END
         ), 0::NUMERIC)
    INTO suma_existente
  FROM public.partes_de_trabajo
  WHERE id_trabajador = NEW.id_trabajador
    AND fecha = NEW.fecha
    AND estado = 'confirmado'
    AND (TG_OP <> 'UPDATE' OR id <> NEW.id);

  IF (suma_existente + valor_nuevo) > 1 THEN
    RAISE EXCEPTION
      'Capacidad diaria excedida: trabajador=% fecha=% (actual=%, nuevo=%, total=%)',
      NEW.id_trabajador,
      NEW.fecha,
      to_char(suma_existente, 'FM999999990.00'),
      to_char(valor_nuevo, 'FM999999990.00'),
      to_char(suma_existente + valor_nuevo, 'FM999999990.00')
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.spc_sanitize_v18(input_text text)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  result text;
BEGIN
  IF input_text IS NULL THEN RETURN ''; END IF;
  result := input_text;
  -- Map accents (preserving Ñ by NOT mapping it)
  result := translate(result, 'áéíóúÁÉÍÓÚüÜ', 'aeiouAEIOUuU');
  -- Whitelist: Keep Alphanumeric + ñÑ + space + symbols
  result := regexp_replace(result, '[^a-zA-Z0-9ñÑ .,-]', '', 'g');
  RETURN trim(result);
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_afip_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Si cambió datos_afip (numérico), actualizamos el campo de texto
    IF (TG_OP = 'INSERT' OR NEW.datos_afip IS DISTINCT FROM OLD.datos_afip) AND NEW.datos_afip IS NOT NULL THEN
        NEW.afip_numero := NEW.datos_afip::text;
    
    -- Si cambió afip_numero (texto), intentamos extraer dígitos para el numérico
    ELSIF (TG_OP = 'INSERT' OR NEW.afip_numero IS DISTINCT FROM OLD.afip_numero) AND NEW.afip_numero IS NOT NULL AND NEW.afip_numero != '' THEN
        BEGIN
            IF NEW.afip_numero ~ '[0-9]' THEN
               NEW.datos_afip := (regexp_replace(NEW.afip_numero, '[^0-9]', '', 'g'))::numeric;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- Silencio quirúrgico: si falla la conversión, no bloqueamos el guardado
            RAISE WARNING 'No se pudo sincronizar afip_numero (%) a datos_afip numérico', NEW.afip_numero;
        END;
    END IF;

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_factura_creada()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id_tarea INTEGER;
  v_estado_id INTEGER;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT id_tarea INTO v_id_tarea
    FROM public.presupuestos_finales
    WHERE id = NEW.id_presupuesto_final;
    
    IF v_id_tarea IS NOT NULL THEN
      SELECT id INTO v_estado_id
      FROM public.estados_tareas 
      WHERE codigo = 'facturado'
      LIMIT 1;
      
      IF v_estado_id IS NOT NULL THEN
        UPDATE public.tareas
        SET 
          id_estado_nuevo = v_estado_id,
          updated_at = NOW()
        WHERE id = v_id_tarea
          AND id_estado_nuevo NOT IN (7, 9, 11)
          AND COALESCE(finalizada, false) = false;
        
        RAISE NOTICE 'Tarea % actualizada a Facturado (id_estado: %) por creación de Factura %', 
                      v_id_tarea, v_estado_id, NEW.id;
      ELSE
        RAISE WARNING 'Estado "facturado" no encontrado en estados_tareas';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_factura_creada_set_pf_y_tarea_facturado()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_estado_facturado_pf INTEGER;
  v_estado_facturado_tarea INTEGER;
  v_tarea_id INTEGER;
BEGIN
  IF NEW.id_presupuesto_final IS NOT NULL THEN
    SELECT id INTO v_estado_facturado_pf 
    FROM estados_presupuestos 
    WHERE codigo = 'facturado'
    LIMIT 1;
    
    SELECT id INTO v_estado_facturado_tarea 
    FROM estados_tareas 
    WHERE codigo = 'facturado'
    LIMIT 1;
    
    IF v_estado_facturado_pf IS NOT NULL THEN
      UPDATE presupuestos_finales
      SET id_estado = v_estado_facturado_pf,
          updated_at = NOW()
      WHERE id = NEW.id_presupuesto_final
        AND id_estado IS DISTINCT FROM v_estado_facturado_pf;
      
      SELECT id_tarea INTO v_tarea_id
      FROM presupuestos_finales
      WHERE id = NEW.id_presupuesto_final;
      
      IF v_tarea_id IS NOT NULL AND v_estado_facturado_tarea IS NOT NULL THEN
        UPDATE tareas
        SET id_estado_nuevo = v_estado_facturado_tarea,
            updated_at = NOW()
        WHERE id = v_tarea_id
          AND id_estado_nuevo IS DISTINCT FROM v_estado_facturado_tarea
          AND id_estado_nuevo NOT IN (7, 9, 11)
          AND COALESCE(finalizada, false) = false;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_factura_pagada()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id_tarea INTEGER;
  v_id_presupuesto_final INTEGER;
  v_todas_pagadas BOOLEAN;
  v_total_facturas INTEGER;
  v_facturas_pagadas INTEGER;
  v_estado_liquidada_id INTEGER;
  v_tarea_finalizada BOOLEAN;
  v_tarea_se_trabajo BOOLEAN;
  v_base_liquidada BOOLEAN;
BEGIN
  IF NEW.pagada = true AND (OLD.pagada IS NULL OR OLD.pagada = false) THEN
    v_id_presupuesto_final := NEW.id_presupuesto_final;
    
    SELECT id_tarea INTO v_id_tarea
    FROM public.presupuestos_finales
    WHERE id = v_id_presupuesto_final;
    
    IF v_id_tarea IS NOT NULL THEN
      SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE pagada = true)
      INTO 
        v_total_facturas,
        v_facturas_pagadas
      FROM public.facturas 
      WHERE id_presupuesto_final = v_id_presupuesto_final;
      
      v_todas_pagadas := (v_total_facturas = v_facturas_pagadas);
      
      RAISE NOTICE 'Factura % pagada. Presupuesto Final %: % de % facturas pagadas', 
                    NEW.id, v_id_presupuesto_final, v_facturas_pagadas, v_total_facturas;
      
      -- REGLA OPERATIVA Y FINANCIERA (Plan 1):
      -- El cobro de facturas NUNCA debe alterar el estado operativo de la obra a 'terminado' (7).
      -- La finalizacion fisica solo la declara el supervisor/admin con 'finalizar tarea' (se_trabajo = true).
      -- Solo si la tarea YA FUE finalizada operativamente (finalizada = true Y se_trabajo = true)
      -- Y ADEMAS el presupuesto base ya fue liquidado (base_liquidada = true),
      -- entonces y solo entonces el ciclo se cierra por completo pasando la tarea a 'liquidada' (9).
      IF v_todas_pagadas THEN
        SELECT 
          COALESCE(finalizada, false),
          COALESCE(se_trabajo, false)
        INTO 
          v_tarea_finalizada,
          v_tarea_se_trabajo
        FROM public.tareas
        WHERE id = v_id_tarea;

        SELECT 
          COALESCE(base_liquidada, false)
        INTO 
          v_base_liquidada
        FROM public.presupuestos_base
        WHERE id_tarea = v_id_tarea;

        IF v_tarea_finalizada AND v_tarea_se_trabajo AND v_base_liquidada THEN
          SELECT id INTO v_estado_liquidada_id
          FROM public.estados_tareas 
          WHERE codigo = 'liquidada'
          LIMIT 1;

          IF v_estado_liquidada_id IS NOT NULL THEN
            UPDATE public.tareas
            SET 
              id_estado_nuevo = v_estado_liquidada_id,
              updated_at = NOW()
            WHERE id = v_id_tarea;
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_liquidacion_creada()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.tareas
    SET 
      id_estado_nuevo = (
        SELECT id 
        FROM public.estados_tareas 
        WHERE codigo = 'liquidada'
        LIMIT 1
      ),
      updated_at = NOW()
    WHERE id = NEW.id_tarea;
    
    RAISE NOTICE 'Tarea % actualizada a Liquidada por creación de Liquidación %', 
                  NEW.id_tarea, NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_presupuesto_final_aprobado()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.aprobado = true AND (OLD.aprobado IS NULL OR OLD.aprobado = false) THEN
    UPDATE public.tareas
    SET 
      id_estado_nuevo = (
        SELECT id 
        FROM public.estados_tareas 
        WHERE codigo = 'aprobado'
        LIMIT 1
      ),
      updated_at = NOW()
    WHERE id = NEW.id_tarea
      AND id_estado_nuevo NOT IN (7, 9, 11)
      AND COALESCE(finalizada, false) = false;
    
    RAISE NOTICE 'Tarea % actualizada a Aprobado por aprobación de Presupuesto Final %', 
                  NEW.id_tarea, NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_presupuesto_final_creado()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.tareas
    SET 
      id_estado_nuevo = (
        SELECT id 
        FROM public.estados_tareas 
        WHERE codigo = 'presupuestado'
        LIMIT 1
      ),
      updated_at = NOW()
    WHERE id = NEW.id_tarea
      AND id_estado_nuevo NOT IN (7, 9, 11)
      AND COALESCE(finalizada, false) = false;
    
    RAISE NOTICE 'Tarea % actualizada a Presupuestado por creación de Presupuesto Final %', 
                  NEW.id_tarea, NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_presupuesto_final_enviado()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_estado_id INTEGER;
BEGIN
  IF NEW.enviado = true AND (OLD.enviado IS NULL OR OLD.enviado = false) THEN
    
    SELECT id INTO v_estado_id
    FROM public.estados_tareas 
    WHERE codigo = 'enviado'
    LIMIT 1;
    
    IF v_estado_id IS NOT NULL THEN
      UPDATE public.tareas
      SET 
        id_estado_nuevo = v_estado_id,
        updated_at = NOW()
      WHERE id = NEW.id_tarea
        AND id_estado_nuevo NOT IN (7, 9, 11)
        AND COALESCE(finalizada, false) = false;
      
      RAISE NOTICE 'Tarea % actualizada a Enviado (id_estado: %) por envío de Presupuesto Final %', 
                    NEW.id_tarea, v_estado_id, NEW.id;
    ELSE
      RAISE WARNING 'Estado "enviado" no encontrado en estados_tareas';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_presupuesto_final_facturado_set_tarea_facturado()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_estado_facturado_pf integer;
  v_estado_facturado_tarea integer;
  v_tarea_id integer;
BEGIN
  IF (OLD.id_estado IS DISTINCT FROM NEW.id_estado) THEN
    SELECT id INTO v_estado_facturado_pf FROM estados_presupuestos WHERE codigo = 'facturado' LIMIT 1;
    SELECT id INTO v_estado_facturado_tarea FROM estados_tareas WHERE codigo = 'facturado' LIMIT 1;

    IF v_estado_facturado_pf IS NOT NULL AND v_estado_facturado_tarea IS NOT NULL AND NEW.id_estado = v_estado_facturado_pf THEN
      v_tarea_id := NEW.id_tarea;
      IF v_tarea_id IS NOT NULL THEN
        UPDATE tareas
        SET id_estado_nuevo = v_estado_facturado_tarea
        WHERE id = v_tarea_id
          AND COALESCE(id_estado_nuevo, 0) <> v_estado_facturado_tarea
          AND id_estado_nuevo NOT IN (7, 9, 11)
          AND COALESCE(finalizada, false) = false;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_rol_to_auth()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Solo actuar si el rol realmente cambió
  IF NEW.rol IS DISTINCT FROM OLD.rol THEN
    -- Sincronizar el rol en auth.users (raw_app_meta_data)
    UPDATE auth.users 
    SET raw_app_meta_data = raw_app_meta_data || jsonb_build_object('rol', NEW.rol)
    WHERE id = NEW.id;

    -- Invalidar sesiones para forzar nuevo JWT con rol actualizado
    PERFORM public.force_jwt_refresh(NEW.id);
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_telefono_to_contacto()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Ya no insertamos en contactos, simplemente devolvemos NEW
  -- para mantener el funcionamiento del trigger sin errores
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_ultimo_acceso()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
    UPDATE public.usuarios SET ultimo_acceso = NEW.last_sign_in_at WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_user_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.usuarios
     SET email = NEW.email
   WHERE id = NEW.id;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_bu_lock_pagada_for_non_admin()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public.get_my_role() <> 'admin' THEN
    IF (NEW.pagada     IS DISTINCT FROM OLD.pagada)
       OR (NEW.fecha_pago IS DISTINCT FROM OLD.fecha_pago) THEN
      RAISE EXCEPTION 'No autorizado a modificar campos de pago';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_factura_pagada_aprueba_ajustes()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Solo actuar cuando la factura pasa a pagada=true
  IF NEW.pagada = true AND (OLD.pagada IS DISTINCT FROM NEW.pagada) THEN
    -- Aprobar todos los ajustes no aprobados de esta factura
    UPDATE public.ajustes_facturas
    SET aprobado = true,
        fecha_aprobacion = COALESCE(fecha_aprobacion, NOW())
    WHERE id_factura = NEW.id
      AND (aprobado IS DISTINCT FROM true);

    -- Marcar bandera en factura (en el mismo UPDATE con BEFORE)
    NEW.ajustes_aprobados := true;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_preferencias_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.upsert_usuario_rol(p_id uuid, p_email text, p_rol text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  INSERT INTO public.usuarios (id, email, rol)
  VALUES (p_id, p_email, p_rol)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        rol   = EXCLUDED.rol;
$function$;

CREATE OR REPLACE FUNCTION public.verificar_liquidacion_existente(p_trabajador_id uuid, p_fecha_inicio date, p_fecha_fin date)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  contador INTEGER;
BEGIN
  SELECT COUNT(*) INTO contador
  FROM liquidaciones_trabajadores
  WHERE 
    id_trabajador = p_trabajador_id AND
    semana_inicio = p_fecha_inicio AND
    semana_fin = p_fecha_fin;
    
  RETURN contador > 0;
END;
$function$;

CREATE OR REPLACE FUNCTION public.verificar_tarea_liquidada()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  estado_tarea TEXT;
BEGIN
  -- Solo verificar si hay id_tarea (no aplica para "otros trabajos")
  IF NEW.id_tarea IS NOT NULL THEN
    -- Obtener el estado actual de la tarea
    SELECT et.codigo INTO estado_tarea
    FROM tareas t
    JOIN estados_tareas et ON t.id_estado_nuevo = et.id
    WHERE t.id = NEW.id_tarea;
    
    -- Si la tarea está liquidada, no permitir nuevos registros
    IF estado_tarea = 'liquidada' THEN
      RAISE EXCEPTION 'No se pueden registrar gastos o días trabajados en una tarea liquidada';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 6. TRIGGERS (44 TRIGGERS)
CREATE TRIGGER trg_auditoria_ajustes_facturas AFTER DELETE OR UPDATE ON ajustes_facturas FOR EACH ROW EXECUTE FUNCTION fn_auditoria_forense_captura();
CREATE TRIGGER trigger_auto_aprobar_ajustes BEFORE INSERT ON ajustes_facturas FOR EACH ROW EXECUTE FUNCTION auto_aprobar_ajustes_factura_pagada();
CREATE TRIGGER trg_auditoria_facturas AFTER DELETE OR UPDATE ON facturas FOR EACH ROW EXECUTE FUNCTION fn_auditoria_forense_captura();
CREATE TRIGGER trg_factura_creada_set_pf_y_tarea_facturado AFTER INSERT ON facturas FOR EACH ROW EXECUTE FUNCTION sync_factura_creada_set_pf_y_tarea_facturado();
CREATE TRIGGER trg_factura_pagada_aprueba_ajustes BEFORE UPDATE OF pagada ON facturas FOR EACH ROW WHEN (new.pagada = true) EXECUTE FUNCTION trg_factura_pagada_aprueba_ajustes();
CREATE TRIGGER trg_facturas_sincronizar_pagada BEFORE INSERT OR UPDATE ON facturas FOR EACH ROW EXECUTE FUNCTION fn_facturas_sincronizar_pagada();
CREATE TRIGGER trg_facturas_sync_afip_fields BEFORE INSERT OR UPDATE ON facturas FOR EACH ROW EXECUTE FUNCTION sync_afip_fields();
CREATE TRIGGER trg_sync_factura_a_pf AFTER DELETE OR UPDATE OF total, id_presupuesto_final ON facturas FOR EACH ROW EXECUTE FUNCTION fn_sincronizar_factura_a_presupuesto_final();
CREATE TRIGGER trg_sync_nombre_factura_a_tarea_y_facturas AFTER UPDATE OF nombre ON facturas FOR EACH ROW EXECUTE FUNCTION fn_sync_nombre_factura_a_tarea_y_facturas();
CREATE TRIGGER trig_aprobar_ajustes_al_pagar AFTER UPDATE OF saldo_pendiente ON facturas FOR EACH ROW EXECUTE FUNCTION aprobar_ajustes_al_pagar();
CREATE TRIGGER trig_facturas_ajustes AFTER UPDATE OF total, saldo_pendiente, total_pagado ON facturas FOR EACH ROW EXECUTE FUNCTION calcular_ajustes_factura();
CREATE TRIGGER trigger_actualizar_saldo_al_cambiar_total BEFORE UPDATE ON facturas FOR EACH ROW WHEN (old.total IS DISTINCT FROM new.total) EXECUTE FUNCTION actualizar_saldo_pendiente_factura();
CREATE TRIGGER trigger_factura_creada AFTER INSERT ON facturas FOR EACH ROW EXECUTE FUNCTION sync_factura_creada();
CREATE TRIGGER trigger_factura_pagada AFTER UPDATE ON facturas FOR EACH ROW WHEN (new.pagada IS DISTINCT FROM old.pagada) EXECUTE FUNCTION sync_factura_pagada();
CREATE TRIGGER trg_recalcular_totales_pf AFTER INSERT OR DELETE OR UPDATE ON items FOR EACH ROW EXECUTE FUNCTION fn_recalcular_totales_pf();
CREATE TRIGGER on_items_factura_update BEFORE UPDATE ON items_factura FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER trg_sync_items_factura_a_pf AFTER INSERT OR DELETE OR UPDATE ON items_factura FOR EACH ROW EXECUTE FUNCTION fn_sincronizar_factura_a_presupuesto_final();
CREATE TRIGGER trig_items_factura_ajustes AFTER INSERT OR DELETE OR UPDATE ON items_factura FOR EACH ROW EXECUTE FUNCTION calcular_ajustes_factura();
CREATE TRIGGER bu_lock_pagada_for_non_admin BEFORE UPDATE ON liquidaciones_nuevas FOR EACH ROW EXECUTE FUNCTION trg_bu_lock_pagada_for_non_admin();
CREATE TRIGGER trg_auditoria_liquidaciones_nuevas AFTER DELETE OR UPDATE ON liquidaciones_nuevas FOR EACH ROW EXECUTE FUNCTION fn_auditoria_forense_captura();
CREATE TRIGGER trg_liquidacion_pagada_actualiza_pb_y_tarea AFTER INSERT OR UPDATE ON liquidaciones_nuevas FOR EACH ROW EXECUTE FUNCTION fn_liquidacion_pagada_actualiza_pb_y_tarea();
CREATE TRIGGER trg_marcar_tarea_liquidada AFTER INSERT ON liquidaciones_nuevas FOR EACH ROW EXECUTE FUNCTION fn_marcar_tarea_liquidada();
CREATE TRIGGER trigger_alerta_sobrecosto AFTER INSERT ON liquidaciones_nuevas FOR EACH ROW WHEN (new.sobrecosto = true) EXECUTE FUNCTION alerta_sobrecosto();
CREATE TRIGGER trigger_liquidacion_creada AFTER INSERT ON liquidaciones_nuevas FOR EACH ROW EXECUTE FUNCTION sync_liquidacion_creada();
CREATE TRIGGER trigger_actualizar_partes_trabajo AFTER INSERT ON liquidaciones_trabajadores FOR EACH ROW EXECUTE FUNCTION actualizar_partes_trabajo_por_liquidacion();
CREATE TRIGGER trg_auditoria_pagos_facturas AFTER DELETE OR UPDATE ON pagos_facturas FOR EACH ROW EXECUTE FUNCTION fn_auditoria_forense_captura();
CREATE TRIGGER trg_sync_pago_a_factura AFTER INSERT OR DELETE OR UPDATE ON pagos_facturas FOR EACH ROW EXECUTE FUNCTION fn_sync_pago_a_factura();
CREATE TRIGGER trg_enforce_capacidad_diaria_v1 BEFORE INSERT OR UPDATE OF tipo_jornada, id_trabajador, fecha ON partes_de_trabajo FOR EACH ROW EXECUTE FUNCTION spc_enforce_capacidad_diaria_v1();
CREATE TRIGGER trigger_preferencias_updated_at BEFORE UPDATE ON preferencias_usuarios FOR EACH ROW EXECUTE FUNCTION update_preferencias_updated_at();
CREATE TRIGGER trg_pb_auto_code BEFORE INSERT ON presupuestos_base FOR EACH ROW EXECUTE FUNCTION generate_pb_code();
CREATE TRIGGER trg_pb_creado_actualizar_estado_tarea AFTER INSERT ON presupuestos_base FOR EACH ROW EXECUTE FUNCTION pb_creado_actualizar_estado_tarea();
CREATE TRIGGER trg_generate_pf_code BEFORE INSERT ON presupuestos_finales FOR EACH ROW EXECUTE FUNCTION generate_pf_code();
CREATE TRIGGER trg_pf_facturado_set_tarea_facturado AFTER UPDATE OF id_estado ON presupuestos_finales FOR EACH ROW EXECUTE FUNCTION sync_presupuesto_final_facturado_set_tarea_facturado();
CREATE TRIGGER trigger_presupuesto_final_aprobado AFTER UPDATE ON presupuestos_finales FOR EACH ROW EXECUTE FUNCTION sync_presupuesto_final_aprobado();
CREATE TRIGGER trigger_presupuesto_final_creado AFTER INSERT ON presupuestos_finales FOR EACH ROW EXECUTE FUNCTION sync_presupuesto_final_creado();
CREATE TRIGGER trigger_presupuesto_final_enviado AFTER UPDATE ON presupuestos_finales FOR EACH ROW WHEN (new.enviado IS DISTINCT FROM old.enviado) EXECUTE FUNCTION sync_presupuesto_final_enviado();
CREATE TRIGGER trg_auto_rechazar_pf_al_finalizar AFTER UPDATE ON tareas FOR EACH ROW EXECUTE FUNCTION auto_rechazar_pf_al_finalizar_tarea();
CREATE TRIGGER trg_check_state_update_role BEFORE UPDATE ON tareas FOR EACH ROW EXECUTE FUNCTION check_state_update_role();
CREATE TRIGGER trg_sync_titulo_tarea_a_facturas AFTER UPDATE OF titulo ON tareas FOR EACH ROW EXECUTE FUNCTION fn_sync_titulo_tarea_a_facturas();
CREATE TRIGGER trg_tareas_sincronizar_finalizada BEFORE INSERT OR UPDATE ON tareas FOR EACH ROW EXECUTE FUNCTION fn_tareas_sincronizar_finalizada();
CREATE TRIGGER trigger_set_fecha_visita_on_tareas_change BEFORE INSERT OR UPDATE ON tareas FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_visita_trigger_function();
CREATE TRIGGER update_tareas_updated_at BEFORE UPDATE ON tareas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_create_default_preferencias AFTER INSERT ON usuarios FOR EACH ROW EXECUTE FUNCTION create_default_preferencias();
CREATE TRIGGER trigger_sync_rol_to_auth AFTER UPDATE OF rol ON usuarios FOR EACH ROW EXECUTE FUNCTION sync_rol_to_auth();


-- 7. VISTAS SQL (31 VISTAS EN ORDEN TOPOLOGICO)
CREATE OR REPLACE VIEW public.vista_actividad_maestra_god_mode AS
WITH actividad_unificada AS (
         SELECT 'J-'::text || partes_de_trabajo.id::text AS event_id,
            partes_de_trabajo.fecha,
            partes_de_trabajo.id_trabajador AS id_usuario,
            partes_de_trabajo.id_tarea,
            'JORNAL'::text AS tipo_evento,
            partes_de_trabajo.tipo_jornada AS detalle_tipo,
            fn_calcular_costo_jornal(partes_de_trabajo.id_trabajador, partes_de_trabajo.tipo_jornada) AS monto,
            partes_de_trabajo.liquidado,
            partes_de_trabajo.id_liquidacion,
            partes_de_trabajo.comentarios AS descripcion,
            partes_de_trabajo.created_at,
            partes_de_trabajo.estado,
            NULL::text AS comprobante_url,
            NULL::text AS imagen_procesada_url
           FROM partes_de_trabajo
        UNION ALL
         SELECT 'G-'::text || gastos_tarea.id::text AS event_id,
            gastos_tarea.fecha_gasto AS fecha,
            gastos_tarea.id_usuario,
            gastos_tarea.id_tarea,
            'GASTO'::text AS tipo_evento,
            gastos_tarea.tipo_gasto AS detalle_tipo,
            gastos_tarea.monto::numeric AS monto,
            gastos_tarea.liquidado,
            gastos_tarea.id_liquidacion,
            gastos_tarea.descripcion,
            gastos_tarea.created_at,
            'confirmado'::text AS estado,
            gastos_tarea.comprobante_url,
            gastos_tarea.imagen_procesada_url
           FROM gastos_tarea
        )
 SELECT a.event_id,
    a.fecha,
    a.id_usuario,
    a.id_tarea,
    a.tipo_evento,
    a.detalle_tipo,
    a.monto,
    a.liquidado,
    a.id_liquidacion,
    a.descripcion,
    a.created_at,
    a.estado,
    a.comprobante_url,
    a.imagen_procesada_url,
    u.email AS email_usuario,
    u.nombre AS nombre_usuario,
    u.rol AS rol_usuario,
    t.titulo AS titulo_tarea,
    t.code AS codigo_tarea,
    e.nombre AS nombre_edificio,
    e.direccion AS direccion_edificio,
    ( SELECT st.id_supervisor
           FROM supervisores_tareas st
          WHERE st.id_tarea = t.id
         LIMIT 1) AS id_supervisor,
    jsonb_build_object('color_perfil', u.color_perfil, 'icon',
        CASE
            WHEN a.tipo_evento = 'JORNAL'::text THEN 'calendar'::text
            ELSE 'receipt'::text
        END, 'status_color',
        CASE
            WHEN a.liquidado THEN '#10b981'::text
            ELSE '#f59e0b'::text
        END) AS ui_metadata
   FROM actividad_unificada a
     JOIN usuarios u ON a.id_usuario = u.id
     JOIN tareas t ON a.id_tarea = t.id
     JOIN edificios e ON t.id_edificio = e.id;;

CREATE OR REPLACE VIEW public.vista_admin_liquidaciones_sin_pf AS
SELECT ln.id AS id_liquidacion,
    ln.id_tarea,
    t.code AS code_tarea,
    t.titulo AS titulo_tarea,
    ln.created_at
   FROM liquidaciones_nuevas ln
     JOIN tareas t ON t.id = ln.id_tarea
  WHERE COALESCE(t.es_particular, false) = false AND NOT (EXISTS ( SELECT 1
           FROM presupuestos_finales pf
          WHERE pf.id_tarea = ln.id_tarea)) AND jwt_rol() = 'admin'::text;;

CREATE OR REPLACE VIEW public.vista_admin_pb_finalizada_sin_pf AS
SELECT DISTINCT ON (t.id) pb.id AS id_presupuesto_base,
    pb.code AS code_pb,
    t.id AS id_tarea,
    t.code AS code_tarea,
    t.titulo AS titulo_tarea,
    pb.total AS total_pb,
    COALESCE(u.nombre, u.email, u.code) AS supervisor_label,
    t.created_at
   FROM tareas t
     LEFT JOIN presupuestos_base pb ON pb.id_tarea = t.id
     LEFT JOIN supervisores_tareas st ON st.id_tarea = t.id
     LEFT JOIN usuarios u ON u.id = st.id_supervisor
  WHERE (t.finalizada = true OR t.id_estado_nuevo = 7) AND t.se_trabajo = true AND COALESCE(t.es_particular, false) = false AND NOT (EXISTS ( SELECT 1
           FROM presupuestos_finales pf
          WHERE pf.id_tarea = t.id))
  ORDER BY t.id, t.created_at DESC;;

CREATE OR REPLACE VIEW public.vista_admin_pb_sin_aprobar AS
SELECT pb.id AS id_presupuesto_base,
    pb.code AS code_pb,
    t.id AS id_tarea,
    t.code AS code_tarea,
    t.titulo AS titulo_tarea,
    pb.total AS total_pb,
    COALESCE(u.nombre, u.email, u.code) AS supervisor_label,
    pb.created_at
   FROM presupuestos_base pb
     JOIN tareas t ON t.id = pb.id_tarea
     LEFT JOIN supervisores_tareas st ON st.id_tarea = t.id
     LEFT JOIN usuarios u ON u.id = st.id_supervisor
  WHERE COALESCE(pb.aprobado, false) = false AND COALESCE(t.es_particular, false) = false AND NOT (EXISTS ( SELECT 1
           FROM presupuestos_finales pf
          WHERE pf.id_tarea = t.id)) AND jwt_rol() = 'admin'::text;;

CREATE OR REPLACE VIEW public.vista_admin_pf_aprobado_sin_factura AS
SELECT pf.id AS id_presupuesto_final,
    pf.code AS code_pf,
    pf.id_tarea,
    t.code AS code_tarea,
    t.titulo AS titulo_tarea,
    pf.total AS monto_pf,
    pf.created_at
   FROM presupuestos_finales pf
     JOIN tareas t ON t.id = pf.id_tarea
     JOIN estados_presupuestos ep ON pf.id_estado = ep.id
  WHERE t.finalizada = true AND t.se_trabajo = true AND (ep.codigo::text = 'aprobado'::text OR pf.aprobado = true) AND COALESCE(t.es_particular, false) = false AND NOT (EXISTS ( SELECT 1
           FROM facturas f
          WHERE f.id_presupuesto_final = pf.id));;

CREATE OR REPLACE VIEW public.vista_admin_pf_enviado_sin_actividad AS
WITH pf_base AS (
         SELECT pf.id AS id_presupuesto_final,
            pf.code AS code_pf,
            pf.id_tarea,
            t_1.code AS code_tarea,
            t_1.titulo AS titulo_tarea,
            t_1.fecha_visita,
            pf.total AS monto_pf,
            pf.created_at AS fecha_creacion
           FROM presupuestos_finales pf
             JOIN tareas t_1 ON t_1.id = pf.id_tarea
        ), pf_validos AS (
         SELECT pfb.id_presupuesto_final,
            pfb.code_pf,
            pfb.id_tarea,
            pfb.code_tarea,
            pfb.titulo_tarea,
            pfb.fecha_visita,
            pfb.monto_pf,
            pfb.fecha_creacion,
            GREATEST(date_trunc('day'::text, now())::date - date_trunc('day'::text, pfb.fecha_creacion)::date, 0) AS dias_desde_creacion
           FROM pf_base pfb
          WHERE pfb.fecha_creacion IS NOT NULL AND (pfb.fecha_visita IS NULL OR pfb.fecha_visita::date <= CURRENT_DATE)
        ), pf_sin_factura AS (
         SELECT pfv.id_presupuesto_final,
            pfv.code_pf,
            pfv.id_tarea,
            pfv.code_tarea,
            pfv.titulo_tarea,
            pfv.fecha_visita,
            pfv.monto_pf,
            pfv.fecha_creacion,
            pfv.dias_desde_creacion
           FROM pf_validos pfv
          WHERE NOT (EXISTS ( SELECT 1
                   FROM facturas f
                  WHERE f.id_presupuesto_final = pfv.id_presupuesto_final))
        ), pf_sin_actividad AS (
         SELECT p_1.id_presupuesto_final,
            p_1.code_pf,
            p_1.id_tarea,
            p_1.code_tarea,
            p_1.titulo_tarea,
            p_1.fecha_visita,
            p_1.monto_pf,
            p_1.fecha_creacion,
            p_1.dias_desde_creacion
           FROM pf_sin_factura p_1
          WHERE NOT (EXISTS ( SELECT 1
                   FROM partes_de_trabajo pdt
                  WHERE pdt.id_tarea = p_1.id_tarea AND (pdt.fecha IS NOT NULL AND pdt.fecha >= date_trunc('day'::text, p_1.fecha_creacion)::date OR pdt.created_at IS NOT NULL AND pdt.created_at >= p_1.fecha_creacion))) AND NOT (EXISTS ( SELECT 1
                   FROM gastos_tarea gt
                  WHERE gt.id_tarea = p_1.id_tarea AND gt.created_at >= p_1.fecha_creacion))
        )
 SELECT p.id_presupuesto_final,
    p.code_pf,
    p.id_tarea,
    p.code_tarea,
    p.titulo_tarea,
    p.monto_pf,
    p.fecha_creacion AS fecha_envio,
    p.dias_desde_creacion AS dias_desde_envio,
        CASE
            WHEN p.dias_desde_creacion >= 30 THEN 'auto_cierre_30d'::text
            WHEN p.dias_desde_creacion >= 20 THEN 'alerta_20d'::text
            ELSE 'ninguno'::text
        END AS umbral
   FROM pf_sin_actividad p
     JOIN tareas t ON t.id = p.id_tarea
  WHERE COALESCE(t.finalizada, false) = false AND p.dias_desde_creacion >= 20 AND (jwt_rol() = 'admin'::text OR CURRENT_USER = 'postgres'::name);;

CREATE OR REPLACE VIEW public.vista_admin_pf_enviado_sin_aprobar AS
SELECT pf.id AS id_presupuesto_final,
    pf.code AS code_pf,
    pf.created_at,
    pf.updated_at,
    EXTRACT(day FROM now() - pf.updated_at::timestamp with time zone)::integer AS dias_sin_respuesta,
        CASE
            WHEN EXTRACT(day FROM now() - pf.updated_at::timestamp with time zone) > 20::numeric THEN 'critico'::text
            WHEN EXTRACT(day FROM now() - pf.updated_at::timestamp with time zone) > 10::numeric THEN 'urgente'::text
            ELSE 'normal'::text
        END AS prioridad,
    t.id AS id_tarea,
    t.code AS code_tarea,
    t.titulo AS titulo_tarea,
    e.id AS id_edificio,
    e.nombre AS nombre_edificio,
    e.id_administrador,
    pf.total AS total_pf
   FROM presupuestos_finales pf
     JOIN estados_presupuestos ep ON pf.id_estado = ep.id
     LEFT JOIN tareas t ON pf.id_tarea = t.id
     LEFT JOIN edificios e ON t.id_edificio = e.id
  WHERE ep.codigo::text = 'enviado'::text AND EXTRACT(day FROM now() - pf.updated_at::timestamp with time zone) > 7::numeric AND COALESCE(t.es_particular, false) = false
  ORDER BY pf.updated_at;;

CREATE OR REPLACE VIEW public.vista_administradores AS
SELECT id,
    code,
    nombre,
    telefono,
    email1,
    email2,
    estado,
    created_at,
    aplica_ajustes,
    porcentaje_default,
    requiere_dos_facturas
   FROM administradores a
  ORDER BY nombre;;

CREATE OR REPLACE VIEW public.vista_asignaciones_tareas_trabajadores AS
SELECT tt.id_tarea,
    t.titulo AS titulo_tarea,
    tt.id_trabajador,
    u.email AS email_trabajador,
    tt.created_at
   FROM trabajadores_tareas tt
     LEFT JOIN tareas t ON tt.id_tarea = t.id
     LEFT JOIN usuarios u ON tt.id_trabajador = u.id;;

CREATE OR REPLACE VIEW public.vista_auditoria_admin_balances AS
WITH f_agg AS (
         SELECT pf_sub.id_tarea,
            count(DISTINCT f_sub.id) AS cant_facturas,
            COALESCE(sum(f_sub.total), 0::bigint) AS total_factura_base,
            COALESCE(sum(( SELECT COALESCE(sum(aj.monto_ajuste), 0::numeric) AS "coalesce"
                   FROM ajustes_facturas aj
                  WHERE aj.id_factura = f_sub.id)), 0::numeric) AS total_ajustes_aprobados,
            COALESCE(sum(f_sub.total_pagado), 0::numeric) AS total_cobrado_real,
            COALESCE(sum(f_sub.saldo_pendiente), 0::numeric) AS saldo_pendiente_factura,
            ( SELECT max(pfac2.fecha_pago) AS max
                   FROM pagos_facturas pfac2
                  WHERE pfac2.id_factura = ANY (array_agg(DISTINCT f_sub.id))) AS fecha_ultimo_cobro
           FROM facturas f_sub
             JOIN presupuestos_finales pf_sub ON f_sub.id_presupuesto_final = pf_sub.id
          GROUP BY pf_sub.id_tarea
        ), ln_last AS (
         SELECT DISTINCT ON (liquidaciones_nuevas.id_tarea) liquidaciones_nuevas.id,
            liquidaciones_nuevas.id_tarea,
            liquidaciones_nuevas.code,
            liquidaciones_nuevas.created_at,
            liquidaciones_nuevas.gastos_reales,
            liquidaciones_nuevas.ganancia_neta,
            liquidaciones_nuevas.ganancia_supervisor,
            liquidaciones_nuevas.ganancia_admin,
            liquidaciones_nuevas.total_supervisor,
            liquidaciones_nuevas.sobrecosto,
            liquidaciones_nuevas.monto_sobrecosto,
            liquidaciones_nuevas.total_base
           FROM liquidaciones_nuevas
          ORDER BY liquidaciones_nuevas.id_tarea, liquidaciones_nuevas.id DESC
        )
 SELECT t.id AS id_tarea,
    t.code AS codigo_tarea,
    t.titulo AS titulo_tarea,
    t.created_at AS fecha_tarea,
    t.finalizada AS tarea_finalizada,
    e.id AS id_edificio,
    e.nombre AS nombre_edificio,
    adm.id AS id_administrador,
    adm.nombre AS nombre_administrador,
    st.id_supervisor,
    u_sup.email AS email_supervisor,
    u_sup.nombre AS nombre_supervisor,
    COALESCE(u_sup.es_propietario, false) AS supervisor_es_propietario,
    pb.id AS id_presupuesto_base,
    pb.code AS codigo_presupuesto_base,
    COALESCE(ln.total_base, pb.total, 0)::numeric AS total_pb,
    pf.id AS id_presupuesto_final,
    pf.code AS codigo_presupuesto_final,
    COALESCE(pf.total, 0)::numeric AS total_pf,
    pf.aprobado AS pf_aprobado,
    ln.id AS id_liquidacion,
    ln.code AS codigo_liquidacion,
    ln.created_at AS fecha_liquidacion,
    COALESCE(ln.gastos_reales, 0)::numeric AS gastos_reales_liquidacion,
    COALESCE(ln.ganancia_neta, 0)::numeric AS ganancia_neta_liquidacion,
    COALESCE(ln.ganancia_supervisor, 0)::numeric AS ganancia_supervisor,
    COALESCE(ln.ganancia_admin, 0)::numeric AS ganancia_admin,
    COALESCE(ln.total_supervisor, 0)::numeric AS total_transferido_supervisor,
    COALESCE(ln.sobrecosto, false) AS hay_sobrecosto,
    COALESCE(ln.monto_sobrecosto, 0)::numeric AS monto_sobrecosto,
    COALESCE(fa.total_factura_base, 0::bigint)::numeric AS total_factura_base,
    COALESCE(fa.total_ajustes_aprobados, 0::numeric) AS total_ajustes_aprobados,
    COALESCE(fa.total_factura_base, 0::bigint)::numeric + COALESCE(fa.total_ajustes_aprobados, 0::numeric) AS total_facturado_neto,
    COALESCE(fa.total_cobrado_real, 0::numeric) AS total_cobrado_real,
    COALESCE(fa.saldo_pendiente_factura, 0::numeric) AS saldo_pendiente_factura,
    (COALESCE(pf.total, 0) - COALESCE(pb.total, 0))::numeric AS margen_comercial_pf_pb,
    COALESCE(fa.total_cobrado_real, 0::numeric) - COALESCE(ln.gastos_reales, 0)::numeric AS ganancia_liquida_obra,
    fa.fecha_ultimo_cobro,
    COALESCE(fa.total_factura_base, 0::bigint)::numeric - COALESCE(fa.total_ajustes_aprobados, 0::numeric) - COALESCE(ln.gastos_reales, 0)::numeric - COALESCE(ln.ganancia_supervisor, 0)::numeric AS ganancia_neta_total_spc
   FROM tareas t
     LEFT JOIN edificios e ON t.id_edificio = e.id
     LEFT JOIN administradores adm ON e.id_administrador = adm.id
     LEFT JOIN supervisores_tareas st ON st.id_tarea = t.id
     LEFT JOIN usuarios u_sup ON st.id_supervisor = u_sup.id
     LEFT JOIN presupuestos_base pb ON pb.id_tarea = t.id
     LEFT JOIN presupuestos_finales pf ON pf.id_tarea = t.id
     LEFT JOIN ln_last ln ON ln.id_tarea = t.id
     LEFT JOIN f_agg fa ON fa.id_tarea = t.id;;

CREATE OR REPLACE VIEW public.vista_comentarios_detallada AS
SELECT c.id,
    c.code,
    c.contenido,
    c.id_tarea,
    c.id_usuario,
    c.created_at,
    c.foto_url,
    u.nombre AS nombre_autor,
    u.color_perfil AS color_autor,
    u.code AS codigo_autor,
    u.email AS email_autor
   FROM comentarios c
     LEFT JOIN usuarios u ON c.id_usuario = u.id;;

CREATE OR REPLACE VIEW public.vista_comprobantes_admin_v4 AS
SELECT gt.id,
    gt.id_tarea,
    gt.id_usuario,
    p.rol AS rol_usuario,
    gt.tipo_gasto,
    gt.monto,
    gt.descripcion,
    gt.comprobante_url,
    gt.fecha_gasto,
    gt.estado,
    gt.created_at,
    gt.updated_at,
    gt.metodo_registro,
    gt.imagen_procesada_url,
    gt.liquidado,
    gt.id_liquidacion,
    t.titulo AS titulo_tarea,
    t.code AS code_tarea,
    p.email::character varying(255) AS email_usuario,
    e.nombre AS nombre_edificio,
    e.id AS id_edificio,
    gt.comprobante_url IS NOT NULL OR gt.imagen_procesada_url IS NOT NULL AS tiene_foto
   FROM gastos_tarea gt
     LEFT JOIN tareas t ON gt.id_tarea = t.id
     LEFT JOIN usuarios p ON gt.id_usuario = p.id
     LEFT JOIN edificios e ON t.id_edificio = e.id;;

CREATE OR REPLACE VIEW public.vista_cuenta_corriente_supervisores AS
SELECT u.id AS usuario_id,
    u.email AS email_supervisor,
    COALESCE(sum(a.monto), 0::numeric) AS total_adelantos_pendientes,
    COALESCE(jsonb_agg(jsonb_build_object('id', a.id, 'fecha', a.fecha, 'monto', a.monto, 'descripcion', a.descripcion)) FILTER (WHERE a.id IS NOT NULL), '[]'::jsonb) AS detalle_adelantos_json
   FROM usuarios u
     LEFT JOIN adelantos a ON u.id = a.usuario_id AND a.estado_liquidado = false
  WHERE u.rol = ANY (ARRAY['supervisor'::text, 'admin'::text])
  GROUP BY u.id, u.email;;

CREATE OR REPLACE VIEW public.vista_edificios_completa AS
SELECT e.id,
    e.code,
    e.nombre,
    e.direccion,
    e.mapa_url,
    e.id_administrador,
    e.estado,
    e.latitud,
    e.longitud,
    e.created_at,
    e.cuit,
    e.notas,
    adm.nombre AS nombre_administrador,
    adm.email1 AS email_administrador,
    ( SELECT jsonb_agg(jsonb_build_object('id', d.id, 'codigo', d.codigo, 'propietario', COALESCE(c."nombreReal", d.propietario), 'telefono', c.telefono)) AS jsonb_agg
           FROM departamentos d
             LEFT JOIN contactos c ON c.departamento_id = d.id AND c.es_principal = true
          WHERE d.edificio_id = e.id) AS mapa_departamentos_json
   FROM edificios e
     LEFT JOIN administradores adm ON e.id_administrador = adm.id;;

CREATE OR REPLACE VIEW public.vista_facturas_completa AS
WITH stats_gastos AS (
         SELECT f_sub.id AS id_factura,
            COALESCE(( SELECT bool_and(it.es_material) AS bool_and
                   FROM items_factura it
                  WHERE it.id_factura = f_sub.id), ( SELECT bool_and(it_pres.es_material) AS bool_and
                   FROM items it_pres
                  WHERE it_pres.id_presupuesto = f_sub.id_presupuesto), false) AS es_factura_materiales,
            COALESCE(( SELECT sum(ge.monto) AS sum
                   FROM gastos_extra_pdf_factura ge
                  WHERE ge.id_factura = f_sub.id), 0::numeric) AS gastos_extra_total,
            COALESCE(( SELECT sum(gt.monto) AS sum
                   FROM gastos_tarea gt
                     JOIN presupuestos_finales pf_sub ON f_sub.id_presupuesto_final = pf_sub.id
                  WHERE gt.id_tarea = pf_sub.id_tarea AND (gt.comprobante_url IS NOT NULL OR gt.imagen_procesada_url IS NOT NULL) AND (COALESCE(( SELECT bool_and(it.es_material) AS bool_and
                           FROM items_factura it
                          WHERE it.id_factura = f_sub.id), false) AND gt.tipo_gasto = 'material'::text OR NOT COALESCE(( SELECT bool_and(it.es_material) AS bool_and
                           FROM items_factura it
                          WHERE it.id_factura = f_sub.id), false) AND (gt.tipo_gasto = ANY (ARRAY['mano_de_obra'::text, 'manual'::text])))), 0::bigint) AS gastos_tarea_total
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
    sg.gastos_extra_total + sg.gastos_tarea_total::numeric AS gastos_sum_incl_extras,
    (sg.gastos_extra_total + sg.gastos_tarea_total::numeric) > 0::numeric AS tiene_extras,
    f.total,
    f.total AS total_base_factura,
    f.saldo_pendiente,
    f.total_pagado,
    COALESCE(( SELECT sum(aj.monto_ajuste) AS sum
           FROM ajustes_facturas aj
          WHERE aj.id_factura = f.id), 0::numeric) AS total_ajustes,
    f.total::numeric + (sg.gastos_extra_total + sg.gastos_tarea_total::numeric) - COALESCE(( SELECT sum(aj.monto_ajuste) AS sum
           FROM ajustes_facturas aj
          WHERE aj.id_factura = f.id AND aj.aprobado = true), 0::numeric) AS total_bruto_factura,
    ef.nombre AS estado_nombre,
    ef.codigo AS estado_codigo,
    ef.color AS estado_color,
    f.datos_afip,
    f.pdf_url,
    f.enviada,
    f.pagada,
    COALESCE(( SELECT sum(aj.monto_ajuste) AS sum
           FROM ajustes_facturas aj
          WHERE aj.id_factura = f.id AND aj.aprobado = true AND aj.pagado = false), 0::numeric) AS total_ajustes_pendientes,
    COALESCE(( SELECT sum(aj.monto_ajuste) AS sum
           FROM ajustes_facturas aj
          WHERE aj.id_factura = f.id AND aj.pagado = true), 0::numeric) AS total_ajustes_liquidados,
    COALESCE(( SELECT sum(aj.monto_ajuste) AS sum
           FROM ajustes_facturas aj
          WHERE aj.id_factura = f.id AND aj.aprobado = false AND aj.pagado = false), 0::numeric) AS total_ajustes_calculados,
    COALESCE(( SELECT sum(aj.monto_ajuste) AS sum
           FROM ajustes_facturas aj
          WHERE aj.id_factura = f.id), 0::numeric) AS total_ajustes_todos,
    pf.descuento_monto AS presupuesto_descuento,
    a.requiere_dos_facturas AS admin_requiere_dos_facturas
   FROM facturas f
     LEFT JOIN stats_gastos sg ON f.id = sg.id_factura
     LEFT JOIN estados_facturas ef ON f.id_estado_nuevo = ef.id
     LEFT JOIN presupuestos_finales pf ON f.id_presupuesto_final = pf.id
     LEFT JOIN tareas t ON pf.id_tarea = t.id
     LEFT JOIN edificios e ON pf.id_edificio = e.id
     LEFT JOIN administradores a ON f.id_administrador = a.id
  WHERE a.estado = 'activo'::text;;

CREATE OR REPLACE VIEW public.vista_finanzas_supervisor AS
SELECT id_supervisor,
    ( SELECT count(DISTINCT t2.id) AS count
           FROM supervisores_tareas st2
             JOIN tareas t2 ON t2.id = st2.id_tarea
          WHERE st2.id_supervisor = st.id_supervisor) AS tareas_supervisadas_total,
    ( SELECT count(*) AS count
           FROM tareas t2
             JOIN supervisores_tareas st2 ON st2.id_tarea = t2.id
          WHERE st2.id_supervisor = st.id_supervisor AND t2.fecha_visita::date = CURRENT_DATE) AS visitas_hoy_total,
    ( SELECT count(*) AS count
           FROM tareas t2
             JOIN supervisores_tareas st2 ON st2.id_tarea = t2.id
          WHERE st2.id_supervisor = st.id_supervisor AND ((EXISTS ( SELECT 1
                   FROM gastos_tarea gt
                  WHERE gt.id_tarea = t2.id)) OR (EXISTS ( SELECT 1
                   FROM partes_de_trabajo pdt
                  WHERE pdt.id_tarea = t2.id))) AND NOT (EXISTS ( SELECT 1
                   FROM liquidaciones_nuevas ln
                  WHERE ln.id_tarea = t2.id))) AS liquidaciones_pendientes,
    ( SELECT count(*) AS count
           FROM liquidaciones_nuevas ln
          WHERE ln.id_usuario_supervisor = st.id_supervisor AND ln.created_at >= date_trunc('month'::text, now())) AS liquidaciones_mes,
    ( SELECT COALESCE(sum(ln.ganancia_supervisor), 0::bigint) AS "coalesce"
           FROM liquidaciones_nuevas ln
          WHERE ln.id_usuario_supervisor = st.id_supervisor AND ln.created_at >= date_trunc('month'::text, now())) AS ganancia_supervisor_mes,
    ( SELECT count(*) AS count
           FROM gastos_tarea gt
             JOIN supervisores_tareas st2 ON st2.id_tarea = gt.id_tarea
          WHERE st2.id_supervisor = st.id_supervisor AND gt.comprobante_url IS NULL) AS gastos_sin_comprobante_total,
    ( SELECT COALESCE(sum(gt.monto), 0::bigint) AS "coalesce"
           FROM gastos_tarea gt
             JOIN supervisores_tareas st2 ON st2.id_tarea = gt.id_tarea
          WHERE st2.id_supervisor = st.id_supervisor AND gt.liquidado IS DISTINCT FROM true) AS gastos_no_liquidados,
    ( SELECT COALESCE(sum(
                CASE pdt.tipo_jornada
                    WHEN 'dia_completo'::text THEN ct.salario_diario::numeric
                    WHEN 'medio_dia'::text THEN ct.salario_diario::numeric * 0.5
                    ELSE 0::numeric
                END), 0::numeric) AS "coalesce"
           FROM partes_de_trabajo pdt
             JOIN configuracion_trabajadores ct ON ct.id_trabajador = pdt.id_trabajador
             JOIN supervisores_tareas st2 ON st2.id_tarea = pdt.id_tarea
          WHERE st2.id_supervisor = st.id_supervisor AND pdt.liquidado IS DISTINCT FROM true) AS jornales_no_liquidados,
    ( SELECT COALESCE(sum(gt.monto), 0::bigint) AS "coalesce"
           FROM gastos_tarea gt
             JOIN supervisores_tareas st2 ON st2.id_tarea = gt.id_tarea
          WHERE st2.id_supervisor = st.id_supervisor AND gt.liquidado IS DISTINCT FROM true AND gt.created_at >= date_trunc('week'::text, now())) AS gastos_no_liquidados_semana,
    ( SELECT count(*) AS count
           FROM partes_de_trabajo pdt
             JOIN supervisores_tareas st2 ON st2.id_tarea = pdt.id_tarea
          WHERE st2.id_supervisor = st.id_supervisor AND pdt.liquidado IS DISTINCT FROM true AND pdt.fecha >= date_trunc('week'::text, now())) AS jornales_pendientes_semana,
    ( SELECT COALESCE(sum(
                CASE pdt.tipo_jornada
                    WHEN 'dia_completo'::text THEN ct.salario_diario::numeric
                    WHEN 'medio_dia'::text THEN ct.salario_diario::numeric * 0.5
                    ELSE 0::numeric
                END), 0::numeric) AS "coalesce"
           FROM partes_de_trabajo pdt
             JOIN configuracion_trabajadores ct ON ct.id_trabajador = pdt.id_trabajador
             JOIN supervisores_tareas st2 ON st2.id_tarea = pdt.id_tarea
          WHERE st2.id_supervisor = st.id_supervisor AND pdt.liquidado IS DISTINCT FROM true AND pdt.fecha >= date_trunc('week'::text, now())) AS monto_jornales_pendientes_semana,
    ( SELECT count(*) AS count
           FROM partes_de_trabajo pdt
             JOIN supervisores_tareas st2 ON st2.id_tarea = pdt.id_tarea
          WHERE st2.id_supervisor = st.id_supervisor AND pdt.liquidado IS DISTINCT FROM true AND pdt.fecha < (CURRENT_DATE - '7 days'::interval)) AS jornales_pendientes_mayor_7d,
    ( SELECT COALESCE(sum(
                CASE pdt.tipo_jornada
                    WHEN 'dia_completo'::text THEN ct.salario_diario::numeric
                    WHEN 'medio_dia'::text THEN ct.salario_diario::numeric * 0.5
                    ELSE 0::numeric
                END), 0::numeric) AS "coalesce"
           FROM partes_de_trabajo pdt
             JOIN supervisores_tareas st2 ON st2.id_tarea = pdt.id_tarea
             JOIN configuracion_trabajadores ct ON ct.id_trabajador = pdt.id_trabajador
          WHERE st2.id_supervisor = st.id_supervisor AND pdt.liquidado IS DISTINCT FROM true AND pdt.fecha < (CURRENT_DATE - '7 days'::interval)) AS monto_jornales_pendientes_mayor_7d,
    ( SELECT count(*) AS count
           FROM presupuestos_base pb
             JOIN tareas t2 ON t2.id = pb.id_tarea
             JOIN supervisores_tareas st2 ON st2.id_tarea = t2.id
          WHERE st2.id_supervisor = st.id_supervisor) AS presupuestos_base_total,
    ( SELECT COALESCE(sum(pb.total), 0::bigint) AS "coalesce"
           FROM presupuestos_base pb
             JOIN tareas t2 ON t2.id = pb.id_tarea
             JOIN supervisores_tareas st2 ON st2.id_tarea = t2.id
          WHERE st2.id_supervisor = st.id_supervisor) AS presupuestos_base_monto_total
   FROM ( SELECT DISTINCT supervisores_tareas.id_supervisor
           FROM supervisores_tareas) st
  WHERE id_supervisor = auth.uid();;

CREATE OR REPLACE VIEW public.vista_finanzas_trabajador AS
SELECT tt.id_trabajador,
    count(DISTINCT t.id) AS tareas_asignadas_total,
    count(*) FILTER (WHERE pdt.fecha >= date_trunc('month'::text, now()) AND pdt.fecha < (date_trunc('month'::text, now()) + '1 mon'::interval)) AS dias_registrados_mes,
    COALESCE(sum(
        CASE pdt.tipo_jornada
            WHEN 'dia_completo'::text THEN ct.salario_diario::numeric
            WHEN 'medio_dia'::text THEN ct.salario_diario::numeric * 0.5
            ELSE 0::numeric
        END) FILTER (WHERE pdt.liquidado IS DISTINCT FROM true), 0::numeric) AS monto_jornales_pendientes,
    count(DISTINCT gt.id) FILTER (WHERE gt.id_usuario = tt.id_trabajador AND gt.liquidado IS DISTINCT FROM true) AS cantidad_gastos_pendientes,
    COALESCE(sum(gt.monto) FILTER (WHERE gt.id_usuario = tt.id_trabajador AND gt.liquidado IS DISTINCT FROM true), 0::bigint) AS monto_gastos_pendientes,
    COALESCE(sum(
        CASE pdt.tipo_jornada
            WHEN 'dia_completo'::text THEN ct.salario_diario::numeric
            WHEN 'medio_dia'::text THEN ct.salario_diario::numeric * 0.5
            ELSE 0::numeric
        END) FILTER (WHERE pdt.liquidado IS DISTINCT FROM true AND pdt.fecha >= date_trunc('week'::text, now())), 0::numeric) + COALESCE(sum(gt.monto) FILTER (WHERE gt.id_usuario = tt.id_trabajador AND gt.liquidado IS DISTINCT FROM true), 0::bigint)::numeric AS proximo_pago_estimado,
    count(*) FILTER (WHERE pdt.liquidado IS DISTINCT FROM true AND pdt.fecha >= date_trunc('week'::text, now())) AS dias_registrados_semana,
    COALESCE(sum(
        CASE pdt.tipo_jornada
            WHEN 'dia_completo'::text THEN ct.salario_diario::numeric
            WHEN 'medio_dia'::text THEN ct.salario_diario::numeric * 0.5
            ELSE 0::numeric
        END) FILTER (WHERE pdt.liquidado IS DISTINCT FROM true AND pdt.fecha >= date_trunc('week'::text, now())), 0::numeric) AS monto_jornales_pendientes_semana,
    COALESCE(sum(gt.monto) FILTER (WHERE gt.id_usuario = tt.id_trabajador AND gt.liquidado IS DISTINCT FROM true AND gt.created_at >= date_trunc('week'::text, now())), 0::bigint) AS monto_gastos_pendientes_semana
   FROM trabajadores_tareas tt
     JOIN tareas t ON t.id = tt.id_tarea
     LEFT JOIN partes_de_trabajo pdt ON pdt.id_tarea = t.id AND pdt.id_trabajador = tt.id_trabajador
     LEFT JOIN configuracion_trabajadores ct ON ct.id_trabajador = tt.id_trabajador
     LEFT JOIN gastos_tarea gt ON gt.id_tarea = t.id AND gt.id_usuario = tt.id_trabajador
  WHERE tt.id_trabajador = auth.uid()
  GROUP BY tt.id_trabajador;;

CREATE OR REPLACE VIEW public.vista_gastos_tarea_completa AS
SELECT gt.id,
    gt.id_tarea,
    gt.id_usuario,
    gt.tipo_gasto,
    gt.monto,
    gt.descripcion,
    gt.comprobante_url,
    gt.fecha_gasto,
    gt.estado,
    gt.created_at,
    gt.updated_at,
    gt.metodo_registro,
    gt.datos_ocr,
    gt.confianza_ocr,
    gt.imagen_procesada_url,
    gt.liquidado,
    gt.id_liquidacion,
    t.titulo AS titulo_tarea,
    t.code AS code_tarea,
    u.email AS email_usuario,
    e.nombre AS nombre_edificio
   FROM gastos_tarea gt
     LEFT JOIN tareas t ON gt.id_tarea = t.id
     LEFT JOIN usuarios u ON gt.id_usuario = u.id
     LEFT JOIN edificios e ON t.id_edificio = e.id;;

CREATE OR REPLACE VIEW public.vista_liquidaciones_completa AS
SELECT l.id,
    l.code,
    l.id_tarea,
    t.titulo AS titulo_tarea,
    l.id_presupuesto_base,
    pb.code AS code_presupuesto_base,
    l.id_presupuesto_final,
    pf.code AS code_presupuesto_final,
    l.id_factura,
    f.code AS code_factura,
    l.gastos_reales,
    l.total_base,
    l.ganancia_neta,
    l.porcentaje_distribucion,
    l.ganancia_supervisor,
    l.ajuste_admin,
    l.ganancia_admin,
    l.total_supervisor,
    l.observaciones,
    l.created_at,
    l.updated_at,
    l.sobrecosto,
    l.monto_sobrecosto,
    l.sobrecosto_supervisor,
    l.sobrecosto_admin,
    l.id_usuario_admin,
    ua.email AS email_admin,
    l.id_usuario_supervisor,
    us.email AS email_supervisor,
    COALESCE(l.detalle_gastos_json, ( SELECT jsonb_agg(sub.item) AS jsonb_agg
           FROM ( SELECT jsonb_build_object('tipo', 'material', 'fecha', g.fecha_gasto, 'descripcion', g.descripcion, 'monto', g.monto) AS item,
                    g.fecha_gasto AS order_date
                   FROM gastos_tarea g
                  WHERE g.id_liquidacion = l.id
                UNION ALL
                 SELECT jsonb_build_object('tipo', 'jornal', 'fecha', pt.fecha, 'descripcion', (u_t.nombre || ' - '::text) || pt.tipo_jornada, 'monto', (ct.salario_diario::numeric *
                        CASE
                            WHEN pt.tipo_jornada = 'dia_completo'::text THEN 1.0
                            WHEN pt.tipo_jornada = 'medio_dia'::text THEN 0.5
                            ELSE 0::numeric
                        END)::integer) AS item,
                    pt.fecha AS order_date
                   FROM partes_de_trabajo pt
                     JOIN usuarios u_t ON pt.id_trabajador = u_t.id
                     JOIN configuracion_trabajadores ct ON pt.id_trabajador = ct.id_trabajador
                  WHERE pt.id_liquidacion = l.id
          ORDER BY 2) sub)) AS detalle_gastos_json,
    l.pagada,
    l.fecha_pago,
    t.se_trabajo,
    t.descripcion_trabajo_realizado,
    t.fecha_finalizacion
   FROM liquidaciones_nuevas l
     LEFT JOIN tareas t ON l.id_tarea = t.id
     LEFT JOIN presupuestos_base pb ON l.id_presupuesto_base = pb.id
     LEFT JOIN presupuestos_finales pf ON l.id_presupuesto_final = pf.id
     LEFT JOIN facturas f ON l.id_factura = f.id
     LEFT JOIN usuarios ua ON l.id_usuario_admin = ua.id
     LEFT JOIN usuarios us ON l.id_usuario_supervisor = us.id;;

CREATE OR REPLACE VIEW public.vista_liquidaciones_supervisores_listado AS
SELECT ln.id,
    ln.created_at,
    ln.updated_at,
    ln.code,
    ln.id_tarea,
    ln.id_usuario_supervisor,
    ln.id_usuario_admin,
    ln.pagada,
    ln.fecha_pago,
    ln.total_base,
    ln.gastos_reales,
    ln.ganancia_neta,
    ln.ganancia_supervisor,
    ln.ganancia_admin,
    ln.total_supervisor,
    ln.sobrecosto,
    ln.monto_sobrecosto,
    ln.sobrecosto_supervisor,
    ln.sobrecosto_admin,
    ln.porcentaje_distribucion,
    ln.observaciones,
    t.titulo AS titulo_tarea,
    us.email AS email_supervisor,
    ua.email AS email_admin,
    t.se_trabajo
   FROM liquidaciones_nuevas ln
     LEFT JOIN tareas t ON t.id = ln.id_tarea
     LEFT JOIN usuarios us ON us.id = ln.id_usuario_supervisor
     LEFT JOIN usuarios ua ON ua.id = ln.id_usuario_admin;;

CREATE OR REPLACE VIEW public.vista_pagos_completa AS
SELECT pf.id AS id_pago,
    pf.id_factura,
    prf.id_tarea,
    pf.fecha_pago,
    pf.monto_pagado AS monto_pago,
    pf.modalidad_pago AS modalidad,
    a.id AS administrador_id,
    a.nombre AS administrador_nombre,
    e.id AS edificio_id,
    e.nombre AS edificio_nombre,
    e.cuit AS edificio_cuit,
    t.titulo AS tarea_titulo,
    t.code AS tarea_codigo,
    prf.total AS presupuesto_total_aprobado,
    f.code AS factura_interno,
    COALESCE(NULLIF(f.afip_numero, ''::text), f.datos_afip::text, ''::text) AS factura_numero_afip,
    pf.created_at
   FROM pagos_facturas pf
     JOIN facturas f ON pf.id_factura = f.id
     JOIN presupuestos_finales prf ON f.id_presupuesto_final = prf.id
     JOIN tareas t ON prf.id_tarea = t.id
     LEFT JOIN edificios e ON prf.id_edificio = e.id
     LEFT JOIN administradores a ON e.id_administrador = a.id;;

CREATE OR REPLACE VIEW public.vista_partes_trabajo_completa AS
SELECT pdt.id,
    pdt.created_at,
    pdt.id_trabajador,
    pdt.id_tarea,
    pdt.fecha,
    pdt.tipo_jornada,
    pdt.id_registrador,
    pdt.comentarios,
    pdt.liquidado,
    pdt.id_liquidacion,
    t.titulo AS titulo_tarea,
    t.code AS code_tarea,
    u.email AS email_trabajador,
    e.nombre AS nombre_edificio
   FROM partes_de_trabajo pdt
     LEFT JOIN tareas t ON pdt.id_tarea = t.id
     LEFT JOIN usuarios u ON pdt.id_trabajador = u.id
     LEFT JOIN edificios e ON t.id_edificio = e.id;;

CREATE OR REPLACE VIEW public.vista_pb_supervisor AS
WITH pf_info AS (
         SELECT pf.id_tarea,
            ep.codigo AS estado_pf,
            pf.aprobado AS pf_aprobado,
            pf.rechazado AS pf_rechazado
           FROM presupuestos_finales pf
             JOIN estados_presupuestos ep ON pf.id_estado = ep.id
        )
 SELECT pb.id,
    pb.code,
    pb.id_tarea,
    pb.nota_pb,
    pb.materiales,
    pb.mano_obra,
    pb.total,
    pb.aprobado AS pb_aprobado,
    pb.created_at,
    pb.updated_at,
    pb.base_liquidada,
    COALESCE(st.id_supervisor, pb.id_supervisor) AS id_supervisor,
    t.titulo AS titulo_tarea,
    t.code AS code_tarea,
    t.id_estado_nuevo AS id_estado_tarea,
    et.nombre AS estado_tarea,
    pb.id_edificio,
    e.nombre AS nombre_edificio,
    e.direccion AS direccion_edificio,
    adm.nombre AS nombre_administrador,
    pfi.estado_pf AS codigo_estado_pf,
    COALESCE(pfi.pf_aprobado, false) AS pf_aprobado,
    COALESCE(pfi.pf_rechazado, false) AS pf_rechazado,
    pb.base_liquidada AS esta_liquidado,
    EXTRACT(day FROM now() - pb.created_at::timestamp with time zone)::integer AS dias_desde_creacion,
        CASE
            WHEN pb.base_liquidada THEN 'pagada'::text
            WHEN pfi.estado_pf::text = ANY (ARRAY['aprobado'::character varying::text, 'facturado'::character varying::text]) THEN 'activa'::text
            WHEN pfi.estado_pf::text = 'rechazado'::text THEN 'rechazada'::text
            ELSE 'pendiente'::text
        END AS estado_operativo,
    t.se_trabajo
   FROM presupuestos_base pb
     LEFT JOIN tareas t ON pb.id_tarea = t.id
     LEFT JOIN estados_tareas et ON t.id_estado_nuevo = et.id
     LEFT JOIN edificios e ON pb.id_edificio = e.id
     LEFT JOIN administradores adm ON e.id_administrador = adm.id
     LEFT JOIN supervisores_tareas st ON pb.id_tarea = st.id_tarea
     LEFT JOIN pf_info pfi ON pb.id_tarea = pfi.id_tarea;;

CREATE OR REPLACE VIEW public.vista_presupuestos_base_completa AS
SELECT pb.id,
    pb.code,
    pb.id_tarea,
    t.titulo AS titulo_tarea,
    pb.materiales,
    pb.mano_obra,
    pb.total,
    pb.aprobado,
    pb.fecha_aprobacion,
    pb.id_supervisor,
    u.email AS email_supervisor,
    pb.id_edificio,
    e.nombre AS nombre_edificio,
    pb.id_administrador,
    a.nombre AS nombre_administrador,
    pb.created_at,
    pb.updated_at,
    pb.nota_pb,
    pb.base_liquidada,
    (EXISTS ( SELECT 1
           FROM liquidaciones_nuevas ln
          WHERE ln.id_presupuesto_base = pb.id)) AS tiene_liquidacion,
    pb.base_liquidada AS esta_liquidado,
    t.se_trabajo
   FROM presupuestos_base pb
     LEFT JOIN tareas t ON pb.id_tarea = t.id
     LEFT JOIN usuarios u ON pb.id_supervisor = u.id
     LEFT JOIN edificios e ON pb.id_edificio = e.id
     LEFT JOIN administradores a ON pb.id_administrador = a.id;;

CREATE OR REPLACE VIEW public.vista_presupuestos_finales_completa AS
SELECT pf.id,
    pf.code,
    pf.id_presupuesto_base,
    pb.code AS code_presupuesto_base,
    pf.materiales,
    pf.mano_obra,
    pf.total,
    pf.total_base,
    pf.ajuste_admin,
    pf.observaciones_admin,
    pf.created_at,
    pf.updated_at,
    pf.id_estado,
    ep.descripcion AS estado_presupuesto,
    pf.id_edificio,
    e.nombre AS nombre_edificio,
    pf.id_tarea,
    t.titulo AS titulo_tarea,
    pf.id_administrador,
    a.nombre AS nombre_administrador,
    pf.aprobado,
    pf.rechazado,
    t.se_trabajo,
    pf.descuento_monto
   FROM presupuestos_finales pf
     LEFT JOIN presupuestos_base pb ON pf.id_presupuesto_base = pb.id
     LEFT JOIN estados_presupuestos ep ON pf.id_estado = ep.id
     LEFT JOIN edificios e ON pf.id_edificio = e.id
     LEFT JOIN tareas t ON pf.id_tarea = t.id
     LEFT JOIN administradores a ON pf.id_administrador = a.id
  WHERE a.estado = 'activo'::text;;

CREATE OR REPLACE VIEW public.vista_tareas_completa AS
SELECT t.id,
    t.code,
    t.titulo,
    t.descripcion,
    t.id_edificio,
    t.fecha_visita,
    t.prioridad,
    t.created_at,
    t.id_estado_nuevo,
    t.gastos_tarea_pdf,
    t.id_administrador,
    t.finalizada,
    t.updated_at,
    e.nombre AS nombre_edificio,
    e.direccion AS direccion_edificio,
    e.notas AS notas_edificio,
    adm.nombre AS nombre_administrador,
    et.nombre AS estado_nombre,
    et.nombre AS estado_tarea,
    et.color AS estado_color,
    t.prioridad AS prioridad_nombre,
        CASE
            WHEN t.prioridad = 'baja'::text THEN '#4CAF50'::text
            WHEN t.prioridad = 'media'::text THEN '#2196F3'::text
            WHEN t.prioridad = 'alta'::text THEN '#FF9800'::text
            WHEN t.prioridad = 'urgente'::text THEN '#F44336'::text
            ELSE '#9E9E9E'::text
        END AS prioridad_color,
    ( SELECT string_agg(u.email, ', '::text) AS string_agg
           FROM supervisores_tareas st
             JOIN usuarios u ON st.id_supervisor = u.id
          WHERE st.id_tarea = t.id) AS supervisores_emails,
    ( SELECT string_agg(u.nombre, ', '::text) AS string_agg
           FROM supervisores_tareas st
             JOIN usuarios u ON st.id_supervisor = u.id
          WHERE st.id_tarea = t.id) AS supervisores,
    ( SELECT string_agg(u.email, ', '::text) AS string_agg
           FROM trabajadores_tareas tt
             JOIN usuarios u ON tt.id_trabajador = u.id
          WHERE tt.id_tarea = t.id) AS trabajadores_emails,
    ( SELECT jsonb_agg(jsonb_build_object('id', u.id, 'nombre', u.nombre, 'rol', u.rol, 'color_perfil', u.color_perfil)) AS jsonb_agg
           FROM trabajadores_tareas tt
             JOIN usuarios u ON tt.id_trabajador = u.id
          WHERE tt.id_tarea = t.id) AS trabajadores_json,
    ( SELECT jsonb_agg(jsonb_build_object('id', u.id, 'nombre', u.nombre, 'email', u.email, 'color_perfil', u.color_perfil)) AS jsonb_agg
           FROM supervisores_tareas st
             JOIN usuarios u ON st.id_supervisor = u.id
          WHERE st.id_tarea = t.id) AS supervisores_json,
    ( SELECT jsonb_agg(jsonb_build_object('id', d.id, 'codigo', d.codigo, 'propietario', COALESCE(c."nombreReal", d.propietario), 'telefono', c.telefono)) AS jsonb_agg
           FROM departamentos_tareas dt
             JOIN departamentos d ON dt.id_departamento = d.id
             LEFT JOIN contactos c ON c.departamento_id = d.id AND c.es_principal = true
          WHERE dt.id_tarea = t.id) AS departamentos_json,
    t.se_trabajo,
    t.descripcion_trabajo_realizado,
    t.fecha_finalizacion,
    t.es_particular
   FROM tareas t
     LEFT JOIN edificios e ON t.id_edificio = e.id
     LEFT JOIN administradores adm ON t.id_administrador = adm.id
     LEFT JOIN estados_tareas et ON t.id_estado_nuevo = et.id;;

CREATE OR REPLACE VIEW public.vista_agenda_operativa_unificada AS
SELECT t.id::text || '-task'::text AS global_id,
    t.id,
    t.code,
    t.titulo,
    t.id_edificio,
    t.nombre_edificio AS edificio_nombre,
    ( SELECT dt.id_departamento
           FROM departamentos_tareas dt
          WHERE dt.id_tarea = t.id
         LIMIT 1) AS id_departamento,
    ( SELECT dep.codigo
           FROM departamentos dep
             JOIN departamentos_tareas dt ON dep.id = dt.id_departamento
          WHERE dt.id_tarea = t.id
         LIMIT 1) AS departamento_nombre,
    ( SELECT tt.id_trabajador
           FROM trabajadores_tareas tt
          WHERE tt.id_tarea = t.id
         LIMIT 1) AS id_asignado,
    ( SELECT u.nombre
           FROM usuarios u
             JOIN trabajadores_tareas tt ON u.id = tt.id_trabajador
          WHERE tt.id_tarea = t.id
         LIMIT 1) AS asignado_nombre,
    t.descripcion AS comentario,
    'tarea'::text AS tipo_registro,
    t.id_estado_nuevo::text AS estado_visual,
    t.prioridad,
    t.created_at
   FROM vista_tareas_completa t
  WHERE t.finalizada = false
UNION ALL
 SELECT m.id::text || '-mt'::text AS global_id,
    m.id,
    'mt-'::text || m.id AS code,
    m.titulo,
    m.id_edificio,
    e.nombre AS edificio_nombre,
    m.id_departamento,
    d.codigo AS departamento_nombre,
    m.id_asignado,
    u.nombre AS asignado_nombre,
    m.comentario,
    'micro_tarea'::text AS tipo_registro,
    'operativa'::text AS estado_visual,
    m.prioridad,
    m.created_at
   FROM micro_tareas_operativas m
     JOIN edificios e ON m.id_edificio = e.id
     LEFT JOIN departamentos d ON m.id_departamento = d.id
     LEFT JOIN usuarios u ON m.id_asignado = u.id
  WHERE m.promocionada = false;;

CREATE OR REPLACE VIEW public.vista_finanzas_admin AS
SELECT ( SELECT count(DISTINCT pf.id) AS count
           FROM presupuestos_finales pf) AS presupuestos_finales_total,
    ( SELECT COALESCE(sum(pf.total), 0::bigint) AS "coalesce"
           FROM presupuestos_finales pf) AS presupuestos_monto_total,
    ( SELECT count(*) AS count
           FROM facturas f
          WHERE f.pagada = false) AS facturas_pendientes,
    ( SELECT count(*) AS count
           FROM facturas f
          WHERE f.pagada = true AND f.fecha_pago >= date_trunc('month'::text, now())) AS facturas_pagadas_mes,
    ( SELECT COALESCE(sum(f.total), 0::bigint) AS "coalesce"
           FROM facturas f
          WHERE f.pagada = true AND f.fecha_pago >= date_trunc('month'::text, now())) AS monto_cobrado_mes,
    ( SELECT COALESCE(sum(aj.monto_ajuste), 0::numeric) AS "coalesce"
           FROM ajustes_facturas aj
          WHERE aj.aprobado = true AND aj.pagado = false) AS ajustes_pendientes_total,
    ( SELECT count(DISTINCT aj.id_factura) AS count
           FROM ajustes_facturas aj
          WHERE aj.aprobado = true AND aj.pagado = false) AS facturas_con_ajustes_pendientes,
    ( SELECT count(*) AS count
           FROM vista_liquidaciones_completa vl
          WHERE vl.created_at >= date_trunc('month'::text, now())) AS liquidaciones_mes,
    ( SELECT COALESCE(sum(vl.ganancia_neta), 0::bigint) AS "coalesce"
           FROM vista_liquidaciones_completa vl
          WHERE vl.created_at >= date_trunc('month'::text, now())) AS ganancia_neta_mes,
    ( SELECT COALESCE(sum(vl.ganancia_admin), 0::bigint) AS "coalesce"
           FROM vista_liquidaciones_completa vl
          WHERE vl.created_at >= date_trunc('month'::text, now())) AS ganancia_admin_mes,
    ( SELECT COALESCE(sum(gt.monto), 0::bigint) AS "coalesce"
           FROM gastos_tarea gt
          WHERE gt.liquidado IS DISTINCT FROM true) AS gastos_no_liquidados,
    ( SELECT count(*) AS count
           FROM partes_de_trabajo pdt
          WHERE pdt.liquidado IS DISTINCT FROM true) AS jornales_pendientes,
    ( SELECT COALESCE(sum(
                CASE pdt.tipo_jornada
                    WHEN 'dia_completo'::text THEN ct.salario_diario::numeric
                    WHEN 'medio_dia'::text THEN ct.salario_diario::numeric * 0.5
                    ELSE 0::numeric
                END), 0::numeric) AS "coalesce"
           FROM partes_de_trabajo pdt
             JOIN configuracion_trabajadores ct ON ct.id_trabajador = pdt.id_trabajador
          WHERE pdt.liquidado IS DISTINCT FROM true) AS monto_jornales_pendientes,
    ( SELECT COALESCE(sum(gt.monto), 0::bigint) AS "coalesce"
           FROM gastos_tarea gt
          WHERE gt.liquidado IS DISTINCT FROM true AND gt.created_at >= date_trunc('week'::text, now())) AS gastos_no_liquidados_semana,
    ( SELECT count(*) AS count
           FROM partes_de_trabajo pdt
          WHERE pdt.liquidado IS DISTINCT FROM true AND pdt.fecha >= date_trunc('week'::text, now())) AS jornales_pendientes_semana,
    ( SELECT COALESCE(sum(
                CASE pdt.tipo_jornada
                    WHEN 'dia_completo'::text THEN ct.salario_diario::numeric
                    WHEN 'medio_dia'::text THEN ct.salario_diario::numeric * 0.5
                    ELSE 0::numeric
                END), 0::numeric) AS "coalesce"
           FROM partes_de_trabajo pdt
             JOIN configuracion_trabajadores ct ON ct.id_trabajador = pdt.id_trabajador
          WHERE pdt.liquidado IS DISTINCT FROM true AND pdt.fecha >= date_trunc('week'::text, now())) AS monto_jornales_pendientes_semana,
    ( SELECT count(*) AS count
           FROM tareas t
             JOIN presupuestos_finales pf ON pf.id_tarea = t.id AND pf.aprobado = true
          WHERE ((EXISTS ( SELECT 1
                   FROM gastos_tarea gt
                  WHERE gt.id_tarea = t.id)) OR (EXISTS ( SELECT 1
                   FROM partes_de_trabajo pdt
                  WHERE pdt.id_tarea = t.id))) AND NOT (EXISTS ( SELECT 1
                   FROM liquidaciones_nuevas ln
                  WHERE ln.id_tarea = t.id))) AS liquidaciones_pendientes,
    ( SELECT COALESCE(sum(f.total), 0::bigint) AS "coalesce"
           FROM facturas f
          WHERE f.pagada = false) AS facturas_por_cobrar_total,
    ( SELECT COALESCE(sum(
                CASE
                    WHEN f.saldo_pendiente IS NOT NULL THEN GREATEST(f.saldo_pendiente, 0::numeric)
                    WHEN f.pagada = false THEN GREATEST(f.total::numeric - COALESCE(f.total_pagado, 0::numeric), 0::numeric)
                    ELSE 0::numeric
                END), 0::numeric) AS "coalesce"
           FROM facturas f
          WHERE COALESCE(f.saldo_pendiente,
                CASE
                    WHEN f.pagada = false THEN f.total::numeric - COALESCE(f.total_pagado, 0::numeric)
                    ELSE 0::numeric
                END) > 0::numeric) AS saldos_pendientes_total,
    ( SELECT count(*) AS count
           FROM partes_de_trabajo pdt
          WHERE pdt.liquidado IS DISTINCT FROM true AND pdt.fecha < (CURRENT_DATE - '7 days'::interval)) AS jornales_pendientes_mayor_7d,
    ( SELECT COALESCE(sum(
                CASE pdt.tipo_jornada
                    WHEN 'dia_completo'::text THEN ct.salario_diario::numeric
                    WHEN 'medio_dia'::text THEN ct.salario_diario::numeric * 0.5
                    ELSE 0::numeric
                END), 0::numeric) AS "coalesce"
           FROM partes_de_trabajo pdt
             JOIN configuracion_trabajadores ct ON ct.id_trabajador = pdt.id_trabajador
          WHERE pdt.liquidado IS DISTINCT FROM true AND pdt.fecha < (CURRENT_DATE - '7 days'::interval)) AS monto_jornales_pendientes_mayor_7d,
    ( SELECT count(*) AS count
           FROM tareas t
          WHERE t.fecha_visita::date = CURRENT_DATE) AS visitas_hoy_total,
    ( SELECT COALESCE(sum(f.total), 0::bigint) AS "coalesce"
           FROM facturas f
          WHERE f.pagada = true AND f.fecha_pago >= date_trunc('month'::text, now())) AS ingresos_mes_actual,
    ( SELECT COALESCE(sum(f.total), 0::bigint) AS "coalesce"
           FROM facturas f
          WHERE f.pagada = true AND f.fecha_pago >= date_trunc('month'::text, now() - '1 mon'::interval) AND f.fecha_pago < date_trunc('month'::text, now())) AS ingresos_mes_anterior,
    ( SELECT count(*) AS count
           FROM vista_admin_liquidaciones_sin_pf) AS liquidaciones_sin_pf_count,
    ( SELECT count(*) AS count
           FROM vista_admin_pf_aprobado_sin_factura) AS pf_aprobado_sin_factura_count,
    ( SELECT count(*) AS count
           FROM vista_admin_pb_finalizada_sin_pf) AS pb_finalizada_sin_pf_count,
    ( SELECT count(*) AS count
           FROM vista_admin_pb_sin_aprobar) AS pb_sin_aprobar_count,
    ( SELECT count(*) AS count
           FROM vista_admin_pf_enviado_sin_actividad
          WHERE vista_admin_pf_enviado_sin_actividad.umbral = 'alerta_20d'::text) AS pf_enviado_sin_actividad_20d_count,
    ( SELECT count(*) AS count
           FROM vista_admin_pf_enviado_sin_actividad
          WHERE vista_admin_pf_enviado_sin_actividad.umbral = 'auto_cierre_30d'::text) AS pf_enviado_sin_actividad_30d_count,
    ( SELECT COALESCE(sum(a.monto), 0::numeric) AS "coalesce"
           FROM adelantos a
          WHERE a.estado_liquidado = false) AS total_capital_en_adelantos,
    ( SELECT COALESCE(sum(pf.descuento_monto), 0::bigint) AS "coalesce"
           FROM presupuestos_finales pf) AS presupuestos_descuento_total
  WHERE jwt_rol() = 'admin'::text;;

CREATE OR REPLACE VIEW public.vista_pb_admin AS
SELECT id,
    code,
    id_tarea,
    nota_pb,
    materiales,
    mano_obra,
    total,
    pb_aprobado,
    created_at,
    updated_at,
    base_liquidada,
    id_supervisor,
    titulo_tarea,
    code_tarea,
    id_estado_tarea,
    estado_tarea,
    id_edificio,
    nombre_edificio,
    direccion_edificio,
    nombre_administrador,
    codigo_estado_pf,
    pf_aprobado,
    pf_rechazado,
    esta_liquidado,
    dias_desde_creacion,
    estado_operativo,
    se_trabajo
   FROM vista_pb_supervisor;;

CREATE OR REPLACE VIEW public.vista_tareas_admin AS
SELECT id,
    code,
    titulo,
    descripcion,
    id_edificio,
    fecha_visita,
    prioridad,
    created_at,
    id_estado_nuevo,
    gastos_tarea_pdf,
    id_administrador,
    finalizada,
    updated_at,
    nombre_edificio,
    direccion_edificio,
    notas_edificio,
    nombre_administrador,
    estado_nombre,
    estado_tarea,
    estado_color,
    prioridad_nombre,
    prioridad_color,
    supervisores_emails,
    supervisores,
    trabajadores_emails,
    trabajadores_json,
    supervisores_json,
    departamentos_json,
    ( SELECT jsonb_build_object('pb', ( SELECT row_to_json(pb.*) AS row_to_json
                   FROM presupuestos_base pb
                  WHERE pb.id_tarea = t.id
                 LIMIT 1), 'pf', ( SELECT row_to_json(pf.*) AS row_to_json
                   FROM presupuestos_finales pf
                  WHERE pf.id_tarea = t.id
                 LIMIT 1), 'tiene_facturas', (EXISTS ( SELECT 1
                   FROM facturas f
                     JOIN presupuestos_finales pf ON f.id_presupuesto_final = pf.id
                  WHERE pf.id_tarea = t.id)), 'facturas_pagadas', ( SELECT COALESCE(bool_and(f.pagada), false) AS "coalesce"
                   FROM facturas f
                     JOIN presupuestos_finales pf ON f.id_presupuesto_final = pf.id
                  WHERE pf.id_tarea = t.id)) AS jsonb_build_object) AS finanzas_json,
    (EXISTS ( SELECT 1
           FROM presupuestos_base pb
          WHERE pb.id_tarea = t.id)) AS tiene_presupuesto_base,
    (EXISTS ( SELECT 1
           FROM presupuestos_finales pf
          WHERE pf.id_tarea = t.id)) AS tiene_presupuesto_final,
    (EXISTS ( SELECT 1
           FROM liquidaciones_nuevas ln
          WHERE ln.id_tarea = t.id)) AS tiene_liquidacion,
    se_trabajo,
    es_particular
   FROM vista_tareas_completa t;;

CREATE OR REPLACE VIEW public.vista_tareas_supervisor AS
SELECT id,
    code,
    titulo,
    descripcion,
    id_edificio,
    fecha_visita,
    prioridad,
    created_at,
    id_estado_nuevo,
    gastos_tarea_pdf,
    id_administrador,
    finalizada,
    updated_at,
    nombre_edificio,
    direccion_edificio,
    notas_edificio,
    nombre_administrador,
    estado_nombre,
    estado_tarea,
    estado_color,
    prioridad_nombre,
    prioridad_color,
    supervisores_emails,
    supervisores,
    trabajadores_emails,
    trabajadores_json,
    supervisores_json,
    departamentos_json,
    (EXISTS ( SELECT 1
           FROM presupuestos_base pb
          WHERE pb.id_tarea = t.id)) AS tiene_presupuesto_base,
    ( SELECT jsonb_build_object('pb', ( SELECT row_to_json(pb.*) AS row_to_json
                   FROM presupuestos_base pb
                  WHERE pb.id_tarea = t.id
                 LIMIT 1), 'total_gastos', ( SELECT COALESCE(sum(gastos_tarea.monto), 0::bigint) AS "coalesce"
                   FROM gastos_tarea
                  WHERE gastos_tarea.id_tarea = t.id), 'lista_gastos', ( SELECT jsonb_agg(row_to_json(g.*)) AS jsonb_agg
                   FROM vista_gastos_tarea_completa g
                  WHERE g.id_tarea = t.id)) AS jsonb_build_object) AS gastos_json,
    se_trabajo,
    es_particular
   FROM vista_tareas_completa t;;

-- 8. HABILITACION RLS EN LAS 33 TABLAS
ALTER TABLE public.adelantos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.administradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ajustes_facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_forense_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion_trabajadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contactos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departamentos_tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edificios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estados_facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estados_presupuestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estados_tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gastos_extra_pdf_factura ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gastos_tarea ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items_factura ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liquidaciones_nuevas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liquidaciones_trabajadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_tareas_operativas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos_facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partes_de_trabajo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preferencias_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presupuestos_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presupuestos_finales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supervisores_tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trabajadores_tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;


-- 9. POLITICAS DE SEGURIDAD RLS (73 POLITICAS)
CREATE POLICY "admin_all_access" ON public.adelantos AS PERMISSIVE FOR ALL TO authenticated USING ((jwt_rol() = 'admin'::text)) WITH CHECK ((jwt_rol() = 'admin'::text));
CREATE POLICY "[V2] Admin All Access - administradores" ON public.administradores AS PERMISSIVE FOR ALL TO public USING ((jwt_rol() = 'admin'::text));
CREATE POLICY "[V2] Supervisor/Trabajador LECTURA - administradores" ON public.administradores AS PERMISSIVE FOR SELECT TO public USING ((jwt_rol() = ANY (ARRAY['supervisor'::text, 'trabajador'::text])));
CREATE POLICY "[V2] Admin All Access - ajustes_facturas" ON public.ajustes_facturas AS PERMISSIVE FOR ALL TO public USING ((jwt_rol() = 'admin'::text));
CREATE POLICY "[V2] Admin All Access - alertas_sistema" ON public.alertas_sistema AS PERMISSIVE FOR ALL TO public USING ((jwt_rol() = 'admin'::text));
CREATE POLICY "Prohibir mutacion manual de logs" ON public.auditoria_forense_logs AS PERMISSIVE FOR ALL TO public USING (false);
CREATE POLICY "Solo admin puede leer logs de auditoria" ON public.auditoria_forense_logs AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.id = auth.uid()) AND (u.rol = 'admin'::text)))));
CREATE POLICY "[V2] Admin All Access - categorias_productos" ON public.categorias_productos AS PERMISSIVE FOR ALL TO public USING ((jwt_rol() = 'admin'::text));
CREATE POLICY "[V2] Admin All Access - comentarios" ON public.comentarios AS PERMISSIVE FOR ALL TO public USING ((jwt_rol() = 'admin'::text));
CREATE POLICY "[V2] Supervisor All Access - Sus Comentarios" ON public.comentarios AS PERMISSIVE FOR ALL TO public USING (((jwt_rol() = 'supervisor'::text) AND (id_tarea IN ( SELECT supervisores_tareas.id_tarea
   FROM supervisores_tareas
  WHERE (supervisores_tareas.id_supervisor = auth.uid())))));
CREATE POLICY "[V2] Trabajador INSERT - Comentarios" ON public.comentarios AS PERMISSIVE FOR INSERT TO public WITH CHECK ((jwt_rol() = 'trabajador'::text));
CREATE POLICY "[V2] Trabajador SELECT - Sus Tareas" ON public.comentarios AS PERMISSIVE FOR SELECT TO public USING (((jwt_rol() = 'trabajador'::text) AND (id_tarea IN ( SELECT trabajadores_tareas.id_tarea
   FROM trabajadores_tareas
  WHERE (trabajadores_tareas.id_trabajador = auth.uid())))));
CREATE POLICY "[V2] Admin All Access - configuracion_trabajadores" ON public.configuracion_trabajadores AS PERMISSIVE FOR ALL TO public USING ((jwt_rol() = 'admin'::text));
CREATE POLICY "[V2] Admin All Access - contactos" ON public.contactos AS PERMISSIVE FOR ALL TO public USING ((jwt_rol() = 'admin'::text));
CREATE POLICY "[V2] Admin/Supervisor Acceso Total - contactos" ON public.contactos AS PERMISSIVE FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM usuarios
  WHERE ((usuarios.id = auth.uid()) AND (usuarios.rol = ANY (ARRAY['admin'::text, 'supervisor'::text]))))));
CREATE POLICY "[V2] Autenticados LECTURA - contactos" ON public.contactos AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "[V2] Trabajador LECTURA - contactos" ON public.contactos AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM usuarios
  WHERE ((usuarios.id = auth.uid()) AND (usuarios.rol = 'trabajador'::text)))));
CREATE POLICY "[V2] Admin/Supervisor Acceso Total - departamentos" ON public.departamentos AS PERMISSIVE FOR ALL TO public USING ((jwt_rol() = ANY (ARRAY['admin'::text, 'supervisor'::text])));
CREATE POLICY "[V2] Trabajador LECTURA - departamentos" ON public.departamentos AS PERMISSIVE FOR SELECT TO public USING ((jwt_rol() = 'trabajador'::text));
CREATE POLICY "[V2] Admin/Supervisor Acceso Total - departamentos_tareas" ON public.departamentos_tareas AS PERMISSIVE FOR ALL TO public USING ((jwt_rol() = ANY (ARRAY['admin'::text, 'supervisor'::text])));
CREATE POLICY "[V2] Trabajador LECTURA - departamentos_tareas" ON public.departamentos_tareas AS PERMISSIVE FOR SELECT TO public USING ((jwt_rol() = 'trabajador'::text));
CREATE POLICY "[V2] Admin All Access - edificios" ON public.edificios AS PERMISSIVE FOR ALL TO public USING ((jwt_rol() = 'admin'::text));
CREATE POLICY "[V2] Vista Publica/Staff LECTURA - edificios" ON public.edificios AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "[V2] Admin All Access - estados_facturas" ON public.estados_facturas AS PERMISSIVE FOR ALL TO public USING ((jwt_rol() = 'admin'::text));
CREATE POLICY "[V2] Public LECTURA - estados_facturas" ON public.estados_facturas AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "[V2] Admin All Access - estados_presupuestos" ON public.estados_presupuestos AS PERMISSIVE FOR ALL TO public USING ((jwt_rol() = 'admin'::text));
CREATE POLICY "[V2] Admin All Access - estados_tareas" ON public.estados_tareas AS PERMISSIVE FOR ALL TO public USING ((jwt_rol() = 'admin'::text));
CREATE POLICY "[V2] Public LECTURA - estados_tareas" ON public.estados_tareas AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "[V2] Admin All Access - facturas" ON public.facturas AS PERMISSIVE FOR ALL TO public USING ((jwt_rol() = 'admin'::text));
CREATE POLICY "[V2] Admin All Access - gastos_extra_pdf_factura" ON public.gastos_extra_pdf_factura AS PERMISSIVE FOR ALL TO public USING ((jwt_rol() = 'admin'::text));
CREATE POLICY "[V2] Admin All Access - gastos_tarea" ON public.gastos_tarea AS PERMISSIVE FOR ALL TO public USING ((jwt_rol() = 'admin'::text));
CREATE POLICY "[V2] Supervisor CRUD Parcial - Sus Tareas" ON public.gastos_tarea AS PERMISSIVE FOR SELECT TO public USING (((jwt_rol() = 'supervisor'::text) AND (id_tarea IN ( SELECT supervisores_tareas.id_tarea
   FROM supervisores_tareas
  WHERE (supervisores_tareas.id_supervisor = auth.uid())))));
CREATE POLICY "[V2] Supervisor DELETE - Sus Tareas" ON public.gastos_tarea AS PERMISSIVE FOR DELETE TO public USING (((jwt_rol() = 'supervisor'::text) AND (id_tarea IN ( SELECT supervisores_tareas.id_tarea
   FROM supervisores_tareas
  WHERE (supervisores_tareas.id_supervisor = auth.uid())))));
CREATE POLICY "[V2] Supervisor INSERT/DELETE - Sus Tareas" ON public.gastos_tarea AS PERMISSIVE FOR INSERT TO public WITH CHECK (((jwt_rol() = 'supervisor'::text) AND (id_tarea IN ( SELECT supervisores_tareas.id_tarea
   FROM supervisores_tareas
  WHERE (supervisores_tareas.id_supervisor = auth.uid())))));
CREATE POLICY "[V2] Supervisor UPDATE - Sus Tareas" ON public.gastos_tarea AS PERMISSIVE FOR UPDATE TO public USING (((jwt_rol() = 'supervisor'::text) AND (id_tarea IN ( SELECT supervisores_tareas.id_tarea
   FROM supervisores_tareas
  WHERE (supervisores_tareas.id_supervisor = auth.uid()))))) WITH CHECK (((jwt_rol() = 'supervisor'::text) AND (id_tarea IN ( SELECT supervisores_tareas.id_tarea
   FROM supervisores_tareas
  WHERE (supervisores_tareas.id_supervisor = auth.uid())))));
CREATE POLICY "[V2] Trabajador CRUD - Sus Gastos" ON public.gastos_tarea AS PERMISSIVE FOR SELECT TO public USING (((jwt_rol() = 'trabajador'::text) AND (id_usuario = auth.uid())));
CREATE POLICY "[V2] Trabajador INSERT - Sus Gastos" ON public.gastos_tarea AS PERMISSIVE FOR INSERT TO public WITH CHECK (((jwt_rol() = 'trabajador'::text) AND (id_usuario = auth.uid())));
CREATE POLICY "[V2] Admin All Access - items" ON public.items AS PERMISSIVE FOR ALL TO public USING ((jwt_rol() = 'admin'::text));
CREATE POLICY "[V2] Admin All Access - items_factura" ON public.items_factura AS PERMISSIVE FOR ALL TO public USING ((jwt_rol() = 'admin'::text));
CREATE POLICY "[V2] Admin All Access - liquidaciones_nuevas" ON public.liquidaciones_nuevas AS PERMISSIVE FOR ALL TO public USING ((jwt_rol() = 'admin'::text));
CREATE POLICY "[V2] Supervisor LECTURA - liquidaciones_nuevas" ON public.liquidaciones_nuevas AS PERMISSIVE FOR SELECT TO public USING (((jwt_rol() = 'supervisor'::text) AND (id_tarea IN ( SELECT supervisores_tareas.id_tarea
   FROM supervisores_tareas
  WHERE (supervisores_tareas.id_supervisor = auth.uid())))));
CREATE POLICY "[V2] Admin All Access - liquidaciones_trabajadores" ON public.liquidaciones_trabajadores AS PERMISSIVE FOR ALL TO public USING ((jwt_rol() = 'admin'::text));
CREATE POLICY "[V2] Trabajador LECTURA - liquidaciones_trabajadores" ON public.liquidaciones_trabajadores AS PERMISSIVE FOR SELECT TO public USING (((jwt_rol() = 'trabajador'::text) AND (id_trabajador = auth.uid())));
CREATE POLICY "Microtareas: Acceso autenticados" ON public.micro_tareas_operativas AS PERMISSIVE FOR ALL TO authenticated USING ((auth.uid() IS NOT NULL)) WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "[V2] Admin All Access - pagos_facturas" ON public.pagos_facturas AS PERMISSIVE FOR ALL TO public USING ((jwt_rol() = 'admin'::text));
CREATE POLICY "[V2] Admin All Access - partes_de_trabajo" ON public.partes_de_trabajo AS PERMISSIVE FOR ALL TO public USING ((jwt_rol() = 'admin'::text));
CREATE POLICY "[V2] Supervisor DELETE - Partes de sus tareas" ON public.partes_de_trabajo AS PERMISSIVE FOR DELETE TO public USING (((jwt_rol() = 'supervisor'::text) AND (id_tarea IN ( SELECT supervisores_tareas.id_tarea
   FROM supervisores_tareas
  WHERE (supervisores_tareas.id_supervisor = auth.uid())))));
CREATE POLICY "[V2] Supervisor INSERT - Partes de sus tareas" ON public.partes_de_trabajo AS PERMISSIVE FOR INSERT TO public WITH CHECK (((jwt_rol() = 'supervisor'::text) AND (id_tarea IN ( SELECT supervisores_tareas.id_tarea
   FROM supervisores_tareas
  WHERE (supervisores_tareas.id_supervisor = auth.uid())))));
CREATE POLICY "[V2] Supervisor LECTURA - Partes de sus tareas" ON public.partes_de_trabajo AS PERMISSIVE FOR SELECT TO public USING (((jwt_rol() = 'supervisor'::text) AND (id_tarea IN ( SELECT supervisores_tareas.id_tarea
   FROM supervisores_tareas
  WHERE (supervisores_tareas.id_supervisor = auth.uid())))));
CREATE POLICY "[V2] Supervisor UPDATE - Partes de sus tareas" ON public.partes_de_trabajo AS PERMISSIVE FOR UPDATE TO public USING (((jwt_rol() = 'supervisor'::text) AND (id_tarea IN ( SELECT supervisores_tareas.id_tarea
   FROM supervisores_tareas
  WHERE (supervisores_tareas.id_supervisor = auth.uid()))))) WITH CHECK (((jwt_rol() = 'supervisor'::text) AND (id_tarea IN ( SELECT supervisores_tareas.id_tarea
   FROM supervisores_tareas
  WHERE (supervisores_tareas.id_supervisor = auth.uid())))));
CREATE POLICY "[V2] Trabajador DELETE - Semana Abierta" ON public.partes_de_trabajo AS PERMISSIVE FOR DELETE TO public USING (((id_trabajador = auth.uid()) AND (jwt_rol() = 'trabajador'::text) AND (id_liquidacion IS NULL) AND (fecha >= (date_trunc('week'::text, (CURRENT_DATE)::timestamp with time zone))::date) AND (fecha <= ((date_trunc('week'::text, (CURRENT_DATE)::timestamp with time zone) + '6 days'::interval))::date) AND (NOT (EXISTS ( SELECT 1
   FROM liquidaciones_trabajadores lt
  WHERE ((lt.id_trabajador = auth.uid()) AND (partes_de_trabajo.fecha >= lt.semana_inicio) AND (partes_de_trabajo.fecha <= lt.semana_fin)))))));
CREATE POLICY "[V2] Trabajador INSERT - Semana Abierta" ON public.partes_de_trabajo AS PERMISSIVE FOR INSERT TO public WITH CHECK (((id_trabajador = auth.uid()) AND (jwt_rol() = 'trabajador'::text) AND (fecha >= (date_trunc('week'::text, (CURRENT_DATE)::timestamp with time zone))::date) AND (fecha <= ((date_trunc('week'::text, (CURRENT_DATE)::timestamp with time zone) + '6 days'::interval))::date) AND (NOT (EXISTS ( SELECT 1
   FROM liquidaciones_trabajadores lt
  WHERE ((lt.id_trabajador = auth.uid()) AND (partes_de_trabajo.fecha >= lt.semana_inicio) AND (partes_de_trabajo.fecha <= lt.semana_fin)))))));
CREATE POLICY "[V2] Trabajador SELECT - Sus Partes" ON public.partes_de_trabajo AS PERMISSIVE FOR SELECT TO public USING (((jwt_rol() = 'trabajador'::text) AND (id_trabajador = auth.uid())));
CREATE POLICY "[V2] Trabajador UPDATE - Semana Abierta" ON public.partes_de_trabajo AS PERMISSIVE FOR UPDATE TO public USING (((id_trabajador = auth.uid()) AND (jwt_rol() = 'trabajador'::text) AND (id_liquidacion IS NULL) AND (fecha >= (date_trunc('week'::text, (CURRENT_DATE)::timestamp with time zone))::date) AND (fecha <= ((date_trunc('week'::text, (CURRENT_DATE)::timestamp with time zone) + '6 days'::interval))::date) AND (NOT (EXISTS ( SELECT 1
   FROM liquidaciones_trabajadores lt
  WHERE ((lt.id_trabajador = auth.uid()) AND (partes_de_trabajo.fecha >= lt.semana_inicio) AND (partes_de_trabajo.fecha <= lt.semana_fin)))))));
CREATE POLICY "[V2] Admin All Access - preferencias_usuarios" ON public.preferencias_usuarios AS PERMISSIVE FOR ALL TO public USING ((jwt_rol() = 'admin'::text));
CREATE POLICY "[V2] Usuarios CRUD - Mis Preferencias" ON public.preferencias_usuarios AS PERMISSIVE FOR ALL TO public USING ((id_usuario = auth.uid())) WITH CHECK ((id_usuario = auth.uid()));
CREATE POLICY "[V2] Admin All Access - presupuestos_base" ON public.presupuestos_base AS PERMISSIVE FOR ALL TO public USING ((jwt_rol() = 'admin'::text)) WITH CHECK ((jwt_rol() = 'admin'::text));
CREATE POLICY "[V2] Supervisor CRUD - Sus Presupuestos no aprobados" ON public.presupuestos_base AS PERMISSIVE FOR SELECT TO public USING (((jwt_rol() = 'supervisor'::text) AND (id_tarea IN ( SELECT supervisores_tareas.id_tarea
   FROM supervisores_tareas
  WHERE (supervisores_tareas.id_supervisor = auth.uid())))));
CREATE POLICY "[V2] Supervisor INSERTS - Sus Presupuestos" ON public.presupuestos_base AS PERMISSIVE FOR INSERT TO public WITH CHECK (((jwt_rol() = 'supervisor'::text) AND (id_tarea IN ( SELECT supervisores_tareas.id_tarea
   FROM supervisores_tareas
  WHERE (supervisores_tareas.id_supervisor = auth.uid())))));
CREATE POLICY "[V2] Supervisor UPDATE - Presupuestos no aprobados" ON public.presupuestos_base AS PERMISSIVE FOR UPDATE TO public USING (((jwt_rol() = 'supervisor'::text) AND (aprobado = false) AND (id_tarea IN ( SELECT supervisores_tareas.id_tarea
   FROM supervisores_tareas
  WHERE (supervisores_tareas.id_supervisor = auth.uid()))))) WITH CHECK ((jwt_rol() = 'supervisor'::text));
CREATE POLICY "phase_platinum_presupuestos_base_access" ON public.presupuestos_base AS RESTRICTIVE FOR ALL TO public USING (((jwt_rol() = 'admin'::text) OR (EXISTS ( SELECT 1
   FROM supervisores_tareas st
  WHERE ((st.id_tarea = presupuestos_base.id_tarea) AND (st.id_supervisor = auth.uid()))))));
CREATE POLICY "[V2] Admin All Access - presupuestos_finales" ON public.presupuestos_finales AS PERMISSIVE FOR ALL TO public USING ((jwt_rol() = 'admin'::text));
CREATE POLICY "[V2] Admin All Access - productos" ON public.productos AS PERMISSIVE FOR ALL TO public USING ((jwt_rol() = 'admin'::text));
CREATE POLICY "[V2] Admin/Supervisor Acceso Total - supervisores_tareas" ON public.supervisores_tareas AS PERMISSIVE FOR ALL TO public USING ((jwt_rol() = ANY (ARRAY['admin'::text, 'supervisor'::text])));
CREATE POLICY "[V2] Admin All Access - tareas" ON public.tareas AS PERMISSIVE FOR ALL TO public USING ((jwt_rol() = 'admin'::text));
CREATE POLICY "[V2] Supervisor CRUD - Sus Tareas" ON public.tareas AS PERMISSIVE FOR ALL TO public USING (((jwt_rol() = 'supervisor'::text) AND (id IN ( SELECT supervisores_tareas.id_tarea
   FROM supervisores_tareas
  WHERE (supervisores_tareas.id_supervisor = auth.uid()))))) WITH CHECK ((jwt_rol() = 'supervisor'::text));
CREATE POLICY "[V2] Trabajador LECTURAS/UPDATE - Sus Tareas" ON public.tareas AS PERMISSIVE FOR SELECT TO public USING (((jwt_rol() = 'trabajador'::text) AND (id IN ( SELECT trabajadores_tareas.id_tarea
   FROM trabajadores_tareas
  WHERE (trabajadores_tareas.id_trabajador = auth.uid())))));
CREATE POLICY "[V2] Trabajador UPDATE EXPLICITO (Estado/Visita)" ON public.tareas AS PERMISSIVE FOR UPDATE TO public USING (((jwt_rol() = 'trabajador'::text) AND (id IN ( SELECT trabajadores_tareas.id_tarea
   FROM trabajadores_tareas
  WHERE (trabajadores_tareas.id_trabajador = auth.uid()))))) WITH CHECK ((jwt_rol() = 'trabajador'::text));
CREATE POLICY "[V2] Admin/Supervisor Acceso Total - trabajadores_tareas" ON public.trabajadores_tareas AS PERMISSIVE FOR ALL TO public USING ((jwt_rol() = ANY (ARRAY['admin'::text, 'supervisor'::text])));
CREATE POLICY "[V2] Trabajador LECTURA - trabajadores_tareas" ON public.trabajadores_tareas AS PERMISSIVE FOR SELECT TO public USING ((jwt_rol() = 'trabajador'::text));
CREATE POLICY "[V2] Admin All Access - usuarios" ON public.usuarios AS PERMISSIVE FOR ALL TO public USING ((jwt_rol() = 'admin'::text));
CREATE POLICY "[V2] Supervisor LECTURA - usuarios" ON public.usuarios AS PERMISSIVE FOR SELECT TO public USING ((jwt_rol() = 'supervisor'::text));
CREATE POLICY "[V2] Usuario Propio CRUD - perfil" ON public.usuarios AS PERMISSIVE FOR ALL TO public USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));


-- 10. DATOS SEMILLA OPERATIVOS

INSERT INTO public.estados_tareas (id, codigo, nombre, descripcion, color, orden) VALUES
(1, 'organizar', 'Organizar', 'Tarea en fase inicial de organización', 'gray', 1),
(2, 'preguntar', 'Preguntar', 'Tarea en fase de consulta o investigación', 'blue', 2),
(12, 'base', 'Presupuesto Base', 'Supervisor cargo presupuesto base', 'purple', 3),
(3, 'presupuestado', 'Presupuestado', 'Tarea con presupuesto creado', 'purple', 4),
(4, 'enviado', 'Enviado', 'Presupuesto enviado al cliente', 'indigo', 5),
(5, 'aprobado', 'Aprobado', 'Presupuesto aprobado por el cliente', 'green', 6),
(6, 'facturado', 'Facturado', 'Tarea facturada', 'orange', 7),
(7, 'terminado', 'Terminado', 'Tarea completada', 'green', 8),
(8, 'reclamado', 'Reclamado', 'Tarea con reclamo del cliente', 'red', 9),
(9, 'liquidada', 'Liquidada', 'Tarea completada y liquidada financieramente', 'purple', 10),
(10, 'posible', 'Posible', 'son posibles trabajos a futuro', 'yellow', 11),
(11, 'vencido', 'Cerrado sin respuesta', null, 'gray', 12)
ON CONFLICT (id) DO UPDATE SET codigo = EXCLUDED.codigo, nombre = EXCLUDED.nombre, orden = EXCLUDED.orden;

SELECT setval('public.estados_tareas_id_seq', (SELECT MAX(id) FROM public.estados_tareas));

INSERT INTO public.estados_presupuestos (id, codigo, nombre, descripcion, color, orden) VALUES
(1, 'borrador', 'Borrador', 'Presupuesto en fase de creación', 'gray', 1),
(2, 'enviado', 'Enviado', 'Presupuesto enviado al cliente', 'blue', 2),
(3, 'aceptado', 'Aceptado', 'Presupuesto aceptado por el cliente', 'green', 3),
(4, 'facturado', 'Facturado', 'Presupuesto facturado', 'orange', 4),
(5, 'rechazado', 'Rechazado', 'Presupuesto rechazado por el cliente', 'red', 5)
ON CONFLICT (id) DO UPDATE SET codigo = EXCLUDED.codigo, nombre = EXCLUDED.nombre, orden = EXCLUDED.orden;

SELECT setval('public.estados_presupuestos_id_seq', (SELECT MAX(id) FROM public.estados_presupuestos));

INSERT INTO public.estados_facturas (id, codigo, nombre, descripcion, color, orden) VALUES
(1, 'borrador', 'Borrador', 'Factura en fase de creación', 'gray', 1),
(2, 'no_pagado', 'No pagado', 'Factura emitida pero no pagada', '#800000', 2),
(7, 'enviado', 'Enviado', 'Factura enviada al cliente', '#6366f1', 2),
(3, 'parcialmente', 'Parcialmente pagado', 'Factura con pago parcial', '#6E6C25', 3),
(4, 'vencido', 'Vencido', 'Factura vencida sin pago completo', '#C90000', 4),
(5, 'pagado', 'Pagado', 'Factura pagada completamente', '#00700B', 5),
(6, 'anulado', 'Anulado', 'Factura anulada', '#520054', 6)
ON CONFLICT (id) DO UPDATE SET codigo = EXCLUDED.codigo, nombre = EXCLUDED.nombre, orden = EXCLUDED.orden;

SELECT setval('public.estados_facturas_id_seq', (SELECT MAX(id) FROM public.estados_facturas));

INSERT INTO public.categorias_productos (id, nombre, descripcion) VALUES
('53a77575-2430-47fe-8383-b9440de9a8ac', 'Gas', null),
('531cc4bf-30d0-47e3-9953-34755154669d', 'Pintura', null),
('6ff1e9fe-1756-4098-8fd5-7fcb7ec4a2a7', 'Materiales', null),
('715e7cde-a3d6-46bd-90d2-ff39b614e49e', 'otro', 'Acá voy a poner los que no se a que categoría pertenece'),
('0f5ca90a-6151-4854-ad3d-2a44db23ce4a', 'Electricidad', ''),
('577b6dbe-29df-4c71-94f4-43fb2bb0aebc', 'Destapación', null),
('63c31adb-a0d1-4089-938d-b38ba7aeb786', 'Impermeabilización', null),
('f77b35b2-5e44-4f44-9706-91cd4eb23e35', 'Plomería', null),
('0abad95e-c8cb-49c6-b608-a1b0fd23e3f3', 'Herrería', null),
('6ca87125-63b4-4c49-b56a-7f56c82001a7', 'Albañilería', null)
ON CONFLICT (id) DO NOTHING;
