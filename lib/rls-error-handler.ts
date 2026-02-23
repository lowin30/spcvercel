// lib/rls-error-handler.ts
import { PostgrestError } from '@supabase/supabase-js';

// Estructura oficial de respuestas estándar para nuestra API/Server Actions
export interface AppResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    isRestricted?: boolean;
}

/**
 * Escudo RLS: Interceptador de Errores de Base de Datos para Next.js.
 * Convierte los errores letales de base de datos en respuestas manejables.
 * 
 * Código PGSQL clave:
 * '42501': INSUFFICIENT PRIVILEGE (Violación directa de Row Level Security)
 */
export function handleSupabaseError(error: PostgrestError | Error | unknown): AppResponse {
    // Manejo de Errores Críticos Supabase / PostgreSQL
    if (error && typeof error === 'object' && 'code' in error) {
        const pgError = error as PostgrestError;

        // CASO 1: Violación RLS Directa (Permisos insuficientes)
        if (pgError.code === '42501') {
            console.warn('🛡️ [ESCUDO RLS ACTIVADO]: Se bloqueó un intento de acceso no autorizado.', pgError.message);
            return {
                success: false,
                isRestricted: true,
                error: 'Acceso denegado por políticas de seguridad (RLS). No cuentas con permiso para ver o alterar estos datos.'
            };
        }

        // OTROS CASOS DE DB (Violación FK, Formato inválido, etc.)
        console.error('❌ Error general de BD atrapado por el escudo:', pgError);
        return {
            success: false,
            error: `Error de base de datos: ${pgError.message}`
        };
    }

    // Errores JS Generales
    console.error('❌ Error no controlado de servidor atrapado por el escudo:', error);
    return {
        success: false,
        error: error instanceof Error ? error.message : 'Error interno inesperado del servidor.'
    };
}

/**
 * Función envolvedora inteligente (Wrapper) para Queries de Supabase.
 * Ejecuta la consulta de lectura de forma segura y evita que Next.js colapse.
 */
export async function executeSecureQuery<T>(
    queryPromise: PromiseLike<{ data: T | null; error: PostgrestError | null }>
): Promise<AppResponse<T>> {
    try {
        const { data, error } = await queryPromise;

        if (error) {
            return handleSupabaseError(error);
        }

        return {
            success: true,
            data: data as T
        };
    } catch (exception) {
        return handleSupabaseError(exception);
    }
}
