# 🔌 MCP (Model Context Protocol) + Supabase + n8n

## 🎯 **¿QUÉ ES MCP?**

**Model Context Protocol** es un estándar abierto que conecta sistemas de IA con herramientas externas y fuentes de datos.

### **Ventajas de MCP:**
- ✅ La IA puede ejecutar queries dinámicas en tu BD
- ✅ Contexto automático según usuario/rol
- ✅ Consultas inteligentes sin definir cada función
- ✅ Estándar abierto (OpenAI, Anthropic, etc.)

---

## 📊 **MCP EN n8n: ESTADO ACTUAL**

### **⚠️ REALIDAD:**
n8n **NO tiene soporte nativo completo** para MCP todavía (Diciembre 2024)

### **✅ ALTERNATIVA: MCP Simulado**
Podemos simular MCP usando **nodos Code** + **Supabase RPC**

---

## 🛠️ **OPCIÓN 1: MCP SIMULADO CON CODE NODE**

### **Paso 1: Crear RPC Function en Supabase**

Ejecuta en Supabase SQL Editor:

```sql
-- Función que ejecuta queries seguras con contexto de usuario
CREATE OR REPLACE FUNCTION public.ejecutar_query_mcp(
  p_query_template TEXT,
  p_params JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_query TEXT;
  v_result JSONB;
BEGIN
  -- Obtener contexto del usuario autenticado
  v_user_id := auth.uid();
  
  SELECT rol INTO v_user_role
  FROM public.usuarios
  WHERE id = v_user_id;
  
  -- Validar que solo sean SELECT (seguridad)
  IF p_query_template !~* '^SELECT' THEN
    RAISE EXCEPTION 'Solo se permiten queries SELECT';
  END IF;
  
  -- Reemplazar placeholders con contexto
  v_query := p_query_template;
  v_query := replace(v_query, '{{user_id}}', v_user_id::TEXT);
  v_query := replace(v_query, '{{user_role}}', quote_literal(v_user_role));
  
  -- Agregar parámetros adicionales
  IF p_params IS NOT NULL THEN
    v_query := format(v_query, VARIADIC (
      SELECT array_agg(value::TEXT)
      FROM jsonb_each_text(p_params)
    ));
  END IF;
  
  -- Ejecutar query con RLS activo
  EXECUTE format('SELECT COALESCE(json_agg(t), ''[]''::json) FROM (%s) t', v_query) 
  INTO v_result;
  
  RETURN v_result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.ejecutar_query_mcp TO authenticated;
```

### **Paso 2: Crear Tool MCP en n8n**

1. En tu workflow, agrega nodo **"Code"**
2. Configura como **Tool** para AI Agent
3. Código:

```javascript
// Tool MCP Simulado
const { query, params } = $input.all()[0].json;

// Obtener cliente Supabase con Service Role
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://fodyzgjwoccpsjmfinvm.supabase.co',
  'TU_SERVICE_ROLE_KEY'
);

// Ejecutar query con contexto MCP
const { data, error } = await supabase.rpc('ejecutar_query_mcp', {
  p_query_template: query,
  p_params: params || {}
});

if (error) {
  throw new Error(`MCP Error: ${error.message}`);
}

return {
  json: {
    success: true,
    data: data,
    query: query
  }
};
```

4. Configurar Tool:
   ```
   Name: query_database_mcp
   Description: "Executes dynamic SQL queries on Supabase with user context. Use this when you need to query the database with custom filters or complex joins. Supports placeholders: {{user_id}}, {{user_role}}"
   ```

5. Conectar al AI Agent

### **Paso 3: Probar**

Pregunta al chatbot:
```
"Muéstrame todas mis tareas del mes pasado que tienen gastos sin liquidar"
```

La IA debería ejecutar:
```sql
SELECT t.*, g.*
FROM tareas t
JOIN supervisores_tareas st ON st.id_tarea = t.id
JOIN gastos_tarea g ON g.id_tarea = t.id
WHERE st.id_supervisor = {{user_id}}
  AND t.fecha_visita >= NOW() - INTERVAL '1 month'
  AND g.liquidado = false
```

---

## 🛠️ **OPCIÓN 2: MCP COMPLETO CON SERVIDOR EXTERNO**

### **Arquitectura:**
```
n8n → HTTP Request → MCP Server → Supabase
                     (Node.js)
```

### **Ventajas:**
- ✅ MCP estándar completo
- ✅ Más control sobre contexto
- ✅ Cache de queries

### **Desventajas:**
- ❌ Requiere servidor adicional
- ❌ Más complejo de mantener

### **Implementación (si quieres):**

**1. Crear servidor MCP (Node.js)**

Archivo: `mcp-server/index.js`

```javascript
import { createMCPServer } from '@modelcontextprotocol/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const server = createMCPServer({
  name: 'supabase-mcp',
  version: '1.0.0',
  
  tools: [
    {
      name: 'query_database',
      description: 'Execute SQL queries with RLS context',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          userId: { type: 'string' },
          userRole: { type: 'string' }
        },
        required: ['query', 'userId']
      },
      handler: async ({ query, userId, userRole }) => {
        // Ejecutar con contexto
        const { data, error } = await supabase.rpc('ejecutar_query_mcp', {
          p_query_template: query,
          p_params: { user_id: userId, user_role: userRole }
        });
        
        if (error) throw error;
        return { data };
      }
    }
  ]
});

server.listen(3001);
```

**2. Dockerizar**

Archivo: `mcp-server/Dockerfile`

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["node", "index.js"]
```

**3. Conectar desde n8n**

Usar nodo **HTTP Request** apuntando a tu MCP server.

---

## 🎯 **RECOMENDACIÓN: ¿QUÉ USAR?**

### **Para tu caso (SPC):**

✅ **OPCIÓN 1: MCP Simulado** (Recomendado)

**Razones:**
- ✅ Más simple
- ✅ No requiere servidor adicional
- ✅ Suficiente para tus necesidades
- ✅ Fácil de mantener
- ✅ Ya tienes RPC functions

### **Cuándo usar OPCIÓN 2:**
- ❌ Si necesitas MCP para múltiples servicios (no solo Supabase)
- ❌ Si necesitas cache complejo
- ❌ Si tienes equipo DevOps para mantenerlo

---

## 📊 **COMPARATIVA: Tools Estáticos vs MCP**

### **Tools Estáticos (actual):**
```javascript
// Definido en n8n
Tool: "buscar_tareas_pendientes"
Query: SELECT * FROM tareas WHERE finalizada = false
```

**Pros:**
- ✅ Simple
- ✅ Seguro (queries predefinidas)
- ✅ Fácil de debuggear

**Cons:**
- ❌ Limitado a queries predefinidas
- ❌ No flexible

### **MCP (dinámico):**
```javascript
// La IA decide el query
Tool: "query_database_mcp"
Query: "SELECT * FROM tareas WHERE finalizada = false AND fecha_visita < NOW()"
```

**Pros:**
- ✅ Queries dinámicas
- ✅ Mucho más flexible
- ✅ La IA puede hacer JOINs complejos

**Cons:**
- ❌ Más riesgo de SQL injection (mitigado con RPC)
- ❌ Más difícil de debuggear

---

## 🚀 **IMPLEMENTACIÓN RÁPIDA PARA TI**

### **Paso 1: Ejecutar SQL**
Ejecuta `06-MCP-SUPABASE-RPC.sql` (creado a continuación)

### **Paso 2: Agregar Tool MCP a tu workflow**
1. Abre tu workflow en n8n
2. Agrega nodo **"Code"**
3. Copia el código de "Paso 2" arriba
4. Conéctalo al AI Agent

### **Paso 3: Probar**
```
Usuario: "muéstrame tareas del último mes con gastos no liquidados"
IA: *Ejecuta query dinámico con MCP*
```

---

## 💡 **CON TUS API KEYS ACTUALES PUEDO:**

### **✅ Groq API Key:**
- Chatbot IA ultra rápido
- Análisis inteligente de queries
- Generación de SQL a partir de lenguaje natural

### **✅ n8n API Key:**
- Crear workflows programáticamente
- Ejecutar workflows desde app
- Monitorear ejecuciones

### **⚠️ Supabase Service Key (necesaria):**
- Ejecutar MCP con bypass RLS temporal
- Crear/modificar RPC functions
- Acceso completo a BD

---

## 📋 **CHECKLIST: IMPLEMENTAR MCP**

- [ ] 1. Ejecutar SQL de RPC function MCP
- [ ] 2. Agregar nodo Code en workflow
- [ ] 3. Configurar como Tool
- [ ] 4. Conectar Service Role Key
- [ ] 5. Probar query dinámico
- [ ] 6. Ajustar prompt de IA para usar MCP

---

## ⚠️ **IMPORTANTE: SEGURIDAD**

### **MCP expone más poder a la IA**

**Mitigaciones implementadas:**
1. ✅ Solo queries SELECT (no DELETE/UPDATE)
2. ✅ RLS activo siempre
3. ✅ Validación de SQL injection
4. ✅ Contexto de usuario obligatorio
5. ✅ Timeout de 10 segundos
6. ✅ Logs de todas las queries

**Nunca permitir:**
- ❌ Queries sin WHERE clause
- ❌ DROP/TRUNCATE/ALTER
- ❌ Bypass de RLS sin validación

---

## 🎯 **CONCLUSIÓN**

**MCP es poderoso pero NO necesario para tu caso.**

**Recomendación:**
1. Empieza con **Tools estáticos** (ya los tienes) ✅
2. Si necesitas más flexibilidad → **MCP Simulado** (Opción 1)
3. Solo si REALMENTE lo necesitas → **MCP Server** (Opción 2)

**Para el 90% de casos, Tools estáticos son suficientes.**

---

**¿Quieres que cree el SQL para MCP ahora?**
