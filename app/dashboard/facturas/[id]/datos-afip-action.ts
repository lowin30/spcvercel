"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

export async function actualizarDatosAFIP(facturaId: string, nuevosDatos: string) {
  const supabase = createServerActionClient({ cookies })
  
  try {
    const { error } = await supabase
      .from("facturas")
      .update({ datos_afip: nuevosDatos })
      .eq("id", facturaId)
    
    if (error) throw error
    
    // Revalidar la página para que se muestren los datos actualizados
    revalidatePath(`/dashboard/facturas/${facturaId}`)
    
    return { success: true, message: "Datos AFIP actualizados correctamente" }
  } catch (error: any) {
    console.error("Error al actualizar datos AFIP:", error)
    return { success: false, message: `Error: ${error.message || "Ocurrió un error al actualizar los datos"}` }
  }
}
