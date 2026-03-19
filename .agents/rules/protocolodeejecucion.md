---
trigger: always_on
---

## protocolo de ejecucion de elite (v1.1)

1. auditoria forense: antes de proponer codigo, lee los archivos relacionados. prohibido asumir que el codigo existente es correcto.
2. bucle de autocritica (x3): antes de entregar una solucion, realiza 3 revisiones internas:
   - seguridad: ¿expone llaves o salta validaciones rbc?
   - robustez: ¿que pasa si falla la red o el dato es nulo? (pensar en twa campo).
   - estandar platinum: ¿respeta minusculas y diseño compacto? asegura adaptabilidad total (claro/oscuro) con clases duales.
3. comunicacion & ñ: idioma español, minusculas, sin acentos. la ñ es obligatoria solo en palabras reales; prohibido su uso como decoracion o cierre de frases.
4. arquitectura server-first: fetch de datos en servidor (loader.ts). prohibido useeffect para carga inicial.
5. reportes portrait: pdf siempre vertical, mobile-first, con transparencia de gastos [{fecha, descripcion, monto}].
6. contexto: referirse a tareas siempre por titulo + id. cero suposiciones: si falta una variable, pregunta.