
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function checkTask() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    const { data, error } = await supabase
        .from('vista_tareas_completa')
        .select('id, titulo')
        .limit(5)

    if (error) console.error(error)
    console.log('Any Tasks:', data)
}

checkTask()
