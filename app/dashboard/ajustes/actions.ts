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

/**
 * Marca como pagados los ajustes aprobados y no pagados de un conjunto de facturas (versión interna ignorada)
 */
async function pagarAjustesPorFacturas_ignored(idsFactura: number[]) {
  try {
    const supabase = await createServerClient()

    // Verificar autenticación
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return {
        success: false,
        error: "No autorizado. Por favor inicia sesión.",
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

    // Obtener ajustes pendientes de las facturas indicadas y solo de facturas totalmente pagadas
    const { data: ajustesPendientes, error: errorConsulta } = await supabase
      .from("ajustes_facturas")
      .select(`
        id,
        id_factura,
        monto_ajuste,
        facturas!inner(id, pagada)
      `)
      .in("id_factura", idsFactura)
      .eq("aprobado", true)
      .eq("pagado", false)
      .eq("facturas.pagada", true)

    if (errorConsulta) {
      console.error("Error al consultar ajustes por facturas:", errorConsulta)
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
      console.error("Error al actualizar ajustes (selección):", errorUpdate)
      return {
        success: false,
        error: "Error al actualizar los ajustes seleccionados.",
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
        facturas: [...new Set(ajustesPendientes.map((a: any) => a.id_factura))].length,
      },
    }
  } catch (error) {
    console.error("Error inesperado al pagar ajustes por facturas:", error)
    return {
      success: false,
      error: "Error inesperado. Por favor intenta nuevamente.",
    }
  }
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
        facturas!inner(id, id_administrador, pagada)
      `)
      .eq("facturas.id_administrador", idAdministrador)
      .eq("facturas.pagada", true)
      .eq("aprobado", true)
      .eq("pagado", false)

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
    const totalAPagar = ajustesPendientes.reduce((sum: number, ajuste: any) => {
      return sum + (ajuste.monto_ajuste || 0)
    }, 0)

    // Obtener IDs de los ajustes
    const idsAjustes = ajustesPendientes.map((a: any) => a.id)

    // Actualizar todos los ajustes como pagados CON fecha_pago
    const { error: errorUpdate } = await supabase
      .from("ajustes_facturas")
      .update({ 
        pagado: true,
        fecha_pago: new Date().toISOString()  // 🆕 Guardar fecha de liquidación
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
        facturas!inner(id, pagada)
      `)
      .in("id_factura", idsFactura)
      .eq("aprobado", true)
      .eq("pagado", false)
      .eq("facturas.pagada", true)

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
