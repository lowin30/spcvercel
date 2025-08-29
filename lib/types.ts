/**
 * @file lib/types.ts
 * @description Este archivo centraliza las definiciones de tipos y interfaces comunes para toda la aplicación.
 *              Al mantener los tipos en un solo lugar, aseguramos la consistencia y facilitamos el mantenimiento.
 */

/**
 * Representa la estructura de un usuario base en la aplicación.
 * Coincide con los datos básicos que se pueden obtener del perfil de un usuario.
 */
export interface Usuario {
  id: string;
  email: string;
  // Aquí se podrían añadir otros campos del perfil como full_name, avatar_url si existen en la tabla de perfiles.
}

/**
 * Representa los datos de la sesión del usuario, combinando la información
 * de autenticación de Supabase (Usuario) con datos específicos de la aplicación (ej. rol).
 */
export interface UserSessionData extends Usuario {
  rol: string;
}
