-- migracion: corregir politica rls permisiva en micro_tareas_operativas
-- protocolo platinum: solo usuarios autenticados pueden operar microtareas

DROP POLICY IF EXISTS "Microtareas: Acceso total" ON public.micro_tareas_operativas;

CREATE POLICY "Microtareas: Acceso autenticados" 
ON public.micro_tareas_operativas 
FOR ALL 
TO authenticated 
USING (auth.uid() IS NOT NULL) 
WITH CHECK (auth.uid() IS NOT NULL);
