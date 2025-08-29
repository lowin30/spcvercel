// Script para corregir el problema de la tabla telefonos_departamento
// Este script modifica los archivos relevantes para asegurar que:
// 1. Los números de teléfono se limpien (sin espacios ni guiones)
// 2. El campo relación nunca sea null

const fs = require('fs');
const path = require('path');

// Archivo principal donde está el error
const edificioPagePath = path.join(__dirname, 'app', 'dashboard', 'edificios', '[id]', 'page.tsx');

try {
  // Leer el contenido del archivo
  let content = fs.readFileSync(edificioPagePath, 'utf8');
  
  // Añadir la importación de cleanPhoneNumber si no existe
  if (!content.includes('import { cleanPhoneNumber }')) {
    content = content.replace(
      'import { createClient } from "@/lib/supabase-client"',
      'import { createClient } from "@/lib/supabase-client"\nimport { cleanPhoneNumber } from "@/lib/utils"'
    );
  }
  
  // Reemplazar la actualización de teléfonos para limpiar el número y evitar null en relacion
  content = content.replace(
    /numero: nuevoTelefono\.numero,/g,
    'numero: cleanPhoneNumber(nuevoTelefono.numero),'
  );
  
  content = content.replace(
    /relacion: nuevoTelefono\.relacion \|\| null,/g,
    'relacion: nuevoTelefono.relacion || "contacto", // Valor predeterminado'
  );
  
  // Guardar los cambios
  fs.writeFileSync(edificioPagePath, content, 'utf8');
  
  console.log('✅ Correcciones aplicadas con éxito:');
  console.log('1. Se ha añadido la importación de cleanPhoneNumber');
  console.log('2. Se han limpiado los números de teléfono (eliminando espacios y guiones)');
  console.log('3. Se ha establecido "contacto" como valor predeterminado para el campo relación');
  
} catch (error) {
  console.error('❌ Error al aplicar las correcciones:', error);
}
