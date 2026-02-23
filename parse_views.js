const fs = require('fs');
const filepath = 'C:/Users/Central 1/.gemini/antigravity/brain/6b9d9e26-f4d7-4bde-a936-7c277b336ce0/.system_generated/steps/4717/output.txt';
const outpath = 'C:/Users/Central 1/.gemini/antigravity/brain/6b9d9e26-f4d7-4bde-a936-7c277b336ce0/05_rls_v2_views_refactor_jwt.sql';

try {
    const raw = fs.readFileSync(filepath, 'utf8');
    const match = raw.match(/<untrusted-data[^>]*>([\s\S]*?)<\/untrusted-data[^>]*>/);
    if (!match) throw new Error("No XML boundary found");

    const views = JSON.parse(match[1].trim());
    let sqlOut = "-- ==============================================================================\n";
    sqlOut += "-- SPC PROTOCOL v130.0: MIGRACIÓN DE DEPENDENCIAS EN VISTAS A JWT RLS\n";
    sqlOut += "-- Objetivo: Reemplazar check_user_role() por public.jwt_rol() en vistas\n";
    sqlOut += "-- para desvincularlas de la V1 y poder purgar la función obsoleta.\n";
    sqlOut += "-- ==============================================================================\n\n";

    for (let v of views) {
        let def = v.view_definition;

        // Efectuar los reemplazos globales
        def = def.replace(/check_user_role\('admin'::text\)/g, "public.jwt_rol() = 'admin'");
        def = def.replace(/check_user_role\('supervisor'::text\)/g, "public.jwt_rol() = 'supervisor'");
        def = def.replace(/check_user_role\('trabajador'::text\)/g, "public.jwt_rol() = 'trabajador'");

        sqlOut += `CREATE OR REPLACE VIEW public.${v.table_name} AS \n${def};\n\n`;
    }

    fs.writeFileSync(outpath, sqlOut, 'utf8');
    console.log("Script 05 Generado Exitosamente en: " + outpath);

} catch (error) {
    console.error(error);
}
