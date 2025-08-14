/**
 * Script de diagnóstico para problemas de registro en Supabase
 * Ejecutar con Node.js: node diagnostico-supabase.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Credenciales (usar variables de entorno o pasar directamente)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// El email que estás intentando registrar
const EMAIL_A_DIAGNOSTICAR = 'traba1@gmail.com';

// Crear clientes Supabase
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function ejecutarDiagnostico() {
  console.log('=== INICIANDO DIAGNÓSTICO DE SUPABASE ===');
  console.log(`Fecha y hora: ${new Date().toLocaleString()}`);
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log('---------------------------------------');
  
  try {
    // 1. Verificar si el usuario ya existe en Auth
    console.log('\n1. VERIFICANDO USUARIO EN AUTH...');
    const { data: userData, error: userError } = await adminClient.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error al listar usuarios:', userError);
    } else {
      const usuarioExistente = userData.users?.find(u => u.email === EMAIL_A_DIAGNOSTICAR);
      
      if (usuarioExistente) {
        console.log(`✓ ENCONTRADO: Usuario existe en Auth con ID: ${usuarioExistente.id}`);
        console.log(`  Email confirmado: ${usuarioExistente.email_confirmed_at ? 'SÍ' : 'NO'}`);
        console.log(`  Última firma: ${usuarioExistente.last_sign_in_at || 'Nunca'}`);
        console.log(`  Metadata:`, usuarioExistente.user_metadata);
      } else {
        console.log(`⚠ NO ENCONTRADO: No existe usuario en Auth con email: ${EMAIL_A_DIAGNOSTICAR}`);
      }
    }
    
    // 2. Verificar si existe en tabla usuarios
    console.log('\n2. VERIFICANDO USUARIO EN TABLA USUARIOS...');
    const { data: tablaData, error: tablaError } = await adminClient
      .from('usuarios')
      .select('*')
      .eq('email', EMAIL_A_DIAGNOSTICAR);
      
    if (tablaError) {
      console.error('Error al consultar tabla usuarios:', tablaError);
    } else if (tablaData && tablaData.length > 0) {
      console.log(`✓ ENCONTRADO: Existe registro en tabla usuarios:`);
      console.log(tablaData[0]);
    } else {
      console.log(`⚠ NO ENCONTRADO: No existe registro en tabla usuarios para: ${EMAIL_A_DIAGNOSTICAR}`);
    }
    
    // 3. Verificar estructura de la tabla usuarios
    console.log('\n3. VERIFICANDO ESTRUCTURA DE TABLA USUARIOS...');
    const { data: estructuraData, error: estructuraError } = await adminClient
      .rpc('obtener_estructura_tabla', { nombre_tabla: 'usuarios' });
      
    if (estructuraError) {
      console.log(`⚠ ERROR AL VERIFICAR ESTRUCTURA: ${estructuraError.message}`);
      console.log('  Puede que necesites crear esta función RPC:');
      console.log(`  
CREATE OR REPLACE FUNCTION obtener_estructura_tabla(nombre_tabla text)
RETURNS SETOF information_schema.columns AS $$
BEGIN
  RETURN QUERY SELECT * FROM information_schema.columns 
  WHERE table_name = nombre_tabla AND table_schema = 'public';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`);
    } else {
      console.log('✓ Columnas encontradas en la tabla usuarios:');
      estructuraData.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}${col.is_nullable === 'NO' ? ', NOT NULL' : ''})`);
      });
    }
    
    // 4. Verificar trigger
    console.log('\n4. VERIFICANDO TRIGGER USUARIOS_AUTH...');
    const { data: triggerData, error: triggerError } = await adminClient.rpc(
      'verificar_trigger_existe', 
      { nombre_trigger: 'on_auth_user_created' }
    ).single();
    
    if (triggerError) {
      console.log(`⚠ ERROR AL VERIFICAR TRIGGER: ${triggerError.message}`);
      console.log('  Puede que necesites crear esta función RPC:');
      console.log(`
CREATE OR REPLACE FUNCTION verificar_trigger_existe(nombre_trigger text)
RETURNS boolean AS $$
DECLARE
  existe boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = nombre_trigger
  ) INTO existe;
  RETURN existe;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`);
    } else if (triggerData) {
      console.log(`✓ ENCONTRADO: El trigger 'on_auth_user_created' existe y está activo`);
    } else {
      console.log(`⚠ NO ENCONTRADO: El trigger 'on_auth_user_created' no existe o está desactivado`);
    }
    
    // 5. Intentar crear un usuario de prueba
    console.log('\n5. INTENTANDO REGISTRO DE PRUEBA...');
    const testEmail = `test_${new Date().getTime()}@ejemplo.com`;
    const { data: signupData, error: signupError } = await anonClient.auth.signUp({
      email: testEmail,
      password: 'Contraseña123!',
      options: {
        data: { nombre: 'Usuario Prueba' }
      }
    });
    
    if (signupError) {
      console.error('⚠ ERROR EN REGISTRO DE PRUEBA:', signupError);
    } else {
      console.log(`✓ REGISTRO DE PRUEBA EXITOSO: ${testEmail}`);
      console.log(`  ID: ${signupData.user?.id || 'No disponible'}`);
      console.log(`  Confirmación email requerida: ${signupData.session ? 'NO' : 'SÍ'}`);
    }
    
    console.log('\n=== DIAGNÓSTICO COMPLETO ===');
    console.log('Instrucciones:');
    console.log('1. Verificar si el trigger está correctamente implementado');
    console.log('2. Comprobar que los nombres de las columnas sean exactamente los esperados');
    console.log('3. Revisar las políticas RLS en la consola de Supabase');
    console.log('4. Si continúan los problemas, desactivar temporalmente el trigger');
    
  } catch (error) {
    console.error('Error global en diagnóstico:', error);
  }
}

// Ejecutar diagnóstico
ejecutarDiagnostico().catch(console.error);
