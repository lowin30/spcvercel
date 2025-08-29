"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase-client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { X, Phone, PlusCircle, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Departamento {
  id: string
  codigo: string
  propietario?: string
}

interface Telefono {
  id: string
  numero: string
  nombre_contacto?: string
  departamento_id?: number
}

interface DepartamentosInteractivosProps {
  tareaId: number
  edificioId: number
  onDepartamentosChange?: (departamentos: Departamento[]) => void
  className?: string
}

export function DepartamentosInteractivos({
  tareaId,
  edificioId,
  onDepartamentosChange,
  className,
}: DepartamentosInteractivosProps) {
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [telefonos, setTelefonos] = useState<Telefono[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [departamentosDisponibles, setDepartamentosDisponibles] = useState<Departamento[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [departamentoSeleccionado, setDepartamentoSeleccionado] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  
  // Cargar rol de usuario
  useEffect(() => {
    const cargarRolUsuario = async () => {
      const supabase = createClient()
      if (!supabase) return
      
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const { data: userData } = await supabase
            .from("usuarios")
            .select("rol")
            .eq("id", session.user.id)
            .single()
          
          if (userData) {
            setUserRole(userData.rol)
          }
        }
      } catch (error) {
        console.error("Error al obtener rol de usuario:", error)
      }
    }
    
    cargarRolUsuario()
  }, [])
  
  // Cargar departamentos asociados a la tarea
  useEffect(() => {
    const cargarDepartamentosTarea = async () => {
      if (!tareaId) return
      
      setLoading(true)
      const supabase = createClient()
      
      if (!supabase) {
        setError("No se pudo inicializar el cliente de Supabase")
        setLoading(false)
        return
      }
      
      try {
        // Obtener departamentos asociados a la tarea
        const { data: departamentosTarea, error: depError } = await supabase
          .from("departamentos_tareas")
          .select(`
            id_departamento,
            departamentos:id_departamento(
              id, 
              codigo,
              propietario
            )
          `)
          .eq("id_tarea", tareaId)
        
        if (depError) {
          console.error("Error al cargar departamentos:", depError)
          setError("Error al cargar departamentos")
          return
        }
        
        // Extraer y formatear los datos de departamentos
        const departamentosFormateados = departamentosTarea
          .map((item: any) => item.departamentos)
          .filter(Boolean)
          .map((dep: any) => ({
            id: dep.id.toString(),
            codigo: dep.codigo,
            propietario: dep.propietario
          }))
        
        setDepartamentos(departamentosFormateados)
        
        // Si hay departamentos, cargar sus teléfonos asociados
        if (departamentosFormateados.length > 0) {
          const departamentosIds = departamentosFormateados.map((d: Departamento) => Number(d.id))
          
          const { data: telefonosData, error: telError } = await supabase
            .from("telefonos_departamento")
            .select("id, numero, nombre_contacto, departamento_id")
            .in("departamento_id", departamentosIds)
          
          if (telError) {
            console.error("Error al cargar teléfonos:", telError)
          } else {
            setTelefonos(telefonosData || [])
          }
        }
        
        // Cargar departamentos disponibles del edificio para el diálogo
        if (edificioId) {
          const { data: todosLosDepartamentos, error: allDepError } = await supabase
            .from("departamentos")
            .select("id, codigo, propietario")
            .eq("edificio_id", edificioId)
          
          if (allDepError) {
            console.error("Error al cargar todos los departamentos:", allDepError)
          } else {
            setDepartamentosDisponibles(todosLosDepartamentos || [])
          }
        }
        
      } catch (error) {
        console.error("Error inesperado:", error)
        setError("Ocurrió un error inesperado al cargar los departamentos")
      } finally {
        setLoading(false)
      }
    }
    
    cargarDepartamentosTarea()
  }, [tareaId, edificioId])
  
  // Función para agregar un departamento a la tarea
  const agregarDepartamento = async () => {
    if (!departamentoSeleccionado || !tareaId) return
    
    setIsUpdating(true)
    const supabase = createClient()
    
    try {
      // Verificar si la relación ya existe
      const { data: existingRel } = await supabase
        .from("departamentos_tareas")
        .select("id")
        .eq("id_tarea", tareaId)
        .eq("id_departamento", departamentoSeleccionado)
        .maybeSingle()
      
      if (existingRel) {
        toast({
          title: "Información",
          description: "Este departamento ya está asociado a la tarea."
        })
        setDialogOpen(false)
        setIsUpdating(false)
        return
      }
      
      // Insertar nueva relación
      const { error: insertError } = await supabase
        .from("departamentos_tareas")
        .insert({
          id_tarea: tareaId,
          id_departamento: Number(departamentoSeleccionado)
        })
      
      if (insertError) {
        throw insertError
      }
      
      // Obtener datos del departamento para actualizar UI
      const { data: depData, error: depError } = await supabase
        .from("departamentos")
        .select("id, codigo, propietario")
        .eq("id", departamentoSeleccionado)
        .single()
      
      if (depError) {
        throw depError
      }
      
      // Actualizar lista de departamentos localmente
      const nuevoDepartamento = {
        id: depData.id.toString(),
        codigo: depData.codigo,
        propietario: depData.propietario
      }
      
      const nuevosDepartamentos = [...departamentos, nuevoDepartamento]
      setDepartamentos(nuevosDepartamentos)
      
      // Notificar cambio a través del callback
      if (onDepartamentosChange) {
        onDepartamentosChange(nuevosDepartamentos)
      }
      
      // Cargar teléfonos del departamento añadido
      const { data: telefonosNuevos } = await supabase
        .from("telefonos_departamento")
        .select("id, numero, nombre_contacto, departamento_id")
        .eq("departamento_id", departamentoSeleccionado)
      
      if (telefonosNuevos && telefonosNuevos.length > 0) {
        setTelefonos([...telefonos, ...telefonosNuevos])
      }
      
      toast({
        title: "Éxito",
        description: "Departamento añadido correctamente."
      })
      
      setDialogOpen(false)
      setDepartamentoSeleccionado(null)
    } catch (error: any) {
      console.error("Error al agregar departamento:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo agregar el departamento",
        variant: "destructive"
      })
    } finally {
      setIsUpdating(false)
    }
  }
  
  // Función para eliminar un departamento de la tarea
  const eliminarDepartamento = async (departamentoId: string) => {
    if (!tareaId) return
    
    setIsUpdating(true)
    const supabase = createClient()
    
    try {
      const { error } = await supabase
        .from("departamentos_tareas")
        .delete()
        .eq("id_tarea", tareaId)
        .eq("id_departamento", departamentoId)
      
      if (error) {
        throw error
      }
      
      // Actualizar UI eliminando el departamento
      const nuevosDepartamentos = departamentos.filter(d => d.id !== departamentoId)
      setDepartamentos(nuevosDepartamentos)
      
      // Actualizar teléfonos (eliminar los del departamento eliminado)
      const nuevosTelefonos = telefonos.filter(t => t.departamento_id !== Number(departamentoId))
      setTelefonos(nuevosTelefonos)
      
      // Notificar cambio
      if (onDepartamentosChange) {
        onDepartamentosChange(nuevosDepartamentos)
      }
      
      toast({
        title: "Departamento eliminado",
        description: "El departamento ha sido desvinculado de la tarea."
      })
    } catch (error: any) {
      console.error("Error al eliminar departamento:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el departamento",
        variant: "destructive"
      })
    } finally {
      setIsUpdating(false)
    }
  }
  
  // Estado de carga
  if (loading) {
    return <div className="flex items-center text-muted-foreground text-sm"><Loader2 className="animate-spin mr-2 h-4 w-4" /> Cargando departamentos...</div>
  }
  
  // Error
  if (error) {
    return <div className="text-sm text-red-500">{error}</div>
  }
  
  // Sin departamentos
  if (departamentos.length === 0) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="text-sm text-muted-foreground">No hay departamentos asignados</div>
        
        {/* Mostrar botón solo si es admin */}
        {userRole === "admin" && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="mt-1">
                <PlusCircle className="h-4 w-4 mr-2" />
                Añadir departamento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Añadir departamento</DialogTitle>
                <DialogDescription>
                  Selecciona un departamento para añadir a esta tarea.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <Select
                  value={departamentoSeleccionado || ''}
                  onValueChange={(value) => setDepartamentoSeleccionado(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {departamentosDisponibles.map((dep) => (
                      <SelectItem key={dep.id} value={dep.id}>
                        {dep.codigo} {dep.propietario ? `(${dep.propietario})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="flex justify-end">
                  <Button onClick={agregarDepartamento} disabled={!departamentoSeleccionado || isUpdating}>
                    {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Añadir
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    )
  }
  
  // Con departamentos
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex flex-wrap gap-2">
        {departamentos.map(dep => (
          <Badge key={dep.id} variant="secondary" className="flex items-center text-sm">
            {dep.codigo} {dep.propietario && `(${dep.propietario})`}
            
            {/* Botón para eliminar (solo para admin) */}
            {userRole === "admin" && (
              <button
                onClick={() => eliminarDepartamento(dep.id)}
                className="ml-1 rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                disabled={isUpdating}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Eliminar {dep.codigo}</span>
              </button>
            )}
          </Badge>
        ))}
        
        {/* Botón para añadir más (solo para admin) */}
        {userRole === "admin" && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-6 px-2">
                <PlusCircle className="h-3 w-3 mr-1" /> Añadir
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Añadir departamento</DialogTitle>
                <DialogDescription>
                  Selecciona un departamento para añadir a esta tarea.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <Select
                  value={departamentoSeleccionado || ''}
                  onValueChange={(value) => setDepartamentoSeleccionado(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {departamentosDisponibles
                      .filter(depDisp => !departamentos.some(dep => dep.id === depDisp.id))
                      .map((dep) => (
                        <SelectItem key={dep.id} value={dep.id}>
                          {dep.codigo} {dep.propietario ? `(${dep.propietario})` : ''}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
                
                <div className="flex justify-end">
                  <Button onClick={agregarDepartamento} disabled={!departamentoSeleccionado || isUpdating}>
                    {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Añadir
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
        
        {/* Mostrar teléfonos relacionados con los departamentos */}
        {telefonos.length > 0 && (
          <div className="w-full mt-2">
            <div className="text-xs text-muted-foreground mb-1">Teléfonos de contacto:</div>
            <div className="flex flex-wrap gap-1 ml-1">
              {telefonos.map(tel => (
                <div key={tel.id} className="flex items-center text-xs text-muted-foreground">
                  <Phone className="h-3 w-3 mr-1" />
                  <span className="font-medium">{tel.numero}</span>
                  {tel.nombre_contacto && <span className="ml-1">({tel.nombre_contacto})</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
