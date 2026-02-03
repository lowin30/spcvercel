"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import Link from "next/link"
import { Plus, Loader2, Phone, Trash2, Pencil } from "lucide-react"
import { createClient } from "@/lib/supabase-client"
import { useToast } from "@/components/ui/use-toast"
import { BatchGoogleSync } from "@/components/batch-google-sync"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// Definir interfaces
interface Edificio {
  id: number | string
  nombre: string
}

interface Departamento {
  id: number | string
  codigo: string
  edificio_id: number | string
  propietario?: string
  edificios?: {
    id?: number | string
    nombre?: string
  }
}

interface Telefono {
  id: number | string
  telefono: string
  relacion: string
  nombreReal: string
  nombre: string // Slug
  es_principal: boolean
  departamento_id: number | string
  notas?: string
  departamentos?: {
    id?: number | string
    codigo?: string
    edificio_id?: number | string
    edificios?: {
      id?: number | string
      nombre?: string
    }
  }
  _totalContactos?: number
}

export default function ContactosPage() {
  const [userDetails, setUserDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  // Estados para los datos
  const [edificios, setEdificios] = useState<Edificio[]>([])
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [telefonos, setTelefonos] = useState<Telefono[]>([])
  const [telefonosPorDepartamento, setTelefonosPorDepartamento] = useState<{ [key: string]: Telefono[] }>({})
  const [edificioSeleccionado, setEdificioSeleccionado] = useState<string>("todos")
  const [departamentoSeleccionado, setDepartamentoSeleccionado] = useState<string>("todos")
  const [busqueda, setBusqueda] = useState<string>("")

  // Datos filtrados
  const [departamentosFiltrados, setDepartamentosFiltrados] = useState<Departamento[]>([])
  const [telefonosFiltrados, setTelefonosFiltrados] = useState<Telefono[]>([])

  // Determinar si el usuario puede crear/editar contactos
  const canCreateContact = userDetails?.rol === "admin"
  const canEditContact = userDetails?.rol === "admin" || userDetails?.rol === "supervisor"
  const canDeleteContact = userDetails?.rol === "admin"

  useEffect(() => {
    async function cargarDatos() {
      try {
        setLoading(true)
        const supabase = createClient()

        if (!supabase) {
          setError("No se pudo inicializar el cliente de Supabase")
          return
        }

        // Verificar sesión de usuario
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          console.log("No se encontró sesión de usuario, redirigiendo al login")
          router.push("/login")
          return
        }

        // Obtener detalles del usuario
        const { data: userData, error: userError } = await supabase
          .from("usuarios")
          .select("*")
          .eq("id", user.id)
          .single()

        if (userError) {
          console.error("Error al obtener detalles del usuario:", userError)
          setError("Error al obtener detalles del usuario")
          return
        }

        setUserDetails(userData)

        // Verificar si el usuario puede ver contactos (admin o supervisor)
        const canViewContacts = userData?.rol === "admin" || userData?.rol === "supervisor"

        if (!canViewContacts) {
          router.push("/dashboard/esperando-rol")
          return
        }

        // Obtener datos de edificios
        const { data: edificiosData, error: edificiosError } = await supabase
          .from("edificios")
          .select("id, nombre")
          .order("nombre")

        if (edificiosError) {
          console.error("Error al obtener edificios:", edificiosError)
        } else {
          setEdificios(edificiosData || [])
        }

        // Obtener datos de departamentos
        const { data: departamentosData, error: deptosError } = await supabase
          .from("departamentos")
          .select(`
            id, 
            codigo,
            edificio_id,
            propietario,
            edificios(nombre)
          `)
          .order("codigo")

        if (deptosError) {
          if (deptosError.code === "42P01") {
            console.warn("La tabla departamentos no existe. Por favor, crea las tablas primero.")
          } else {
            console.error("Error al obtener departamentos:", deptosError)
          }
        } else {
          setDepartamentos((departamentosData || []) as unknown as Departamento[])
          setDepartamentosFiltrados((departamentosData || []) as unknown as Departamento[])
        }

        // Obtener datos de teléfonos (Desde tabla 'contactos')
        const { data: telefonosData, error: telefonosError } = await supabase
          .from("contactos")
          .select(`
            id,
            telefono,
            relacion,
            nombreReal,
            nombre,
            es_principal,
            notas,
            departamento_id,
            departamentos(
              id,
              codigo,
              edificio_id,
              edificios(id, nombre)
            )
          `)
          .not('departamento_id', 'is', null) // Solo traer los vinculados a dptos
          .order("es_principal", { ascending: false })
          .order("created_at", { ascending: false })

        if (telefonosError) {
          console.error("Error al obtener contactos:", telefonosError)
        } else {
          setTelefonos((telefonosData || []) as unknown as Telefono[])
          setTelefonosFiltrados((telefonosData || []) as unknown as Telefono[])
        }

      } catch (err) {
        console.error("Error inesperado:", err)
        setError("Ocurrió un error inesperado")
      } finally {
        setLoading(false)
      }
    }

    cargarDatos()
  }, [router])

  // Efecto para filtrar departamentos cuando se selecciona un edificio
  useEffect(() => {
    if (edificioSeleccionado && edificioSeleccionado !== "todos") {
      const filtrados = departamentos.filter(
        (depto) => depto.edificio_id.toString() === edificioSeleccionado
      )
      setDepartamentosFiltrados(filtrados)
    } else {
      setDepartamentosFiltrados(departamentos)
    }

    // Resetear el departamento seleccionado
    setDepartamentoSeleccionado("todos")
  }, [edificioSeleccionado, departamentos])

  // Efecto para filtrar teléfonos cuando se selecciona un departamento o cambia la búsqueda
  useEffect(() => {
    let filtrados = [...telefonos]

    // Filtrar por edificio si hay uno seleccionado
    if (edificioSeleccionado && edificioSeleccionado !== "todos") {
      filtrados = filtrados.filter(
        tel => tel.departamentos?.edificio_id?.toString() === edificioSeleccionado
      )
    }

    // Filtrar por departamento si hay uno seleccionado
    if (departamentoSeleccionado && departamentoSeleccionado !== "todos") {
      filtrados = filtrados.filter(
        tel => tel.departamento_id.toString() === departamentoSeleccionado
      )
    }

    // Filtrar por búsqueda
    if (busqueda) {
      const busquedaLower = busqueda.toLowerCase()
      filtrados = filtrados.filter(
        tel =>
          (tel.nombreReal && tel.nombreReal.toLowerCase().includes(busquedaLower)) ||
          (tel.nombre && tel.nombre.toLowerCase().includes(busquedaLower)) ||
          (tel.telefono && tel.telefono.toLowerCase().includes(busquedaLower)) ||
          (tel.relacion && tel.relacion.toLowerCase().includes(busquedaLower))
      )
    }

    // Agrupar teléfonos por departamento
    const telefonosByDepartamento: { [key: string]: Telefono[] } = {}

    filtrados.forEach(tel => {
      const deptId = String(tel.departamento_id)
      if (!telefonosByDepartamento[deptId]) {
        telefonosByDepartamento[deptId] = []
      }
      telefonosByDepartamento[deptId].push(tel)
    })

    setTelefonosPorDepartamento(telefonosByDepartamento)

    // Priorizamos los teléfonos principales para cada departamento
    const telefonosPrincipalesPorDepartamento = Object.values(telefonosByDepartamento).map(telGroup => {
      // Buscar primero un teléfono principal
      const principal = telGroup.find(tel => tel.es_principal)
      if (principal) {
        return { ...principal, _totalContactos: telGroup.length }
      }
      // Si no hay principal, usar el primero
      return { ...telGroup[0], _totalContactos: telGroup.length }
    })

    setTelefonosFiltrados(telefonosPrincipalesPorDepartamento)
  }, [edificioSeleccionado, departamentoSeleccionado, busqueda, telefonos])

  // Función para eliminar un teléfono
  const eliminarTelefono = async (id: string | number) => {
    if (!canDeleteContact) return

    if (!confirm("¿Está seguro que desea eliminar este contacto?")) {
      return
    }

    try {
      setLoading(true)
      const supabase = createClient()

      if (!supabase) {
        toast({
          title: "Error",
          description: "No se pudo inicializar el cliente de Supabase",
          variant: "destructive",
        })
        return
      }

      const { error } = await supabase
        .from("contactos")
        .delete()
        .eq("id", id)

      if (error) {
        throw new Error(error.message)
      }

      // Actualizar la lista sin recargar
      setTelefonos(telefonos.filter(tel => tel.id !== id))
      setTelefonosFiltrados(telefonosFiltrados.filter(tel => tel.id !== id))

      toast({
        title: "Contacto eliminado",
        description: "El contacto ha sido eliminado correctamente",
      })
    } catch (error: any) {
      console.error("Error al eliminar:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el contacto: " + error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Estado de carga
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-10 w-10 animate-spin text-gray-500" />
          <p className="text-lg text-gray-500">Cargando contactos...</p>
        </div>
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
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Contactos</h2>
          <p className="text-muted-foreground">Gestiona los teléfonos de contacto por departamento.</p>
        </div>
        <div className="flex gap-2 items-center">
          {canCreateContact && <BatchGoogleSync />}
          {canCreateContact ? (
            <Link href="/dashboard/contactos/nuevo">
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />
                Nuevo Contacto
              </Button>
            </Link>
          ) : null}
        </div>
      </div>


      {/* Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 mb-4 md:mb-6">
        {/* Filtro por edificio */}
        <div className="space-y-1 sm:space-y-2">
          <label className="text-xs sm:text-sm font-medium">Edificio</label>
          <Select value={edificioSeleccionado} onValueChange={setEdificioSeleccionado}>
            <SelectTrigger className="h-8 sm:h-10 text-xs sm:text-sm">
              <SelectValue placeholder="Todos los edificios" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos" className="text-xs sm:text-sm">Todos los edificios</SelectItem>
              {edificios.map((edificio) => (
                <SelectItem key={edificio.id} value={edificio.id.toString()} className="text-xs sm:text-sm">
                  {edificio.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filtro por departamento */}
        <div className="space-y-1 sm:space-y-2">
          <label className="text-xs sm:text-sm font-medium">Departamento</label>
          <Select value={departamentoSeleccionado} onValueChange={setDepartamentoSeleccionado} disabled={departamentosFiltrados.length === 0}>
            <SelectTrigger className="h-8 sm:h-10 text-xs sm:text-sm">
              <SelectValue placeholder="Todos los departamentos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos" className="text-xs sm:text-sm">Todos los departamentos</SelectItem>
              {departamentosFiltrados.map((depto) => (
                <SelectItem key={depto.id} value={depto.id.toString()} className="text-xs sm:text-sm">
                  {depto.codigo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Búsqueda por texto */}
        <div className="space-y-1 sm:space-y-2">
          <label className="text-xs sm:text-sm font-medium">Buscar</label>
          <Input
            placeholder="Buscar contacto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="h-8 sm:h-10 text-xs sm:text-sm"
          />
        </div>
      </div>

      {/* Lista de contactos */}
      <div className="rounded-md border w-full max-w-full overflow-hidden">
        {/* Estilos para dispositivos móviles */}
        <style jsx global>{`
          /* Estilos para evitar scroll horizontal en móvil */
          @media (max-width: 640px) {            
            table.contactos-table {
              width: 100%;
              table-layout: fixed;
              border-collapse: collapse;
              border-spacing: 0;
            }
            
            /* Ocultar columnas de Edificio y Departamento en móvil */
            table.contactos-table th:nth-child(1),
            table.contactos-table td:nth-child(1),
            table.contactos-table th:nth-child(2),
            table.contactos-table td:nth-child(2) {
              display: none;
            }
            
            /* Ajustar anchos de las columnas visibles */
            table.contactos-table th:nth-child(3),
            table.contactos-table td:nth-child(3) {
              width: 45%;
              padding: 8px 4px;
            }
            
            table.contactos-table th:nth-child(4),
            table.contactos-table td:nth-child(4) {
              width: 32%;
              padding: 8px 4px 8px 4px;
              max-width: 32vw;
              overflow-x: visible;
              text-align: right;
              padding-right: 2px;
            }
            
            table.contactos-table th:nth-child(5),
            table.contactos-table td:nth-child(5) {
              width: 23%;
              padding: 8px 0 8px 0;
              text-align: center;
            }
            
            /* Centrar los botones de acción */
            table.contactos-table td:nth-child(5) > div {
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100%;
            }
            
            /* Permitir scroll horizontal dentro de la celda de teléfonos si es necesario */
            table.contactos-table td:nth-child(4) > div {
              max-height: 120px;
              overflow-y: auto;
              padding-right: 0;
            }
            
            /* Asegurar que el contenido no cause overflow */
            table.contactos-table td {
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              vertical-align: top;
            }

            /* Reducir padding general de todas las celdas en móvil */
            table.contactos-table td {
              padding-top: 4px;
              padding-bottom: 4px;
            }
            
            /* Hacer botones más pequeños en móvil */
            table.contactos-table button {
              height: 30px;
              width: 30px;
              padding: 0;
            }
            
            table.contactos-table button svg {
              height: 14px;
              width: 14px;
            }
          }
        `}</style>
        <Table className="contactos-table">
          <TableCaption>Lista de contactos disponibles.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Edificio</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Teléfonos</TableHead>
              <TableHead className="w-[80px] pl-0">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {telefonosFiltrados.length > 0 ? (
              telefonosFiltrados.map((telefono) => (
                <TableRow key={telefono.id}>
                  <TableCell>
                    {telefono.departamentos?.edificios?.nombre || "—"}
                  </TableCell>
                  <TableCell>
                    {telefono.departamentos?.codigo || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {telefono.nombreReal || telefono.nombre || "—"}
                      <div className="hidden sm:block"></div>
                      <div className="sm:hidden text-xs text-gray-500 truncate">
                        {telefono.departamentos?.edificios?.nombre || "—"} {telefono.departamentos?.codigo || "—"}
                      </div>
                      {telefono.es_principal && (
                        <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                          Principal
                        </span>
                      )}
                      {telefono._totalContactos && telefono._totalContactos > 1 && (
                        <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
                          {telefono._totalContactos} contactos
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-end">
                      {telefonosPorDepartamento[telefono.departamento_id.toString()]?.map((tel, index) => (
                        <a href={`tel:${tel.telefono?.replace(/[-\s]/g, '')}`} key={tel.id} className="block py-0.5 hover:text-blue-600 text-nowrap">
                          {tel.telefono?.replace(/[-\s]/g, '') || "—"}
                        </a>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2 justify-center">
                      {canEditContact && (
                        <Link href={`/dashboard/contactos/${telefono.departamento_id}/editar`}>
                          <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" title="Editar contactos del departamento">
                            <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </Button>
                        </Link>
                      )}
                      {canDeleteContact && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 sm:h-9 sm:w-9"
                          title="Eliminar"
                          onClick={() => eliminarTelefono(telefono.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  {departamentos.length === 0 && telefonos.length === 0 ? (
                    <div className="text-center">
                      <p className="text-muted-foreground">
                        No hay datos de departamentos o contactos. Asegúrate de haber ejecutado el script para crear las tablas.
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No se encontraron contactos con los filtros aplicados.</p>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}