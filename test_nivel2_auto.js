const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function testNivel2Complete() {
    console.log('🧪 TESTING NIVEL 2 - VERIFICACIÓN COMPLETA\n')
    console.log('='.repeat(60))

    let allTestsPassed = true
    const results = {
        migration: false,
        seedData: false,
        rpcFunctions: false,
        triggers: false
    }

    // ============================================================================
    // FASE 1: Verificar que Migration se ejecutó
    // ============================================================================
    console.log('\n📋 FASE 1: Verificando tablas creadas...')

    try {
        const { data: tables, error } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public')
            .like('table_name', 'ai_%')

        if (error) throw error

        const expectedTables = ['ai_categories', 'ai_intents', 'ai_knowledge_docs', 'ai_tool_metadata']
        const foundTables = tables?.map(t => t.table_name) || []

        console.log(`   Tablas encontradas: ${foundTables.length}/4`)

        expectedTables.forEach(table => {
            const exists = foundTables.includes(table)
            console.log(`   ${exists ? '✅' : '❌'} ${table}`)
            if (!exists) allTestsPassed = false
        })

        results.migration = foundTables.length === 4

        if (results.migration) {
            console.log('\n   ✅ Migration ejecutado correctamente')
        } else {
            console.log('\n   ⚠️  Migration NO ejecutado. Ejecutar nivel2_migration.sql en Supabase')
            return results
        }

    } catch (e) {
        console.error('   ❌ Error verificando tablas:', e.message)
        allTestsPassed = false
        return results
    }

    // ============================================================================
    // FASE 2: Verificar Seed Data
    // ============================================================================
    console.log('\n📊 FASE 2: Verificando datos insertados...')

    try {
        // Contar categorías
        const { count: catCount, error: catError } = await supabase
            .from('ai_categories')
            .select('*', { count: 'exact', head: true })

        console.log(`   Categorías: ${catCount}/6 ${catCount === 6 ? '✅' : '❌'}`)

        // Contar tools
        const { count: toolCount, error: toolError } = await supabase
            .from('ai_tool_metadata')
            .select('*', { count: 'exact', head: true })

        console.log(`   Tools: ${toolCount}/15 ${toolCount === 15 ? '✅' : '❌'}`)

        // Contar intents
        const { count: intentCount, error: intentError } = await supabase
            .from('ai_intents')
            .select('*', { count: 'exact', head: true })

        console.log(`   Intents: ${intentCount}/10 ${intentCount === 10 ? '✅' : '❌'}`)

        results.seedData = catCount === 6 && toolCount === 15 && intentCount === 10

        if (results.seedData) {
            console.log('\n   ✅ Seed data completo')
        } else {
            console.log('\n   ⚠️  Seed data incompleto. Ejecutar nivel2_seeddata.sql')
            if (catCount === 0 && toolCount === 0 && intentCount === 0) {
                console.log('   💡 Parece que seed data NO se ejecutó aún')
            }
        }

    } catch (e) {
        console.error('   ❌ Error verificando seed data:', e.message)
        allTestsPassed = false
    }

    // ============================================================================
    // FASE 3: Verificar RPC Functions
    // ============================================================================
    console.log('\n🔧 FASE 3: Probando funciones RPC...')

    // Test 3.1: search_tools
    try {
        console.log('\n   Test 3.1: search_tools("pago", "trabajador")')
        const { data, error } = await supabase.rpc('search_tools', {
            query_text: 'pago',
            user_role: 'trabajador'
        })

        if (error) {
            console.error('   ❌ Error:', error.message)
            if (error.message.includes('does not exist')) {
                console.log('   💡 Función NO existe. Verificar que migration se ejecutó completo')
            }
            allTestsPassed = false
        } else {
            console.log(`   ✅ Función ejecutada. Resultados: ${data?.length || 0}`)
            if (data && data.length > 0) {
                data.slice(0, 3).forEach(t => {
                    console.log(`      - ${t.display_name} (relevancia: ${Math.round((t.relevance || 0) * 100)}%)`)
                })
                results.rpcFunctions = true
            } else {
                console.log('   ⚠️  No devolvió resultados (puede ser normal si no hay datos)')
            }
        }
    } catch (e) {
        console.error('   ❌ Error ejecutando search_tools:', e.message)
        allTestsPassed = false
    }

    // Test 3.2: detect_intent
    try {
        console.log('\n   Test 3.2: detect_intent("cuanto cobro")')
        const { data, error } = await supabase.rpc('detect_intent', {
            user_message: 'cuanto cobro'
        })

        if (error) {
            console.error('   ❌ Error:', error.message)
            allTestsPassed = false
        } else {
            if (data && data.length > 0) {
                console.log(`   ✅ Intent detectado: "${data[0].intent_name}"`)
                console.log(`      Tool mapeado: "${data[0].mapped_tool}"`)
                console.log(`      Confianza: ${Math.round((data[0].confidence_score || 0) * 100)}%`)
            } else {
                console.log('   ⚠️  No detectó intent (verificar seed data)')
            }
        }
    } catch (e) {
        console.error('   ❌ Error ejecutando detect_intent:', e.message)
        allTestsPassed = false
    }

    // Test 3.3: search_knowledge
    try {
        console.log('\n   Test 3.3: search_knowledge("manual", "admin")')
        const { data, error } = await supabase.rpc('search_knowledge', {
            query_text: 'manual',
            user_role: 'admin'
        })

        if (error) {
            console.error('   ❌ Error:', error.message)
            allTestsPassed = false
        } else {
            console.log(`   ✅ Función ejecutada. Docs encontrados: ${data?.length || 0}`)
            console.log('      (Normal que sea 0, aún no hay PDFs subidos)')
        }
    } catch (e) {
        console.error('   ❌ Error ejecutando search_knowledge:', e.message)
        allTestsPassed = false
    }

    // ============================================================================
    // FASE 4: Verificar Columnas Extendidas
    // ============================================================================
    console.log('\n🔄 FASE 4: Verificando extensiones a tablas existentes...')

    try {
        // Verificar user_vocabulary tiene nuevas columnas
        const { data: vocabSample } = await supabase
            .from('user_vocabulary')
            .select('id, category, usage_count')
            .limit(1)

        if (vocabSample !== null) {
            console.log('   ✅ user_vocabulary extendida correctamente')
        }

        // Verificar chat_history tiene nuevas columnas
        const { data: chatSample } = await supabase
            .from('chat_history')
            .select('id, tool_used, intent_detected')
            .limit(1)

        if (chatSample !== null) {
            console.log('   ✅ chat_history extendida correctamente')
        }

    } catch (e) {
        console.error('   ❌ Error verificando columnas:', e.message)
        console.log('   💡 Puede ser que las columnas no existan aún (migration no ejecutado)')
        allTestsPassed = false
    }

    // ============================================================================
    // RESUMEN FINAL
    // ============================================================================
    console.log('\n' + '='.repeat(60))
    console.log('\n📊 RESUMEN DE RESULTADOS:\n')

    console.log(`   Migration:      ${results.migration ? '✅ OK' : '❌ PENDIENTE'}`)
    console.log(`   Seed Data:      ${results.seedData ? '✅ OK' : '❌ PENDIENTE'}`)
    console.log(`   RPC Functions:  ${results.rpcFunctions ? '✅ OK' : '❌ VERIFICAR'}`)

    console.log('\n' + '='.repeat(60))

    if (results.migration && results.seedData && results.rpcFunctions) {
        console.log('\n🎉 ¡NIVEL 2 FUNCIONANDO CORRECTAMENTE!')
        console.log('\n✅ Próximos pasos:')
        console.log('   1. Integrar en Next.js (ver nivel2_integracion.md)')
        console.log('   2. Subir primeros PDFs a knowledge base')
        console.log('   3. Modificar system prompt en app/api/chat/route.ts')
    } else if (!results.migration) {
        console.log('\n⚠️  ACCIÓN REQUERIDA: Ejecutar Migration')
        console.log('\n📝 Pasos:')
        console.log('   1. Abrir Supabase Dashboard → SQL Editor')
        console.log('   2. Copiar contenido de: nivel2_migration.sql')
        console.log('   3. Pegar y ejecutar (Run)')
        console.log('   4. Re-ejecutar este test: node test_nivel2_auto.js')
    } else if (!results.seedData) {
        console.log('\n⚠️  ACCIÓN REQUERIDA: Ejecutar Seed Data')
        console.log('\n📝 Pasos:')
        console.log('   1. Abrir Supabase Dashboard → SQL Editor (nueva query)')
        console.log('   2. Copiar contenido de: nivel2_seeddata.sql')
        console.log('   3. Pegar y ejecutar (Run)')
        console.log('   4. Re-ejecutar este test: node test_nivel2_auto.js')
    } else {
        console.log('\n⚠️  Algunas verificaciones fallaron')
        console.log('   Revisar mensajes de error arriba')
        console.log('   Consultar: nivel2_testing.md sección Debugging')
    }

    console.log('\n')

    return {
        allPassed: results.migration && results.seedData && results.rpcFunctions,
        results
    }
}

// Ejecutar tests
testNivel2Complete()
    .then(({ allPassed, results }) => {
        process.exit(allPassed ? 0 : 1)
    })
    .catch(err => {
        console.error('\n💥 Error fatal:', err)
        process.exit(1)
    })
