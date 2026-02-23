const fs = require('fs');
const path = 'C:/Users/Central 1/Downloads/spc7/spc/spc/app/dashboard/ajustes/actions.ts';
let code = fs.readFileSync(path, 'utf8');

const replacement = `export async function pagarAjustesAdministrador(idAdministrador: number) {
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
      .select(\`
        id,
        monto_ajuste,
        facturas!inner(id, id_administrador, pagada, saldo_pendiente)
      \`)
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
`;

const lines = code.split('\n');
const start = lines.findIndex(l => l.startsWith('export async function pagarAjustesAdministrador'));
const end = lines.findIndex(l => l.startsWith('export async function pagarAjustesPorFacturas('));

if (start !== -1 && end !== -1) {
    lines.splice(start, end - start, replacement);
    fs.writeFileSync(path, lines.join('\n'));
    console.log('Fixed actions.ts perfectly');
} else {
    console.log('Bounds not found');
}
