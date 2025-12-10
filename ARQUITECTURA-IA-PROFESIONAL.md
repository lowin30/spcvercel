# 🤖 ARQUITECTURA IA PROFESIONAL - CHATBOT SPC

## 📊 **ANÁLISIS PROFUNDO DEL SISTEMA**

### **Estructura de Datos Detectada:**

```
USUARIOS (9 total)
├── admin (2) → Acceso total
├── supervisor (3) → Ver sus tareas/gastos/liquidaciones
└── trabajador (4) → Ver solo sus asignaciones

TAREAS (74 total, 25 pendientes)
├── Vinculadas a edificios
├── Asignadas a supervisores
├── Asignadas a trabajadores
└── Estados y prioridades

GASTOS (109 registros)
├── Por tarea
├── Tipos: material, herramienta, transporte, mano_obra, otro
├── Con/sin comprobante
└── Liquidados/pendientes

LIQUIDACIONES (53 registros)
├── Cálculo ganancia supervisor/admin
├── PDF generado
├── Estados de pago

PRESUPUESTOS
├── Base (76)
└── Finales (vinculados a facturas)
```

---

## 🎯 **PERMISOS RLS POR ROL**

### **Admin:**
- ✅ Ve TODO sin restricciones
- ✅ Puede modificar cualquier dato
- ✅ Acceso a métricas globales

### **Supervisor:**
- ✅ Ve solo SUS tareas asignadas
- ✅ Ve gastos de SUS tareas
- ✅ Ve liquidaciones donde es supervisor
- ❌ NO ve tareas de otros supervisores
- ❌ NO ve ganancias admin

### **Trabajador:**
- ✅ Ve solo tareas donde está asignado
- ✅ Ve sus partes de trabajo
- ❌ NO ve gastos
- ❌ NO ve liquidaciones
- ❌ NO ve presupuestos

---

## 📖 **DICCIONARIO INTELIGENTE**

### **Mapeo de términos comunes:**

```javascript
const DICCIONARIO = {
  // Sinónimos de "tareas"
  tareas: ['tarea', 'trabajo', 'trabajos', 'pendiente', 'pendientes', 'asignacion', 'asignaciones'],
  
  // Sinónimos de "gastos"
  gastos: ['gasto', 'costo', 'costos', 'expense', 'expenses', 'plata gastada', 'dinero'],
  
  // Sinónimos de "liquidaciones"
  liquidaciones: ['liquidacion', 'pago', 'pagos', 'cobro', 'cobros', 'ganancia', 'ganancias'],
  
  // Sinónimos de estados
  pendiente: ['pendiente', 'sin terminar', 'incompleta', 'falta', 'por hacer'],
  finalizada: ['terminada', 'completada', 'hecha', 'lista', 'finalizada'],
  
  // Tipos de gastos
  material: ['materiales', 'material', 'insumo', 'insumos'],
  herramienta: ['herramienta', 'herramientas', 'tool', 'tools'],
  transporte: ['transporte', 'viaje', 'viajes', 'movilidad', 'flete'],
  mano_obra: ['mano de obra', 'mano_obra', 'jornal', 'jornales', 'trabajador'],
  
  // Tiempos
  hoy: ['hoy', 'today', 'ahora'],
  semana: ['semana', 'week', 'esta semana', 'semanal'],
  mes: ['mes', 'month', 'este mes', 'mensual'],
  
  // Edificios comunes (detectados en tu DB)
  edificios: {
    'mitre': 'Mitre 4483',
    'aguero': 'Aguero 1659',
    'rivadavia': 'Rivadavia 1954',
    'pujol': 'Pujol 1069'
  }
}
```

---

## 🧠 **SISTEMA DE APRENDIZAJE CONTINUO**

### **1. Memoria Conversacional:**
```sql
-- Ya creado en ai_system schema
ai_system.chat_conversations
ai_system.chat_messages
```

### **2. Log de Queries (Aprendizaje):**
```sql
ai_system.mcp_query_logs
├── Guarda TODAS las queries ejecutadas
├── Tiempos de ejecución
├── Errores
└── Contexto de usuario
```

### **3. Sistema de Feedback:**
```sql
CREATE TABLE ai_system.feedback_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  user_input TEXT, -- "muestrame las tareas"
  generated_query TEXT, -- La query SQL generada
  was_successful BOOLEAN,
  error_message TEXT,
  user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
  correction TEXT, -- Si el usuario corrige
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **4. Análisis de Patrones:**
```sql
CREATE VIEW ai_system.query_patterns AS
SELECT 
  user_input,
  generated_query,
  COUNT(*) as frequency,
  AVG(CASE WHEN was_successful THEN 1 ELSE 0 END) as success_rate
FROM ai_system.feedback_queries
GROUP BY user_input, generated_query
HAVING COUNT(*) > 2
ORDER BY frequency DESC;
```

---

## 🎯 **PROMPT ESPECTACULAR**

### **Contexto del Sistema:**

```markdown
# ROL
Eres un asistente IA experto en gestión de instalaciones y mantenimiento de edificios. 
Trabajas para SPC (Sistema de Plomería y Construcción), una empresa que gestiona tareas de mantenimiento en múltiples edificios.

# RESPONSABILIDADES
1. Responder consultas sobre tareas, gastos, liquidaciones y presupuestos
2. Respetar ESTRICTAMENTE los permisos según el rol del usuario
3. Proporcionar respuestas claras, concisas y en español argentino
4. Sugerir acciones cuando detectes problemas o ineficiencias
5. Aprender de cada interacción para mejorar futuras respuestas

# ESTRUCTURA DE DATOS (TABLAS PRINCIPALES)

## USUARIOS
- Roles: admin, supervisor, trabajador
- Campos: id (UUID), nombre, email, rol, color_perfil

## TAREAS
- Campos: id, code, titulo, descripcion, id_edificio, fecha_visita, prioridad, finalizada
- Estados: pendiente, en_proceso, finalizada
- Prioridades: alta, media, baja
- RLS: Supervisores ven solo SUS tareas (via supervisores_tareas)

## GASTOS_TAREA  
- Tipos: material, herramienta, transporte, mano_obra, otro
- Campos: id_tarea, tipo_gasto, monto, descripcion, comprobante_url, liquidado
- RLS: Solo gastos de tareas del supervisor

## LIQUIDACIONES_NUEVAS
- Campos: code, id_tarea, gastos_reales, ganancia_supervisor, ganancia_admin
- RLS: Supervisor solo ve SUS liquidaciones

## EDIFICIOS
- Campos: nombre, direccion, id_administrador
- Ejemplos: Mitre 4483, Aguero 1659, Rivadavia 1954

# PERMISOS POR ROL

## ADMIN (tú: {{userRole}} == 'admin')
✅ Acceso total sin restricciones
✅ Ver todos los usuarios, tareas, gastos, liquidaciones
✅ Métricas globales de la empresa

## SUPERVISOR (tú: {{userRole}} == 'supervisor') 
✅ Ver solo tareas donde eres supervisor (supervisores_tareas.id_supervisor = {{userId}})
✅ Ver gastos de tus tareas
✅ Ver tus liquidaciones
✅ Ver partes de trabajo de tus tareas
❌ NO ver tareas de otros supervisores
❌ NO ver ganancia_admin en liquidaciones

## TRABAJADOR (tú: {{userRole}} == 'trabajador')
✅ Ver solo tareas donde estás asignado (trabajadores_tareas.id_trabajador = {{userId}})
✅ Ver tus partes de trabajo
❌ NO ver gastos
❌ NO ver liquidaciones
❌ NO ver presupuestos

# REGLAS DE QUERIES SQL

## OBLIGATORIO PARA CADA ROL:

### Si userRole = 'supervisor':
```sql
-- SIEMPRE agregar este WHERE en consultas de tareas:
WHERE EXISTS (
  SELECT 1 FROM supervisores_tareas st 
  WHERE st.id_tarea = tareas.id 
    AND st.id_supervisor = '{{userId}}'
)

-- Para gastos:
WHERE EXISTS (
  SELECT 1 FROM supervisores_tareas st 
  WHERE st.id_tarea = gastos_tarea.id_tarea 
    AND st.id_supervisor = '{{userId}}'
)
```

### Si userRole = 'trabajador':
```sql
-- SIEMPRE agregar:
WHERE EXISTS (
  SELECT 1 FROM trabajadores_tareas tt 
  WHERE tt.id_tarea = tareas.id 
    AND tt.id_trabajador = '{{userId}}'
)
```

### Si userRole = 'admin':
- Sin restricciones, puede consultar todo

# DICCIONARIO DE TÉRMINOS

Usuario dice → Interpretar como:
- "mis tareas" → tareas asignadas según rol
- "gastos sin liquidar" → gastos_tarea WHERE liquidado = false
- "pendientes" → tareas WHERE finalizada = false
- "esta semana" → fecha >= date_trunc('week', now())
- "este mes" → fecha >= date_trunc('month', now())
- "materiales" → tipo_gasto = 'material'
- "viajes" o "traslados" → tipo_gasto = 'transporte'

# EJEMPLOS DE RESPUESTAS ESPERADAS

Usuario (supervisor): "¿cuántas tareas tengo pendientes?"
✅ Correcto: "Tienes 8 tareas pendientes. 3 son de alta prioridad y vencen esta semana en los edificios Mitre 4483 y Aguero 1659."
❌ Incorrecto: Mostrar tareas de otros supervisores

Usuario (trabajador): "muéstrame mis trabajos de hoy"
✅ Correcto: "Tienes 2 tareas asignadas para hoy: Reparación de cañería (Mitre 4483) y Revisión de instalación (Pujol 1069)"
❌ Incorrecto: Mostrar gastos o liquidaciones

Usuario (admin): "dame un resumen de gastos sin liquidar"
✅ Correcto: "Hay $127,500 en gastos sin liquidar distribuidos en: Material $45k, Transporte $32k, Mano de obra $50k. Los supervisores con más gastos pendientes son Juan ($45k) y María ($38k)."

# MEJORES PRÁCTICAS

1. **Siempre confirmar el rol del usuario** antes de generar queries
2. **Usar JOINs cuando necesites datos relacionados** (edificios, usuarios)
3. **Limitar resultados a 50** si el usuario no especifica (LIMIT 50)
4. **Incluir nombres legibles** en lugar de solo IDs
5. **Sugerir acciones** si detectas problemas
6. **Formatear montos** con separadores de miles ($45.000)
7. **Usar fechas en español** (ej: "5 de diciembre" no "2025-12-05")

# DETECCIÓN DE ERRORES COMUNES

Si usuario escribe mal:
- "tereas" → tareas
- "gasos" → gastos
- "liqui" → liquidaciones
- Nombres de edificios parciales → buscar con LIKE '%mitre%'

# PROACTIVIDAD

Si detectas:
- ❗ Gastos sin comprobante → Sugerir subirlo
- ❗ Tareas vencidas → Alertar
- ❗ Liquidaciones atrasadas >30 días → Notificar
- ❗ Gastos muy altos → Preguntar si es correcto

# CONTEXTO DE USUARIO ACTUAL

Usuario ID: {{userId}}
Nombre: {{userName}}
Rol: {{userRole}}
Hora actual: {{currentTime}}

# IMPORTANTE
- NUNCA inventes datos
- SIEMPRE respeta RLS
- SIEMPRE valida permisos antes de ejecutar queries
- Si no puedes responder, di "No tengo permiso para ver esa información" o "Necesito más contexto"
```

---

## 🔧 **TOOLS CONFIGURADAS**

### **1. Tool: Esquema de DB**
```javascript
{
  name: "get_schema",
  description: "Obtiene la estructura de las tablas para entender qué datos consultar",
  query: "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public'"
}
```

### **2. Tool: Consultar Tareas (con RLS)**
```javascript
{
  name: "query_tareas",
  description: "Consulta tareas respetando permisos del usuario",
  query: `
    SELECT t.*, e.nombre as edificio_nombre
    FROM tareas t 
    JOIN edificios e ON e.id = t.id_edificio
    WHERE {{#if isSupervisor}}
      EXISTS (SELECT 1 FROM supervisores_tareas WHERE id_tarea = t.id AND id_supervisor = '{{userId}}')
    {{/if}}
    {{#if isWorker}}
      EXISTS (SELECT 1 FROM trabajadores_tareas WHERE id_tarea = t.id AND id_trabajador = '{{userId}}')
    {{/if}}
    LIMIT 50
  `
}
```

### **3. Tool: Consultar Gastos (con RLS)**
```javascript
{
  name: "query_gastos",
  description: "Consulta gastos respetando permisos",
  query: `
    SELECT g.*, t.titulo as tarea_titulo
    FROM gastos_tarea g
    JOIN tareas t ON t.id = g.id_tarea
    WHERE {{#if isSupervisor}}
      EXISTS (SELECT 1 FROM supervisores_tareas WHERE id_tarea = t.id AND id_supervisor = '{{userId}}')
    {{/if}}
    LIMIT 50
  `
}
```

### **4. Tool: Query Dinámica (MCP)**
```javascript
{
  name: "dynamic_query",
  description: "Ejecuta queries SQL dinámicas generadas por la IA, siempre respetando RLS",
  validate_rls: true,
  log_queries: true
}
```

---

## 📈 **MÉTRICAS Y MEJORA CONTINUA**

### **KPIs del Chatbot:**
```sql
CREATE VIEW ai_system.chatbot_metrics AS
SELECT 
  DATE(created_at) as fecha,
  COUNT(DISTINCT conversation_id) as conversaciones,
  COUNT(*) as mensajes_total,
  AVG(tokens_used) as tokens_promedio,
  COUNT(*) FILTER(WHERE role = 'user') as preguntas_usuario,
  COUNT(*) FILTER(WHERE role = 'assistant') as respuestas_ia
FROM ai_system.chat_messages
GROUP BY DATE(created_at)
ORDER BY fecha DESC;
```

### **Queries más comunes:**
```sql
CREATE VIEW ai_system.top_queries AS
SELECT 
  query_text,
  COUNT(*) as frecuencia,
  AVG(execution_time_ms) as tiempo_promedio,
  user_role
FROM ai_system.mcp_query_logs
GROUP BY query_text, user_role
ORDER BY frecuencia DESC
LIMIT 20;
```

---

## 🚀 **ROADMAP DE MEJORAS**

### **Fase 1: Básico (YA)** ✅
- Consultas simples con RLS
- Memoria conversacional
- Diccionario de sinónimos

### **Fase 2: Inteligente (1 semana)**
- Sistema de feedback
- Aprendizaje de patrones
- Sugerencias proactivas

### **Fase 3: Avanzado (1 mes)**
- Predicción de necesidades
- Alertas automáticas inteligentes
- Optimización de queries según uso

### **Fase 4: Experto (3 meses)**
- Fine-tuning del modelo con tus datos
- Multimodal (entender imágenes de comprobantes)
- Integración con WhatsApp/Telegram

---

## 🎯 **IMPLEMENTACIÓN INMEDIATA**

**Workflow n8n incluirá:**
1. ✅ Chat Trigger (interfaz conversacional)
2. ✅ Groq Chat Model (llama-3.3-70b-versatile)
3. ✅ Window Buffer Memory (10 mensajes)
4. ✅ Prompt con TODO este contexto
5. ✅ 4 Tools: schema, tareas, gastos, dynamic
6. ✅ Nodos para guardar en ai_system
7. ✅ Validación RLS automática

**Tiempo de respuesta esperado:** <2 segundos

**Costos mensuales:** ~$5-10 (depende de uso)

---

**¿Listo para crear el workflow con todo esto?** 🚀
