const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://fodyzgjwoccpsjmfinvm.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvZHl6Z2p3b2NjcHNqbWZpbnZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3MTc4NzgsImV4cCI6MjA2MzI5Mzg3OH0.kpthf8iRunvBCcbk73Csvi2zmK_kMFPjS3wmnM79GNQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function deepAudit() {
    console.log('--- BUSCANDO EDIFICIO PAREJA 3205 ---');
    const { data: edificios, error: eError } = await supabase
        .from('edificios')
        .select('*')
        .ilike('nombre', '%Pareja 3205%');

    if (eError) {
        console.error('Error Edificios:', eError);
        return;
    }
    console.log('Edificios encontrados:', edificios);

    if (edificios && edificios.length > 0) {
        const building = edificios[0];
        console.log('\n--- DETALLE DEL EDIFICIO ---');
        console.log(`ID: ${building.id}`);
        console.log(`Nombre: ${building.nombre}`);
        console.log(`ID Administrador asignado: ${building.id_administrador}`);

        console.log('\n--- BUSCANDO CONTACTO ASOCIADO AL ID_ADMINISTRADOR ---');
        const { data: adminAsignado } = await supabase
            .from('contactos')
            .select('*')
            .eq('id', building.id_administrador);
        console.log('Contacto asignado como Admin:', adminAsignado);

        console.log('\n--- BUSCANDO CONTACTOS LLAMADOS ADRIAN ---');
        const { data: adrianes } = await supabase
            .from('contactos')
            .select('*')
            .ilike('nombre', '%adrian%');
        console.log('Contactos con "adrian":', adrianes);

        console.log('\n--- BUSCANDO PRESUPUESTOS BASE DE ESTE EDIFICIO ---');
        const { data: pbs } = await supabase
            .from('presupuestos_base')
            .select('id, code, id_administrador')
            .eq('id_edificio', building.id);
        console.log('PBs encontrados:', pbs);
    } else {
        console.log('No se encontró el edificio con ese nombre.');
    }
}

deepAudit();
