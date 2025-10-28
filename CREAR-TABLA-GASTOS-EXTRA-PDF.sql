BEGIN;

CREATE TABLE IF NOT EXISTS public.gastos_extra_pdf_factura (
  id bigserial PRIMARY KEY,
  id_factura integer NOT NULL REFERENCES public.facturas(id) ON DELETE CASCADE,
  id_tarea integer NULL REFERENCES public.tareas(id) ON DELETE SET NULL,
  id_usuario uuid NOT NULL REFERENCES public.usuarios(id),
  fecha date NOT NULL,
  monto numeric(12,2) NOT NULL CHECK (monto >= 0),
  descripcion text NOT NULL,
  comprobante_url text NULL,
  imagen_procesada_url text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gastos_extra_pdf_factura ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'gastos_extra_pdf_factura' AND policyname = 'gastos_extra_pdf_select'
  ) THEN
    CREATE POLICY gastos_extra_pdf_select ON public.gastos_extra_pdf_factura
    FOR SELECT
    TO authenticated
    USING (EXISTS (
      SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'admin'
    ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'gastos_extra_pdf_factura' AND policyname = 'gastos_extra_pdf_insert'
  ) THEN
    CREATE POLICY gastos_extra_pdf_insert ON public.gastos_extra_pdf_factura
    FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'admin'
    ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'gastos_extra_pdf_factura' AND policyname = 'gastos_extra_pdf_update'
  ) THEN
    CREATE POLICY gastos_extra_pdf_update ON public.gastos_extra_pdf_factura
    FOR UPDATE
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'gastos_extra_pdf_factura' AND policyname = 'gastos_extra_pdf_delete'
  ) THEN
    CREATE POLICY gastos_extra_pdf_delete ON public.gastos_extra_pdf_factura
    FOR DELETE
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'admin'));
  END IF;
END
$$;

COMMIT;
