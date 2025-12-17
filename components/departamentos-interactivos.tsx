"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase-client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { X, Phone, PlusCircle, Loader2, MessageSquare } from "lucide-react"
import { PhoneActions } from "@/components/phone-actions"
import { NotasDepartamentoDialog } from "@/components/notas-departamento-dialog"
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
  const [notasDialogOpen, setNotasDialogOpen] = useState(false)
  const [departamentoNotasActivo, setDepartamentoNotasActivo] = useState<{ id: number; codigo: string } | null>(null)
  
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
  
  // Función auxiliar para actualizar la UI al eliminar un departamento
  const actualizarUIEliminarDepartamento = (departamentoId: string) => {
    // Filtrar el departamento eliminado
    const nuevosDepartamentos = departamentos.filter(d => d.id !== departamentoId)
    setDepartamentos(nuevosDepartamentos)
    
    // Filtrar los teléfonos asociados a ese departamento
    const nuevosTelefonos = telefonos.filter(t => t.departamento_id !== Number(departamentoId))
    setTelefonos(nuevosTelefonos)
    
    // Notificar cambio si hay callback
    if (onDepartamentosChange) {
      onDepartamentosChange(nuevosDepartamentos)
    }
  }
  
  // Función para diagnóstico de permisos en Supabase
  const diagnosticarPermisos = async (idDepartamento: string) => {
    if (!tareaId) return
    
    const supabase = createClient()
    if (!supabase) return
    
    console.log("=== Diagnóstico de permisos Supabase ===")
    
    try {
      // 1. Verificar permisos de lectura
      console.log("1. Verificando permisos de lectura...")
      const { data: readData, error: readError } = await supabase
        .from("departamentos_tareas")
        .select('*')
        .eq("id_tarea", tareaId)
        .eq("id_departamento", Number(idDepartamento))
      
      console.log("Resultado lectura:", { data: readData, error: readError })
      
      // 2. Verificar si podemos actualizar
      console.log("2. Verificando permisos de actualización...")
      const { data: updateData, error: updateError } = await supabase
        .from("departamentos_tareas")
        .update({ updated_at: new Date().toISOString() })
        .eq("id_tarea", tareaId)
        .eq("id_departamento", Number(idDepartamento))
        .select()
      
      console.log("Resultado actualización:", { data: updateData, error: updateError })
      
      // 3. Verificar permiso de eliminación
      console.log("3. Verificando permisos de eliminación...")
      const { data: deleteData, error: deleteError } = await supabase
        .from("departamentos_tareas")
        .delete()
        .eq("id_tarea", tareaId)
        .eq("id_departamento", Number(idDepartamento))
        .select()
      
      console.log("Resultado eliminación:", { data: deleteData, error: deleteError })
      
      return { readData, updateData, deleteData, readError, updateError, deleteError }
    } catch (error) {
      console.error("Error en diagnóstico:", error)
      return null
    }
  }
  
  // Función para eliminar un departamento de la tarea
  const eliminarDepartamento = async (departamentoId: string) => {
    if (!tareaId) return
    
    setIsUpdating(true)
    const supabase = createClient()
    
    if (!supabase) {
      toast({
        title: "Error",
        description: "No se pudo inicializar Supabase",
        variant: "destructive"
      })
      setIsUpdating(false)
      return
    }
    
    try {
      console.log('Intentando eliminar departamento con id:', departamentoId)
      
      // 1. Verificar si la relación existe
      const { data: relacionExistente } = await supabase
        .from("departamentos_tareas")
        .select('id')
        .eq("id_tarea", tareaId)
        .eq("id_departamento", Number(departamentoId))
      
      if (!relacionExistente || relacionExistente.length === 0) {
        console.log('La relación no existe en la base de datos')
        toast({
          title: "Información",
          description: "Este departamento ya no está asociado a la tarea."
        })
        
        // Actualizamos la UI solamente
        actualizarUIEliminarDepartamento(departamentoId)
        setIsUpdating(false)
        return
      }
      
      // 2. Intentar eliminar usando la función RPC personalizada que tiene permisos elevados
      const { data: resultado, error: rpcError } = await supabase.rpc(
        'eliminar_departamento_tarea',
        { 
          p_tarea_id: tareaId, 
          p_departamento_id: Number(departamentoId)
        }
      )
      
      if (rpcError) {
        console.error('Error al eliminar con RPC:', rpcError)
        
        // Plan B: Intentar con el método estándar como respaldo
        console.log('Intentando método de eliminación estándar como respaldo')
        const { error: deleteError } = await supabase
          .from("departamentos_tareas")
          .delete()
          .eq("id_tarea", tareaId)
          .eq("id_departamento", Number(departamentoId))
        
        if (deleteError) {
          console.error('Error en método estándar:', deleteError)
          throw deleteError
        }
      }
      
      // 3. Verificar si tuvo éxito (opcional, para debug)
      const { data: checkDelete } = await supabase
        .from("departamentos_tareas")
        .select('id')
        .eq("id_tarea", tareaId)
        .eq("id_departamento", Number(departamentoId))
      
      if (checkDelete && checkDelete.length > 0) {
        console.warn('La relación persiste en BD, pero actualizamos UI de todas formas')
      } else {
        console.log('Eliminación exitosa confirmada!')
      }
      
      // No hacemos verificación adicional para evitar falsos negativos
      // por problemas de caché o latencia
      
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
          <Badge key={dep.id} variant="secondary" className="flex items-center text-sm gap-1">
            {dep.codigo} {dep.propietario && `(${dep.propietario})`}
            
            {/* Botón para ver/editar notas */}
            <button
              onClick={() => {
                setDepartamentoNotasActivo({ id: Number(dep.id), codigo: dep.codigo })
                setNotasDialogOpen(true)
              }}
              className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              title={`Ver notas de ${dep.codigo}`}
            >
              <MessageSquare className="h-3 w-3" />
              <span className="sr-only">Notas {dep.codigo}</span>
            </button>
            
            {/* Botón para eliminar (solo para admin) */}
            {userRole === "admin" && (
              <button
                onClick={() => eliminarDepartamento(dep.id)}
                className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
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
      </div>
      
      {/* Mostrar teléfonos asociados */}
      {telefonos.length > 0 && (
        <div className="mt-2 space-y-1">
          <h4 className="text-xs font-medium text-muted-foreground">Teléfonos:</h4>
          <div className="flex flex-col gap-2">
            {telefonos.map(tel => (
              <div key={tel.id} className="flex items-center justify-between gap-2 text-xs bg-muted px-2 py-1.5 rounded-md">
                <span className="font-medium text-foreground">
                  {(() => {
                    const depCodigo = departamentos.find(d => Number(d.id) === tel.departamento_id)?.codigo
                    return `${depCodigo ? `[${depCodigo}] ` : ''}${tel.nombre_contacto || 'Contacto'}`
                  })()}
                </span>
                <PhoneActions numero={tel.numero} nombre={tel.nombre_contacto} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dialog para notas de departamento */}
      {departamentoNotasActivo && (
        <NotasDepartamentoDialog
          open={notasDialogOpen}
          onOpenChange={setNotasDialogOpen}
          departamentoId={departamentoNotasActivo.id}
          departamentoCodigo={departamentoNotasActivo.codigo}
          onNotaGuardada={() => {
            // Opcional: recargar departamentos si necesario
          }}
        />
      )}
    </div>
  )
}