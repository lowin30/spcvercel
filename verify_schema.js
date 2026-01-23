const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function verifySchema() {
    console.log('🔍 Verificando esquema de tablas existentes...\n')

    // 1. Verificar user_vocabulary
    console.log('📋 TABLA: user_vocabulary')
    const { data: vocab, error: vocabError } = await supabase
        .from('user_vocabulary')
        .select('*')
        .limit(1)

    if (vocabError) {
        console.error('❌ Error:', vocabError)
    } else {
        console.log('Columnas:', vocab?.[0] ? Object.keys(vocab[0]) : 'Tabla vacía')
        console.log('Ejemplo:', JSON.stringify(vocab?.[0], null, 2))
    }

    // 2. Verificar chat_history
    console.log('\n📋 TABLA: chat_history')
    const { data: chat, error: chatError } = await supabase
        .from('chat_history')
        .select('*')
        .limit(1)

    if (chatError) {
        console.error('❌ Error:', chatError)
    } else {
        console.log('Columnas:', chat?.[0] ? Object.keys(chat[0]) : 'Tabla vacía')
        console.log('Ejemplo:', JSON.stringify(chat?.[0], null, 2))
    }

    // 3. Verificar usuarios (para FK)
    console.log('\n📋 TABLA: usuarios')
    const { data: users, error: usersError } = await supabase
        .from('usuarios')
        .select('id, rol')
        .limit(1)

    if (usersError) {
        console.error('❌ Error:', usersError)
    } else {
        console.log('Columnas:', users?.[0] ? Object.keys(users[0]) : 'Tabla vacía')
        console.log('Roles posibles: verificar manualmente')
    }

    // 4. Verificar extensiones de PostgreSQL
    console.log('\n🔌 Verificando extensiones disponibles...')
    const { data: extensions } = await supabase.rpc('pg_available_extensions', {})

    if (extensions) {
        const relevantExt = ['pg_trgm', 'pgvector', 'pg_stat_statements']
        console.log('Extensiones relevantes:')
        relevantExt.forEach(ext => {
            const found = extensions.find(e => e.name === ext)
            console.log(`  - ${ext}: ${found ? '✅ Disponible' : '❌ No disponible'}`)
        })
    }

    console.log('\n✅ Verificación completa')
}

verifySchema().catch(console.error)
