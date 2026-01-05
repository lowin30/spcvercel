WITH exis AS (
  SELECT 1 FROM public.estados_tareas WHERE codigo = 'vencido'
),
maxo AS (
  SELECT COALESCE(MAX(orden),0)+1 AS next FROM public.estados_tareas
)
INSERT INTO public.estados_tareas (codigo, nombre, color, orden)
SELECT 'vencido', 'Cerrado sin respuesta', 'gray', maxo.next
FROM maxo
WHERE NOT EXISTS (SELECT 1 FROM exis);
