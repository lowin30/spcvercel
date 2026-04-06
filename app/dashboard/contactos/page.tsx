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
  nombre: string // Slug o nombre consolidado
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
      administradores?: {
        id?: number | string
        nombre?: string
      }
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
              edificios(
                id, 
                nombre,
                administradores(id, nombre)
              )
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
      // Evitar duplicados inteligentes en el renderizado
      const telNormalizado = tel.telefono?.replace(/\D/g, '')
      const isDuplicate = telNormalizado && telefonosByDepartamento[deptId].some(
        existing => existing.telefono?.replace(/\D/g, '') === telNormalizado
      )
      
      if (!isDuplicate) {
        telefonosByDepartamento[deptId].push(tel)
      }
    })

    setTelefonosPorDepartamento(telefonosByDepartamento)

    // Priorizamos los teléfonos principales para cada departamento
    const telefonosPrincipalesPorDepartamento = Object.values(telefonosByDepartamento).map(telGroup => {
      const principal = telGroup.find(tel => tel.es_principal)
      if (principal) {
        return { ...principal, _totalContactos: telGroup.length }
      }
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
      <div className="rounded-md border-0 sm:border w-full max-w-full overflow-hidden">
        {/* Estilos Lista Ultra-Densa Platinum */}
        <style jsx global>{`
          @media (max-width: 640px) {            
            .contactos-table thead {
              display: none;
            }
            
            .contactos-table, .contactos-table tbody, .contactos-table tr, .contactos-table td {
              display: block;
              width: 100%;
            }
            
            .contactos-table tr {
              margin-bottom: 4px; /* Ultra-compacto */
              border-bottom: 1px solid rgba(0,0,0,0.06);
              background-color: #fff;
              padding: 6px 8px; /* Padding Platinum */
            }

            .dark .contactos-table tr {
              background-color: #09090b;
              border-color: rgba(255,255,255,0.06);
            }
            
            /* Ocultar celdas redundantes */
            .contactos-table td:nth-child(1),
            .contactos-table td:nth-child(2),
            .contactos-table td:nth-child(3) {
              display: none;
            }
            
            /* Contenedor Bicameral (Datos vs Acciones) */
            .contactos-table tr {
              display: flex !important;
              justify-content: space-between;
              align-items: center;
              gap: 8px;
            }

            /* Sección Alpha (Izq): Nombre y Metadatos */
            .contactos-table td:nth-child(4) {
              flex: 1;
              padding: 0;
              min-width: 0;
            }

            /* Sección Omega (Der): Teléfono y Acciones */
            .contactos-table td:nth-child(5) {
              display: none; /* Los teléfonos se inyectan en la celda 6 por simplicidad en el flex */
            }
            
            .contactos-table td:nth-child(6) {
              width: auto;
              padding: 0;
              display: flex;
              flex-direction: row;
              align-items: center;
              gap: 6px;
            }

            /* Ajuste de Links de Teléfono en modo ultra-denso */
            .contactos-mobile-tel {
              font-size: 0.85rem;
              font-weight: 600;
              color: #2563eb;
              display: flex;
              align-items: center;
              gap: 3px;
              white-space: nowrap;
            }

            .dark .contactos-mobile-tel {
              color: #60a5fa;
            }
          }
        `}</style>
        
        <Table className="contactos-table">
          <TableCaption className="hidden sm:table-caption">Lista de contactos disponibles.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>administrador</TableHead>
              <TableHead>edificio</TableHead>
              <TableHead>depto</TableHead>
              <TableHead>contacto</TableHead>
              <TableHead>telefonos</TableHead>
              <TableHead className="w-[80px] pl-0">acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {telefonosFiltrados.length > 0 ? (
              telefonosFiltrados.map((telefono) => {
                const todosTelefonos = telefonosPorDepartamento[telefono.departamento_id.toString()] || [];
                const telPrincipal = todosTelefonos[0]?.telefono?.replace(/[-\s]/g, '') || "";
                
                return (
                  <TableRow key={telefono.id}>
                    {/* Celdas ocultas en móvil por CSS */}
                    <TableCell className="text-muted-foreground text-xs">
                      {(telefono.departamentos?.edificios as any)?.administradores?.nombre || "—"}
                    </TableCell>
                    <TableCell>
                      {telefono.departamentos?.edificios?.nombre || "—"}
                    </TableCell>
                    <TableCell>
                      {telefono.departamentos?.codigo || "—"}
                    </TableCell>
                    
                    {/* Celda 4: Bloque de Identidad (Alpha) */}
                    <TableCell>
                      <div className="flex flex-col min-w-0">
                        <div className="font-bold text-[13px] sm:text-base truncate leading-tight">
                          {telefono.nombre || telefono.nombreReal || "—"}
                        </div>
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          {telefono.es_principal && (
                            <span className="text-[9px] font-black text-green-700 dark:text-green-400 uppercase">
                              PRI
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground truncate italic">
                            {telefono.relacion || (telefono.nombreReal !== telefono.nombre ? telefono.nombreReal : "contacto")}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    
                    {/* Celda 5: Telefonos (Legacy desktop) */}
                    <TableCell className="sm:table-cell hidden">
                      <div className="flex flex-col items-end gap-1">
                        {todosTelefonos.map((tel) => (
                          <a key={tel.id} href={`tel:${tel.telefono?.replace(/[-\s]/g, '')}`} className="hover:text-blue-600">
                             {tel.telefono?.replace(/[-\s]/g, '')}
                          </a>
                        ))}
                      </div>
                    </TableCell>
                    
                    {/* Celda 6: Acciones & Teléfono Rápido (Omega) */}
                    <TableCell>
                      {/* Teléfono rápido (Solo móvil) */}
                      <a 
                        href={`tel:${telPrincipal}`} 
                        className="sm:hidden contactos-mobile-tel"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        {telPrincipal.slice(-8)}
                      </a>

                      <div className="flex gap-1 items-center">
                        {canEditContact && (
                          <Link href={`/dashboard/contactos/${telefono.departamento_id}/editar`}>
                            <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-9 sm:w-9">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        )}
                        {canDeleteContact && (
                          <Button
                            variant="ghost" 
                            size="icon"
                            className="h-7 w-7 sm:h-9 sm:w-9"
                            onClick={() => eliminarTelefono(telefono.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                   <p className="text-muted-foreground">No se encontraron contactos con los filtros aplicados.</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}