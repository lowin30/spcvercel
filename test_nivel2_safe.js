require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

// Verificar que tenemos las credenciales
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('❌ ERROR: Variables de entorno no encontradas')
    console.error('   Asegúrate que .env.local existe con:')
    console.error('   - NEXT_PUBLIC_SUPABASE_URL')
    console.error('   - NEXT_PUBLIC_SUPABASE_ANON_KEY')
    process.exit(1)
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function testNivel2Complete() {
    console.log('🧪 TESTING NIVEL 2 - VERIFICACIÓN AUTOMÁTICA\n')
    console.log('='.repeat(70))
    console.log(`🔗 Conectando a: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`)
    console.log('='.repeat(70))

    const results = {
        migration: false,
        seedData: false,
        rpcFunctions: false
    }

    // ============================================================================
    // FASE 1: Verificar Tablas
    // ============================================================================
    console.log('\n📋 FASE 1: Verificando tablas AI...')

    try {
        const expectedTables = ['ai_categories', 'ai_intents', 'ai_knowledge_docs', 'ai_tool_metadata']
        let foundCount = 0

        for (const tableName of expectedTables) {
            const { count, error } = await supabase
                .from(tableName)
                .select('*', { count: 'exact', head: true })

            if (error) {
                if (error.message.includes('does not exist') || error.code === '42P01') {
                    console.log(`   ❌ ${tableName} - NO EXISTE`)
                } else {
                    console.log(`   ⚠️  ${tableName} - Error: ${error.message}`)
                }
            } else {
                console.log(`   ✅ ${tableName} - OK (${count} registros)`)
                foundCount++
            }
        }

        results.migration = foundCount === 4

        if (results.migration) {
            console.log('\n   ✅ Todas las tablas existen')
        } else {
            console.log(`\n   ❌ Faltan ${4 - foundCount} tablas`)
            console.log('\n   💡 ACCIÓN REQUERIDA:')
            console.log('      1. Abrir Supabase Dashboard → SQL Editor')
            console.log('      2. Copiar nivel2_migration.sql')
            console.log('      3. Ejecutar (Run)')
            console.log('      4. Re-ejecutar: node test_nivel2_safe.js')
            return results
        }

    } catch (e) {
        console.error('   ❌ Error verificando tablas:', e.message)
        return results
    }

    // ============================================================================
    // FASE 2: Verificar Seed Data
    // ============================================================================
    console.log('\n📊 FASE 2: Verificando datos...')

    try {
        const { count: catCount } = await supabase
            .from('ai_categories')
            .select('*', { count: 'exact', head: true })

        const { count: toolCount } = await supabase
            .from('ai_tool_metadata')
            .select('*', { count: 'exact', head: true })

        const { count: intentCount } = await supabase
            .from('ai_intents')
            .select('*', { count: 'exact', head: true })

        console.log(`   Categorías: ${catCount}/6 ${catCount >= 6 ? '✅' : '❌'}`)
        console.log(`   Tools:      ${toolCount}/15 ${toolCount >= 15 ? '✅' : '❌'}`)
        console.log(`   Intents:    ${intentCount}/10 ${intentCount >= 10 ? '✅' : '❌'}`)

        results.seedData = catCount >= 6 && toolCount >= 15 && intentCount >= 10

        if (results.seedData) {
            console.log('\n   ✅ Seed data completo')
        } else {
            console.log('\n   ❌ Seed data incompleto o vacío')
            console.log('\n   💡 ACCIÓN REQUERIDA:')
            console.log('      1. Abrir Supabase Dashboard → SQL Editor (nueva query)')
            console.log('      2. Copiar nivel2_seeddata.sql')
            console.log('      3. Ejecutar (Run)')
            console.log('      4. Re-ejecutar: node test_nivel2_safe.js')
            return results
        }

    } catch (e) {
        console.error('   ❌ Error verificando seed data:', e.message)
        return results
    }

    // ============================================================================
    // FASE 3: Probar RPC Functions
    // ============================================================================
    console.log('\n🔧 FASE 3: Probando RPC functions...')

    // Test: search_tools
    try {
        console.log('\n   → search_tools("pago", "trabajador")')
        const { data, error } = await supabase.rpc('search_tools', {
            query_text: 'pago',
            user_role: 'trabajador'
        })

        if (error) {
            console.error(`   ❌ Error: ${error.message}`)
            console.log('   💡 La función search_tools no existe o tiene permisos incorrectos')
            results.rpcFunctions = false
        } else {
            console.log(`   ✅ Ejecutada OK. Resultados: ${data?.length || 0}`)
            if (data && data.length > 0) {
                data.slice(0, 2).forEach(t => {
                    console.log(`      • ${t.display_name}`)
                })
                results.rpcFunctions = true
            } else {
                console.log('   ⚠️  0 resultados (puede ser normal)')
            }
        }
    } catch (e) {
        console.error(`   ❌ Error: ${e.message}`)
        results.rpcFunctions = false
    }

    // Test: detect_intent
    try {
        console.log('\n   → detect_intent("cuanto cobro")')
        const { data, error } = await supabase.rpc('detect_intent', {
            user_message: 'cuanto cobro'
        })

        if (error) {
            console.error(`   ❌ Error: ${error.message}`)
        } else if (data && data.length > 0) {
            console.log(`   ✅ Intent: "${data[0].intent_name}" → Tool: "${data[0].mapped_tool}"`)
        } else {
            console.log('   ⚠️  No detectó intent')
        }
    } catch (e) {
        console.error(`   ❌ Error: ${e.message}`)
    }

    // Test: search_knowledge
    try {
        console.log('\n   → search_knowledge("manual", "admin")')
        const { data, error } = await supabase.rpc('search_knowledge', {
            query_text: 'manual',
            user_role: 'admin',
            doc_category: null
        })

        if (error) {
            console.error(`   ❌ Error: ${error.message}`)
        } else {
            console.log(`   ✅ Ejecutada OK. Docs: ${data?.length || 0} (normal si es 0)`)
        }
    } catch (e) {
        console.error(`   ❌ Error: ${e.message}`)
    }

    // ============================================================================
    // RESUMEN
    // ============================================================================
    console.log('\n' + '='.repeat(70))
    console.log('\n📊 RESUMEN:\n')

    console.log(`   ✅ Migration ejecutado:     ${results.migration ? 'SÍ' : 'NO'}`)
    console.log(`   ✅ Seed data insertado:     ${results.seedData ? 'SÍ' : 'NO'}`)
    console.log(`   ✅ RPC functions OK:        ${results.rpcFunctions ? 'SÍ' : 'NO'}`)

    console.log('\n' + '='.repeat(70))

    const allPassed = results.migration && results.seedData && results.rpcFunctions

    if (allPassed) {
        console.log('\n🎉 ¡NIVEL 2 FUNCIONANDO PERFECTAMENTE!\n')
        console.log('✅ Próximos pasos:')
        console.log('   1. Ver nivel2_integracion.md para integrar en Next.js')
        console.log('   2. Modificar app/api/chat/route.ts (system prompt)')
        console.log('   3. Subir PDFs a knowledge base\n')
    } else {
        console.log('\n⚠️  Nivel 2 NO completado aún\n')
        console.log('   Seguir las instrucciones arriba marcadas con 💡\n')
    }

    return { allPassed, results }
}

// Ejecutar
testNivel2Complete()
    .then(({ allPassed }) => process.exit(allPassed ? 0 : 1))
    .catch(err => {
        console.error('\n💥 Error fatal:', err.message)
        process.exit(1)
    })
