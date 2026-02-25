const fs = require('fs');

const sql = fs.readFileSync('db_schema_dump.sql', 'utf8');

const regexLiq = /CREATE OR REPLACE VIEW "?public"?"\."?vista_liquidaciones_completa"? AS([\s\S]*?);/i;
const matchLiq = sql.match(regexLiq);

if (matchLiq) {
    console.log("=== VISTA LIQUIDACIONES COMPLETA ===\n" + matchLiq[0]);
} else {
    console.log("No se encontró vista_liquidaciones_completa.");
}

const regexPres = /CREATE OR REPLACE VIEW "?public"?"\."?vista_presupuestos_base_completa"? AS([\s\S]*?);/i;
const matchPres = sql.match(regexPres);

if (matchPres) {
    console.log("\n=== VISTA PRESUPUESTOS BASE COMPLETA ===\n" + matchPres[0]);
} else {
    console.log("No se encontró vista_presupuestos_base_completa.");
}
