"use server"

import { createSsrServerClient } from "@/lib/ssr-server"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

/**
 * Obtener presupuestos base con filtrado opcional por aprobación
 */
export async function getPresupuestosBase(filtro: 'todos' | 'aprobados' | 'pendientes' = 'todos') {
  // Usamos el cliente SSR server de manera correcta
  const supabase = await createSsrServerClient()
  
  try {
    // Verificar sesión del usuario
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return { success: false, message: "No autorizado", data: [] }
    }
    
    // Verificar rol del usuario
    const { data: userData } = await supabase
      .from("usuarios")
      .select("rol")
      .eq("id", session.user.id)
      .single()
      
    if (!userData || (userData.rol !== "admin" && userData.rol !== "supervisor")) {
      return { success: false, message: "No tienes permisos para ver estos datos", data: [] }
    }
    
    // Construir consulta base usando la vista
    let query = supabase
      .from("vista_presupuestos_base_completa")
      .select('*')
    
    // Filtrar por supervisor si el usuario no es admin
    if (userData.rol === "supervisor") {
      query = query.eq("id_supervisor", session.user.id)
    }
    
    // Aplicar filtro por aprobación si no es 'todos'
    if (filtro === 'aprobados') {
      query = query.eq("aprobado", true)
    } else if (filtro === 'pendientes') {
      query = query.eq("aprobado", false)
    }
    
    // Ordenar por fecha de creación (más reciente primero)
    query = query.order('created_at', { ascending: false })
    
    const { data, error } = await query
    
    if (error) {
      throw error
    }
    
    return { 
      success: true, 
      data: data || [], 
      userRole: userData.rol,
      userId: session.user.id
    }
  } catch (error: any) {
    console.error("Error al obtener presupuestos base:", error)
    return { 
      success: false, 
      message: error.message || "Error al cargar los presupuestos base", 
      data: [] 
    }
  }
}

/**
 * Aprobar un presupuesto base (solo usuarios con rol admin)
 */
export async function aprobarPresupuestoBase(id: number) {
  console.log("Iniciando aprobación del presupuesto base ID:", id)
  
  // Usamos el patrón que funciona en otras partes de la aplicación
  const supabase = await createSsrServerClient()
  
  try {
    console.log("Iniciando proceso de aprobación del presupuesto base ID:", id)
    
    // 1. Verificar sesión activa
    console.log("Verificando sesión...")
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error("Error al verificar la sesión:", sessionError)
      return { success: false, message: "Error al verificar la sesión: " + sessionError.message }
    }
    
    if (!session) {
      console.error("No hay sesión activa.")
      return { success: false, message: "No hay sesión activa. Por favor inicie sesión nuevamente." }
    }
    
    console.log("Sesión válida para usuario:", session.user.email)
    
    const userId = session.user.id
    console.log("Usuario autenticado con ID:", userId)
    
    // Obtener rol del usuario desde la tabla usuarios
    const { data: userData, error: userError } = await supabase
      .from("usuarios")
      .select("rol")
      .eq("id", userId)
      .single()
    
    console.log("Datos del usuario encontrados:", userData || {})
    
    // Verificar si hay error al obtener el usuario
    if (userError) {
      console.error("Error al obtener datos del usuario:", userError)
      return { success: false, message: "Error al verificar permisos: " + userError.message }
    }
    
    // Verificar explícitamente que el usuario tenga rol "admin"
    // IMPORTANTE: No confundir con la tabla "administradores"
    if (!userData || userData.rol !== "admin") {
      console.error("Usuario sin permisos de administrador. Rol actual:", userData?.rol)
      return { success: false, message: "Solo los usuarios con rol admin pueden aprobar presupuestos base" }
    }
    
    // Primero obtenemos el id_tarea del presupuesto
    const { data: presupuestoData, error: presupuestoError } = await supabase
      .from("presupuestos_base")
      .select("id_tarea")
      .eq("id", id)
      .single()
      
    if (presupuestoError) {
      console.error("Error al obtener id_tarea del presupuesto:", presupuestoError)
      throw new Error("No se pudo obtener la información del presupuesto")
    }
    
    const id_tarea = presupuestoData.id_tarea
    
    // Iniciamos una transacción para actualizar tanto el presupuesto como la tarea
    
    // 1. Aprobar el presupuesto
    const { error: updatePresupuestoError } = await supabase
      .from("presupuestos_base")
      .update({
        aprobado: true,
        fecha_aprobacion: new Date().toISOString()
      })
      .eq("id", id)
      
    if (updatePresupuestoError) {
      console.error("Error al actualizar presupuesto:", updatePresupuestoError)
      throw updatePresupuestoError
    }
    
    // 2. Actualizar el estado de la tarea asociada al ID 2 (Preguntar)
    if (id_tarea) {
      const { error: updateTareaError } = await supabase
        .from("tareas")
        .update({
          id_estado_nuevo: 2 // ID 2 corresponde a "Preguntar"
        })
        .eq("id", id_tarea)
        
      if (updateTareaError) {
        console.error("Error al actualizar estado de la tarea:", updateTareaError)
        // No lanzamos error aquí para que no falle toda la operación si solo falla esta parte
      }
    }
    
    // Revalidar rutas
    revalidatePath(`/dashboard/presupuestos-base/${id}`)
    revalidatePath('/dashboard/presupuestos-base')
    if (id_tarea) {
      revalidatePath(`/dashboard/tareas/editar/${id_tarea}`)
      revalidatePath('/dashboard/tareas')
    }
    
    return { success: true, message: "Presupuesto base aprobado correctamente" }
  } catch (error: any) {
    console.error("Error al aprobar presupuesto base:", error)
    return { success: false, message: error.message || "Error al aprobar el presupuesto base" }
  }
}

/**
 * Anular la aprobación de un presupuesto base (solo admin)
 */
export async function anularAprobacionPresupuestoBase(id: number) {
  // Usamos el cliente SSR server de manera correcta
  const supabase = await createSsrServerClient()
  
  try {
    console.log("Iniciando proceso de anulación de aprobación del presupuesto base ID:", id)
    
    // Obtener la sesión de usuario actual
    const { data, error } = await supabase.auth.getSession()
    
    // Verificar si hay errores en la respuesta de sesión
    if (error) {
      console.error("Error al obtener sesión:", error)
      return { success: false, message: "Error de autenticación: " + error.message }
    }
    
    // Verificar si existe la sesión y usuario
    if (!data.session || !data.session.user) {
      console.error("No hay sesión activa o datos de usuario")
      return { success: false, message: "No hay sesión activa. Por favor inicie sesión nuevamente." }
    }
    
    const userId = data.session.user.id
    console.log("Usuario autenticado con ID:", userId)
    
    // Obtener rol del usuario desde la tabla usuarios
    const { data: userData, error: userError } = await supabase
      .from("usuarios")
      .select("rol")
      .eq("id", userId)
      .single()
    
    console.log("Datos del usuario encontrados:", userData || {})
    
    // Verificar si hay error al obtener el usuario
    if (userError) {
      console.error("Error al obtener datos del usuario:", userError)
      return { success: false, message: "Error al verificar permisos: " + userError.message }
    }
    
    // Verificar rol de admin
    if (userData?.rol !== "admin") {
      return { success: false, message: "Solo los administradores pueden anular la aprobación de presupuestos base" }
    }
    
    // Primero obtenemos el id_tarea del presupuesto
    const { data: presupuestoData, error: presupuestoError } = await supabase
      .from("presupuestos_base")
      .select("id_tarea")
      .eq("id", id)
      .single()
      
    if (presupuestoError) {
      console.error("Error al obtener id_tarea del presupuesto:", presupuestoError)
      throw new Error("No se pudo obtener la información del presupuesto")
    }
    
    const id_tarea = presupuestoData.id_tarea
    
    // Anular aprobación del presupuesto
    const { error: updateError } = await supabase
      .from("presupuestos_base")
      .update({
        aprobado: false,
        fecha_aprobacion: null
      })
      .eq("id", id)
      
    if (updateError) {
      console.error("Error al anular aprobación del presupuesto:", updateError)
      throw updateError
    }
    
    // Actualizar el estado de la tarea asociada al ID 2 (Preguntar)
    if (id_tarea) {
      const { error: updateTareaError } = await supabase
        .from("tareas")
        .update({
          id_estado_nuevo: 2 // ID 2 corresponde a "Preguntar"
        })
        .eq("id", id_tarea)
        
      if (updateTareaError) {
        console.error("Error al actualizar estado de la tarea:", updateTareaError)
        // No lanzamos error aquí para que no falle toda la operación si solo falla esta parte
      }
    }
    
    // Revalidar rutas
    revalidatePath(`/dashboard/presupuestos-base/${id}`)
    revalidatePath('/dashboard/presupuestos-base')
    if (id_tarea) {
      revalidatePath(`/dashboard/tareas/editar/${id_tarea}`)
      revalidatePath('/dashboard/tareas')
    }
    
    return { success: true, message: "Aprobación anulada correctamente" }
  } catch (error: any) {
    console.error("Error al anular aprobación:", error)
    return { success: false, message: error.message || "Error al anular la aprobación del presupuesto base" }
  }
}

/**
 * Eliminar un presupuesto base (solo admin)
 */
export async function deletePresupuestoBase(id: number) {
  const supabase = await createSsrServerClient()
  
  try {
    console.log("Iniciando eliminación del presupuesto base ID:", id)
    
    // Verificar sesión
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return { success: false, message: "No autorizado" }
    }
    
    // Verificar rol
    const { data: userData, error: userError } = await supabase
      .from("usuarios")
      .select("rol")
      .eq("id", session.user.id)
      .single()
    
    if (userError || !userData) {
      return { success: false, message: "Error al verificar permisos" }
    }
    
    // Solo admin puede eliminar
    if (userData.rol !== "admin") {
      return { success: false, message: "Solo los administradores pueden eliminar presupuestos base" }
    }
    
    // Verificar que el presupuesto no esté aprobado
    const { data: presupuestoData, error: checkError } = await supabase
      .from("presupuestos_base")
      .select("aprobado")
      .eq("id", id)
      .single()
    
    if (checkError) {
      return { success: false, message: "No se pudo verificar el presupuesto" }
    }
    
    if (presupuestoData.aprobado) {
      return { success: false, message: "No se pueden eliminar presupuestos aprobados" }
    }
    
    // Eliminar items asociados primero
    const { error: deleteItemsError } = await supabase
      .from("items_presupuesto_base")
      .delete()
      .eq("id_presupuesto_base", id)
    
    if (deleteItemsError) {
      console.error("Error al eliminar items:", deleteItemsError)
      return { success: false, message: "Error al eliminar los items del presupuesto" }
    }
    
    // Eliminar presupuesto
    const { error: deleteError } = await supabase
      .from("presupuestos_base")
      .delete()
      .eq("id", id)
    
    if (deleteError) {
      console.error("Error al eliminar presupuesto:", deleteError)
      return { success: false, message: "Error al eliminar el presupuesto" }
    }
    
    // Revalidar rutas
    revalidatePath('/dashboard/presupuestos-base')
    
    return { success: true, message: "Presupuesto eliminado correctamente" }
  } catch (error: any) {
    console.error("Error al eliminar presupuesto base:", error)
    return { success: false, message: error.message || "Error al eliminar el presupuesto base" }
  }
}
