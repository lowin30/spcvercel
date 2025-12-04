// deno-lint-ignore-file no-explicit-any
import { createClient } from 'jsr:@supabase/supabase-js@2'

// Groq API compatible con OpenAI
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

// Sistema de prompts por rol con filtros RLS
const SYSTEM_PROMPTS = {
  admin: `Eres un asistente IA para administradores del sistema SPC de gestión de facility management.

MEMORIA Y CONTEXTO:
- Recuerdas la conversación actual (puedes ver mensajes anteriores arriba)
- Eres ADMINISTRADOR con acceso total al sistema
- "Tareas del administrador X" significa "tareas donde X es SUPERVISOR"
- Admin y Supervisor son roles diferentes

TU PERSONALIDAD:
- Profesional pero amigable y conversacional
- Proactivo: ofreces sugerencias relevantes
- Explicas brevemente tus respuestas
- Haces seguimiento del contexto de la conversación

FORMATO DE RESPUESTAS:
- CONCISO: 2-4 líneas máximo
- ESTRUCTURADO: usa viñetas (-) si hay lista
- NÚMEROS: si hay >10 resultados, muestra 3-5 ejemplos + "...y X más"
- SEGUIMIENTO: termina con pregunta o sugerencia de acción

EJEMPLOS DE CONVERSACIÓN:

Usuario: "¿cuántas tareas sin finalizar hay?"
Tú: "Hay 24 tareas sin finalizar en el sistema. Las más urgentes por fecha: Mitre 4483 piso 4, Aguero 1659, Rivadavia 1954. ¿Quieres filtrar por edificio o supervisor?"

Usuario: "del supervisor juan"
Tú: "Juan tiene 8 tareas pendientes: Pujol 1069, Yrigoyen 1983, Billinghurst 415 ...y 5 más. ¿Quieres ver detalles de alguna?"

Usuario: "la primera"
Tú: "Pujol 1069 - Problemas varios (sin finalizar). ¿Necesitas más info o quieres marcarla como finalizada?"`,

  supervisor: `Eres un asistente inteligente para supervisores del sistema SPC.

SEGURIDAD RLS:
- SOLO puedes ver TUS propias tareas, liquidaciones y gastos (ID: {user_id})
- NUNCA muestres datos de otros supervisores
- Si preguntan por otros supervisores, rechaza

INSTRUCCIONES:
- Responde CONCISO (máximo 3-4 líneas)
- Si hay más de 10 resultados, muestra solo 5 y di "...y X más"
- Sé directo y claro
- Usa lenguaje simple

EJEMPLO:
Usuario: "¿cuántas tareas tengo pendientes?"
Tú: "Tienes 8 tareas pendientes. Las más próximas son: [lista 3] ...y 5 más."`,

  trabajador: `Eres un asistente inteligente del trabajador en el sistema SPC.
IMPORTANTE: Solo puedes ver tus propios partes de trabajo (ID: {user_id}).
NUNCA muestres datos de otros trabajadores o supervisores.
Si el usuario pregunta por datos que no le corresponden, rechaza cortésmente.
Cuando hagas consultas a la base de datos, SIEMPRE filtra por id_trabajador = '{user_id}'.
Responde en español, de forma concisa y amigable.`
}

// Funciones disponibles por rol (con RLS automático)
const FUNCTIONS_BY_ROLE = {
  supervisor: [
    {
      name: 'obtener_mis_tareas',
      description: 'Obtiene las tareas asignadas al supervisor actual. Puede filtrar por estado.',
      parameters: {
        type: 'object',
        properties: {
          estado: {
            type: 'string',
            enum: ['activas', 'finalizadas', 'todas'],
            description: 'Estado de las tareas a buscar'
          },
          limite: {
            type: 'number',
            description: 'Número máximo de tareas a retornar',
            default: 10
          }
        },
        required: ['estado']
      }
    },
    {
      name: 'obtener_mis_liquidaciones',
      description: 'Obtiene las liquidaciones del supervisor actual, opcionalmente filtradas por mes.',
      parameters: {
        type: 'object',
        properties: {
          mes: {
            type: 'string',
            description: 'Mes en formato YYYY-MM (ejemplo: 2025-12)',
            pattern: '^\\d{4}-\\d{2}$'
          }
        }
      }
    },
    {
      name: 'buscar_en_tareas',
      description: 'Busca tareas del supervisor usando búsqueda inteligente (ignora acentos, errores tipográficos).',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Término de búsqueda'
          }
        },
        required: ['query']
      }
    },
    {
      name: 'obtener_gastos_pendientes',
      description: 'Obtiene gastos sin liquidar del supervisor.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  ],

  trabajador: [
    {
      name: 'obtener_mis_partes',
      description: 'Obtiene los partes de trabajo del trabajador actual.',
      parameters: {
        type: 'object',
        properties: {
          fecha_desde: {
            type: 'string',
            description: 'Fecha desde en formato YYYY-MM-DD',
            pattern: '^\\d{4}-\\d{2}-\\d{2}$'
          },
          limite: {
            type: 'number',
            default: 20
          }
        }
      }
    }
  ],

  admin: [
    {
      name: 'obtener_estadisticas_globales',
      description: 'Obtiene estadísticas globales del sistema.',
      parameters: {
        type: 'object',
        properties: {
          periodo: {
            type: 'string',
            enum: ['hoy', 'semana', 'mes'],
            default: 'hoy'
          }
        }
      }
    },
    {
      name: 'buscar_tareas_global',
      description: 'Busca y filtra tareas en todo el sistema (admin only). Puede buscar por texto, filtrar por estado (finalizadas o sin finalizar), o ambos.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Término de búsqueda en titulo o descripcion (opcional)'
          },
          estado: {
            type: 'string',
            enum: ['todas', 'activas', 'finalizadas'],
            description: 'Filtrar por estado: activas (sin finalizar), finalizadas, o todas',
            default: 'todas'
          }
        }
      }
    }
  ]
}

Deno.serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[ai-chat-secure] Request recibido')
    
    // 1. Validar autenticación
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.log('[ai-chat-secure] Sin Authorization header')
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { 
          status: 401, 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          } 
        }
      )
    }
    
    console.log('[ai-chat-secure] Authorization header OK')

    // Crear cliente Supabase con el token del usuario
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    )

    // 2. Obtener usuario actual
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      console.log('[ai-chat-secure] Error obteniendo usuario:', userError?.message)
      return new Response(
        JSON.stringify({ error: 'Usuario no válido', details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log('[ai-chat-secure] Usuario autenticado:', user.id)

    // 3. Obtener rol del usuario desde la BD (CRÍTICO: no confiar en JWT)
    const { data: userData, error: userDataError } = await supabaseClient
      .from('usuarios')
      .select('rol, nombre')
      .eq('id', user.id)
      .single()

    if (userDataError || !userData) {
      return new Response(
        JSON.stringify({ error: 'Usuario no encontrado en la base de datos' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Parsear request
    const { pregunta, contexto, historial } = await req.json()

    if (!pregunta || typeof pregunta !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Pregunta inválida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log('[ai-chat-secure] Historial de mensajes:', historial?.length || 0)

    // 5. Seleccionar prompt según rol
    const systemPrompt = (SYSTEM_PROMPTS as any)[userData.rol]?.replace(/{user_id}/g, user.id)

    if (!systemPrompt) {
      return new Response(
        JSON.stringify({ error: 'Rol no soportado' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 6. Funciones disponibles según rol
    const availableFunctions = (FUNCTIONS_BY_ROLE as any)[userData.rol] || []

    // 7. Preparar mensajes para Groq con memoria conversacional
    const messages = [
      { role: 'system', content: systemPrompt },
      // Incluir historial de conversación (últimos 10 mensajes)
      ...(historial || []),
      {
        role: 'user',
        content: `Usuario: ${userData.nombre} (${userData.rol})
Página actual: ${contexto || 'dashboard'}
Fecha: ${new Date().toLocaleDateString('es-AR')}

Pregunta actual: ${pregunta}`
      }
    ]
    
    console.log('[ai-chat-secure] Total de mensajes enviados a Groq:', messages.length)

    // 8. Llamar a Groq API (compatible con OpenAI)
    console.log('[ai-chat-secure] Llamando a Groq API...')
    const groqApiKey = Deno.env.get('GROQ_API_KEY')
    if (!groqApiKey) {
      console.error('[ai-chat-secure] GROQ_API_KEY no está configurada')
      return new Response(
        JSON.stringify({ error: 'Configuración incorrecta del servidor' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        functions: availableFunctions.length > 0 ? availableFunctions : undefined,
        function_call: availableFunctions.length > 0 ? 'auto' : undefined,
        temperature: 0.7,
        max_tokens: 1000
      })
    })

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text()
      console.error('[ai-chat-secure] Groq API error:', groqResponse.status, errorText)
      return new Response(
        JSON.stringify({ error: 'Error al procesar la pregunta con IA', details: errorText.substring(0, 200) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log('[ai-chat-secure] Respuesta de Groq OK')

    const groqData = await groqResponse.json()
    const message = groqData.choices[0].message

    // 9. Si la IA quiere llamar una función, ejecutarla con RLS
    if (message.function_call) {
      const functionName = message.function_call.name
      const functionArgs = JSON.parse(message.function_call.arguments)

      console.log(`Ejecutando función: ${functionName}`, functionArgs)

      // Ejecutar función con RLS automático
      const functionResult = await executeFunctionWithRLS(
        supabaseClient,
        functionName,
        functionArgs,
        user.id,
        userData.rol
      )

      // Llamar a Groq nuevamente con el resultado
      const finalGroqResponse = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('GROQ_API_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            ...messages,
            message,
            {
              role: 'function',
              name: functionName,
              content: JSON.stringify(functionResult)
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        })
      })

      const finalGroqData = await finalGroqResponse.json()
      const finalMessage = finalGroqData.choices[0].message

      return new Response(
        JSON.stringify({
          respuesta: finalMessage.content,
          function_called: functionName,
          function_args: functionArgs
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 10. Respuesta simple (sin function call)
    return new Response(
      JSON.stringify({
        respuesta: message.content
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error en ai-chat-secure:', error)
    
    let errorDetails
    if (error instanceof Error) {
      errorDetails = {
        message: error.message,
        stack: error.stack?.substring(0, 500)
      }
    } else if (typeof error === 'object' && error !== null) {
      errorDetails = JSON.stringify(error, null, 2)
    } else {
      errorDetails = String(error)
    }
    
    return new Response(
      JSON.stringify({ 
        error: 'Error interno del servidor',
        details: errorDetails
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Ejecutar funciones con RLS automático
async function executeFunctionWithRLS(
  supabase: any,
  functionName: string,
  args: any,
  userId: string,
  userRole: string
): Promise<any> {
  try {
    switch (functionName) {
      // SUPERVISOR FUNCTIONS
      case 'obtener_mis_tareas': {
        console.log('[executeFunctionWithRLS] obtener_mis_tareas:', args)
        
        // Usar RPC function que respeta RLS
        const { data, error } = await supabase.rpc('obtener_tareas_supervisor', {
          p_estado: args.estado || 'todas',
          p_limit: args.limite || 10
        })

        if (error) {
          console.error('[executeFunctionWithRLS] Error en obtener_tareas_supervisor:', error)
          throw error
        }
        
        console.log('[executeFunctionWithRLS] Tareas encontradas:', data?.length || 0)
        return data || []
      }

      case 'obtener_mis_liquidaciones': {
        const query = supabase
          .from('liquidaciones_nuevas')
          .select(`
            id,
            created_at,
            ganancia_supervisor,
            total_presupuesto,
            aprobada
          `)
          .order('created_at', { ascending: false })
          .limit(20)

        if (args.mes) {
          query
            .gte('created_at', `${args.mes}-01`)
            .lt('created_at', `${args.mes}-32`)
        }

        const { data, error } = await query

        if (error) throw error
        return data || []
      }

      case 'buscar_en_tareas': {
        // Búsqueda simple mientras implementamos la función RPC
        const { data, error } = await supabase
          .rpc('obtener_tareas_supervisor', {
            p_estado: 'todas',
            p_limit: 20
          })

        if (error) throw error
        
        // Filtrar en memoria por query
        const filtered = (data || []).filter((tarea: any) => {
          const searchText = `${tarea.titulo} ${tarea.descripcion}`.toLowerCase()
          return searchText.includes(args.query.toLowerCase())
        })
        
        return filtered.slice(0, 10)
      }

      case 'obtener_gastos_pendientes': {
        const { data, error } = await supabase
          .from('gastos_tarea')
          .select(`
            id,
            monto,
            descripcion,
            tipo_gasto,
            comprobante_url,
            tareas(titulo)
          `)
          .eq('liquidado', false)
          .order('created_at', { ascending: false })
          .limit(20)

        if (error) throw error
        return data || []
      }

      // TRABAJADOR FUNCTIONS
      case 'obtener_mis_partes': {
        const query = supabase
          .from('partes_de_trabajo')
          .select(`
            id,
            fecha,
            tipo_jornada,
            liquidado,
            tareas(titulo, edificios(nombre))
          `)
          .order('fecha', { ascending: false })
          .limit(args.limite || 20)

        if (args.fecha_desde) {
          query.gte('fecha', args.fecha_desde)
        }

        const { data, error } = await query

        if (error) throw error
        return data || []
      }

      // ADMIN FUNCTIONS
      case 'obtener_estadisticas_globales': {
        if (userRole !== 'admin') {
          throw new Error('Acceso denegado: solo administradores')
        }

        // Aquí podrías llamar a una vista o RPC específica para admins
        const { data, error } = await supabase
          .rpc('obtener_estadisticas_dashboard')

        if (error) throw error
        return data || {}
      }

      case 'buscar_tareas_global': {
        if (userRole !== 'admin') {
          throw new Error('Acceso denegado: solo administradores')
        }

        console.log('[buscar_tareas_global] Args:', args)

        // Query directo a tareas (admin puede ver todo)
        let query = supabase
          .from('tareas')
          .select(`
            id,
            titulo,
            descripcion,
            finalizada,
            fecha_visita,
            edificios(nombre, direccion)
          `)
          .order('fecha_visita', { ascending: false })
          .limit(100)

        // Filtrar por estado
        const estado = args.estado || 'todas'
        if (estado === 'activas') {
          query = query.eq('finalizada', false)
        } else if (estado === 'finalizadas') {
          query = query.eq('finalizada', true)
        }

        // Filtrar por query si existe (busca en titulo y descripcion)
        if (args.query) {
          query = query.or(`titulo.ilike.%${args.query}%,descripcion.ilike.%${args.query}%`)
        }

        const { data, error } = await query

        if (error) {
          console.error('[buscar_tareas_global] Error:', error)
          throw error
        }
        
        console.log('[buscar_tareas_global] Encontradas:', data?.length || 0, 'Estado:', estado)
        return data || []
      }

      default:
        throw new Error(`Función desconocida: ${functionName}`)
    }
  } catch (error) {
    console.error(`Error ejecutando función ${functionName}:`, error)
    throw error
  }
}
