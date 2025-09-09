"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase-client"
import { formatDate } from "@/lib/date-utils"
import { executeCountQuery, executeQuery } from "@/lib/supabase-helpers"
import { TaskStatusBadge } from "./tasks-badge.jsx"

// Importar componentes específicos por rol
import { AdminDashboard } from "./admin-dashboard.jsx"
import { SupervisorDashboard } from "./supervisor-dashboard.jsx"
import { TrabajadorDashboard } from "./trabajador-dashboard.jsx"

// Definir tipos para mejorar la inferencia
type StatsType = {
  total_edificios: number;
  total_contactos: number;
  total_administradores: number;
  tareas_activas: number;
};

type TaskType = {
  id: string;
  created_at: string;
  [key: string]: any;
};

type BuildingType = {
  id: string;
  created_at: string;
  [key: string]: any;
};

export default function DashboardPage() {
  const supabase = createClient()
  
  // Estados generales
  const [stats, setStats] = useState<StatsType | null>(null)
  const [recentTasks, setRecentTasks] = useState<TaskType[]>([])
  const [recentBuildings, setRecentBuildings] = useState<BuildingType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Estado para almacenar los datos del usuario
  const [userDetails, setUserDetails] = useState<any>(null)
  
  // Estados específicos por rol
  const [financialStats, setFinancialStats] = useState<any>(null) // Para admin
  const [supervisorStats, setSupervisorStats] = useState<any>(null) // Para supervisor
  const [trabajadorStats, setTrabajadorStats] = useState<any>(null) // Para trabajador

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true)
        
        if (!supabase) {
          setError("No se pudo inicializar el cliente de Supabase")
          return
        }
        
        // 1. Obtener datos del usuario actual
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setError("No se pudo obtener la información del usuario")
          return
        }
        
        // 2. Obtener detalles del usuario desde la tabla 'usuarios'
        const { data: userData, error: userError } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', user.id)
          .single()
          
        if (userError || !userData) {
          console.error("Error al obtener detalles del usuario:", userError)
          setError("No se pudo obtener la información del usuario")
          return
        }
        
        console.log("Datos de usuario obtenidos:", userData)
        setUserDetails(userData)

        // Obtener estadísticas mediante consultas directas a las tablas
        try {
          // 1. Contar edificios - usando la función de ayuda
          const edificiosQuery = supabase
            .from('edificios')
            .select('id', { count: 'exact', head: true })
          const { count: edificiosCount } = await executeCountQuery(edificiosQuery)

          // 2. Contar teléfonos de departamentos (reemplaza el antiguo conteo de contactos)
          const telefonosQuery = supabase
            .from('telefonos_departamento')
            .select('id', { count: 'exact', head: true })
          const { count: telefonosCount } = await executeCountQuery(telefonosQuery)
            
          // 3. Contar usuarios administradores - usando la función de ayuda
          const adminsQuery = supabase
            .from('usuarios')
            .select('id', { count: 'exact', head: true })
            .eq('rol', 'admin')
          const { count: adminsCount } = await executeCountQuery(adminsQuery)

          // 4. Contar tareas activas - usando la columna 'finalizada' (false = activa, true = finalizada)
          const tareasActivasQuery = supabase
            .from('tareas')
            .select('id', { count: 'exact', head: true })
            .eq('finalizada', false) // Una tarea es activa cuando finalizada = false
          const { count: tareasActivasCount } = await executeCountQuery(tareasActivasQuery)

          // Crear objeto de estadísticas
          setStats({
            total_edificios: edificiosCount || 0,
            total_contactos: telefonosCount || 0, // Ahora muestra el total de teléfonos
            total_administradores: adminsCount || 0,
            tareas_activas: tareasActivasCount || 0
          })

          // Cargar estadísticas específicas según el rol del usuario
          if (userData.rol === 'admin') {
            try {
              // Estadísticas financieras para administradores
              const presupuestosQuery = supabase
                .from('presupuestos_finales')
                .select('id, total', { count: 'exact', head: true })
                .eq('id_estado', 5) // ID de estado "activo"
              const { count: presupuestosActivos } = await executeCountQuery(presupuestosQuery)
              
              // Monto total de presupuestos activos
              const { data: montoData } = await supabase
                .from('presupuestos_finales')
                .select('total')
                .eq('id_estado', 5) // ID de estado "activo"
              const montoTotal = montoData?.reduce((sum, item) => sum + (item.total || 0), 0) || 0
              
              // Facturas pendientes
              const { count: facturasPendientes } = await executeCountQuery(
                supabase
                  .from('facturas')
                  .select('id', { count: 'exact', head: true })
                  .eq('id_estado_nuevo', 1) // ID de estado "pendiente"
              )
              
              // Liquidaciones pendientes
              // Para liquidaciones_nuevas no existe estado, usamos otra condición
              const { count: liquidacionesPendientes } = await executeCountQuery(
                supabase
                  .from('liquidaciones_nuevas')
                  .select('id', { count: 'exact', head: true })
                  .is('ganancia_neta', null) // Asumimos que si no hay ganancia, está pendiente
              )
              
              setFinancialStats({
                presupuestos_activos: presupuestosActivos || 0,
                presupuestos_monto_total: montoTotal || 0,
                facturas_pendientes: facturasPendientes || 0,
                liquidaciones_pendientes: liquidacionesPendientes || 0
              })
            } catch (e) {
              console.error("Error al cargar estadísticas para administrador:", e)
              setFinancialStats({
                presupuestos_activos: 0,
                presupuestos_monto_total: 0,
                facturas_pendientes: 0,
                liquidaciones_pendientes: 0
              })
            }
          } else if (userData.rol === 'supervisor') {
            try {
              // Tareas supervisadas
              const { count: tareasSupervisadas } = await executeCountQuery(
                supabase
                  .from('supervisores_tareas')
                  .select('id_tarea', { count: 'exact', head: true })
                  .eq('id_supervisor', userData.id)
              )
              
              // Presupuestos pendientes para las tareas supervisadas
              // Primero obtenemos las tareas del supervisor (reutilizamos la consulta anterior)
              // Podríamos reutilizar tareasDelSupervisor y idsTareas de abajo, pero para mayor claridad lo repetimos
              const { data: tareasDelSupervisorPresupuestos } = await supabase
                .from('supervisores_tareas')
                .select('id_tarea')
                .eq('id_supervisor', userData.id);
                
              const idsTareasPresupuestos = tareasDelSupervisorPresupuestos?.map(t => t.id_tarea) || [];
              
              // Luego consultamos presupuestos pendientes para esas tareas
              let presupuestosPendientes = 0;
              if (idsTareasPresupuestos.length > 0) {
                const presupuestosResult = await executeCountQuery(
                  supabase
                    .from('presupuestos_finales')
                    .select('id', { count: 'exact', head: true })
                    .eq('id_estado', 1) // Asumiendo que 1 = pendiente
                    .in('id_tarea', idsTareasPresupuestos)
                );
                presupuestosPendientes = presupuestosResult.count || 0;
              }
              
              // Trabajadores asignados a sus tareas
              // Primero obtenemos las tareas del supervisor
              const { data: tareasDelSupervisor } = await supabase
                .from('supervisores_tareas')
                .select('id_tarea')
                .eq('id_supervisor', userData.id);
                
              const idsTareas = tareasDelSupervisor?.map(t => t.id_tarea) || [];
              
              // Luego contamos trabajadores en esas tareas
              let trabajadoresAsignados = 0;
              if (idsTareas.length > 0) {
                // Primero obtenemos todos los trabajadores sin duplicados
                const { data: trabajadoresData } = await supabase
                  .from('trabajadores_tareas')
                  .select('id_trabajador')
                  .in('id_tarea', idsTareas);
                
                // Eliminamos duplicados manualmente
                const trabajadoresUnicos = new Set();
                trabajadoresData?.forEach(t => trabajadoresUnicos.add(t.id_trabajador));
                trabajadoresAsignados = trabajadoresUnicos.size;
              }
              
              // Liquidaciones propias
              const { count: liquidacionesPropias } = await executeCountQuery(
                supabase
                  .from('liquidaciones_nuevas')
                  .select('id', { count: 'exact', head: true })
                  .eq('id_usuario_supervisor', userData.id) // Columna correcta
              )
              
              setSupervisorStats({
                tareas_supervisadas: tareasSupervisadas || 0,
                presupuestos_pendientes: presupuestosPendientes || 0,
                trabajadores_asignados: trabajadoresAsignados || 0,
                liquidaciones_propias: liquidacionesPropias || 0
              })
            } catch (e) {
              console.error("Error al cargar estadísticas para supervisor:", e)
              setSupervisorStats({
                tareas_supervisadas: 0,
                presupuestos_pendientes: 0,
                trabajadores_asignados: 0,
                liquidaciones_propias: 0
              })
            }
          } else if (userData.rol === 'trabajador') {
            try {
              // Mis tareas
              const { count: misTareas } = await executeCountQuery(
                supabase
                  .from('trabajadores_tareas')
                  .select('id_tarea', { count: 'exact', head: true })
                  .eq('id_trabajador', userData.id)
              )
              
              // Días registrados en el mes actual
              let diasRegistrados = 0;
              try {
                const today = new Date();
                const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                
                // Primero verificamos si la tabla existe
                const { error: tableCheckError } = await supabase
                  .from('vista_partes_trabajo_completa')
                  .select('id')
                  .limit(1)
                  .maybeSingle();
                
                if (!tableCheckError) {
                  const { count: diasCount } = await executeCountQuery(
                    supabase
                      .from('vista_partes_trabajo_completa')
                      .select('id', { count: 'exact', head: true })
                      .eq('id_trabajador', userData.id)
                      .gte('fecha', firstDayOfMonth.toISOString())
                  );
                  diasRegistrados = diasCount || 0;
                } else {
                  console.warn("Tabla vista_partes_trabajo_completa no encontrada o error:", tableCheckError);
                }
              } catch (e) {
                console.error("Error al consultar días trabajados:", e);
              }
              
              // Gastos pendientes
              let gastosPendientes = 0;
              try {
                // Primero verificamos si la tabla existe
                const { error: tableCheckError } = await supabase
                  .from('vista_gastos_tarea_completa')
                  .select('id')
                  .limit(1)
                  .maybeSingle();
                
                if (!tableCheckError) {
                  const { count: gastosCount } = await executeCountQuery(
                    supabase
                      .from('vista_gastos_tarea_completa')
                      .select('id', { count: 'exact', head: true })
                      .eq('id_usuario', userData.id) // Cambio de id_trabajador a id_usuario según la estructura
                      .eq('estado', 'pendiente')
                  );
                  gastosPendientes = gastosCount || 0;
                } else {
                  console.warn("Tabla vista_gastos_tarea_completa no encontrada o error:", tableCheckError);
                }
              } catch (e) {
                console.error("Error al consultar gastos pendientes:", e);
              }
              
              // Obtener información del próximo pago estimado
              let configTrabajador = { salario_diario: 0 }; // Cambiado a salario_diario según la estructura
              try {
                // Primero verificamos si la tabla existe
                const { error: tableCheckError } = await supabase
                  .from('configuracion_trabajadores')
                  .select('salario_diario') // Cambiado a salario_diario
                  .limit(1)
                  .maybeSingle();
                  
                if (!tableCheckError) {
                  const { data: configData } = await supabase
                    .from('configuracion_trabajadores')
                    .select('salario_diario') // Cambiado a salario_diario
                    .eq('id_trabajador', userData.id)
                    .maybeSingle();
                    
                  if (configData) {
                    configTrabajador = configData;
                  }
                } else {
                  console.warn("Tabla configuracion_trabajadores no encontrada o error:", tableCheckError);
                }
              } catch (e) {
                console.error("Error al consultar configuración del trabajador:", e);
              }
              
              // Calcular próximo pago aproximado (días registrados * tarifa diaria)
              const proximoPago = (configTrabajador?.salario_diario || 0) * (diasRegistrados || 0)
              
              setTrabajadorStats({
                mis_tareas: misTareas || 0,
                dias_registrados_mes: diasRegistrados || 0,
                gastos_pendientes: gastosPendientes || 0,
                proximo_pago_estimado: proximoPago || 0
              })
            } catch (e) {
              console.error("Error al cargar estadísticas para trabajador:", e)
              setTrabajadorStats({
                mis_tareas: 0,
                dias_registrados_mes: 0,
                gastos_pendientes: 0,
                proximo_pago_estimado: 0
              })
            }
          }
        } catch (statsError) {
          console.error("Error al obtener estadísticas:", statsError)
          // Usar valores por defecto para que la interfaz no se rompa
          setStats({
            total_edificios: 0,
            total_contactos: 0, // Ahora representa el total de teléfonos
            total_administradores: 0,
            tareas_activas: 0
          })
        }

        // Obtener tareas recientes filtradas por rol
        console.log("Filtrando tareas para rol:", userData?.rol, "con ID:", userData?.id);
        
        let tasksQuery;
        
        // Filtrar tareas según el rol del usuario
        if (userData?.rol === 'admin') {
          // Los admin ven todas las tareas usando la vista completa con JOIN a estados_tareas
          tasksQuery = supabase.from("vista_tareas_completa")
            .select(`
              id, titulo, fecha_visita, id_estado_nuevo, estado_tarea, created_at,
              estados:estados_tareas(id, nombre, color)
            `)
            .order('fecha_visita', { ascending: true }) // Ordenar por fecha de visita más próxima
        } 
        else if (userData?.rol === 'supervisor') {
          // Los supervisores solo ven tareas que supervisan
          try {
            // Primero obtenemos los IDs de tareas asignadas al supervisor
            const { data: asignaciones } = await supabase
              .from('supervisores_tareas')
              .select('id_tarea')
              .eq('id_supervisor', userData.id)
            
            const idsTareas = asignaciones?.map(a => a.id_tarea) || []
            
            // Registrar para debugging
            console.log(`Supervisor ${userData.id}: ${idsTareas.length} tareas encontradas`)
            
            if (idsTareas.length > 0) {
              // Luego filtramos las tareas por esos IDs usando la vista completa con JOIN a estados_tareas
              console.log("Consultando tareas específicas para supervisor con IDs:", idsTareas);
              tasksQuery = supabase.from("vista_tareas_completa")
                .select(`
                  id, titulo, fecha_visita, id_estado_nuevo, estado_tarea, created_at,
                  estados:estados_tareas(id, nombre, color)
                `)
                .in('id', idsTareas)
                .order('fecha_visita', { ascending: true }) // Ordenar por fecha de visita más próxima
            } else {
              // Si no tiene tareas asignadas, mostramos una lista vacía
              tasksQuery = supabase.from("vista_tareas_completa")
                .select(`
                  id, titulo, fecha_visita, id_estado_nuevo, estado_tarea, created_at,
                  estados:estados_tareas(id, nombre, color)
                `)
                .eq('id', -1) // No coincidirá con ninguna
            }
          } catch (e) {
            console.error("Error al consultar tareas del supervisor:", e)
            tasksQuery = supabase.from("vista_tareas_completa")
              .select(`
                id, titulo, fecha_visita, id_estado_nuevo, estado_tarea, created_at,
                estados:estados_tareas(id, nombre, color)
              `)
              .limit(0)
          }
        } 
        else if (userData?.rol === 'trabajador') {
          // Los trabajadores solo ven tareas donde están asignados
          try {
            // Primero obtenemos los IDs de tareas asignadas al trabajador
            const { data: asignaciones } = await supabase
              .from('trabajadores_tareas')
              .select('id_tarea')
              .eq('id_trabajador', userData.id)
            
            const idsTareas = asignaciones?.map(a => a.id_tarea) || []
            
            // Registrar para debugging
            console.log(`Trabajador ${userData.id}: ${idsTareas.length} tareas encontradas`)
            
            if (idsTareas.length > 0) {
              // Luego filtramos las tareas por esos IDs usando la vista completa con JOIN a estados_tareas
              tasksQuery = supabase.from("vista_tareas_completa")
                .select(`
                  id, titulo, fecha_visita, id_estado_nuevo, estado_tarea, created_at,
                  estados:estados_tareas(id, nombre, color)
                `)
                .in('id', idsTareas)
                .order('fecha_visita', { ascending: true }) // Ordenar por fecha de visita más próxima
            } else {
              // Si no tiene tareas asignadas, mostramos una lista vacía
              tasksQuery = supabase.from("vista_tareas_completa")
                .select(`
                  id, titulo, fecha_visita, id_estado_nuevo, estado_tarea, created_at,
                  estados:estados_tareas(id, nombre, color)
                `)
                .eq('id', -1) // No coincidirá con ninguna
            }
          } catch (e) {
            console.error("Error al consultar tareas del trabajador:", e)
            tasksQuery = supabase.from("vista_tareas_completa")
              .select(`
                id, titulo, fecha_visita, id_estado_nuevo, estado_tarea, created_at,
                estados:estados_tareas(id, nombre, color)
              `)
              .limit(0)
          }
        }
        else {
          // Para otros roles o si no hay rol definido, no mostramos tareas
          console.log('Rol no reconocido o no definido:', userData?.rol)
          tasksQuery = supabase.from("vista_tareas_completa")
            .select(`
              id, titulo, fecha_visita, id_estado_nuevo, estado_tarea, created_at,
              estados:estados_tareas(id, nombre, color)
            `)
            .limit(0)
        }
        
        // Ejecutamos la consulta con límite
        console.log("Consultando tareas recientes para todos los usuarios");
        const { data: tasksData, error: tasksError } = await executeQuery<TaskType>(
          tasksQuery,
          5,
          "created_at",
          false // descendente
        );
        
        if (tasksError) {
          console.error("Error al obtener tareas recientes:", tasksError)
        } else {
          console.log("Datos de tareas con estados:", tasksData);
          setRecentTasks(tasksData)
        }

        // Obtener edificios recientes - usando la función de ayuda
        const buildingsQuery = supabase.from("edificios").select("*")
        const { data: buildingsData, error: buildingsError } = await executeQuery<BuildingType>(
          buildingsQuery,
          5,
          "created_at",
          false // descendente
        )

        if (buildingsError) {
          console.error("Error al obtener edificios recientes:", buildingsError)
        } else {
          setRecentBuildings(buildingsData)
        }

      } catch (err) {
        console.error("Error al cargar datos del dashboard:", err)
        setError("Ocurrió un error al cargar los datos del dashboard")
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  // Estado de carga
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // Estado de error
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-red-800">Error</h2>
        <p className="mt-2 text-red-700">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      {/* Mostrar interfaz específica según el rol del usuario */}
      {userDetails?.rol === 'admin' && (
        <AdminDashboard 
          stats={stats} 
          financialStats={financialStats} 
          recentTasks={recentTasks} 
          recentBuildings={recentBuildings} 
        />
      )}

      {userDetails?.rol === 'supervisor' && (
        <SupervisorDashboard 
          stats={stats} 
          supervisorStats={supervisorStats} 
          recentTasks={recentTasks} 
        />
      )}

      {userDetails?.rol === 'trabajador' && (
        <TrabajadorDashboard 
          stats={stats} 
          trabajadorStats={trabajadorStats} 
          recentTasks={recentTasks} 
        />
      )}
      
      {/* Si no hay un rol definido, mostrar la interfaz genérica */}
      {!userDetails?.rol && (
        <>
          {/* Estadísticas generales */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <h3 className="text-sm font-medium text-muted-foreground">Total Edificios</h3>
              <p className="mt-2 text-3xl font-bold">{stats?.total_edificios || 0}</p>
            </div>
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <h3 className="text-sm font-medium text-muted-foreground">Total Administradores</h3>
              <p className="mt-2 text-3xl font-bold">{stats?.total_administradores || 0}</p>
            </div>
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <h3 className="text-sm font-medium text-muted-foreground">Total Teléfonos</h3>
              <p className="mt-2 text-3xl font-bold">{stats?.total_contactos || 0}</p>
            </div>
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <h3 className="text-sm font-medium text-muted-foreground">Tareas Activas</h3>
              <p className="mt-2 text-3xl font-bold">{stats?.tareas_activas || 0}</p>
            </div>
          </div>
          
          {/* Tareas recientes */}
          <div>
            <h2 className="mb-4 text-xl font-semibold">Tareas Recientes</h2>
            <div className="rounded-lg border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-2 text-left font-medium">Título</th>
                      <th className="px-4 py-2 text-left font-medium">Estado</th>
                      <th className="px-4 py-2 text-left font-medium">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTasks && recentTasks.length > 0 ? (
                      recentTasks.map((task) => (
                        <tr key={task.id} className="border-b">
                          <td className="px-4 py-2">{task.titulo}</td>
                          <td className="px-4 py-2">
                            <TaskStatusBadge task={task} />
                          </td>
                          <td className="px-4 py-2">{formatDate(task.created_at)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-4 py-2 text-center text-muted-foreground">
                          No hay tareas recientes
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Edificios recientes */}
          <div>
            <h2 className="mb-4 text-xl font-semibold">Edificios Recientes</h2>
            <div className="rounded-lg border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-2 text-left font-medium">Nombre</th>
                      <th className="px-4 py-2 text-left font-medium">Dirección</th>
                      <th className="px-4 py-2 text-left font-medium">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBuildings && recentBuildings.length > 0 ? (
                      recentBuildings.map((building) => (
                        <tr key={building.id} className="border-b">
                          <td className="px-4 py-2">{building.nombre}</td>
                          <td className="px-4 py-2">{building.direccion}</td>
                          <td className="px-4 py-2">{formatDate(building.created_at)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-4 py-2 text-center text-muted-foreground">
                          No hay edificios recientes
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
