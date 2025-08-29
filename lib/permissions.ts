// Importamos la función createClient que implementa el patrón singleton
import { createClient } from "./supabase-client"

// Tipos de permisos
export type Permission =
  | "ver_presupuestos_base"
  | "editar_presupuestos_base"
  | "ver_presupuestos_finales"
  | "editar_presupuestos_finales"
  | "ver_productos"
  | "editar_productos"
  | "ver_calculadora"
  | "asignar_trabajadores"
  | "ver_agenda_trabajadores"
  | "crear_liquidaciones_supervisor"

// Mapa de permisos por rol
const rolePermissions: Record<string, Permission[]> = {
  admin: [
    "ver_presupuestos_base",
    "editar_presupuestos_base",
    "ver_presupuestos_finales",
    "editar_presupuestos_finales",
    "ver_productos",
    "editar_productos",
    "ver_calculadora",
    "asignar_trabajadores",
    "ver_agenda_trabajadores",
    "crear_liquidaciones_supervisor",
  ],
  supervisor: ["ver_presupuestos_base", "editar_presupuestos_base", "asignar_trabajadores", "ver_agenda_trabajadores"],
  trabajador: [],
}

// Función para verificar si un usuario tiene un permiso específico
export async function hasPermission(permission: Permission): Promise<boolean> {
  const supabase = createClient() // Usamos la instancia singleton

  try {
    // Obtener la sesión actual
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return false

    // Obtener el rol del usuario
    const { data: userData, error } = await supabase.from("usuarios").select("rol").eq("id", user.id).single()

    if (error || !userData) {
      // Si no encontramos el usuario en la tabla usuarios, verificamos en auth.users
      // Esto es temporal hasta que todos los usuarios tengan un registro en la tabla usuarios
      const { data: userDetails } = await supabase.rpc("get_user_details")
      if (!userDetails || !userDetails.rol) return false

      return rolePermissions[userDetails.rol]?.includes(permission) || false
    }

    const userRole = userData.rol

    // Verificar si el rol tiene el permiso
    return rolePermissions[userRole]?.includes(permission) || false
  } catch (error) {
    console.error("Error al verificar permisos:", error)
    return false
  }
}

// Función para verificar si un usuario puede editar un presupuesto base específico
export async function canEditPresupuestoBase(presupuestoId: number): Promise<boolean> {
  const supabase = createClient() // Usamos la instancia singleton

  try {
    // Obtener la sesión actual
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return false

    // Obtener el rol del usuario
    const { data: userDetails } = await supabase.rpc("get_user_details")
    if (!userDetails || !userDetails.rol) return false

    // Si es admin, siempre puede editar
    if (userDetails.rol === "admin") return true

    // Si es supervisor, verificar si el presupuesto le pertenece y no está aprobado
    if (userDetails.rol === "supervisor") {
      const { data: presupuesto, error: presupuestoError } = await supabase
        .from("presupuestos_base")
        .select("id_supervisor, aprobado")
        .eq("id", presupuestoId)
        .single()

      if (presupuestoError || !presupuesto) return false

      // Solo puede editar si es el supervisor asignado y el presupuesto no está aprobado
      return presupuesto.id_supervisor === user.id && !presupuesto.aprobado
    }

    return false
  } catch (error) {
    console.error("Error al verificar permisos de edición:", error)
    return false
  }
}
