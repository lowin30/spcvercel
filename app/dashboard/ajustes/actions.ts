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

    // Obtener todos los ajustes pendientes del administrador
    const { data: ajustesPendientes, error: errorConsulta } = await supabase
      .from("ajustes_facturas")
      .select(`
        id,
        monto_ajuste,
        facturas!inner(id, id_administrador)
      `)
      .eq("facturas.id_administrador", idAdministrador)
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
