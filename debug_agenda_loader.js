const { getAgendaDataV2 } = require('./lib/tools/partes/loader');
const { format, startOfMonth, endOfMonth } = require('date-fns');

async function test() {
    const userId = 'fc57e570-2950-4ed5-bfdc-d1bca5423c8e'; // miretendencia
    const userRol = 'supervisor';
    const hoy = new Date();
    const fechaDesde = format(startOfMonth(hoy), 'yyyy-MM-dd');
    const fechaHasta = format(endOfMonth(hoy), 'yyyy-MM-dd');

    console.log('--- Testing getAgendaDataV2 ---');
    try {
        const data = await getAgendaDataV2({
            userId,
            userRol,
            fechaDesde,
            fechaHasta
        });

        console.log('Eventos count:', data.eventos.length);
        console.log('Catálogos:');
        console.log('- Edificios:', data.catalogos.edificios.length);
        console.log('- Usuarios:', data.catalogos.usuarios.length);
        console.log('- Tareas:', data.catalogos.tareas.length);

        if (data.catalogos.tareas.length > 0) {
            console.log('Primera Tarea:', data.catalogos.tareas[0].titulo);
        }

        if (data.catalogos.usuarios.length > 0) {
            console.log('Roles en Usuarios:', [...new Set(data.catalogos.usuarios.map(u => u.rol))]);
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

test();
