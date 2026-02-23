"use server"

import { createServerClient } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"

/**
 * Marca todos los ajustes aprobados y pendientes de pago de un administrador como pagados
 */
export async function pagarAjustesAdministrador(idAdministrador: number) {
  try {
    const supabase = await createServerClient()

    // Verificar autenticación
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return {
        success: false,
        error: "No autorizado. Por favor inicia sesión."
      }
    }

    // Verificar rol (solo admin y supervisor pueden pagar ajustes)
    const { data: usuario, error: userError } = await supabase
      .from("usuarios")
      .select("rol")
      .eq("id", session.user.id)
      .single()

    if (userError || !usuario) {
      console.error("Error al obtener rol del usuario:", userError)
      return {
        success: false,
        error: "Error al verificar permisos. Por favor intenta nuevamente."
      }
    }

    const rolNombre = usuario.rol
    if (!rolNombre || (rolNombre !== "admin" && rolNombre !== "supervisor")) {
      return {
        success: false,
        error: "No tienes permisos para realizar esta acción."
      }
    }

    // Obtener todos los ajustes pendientes del administrador SOLO de facturas totalmente pagadas
    const { data: ajustesPendientes, error: errorConsulta } = await supabase
      .from("ajustes_facturas")
      .select(`
        id,
        monto_ajuste,
        facturas!inner(id, id_administrador, pagada, saldo_pendiente)
      `)
      .eq("facturas.id_administrador", idAdministrador)
      .eq("aprobado", true)
      .eq("pagado", false)
      .or("pagada.eq.true,saldo_pendiente.lte.0", { foreignTable: "facturas" })

    if (errorConsulta) {
      console.error("Error al consultar ajustes:", errorConsulta)
      return { 
        success: false, 
        error: "Error al consultar los ajustes pendientes." 
      }
    }

    if (!ajustesPendientes || ajustesPendientes.length === 0) {
      return { 
        success: false, 
        error: "No hay ajustes pendientes de pago para este administrador." 
      }
    }

    // Calcular total a pagar
    const totalAPagar = ajustesPendientes.reduce((sum: number, ajuste: any) => sum + (ajuste.monto_ajuste || 0), 0)
    const idsAjustes = ajustesPendientes.map((a: any) => a.id)

    // Actualizar todos los ajustes como pagados CON fecha_pago
    const { error: errorUpdate } = await supabase
      .from("ajustes_facturas")
      .update({ 
        pagado: true,
        fecha_pago: new Date().toISOString()
      })
      .in("id", idsAjustes)

    if (errorUpdate) {
      console.error("Error al actualizar ajustes:", errorUpdate)
      return { 
        success: false, 
        error: "Error al actualizar los ajustes. Por favor intenta nuevamente." 
      }
    }

    // Revalidar rutas relacionadas
    revalidatePath("/dashboard/ajustes")
    revalidatePath("/dashboard/facturas")

    return { 
      success: true, 
      data: {
        cantidadAjustes: ajustesPendientes.length,
        totalPagado: totalAPagar,
        facturas: [...new Set(ajustesPendientes.map((a: any) => a.facturas?.id))].length
      }
    }
  } catch (error) {
    console.error("Error inesperado al pagar ajustes:", error)
    return { 
      success: false, 
      error: "Error inesperado. Por favor intenta nuevamente." 
    }
  }
}

export async function pagarAjustesPorFacturas(idsFactura: number[]) {
  try {
    const supabase = await createServerClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return {
        success: false,
        error: "No autorizado. Por favor inicia sesión.",
      }
    }

    const { data: usuario, error: userError } = await supabase
      .from("usuarios")
      .select("rol")
      .eq("id", session.user.id)
      .single()

    if (userError || !usuario) {
      return {
        success: false,
        error: "Error al verificar permisos. Por favor intenta nuevamente.",
      }
    }

    const rolNombre = usuario.rol
    if (!rolNombre || (rolNombre !== "admin" && rolNombre !== "supervisor")) {
      return {
        success: false,
        error: "No tienes permisos para realizar esta acción.",
      }
    }

    if (!idsFactura || idsFactura.length === 0) {
      return {
        success: false,
        error: "No se enviaron facturas para liquidar.",
      }
    }

    const { data: ajustesPendientes, error: errorConsulta } = await supabase
      .from("ajustes_facturas")
      .select(`
        id,
        id_factura,
        monto_ajuste,
        facturas!inner(id, pagada, saldo_pendiente)
      `)
      .in("id_factura", idsFactura)
      .eq("aprobado", true)
      .eq("pagado", false)
      .or("pagada.eq.true,saldo_pendiente.lte.0", { foreignTable: "facturas" })

    if (errorConsulta) {
      return {
        success: false,
        error: "Error al consultar los ajustes pendientes.",
      }
    }

    if (!ajustesPendientes || ajustesPendientes.length === 0) {
      return {
        success: false,
        error: "No hay ajustes pendientes de pago para las facturas seleccionadas.",
      }
    }

    const totalAPagar = ajustesPendientes.reduce((sum: number, a: any) => sum + (a.monto_ajuste || 0), 0)
    const idsAjustes = ajustesPendientes.map((a: any) => a.id)

    const { error: errorUpdate } = await supabase
      .from("ajustes_facturas")
      .update({ pagado: true, fecha_pago: new Date().toISOString() })
      .in("id", idsAjustes)

    if (errorUpdate) {
      return {
        success: false,
        error: "Error al actualizar los ajustes seleccionados.",
      }
    }

    revalidatePath("/dashboard/ajustes")
    revalidatePath("/dashboard/facturas")

    return {
      success: true,
      data: {
        cantidadAjustes: ajustesPendientes.length,
        totalPagado: totalAPagar,
        facturas: [...new Set(ajustesPendientes.map((a: any) => a.id_factura))].length,
      },
    }
  } catch {
    return {
      success: false,
      error: "Error inesperado. Por favor intenta nuevamente.",
    }
  }
}

/**
 * Revoca el acceso de un usuario forzando un reinicio de sesión y limpiando sus metadatos
 * Ideal para el "Botón de Pánico" cuando cambian los roles.
 */
export async function revokeUserSession(targetUserId: string) {
  try {
    const supabase = await createServerClient()

    // Verificar que quien lo ejecuta sea admin
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return { success: false, error: "No autorizado." }

    const { data: adminUser } = await supabase
      .from("usuarios")
      .select("rol")
      .eq("id", session.user.id)
      .single()

    if (!adminUser || adminUser.rol !== "admin") {
      return { success: false, error: "Permiso denegado." }
    }

    // Estrategia combinada para invalidar sesiones en GoTrue/Supabase:
    // Al actualizar el usuario con la API de admin, se disparan re-evaluaciones 
    // y forzamos a que si tiene sesión, la pierda

    // IMPORTANTE: En Supabase para forzar el invalidar refresh tokens,
    // podemos cambiar secret o forzar metadata. El auth hook hará refresh.
    const { error: revokError } = await supabase.auth.admin.updateUserById(
      targetUserId,
      { ban_duration: 'none', user_metadata: { force_logout_at: Date.now() } }
    )

    if (revokError) {
      console.error("Error al revocar sesión:", revokError)
      return { success: false, error: revokError.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error("Error en revokeUserSession:", error)
    return { success: false, error: error?.message || "Error al forzar el cierre" }
  }
}

