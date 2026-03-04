import { validateSessionAndGetUser } from '@/lib/auth-bridge'
import { getTareasActivasConTrabajadores, getPartesDelDia, getPartesSemana, getResumenPlanificacion } from '@/lib/tools/partes/loader'
import RegistroDiasClient from './registro-dias-client'

/**
 * REGISTRO DIAS PAGE — CONSOLA DE MANDO DEL SUPERVISOR
 * server component que pre-carga datos via loaders de tools
 */
export default async function RegistroGeneralPartesPage() {
  const user = await validateSessionAndGetUser()

  // fecha de hoy para pase de lista
  const hoy = new Date()
  const fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`

  // calcular rango de la semana actual (lunes a sabado)
  const dia = hoy.getDay()
  const diffLunes = (dia + 6) % 7
  const lunes = new Date(hoy)
  lunes.setDate(hoy.getDate() - diffLunes)
  const sabado = new Date(lunes)
  sabado.setDate(lunes.getDate() + 5)
  const fechaLunes = `${lunes.getFullYear()}-${String(lunes.getMonth() + 1).padStart(2, '0')}-${String(lunes.getDate()).padStart(2, '0')}`
  const fechaSabado = `${sabado.getFullYear()}-${String(sabado.getMonth() + 1).padStart(2, '0')}-${String(sabado.getDate()).padStart(2, '0')}`

  // cargar datos en paralelo (gold standard: todo en server)
  const [tareas, partesHoy, partesSemana, resumen] = await Promise.all([
    getTareasActivasConTrabajadores(user.id, user.rol),
    getPartesDelDia(fechaHoy, user.id, user.rol),
    getPartesSemana(fechaLunes, fechaSabado, user.id, user.rol),
    getResumenPlanificacion(fechaLunes, fechaSabado, user.id, user.rol),
  ])

  return (
    <RegistroDiasClient
      userDetails={{ id: user.id, rol: user.rol, email: user.email }}
      tareas={tareas}
      partesHoy={partesHoy}
      partesSemana={partesSemana}
      resumen={resumen}
      fechaHoy={fechaHoy}
    />
  )
}
