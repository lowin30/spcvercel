const fs = require('fs');
const files = [
    'c:/Users/Central 1/Downloads/spc7/spc/spc/app/dashboard/pagos/borrar-pago.ts',
    'c:/Users/Central 1/Downloads/spc7/spc/spc/app/dashboard/pagos/nuevo/crear-pago.ts',
    'c:/Users/Central 1/Downloads/spc7/spc/spc/app/api/user/route.ts',
    'c:/Users/Central 1/Downloads/spc7/spc/spc/app/api/tasks/list/route.ts',
    'c:/Users/Central 1/Downloads/spc7/spc/spc/app/api/badges/route.ts',
    'c:/Users/Central 1/Downloads/spc7/spc/spc/app/dashboard/presupuestos/actions-factura.ts',
    'c:/Users/Central 1/Downloads/spc7/spc/spc/app/dashboard/presupuestos/actions-envio.ts'
];

files.forEach(file => {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');

        // Replace createSupabaseServerClient imports
        content = content.replace(/import\s+{\s*createSupabaseServerClient\s*}\s+from\s+['"]@\/lib\/supabase\/server['"][;]?/g, "import { createServerClient } from '@/lib/supabase-server'");
        content = content.replace(/createSupabaseServerClient/g, 'createServerClient');

        // Replace createSsrServerClient imports
        content = content.replace(/import\s+{\s*createSsrServerClient\s*}\s+from\s+['"]@\/lib\/ssr-server['"][;]?/g, "import { createServerClient } from '@/lib/supabase-server'");
        content = content.replace(/createSsrServerClient/g, 'createServerClient');

        fs.writeFileSync(file, content, 'utf8');
        console.log('Fixed:', file);
    } else {
        console.log('Not found:', file);
    }
});
