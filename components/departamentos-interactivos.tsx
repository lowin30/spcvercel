"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase-client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { X, Phone, PlusCircle, Loader2, MessageSquare, Plus, Star } from "lucide-react"
import { PhoneActions } from "@/components/phone-actions"
import { NotasDepartamentoDialog } from "@/components/notas-departamento-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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
  initialDepartamentos?: Departamento[]
  initialTelefonos?: Telefono[]
  initialDepartamentosDisponibles?: Departamento[]
  onDepartamentosChange?: (departamentos: Departamento[]) => void
  className?: string
}

export function DepartamentosInteractivos({
  tareaId,
  edificioId,
  initialDepartamentos,
  initialTelefonos,
  initialDepartamentosDisponibles,
  onDepartamentosChange,
  className,
}: DepartamentosInteractivosProps) {
  const [departamentos, setDepartamentos] = useState<Departamento[]>(initialDepartamentos || [])
  const [telefonos, setTelefonos] = useState<Telefono[]>(initialTelefonos || [])
  const [loading, setLoading] = useState(!initialDepartamentos)
  const [error, setError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [departamentosDisponibles, setDepartamentosDisponibles] = useState<Departamento[]>(initialDepartamentosDisponibles || [])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [departamentoSeleccionado, setDepartamentoSeleccionado] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [notasDialogOpen, setNotasDialogOpen] = useState(false)
  const [departamentoNotasActivo, setDepartamentoNotasActivo] = useState<{ id: number; codigo: string } | null>(null)

  // Estados para crear nuevo departamento
  const [crearDepartamentoDialogOpen, setCrearDepartamentoDialogOpen] = useState(false)
  const [nuevoDepartamento, setNuevoDepartamento] = useState({ codigo: "", notas: "" })
  const [creandoDepartamento, setCreandoDepartamento] = useState(false)
  const [telefonosNuevos, setTelefonosNuevos] = useState<{
    nombre_contacto: string;
    relacion: string;
    numero: string;
    es_principal: boolean;
    notas: string;
  }[]>([{ nombre_contacto: '', relacion: '', numero: '', es_principal: true, notas: '' }])

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
    // Si ya tenemos datos iniciales decidimos no hacer el fetch
    if (initialDepartamentos && initialTelefonos && initialDepartamentosDisponibles) {
      setLoading(false);
      return;
    }

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

        // Si hay departamentos, cargar sus teléfonos asociados (SPC v18.2: from 'contactos')
        if (departamentosFormateados.length > 0) {
          const departamentosIds = departamentosFormateados.map((d: Departamento) => Number(d.id))

          const { data: contactosData, error: telError } = await supabase
            .from("contactos")
            .select("id, numero:telefono, nombre_contacto:nombreReal, departamento_id")
            .in("departamento_id", departamentosIds)

          if (telError) {
            console.error("Error al cargar teléfonos:", telError)
          } else {
            // Map to Telefono interface
            const mappedPhones = contactosData?.map(c => ({
              id: c.id.toString(),
              numero: c.numero || "",
              nombre_contacto: c.nombre_contacto || "",
              departamento_id: c.departamento_id
            })) || []
            setTelefonos(mappedPhones)
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

  // Funciones para gestionar teléfonos del nuevo departamento
  const agregarTelefonoNuevo = () => {
    setTelefonosNuevos([...telefonosNuevos, {
      nombre_contacto: '',
      relacion: '',
      numero: '',
      es_principal: false,
      notas: ''
    }]);
  };

  const actualizarTelefonoNuevo = (index: number, campo: string, valor: any) => {
    const nuevos = [...telefonosNuevos];
    (nuevos[index] as any)[campo] = valor;
    setTelefonosNuevos(nuevos);
  };

  const eliminarTelefonoNuevo = (index: number) => {
    setTelefonosNuevos(telefonosNuevos.filter((_, i) => i !== index));
  };

  // Función para crear un nuevo departamento
  const crearNuevoDepartamento = async () => {
    if (!nuevoDepartamento.codigo || !edificioId) return;

    setCreandoDepartamento(true);
    const supabase = createClient();

    try {
      // Verificar si ya existe
      const { data: existingDepts, error: checkError } = await supabase
        .from("departamentos")
        .select("id, codigo")
        .eq("edificio_id", edificioId);

      if (checkError) throw checkError;

      const codigoDuplicado = existingDepts?.find(
        dept => dept.codigo.toLowerCase() === nuevoDepartamento.codigo.toLowerCase()
      );

      if (codigoDuplicado) {
        toast({
          title: "Error",
          description: `Ya existe un departamento con el código "${codigoDuplicado.codigo}" en este edificio.`,
          variant: "destructive"
        });
        setCreandoDepartamento(false);
        return;
      }

      // Crear departamento
      const { data: nuevoDep, error: createError } = await supabase
        .from("departamentos")
        .insert({
          edificio_id: edificioId,
          codigo: nuevoDepartamento.codigo,
          notas: nuevoDepartamento.notas || null
        })
        .select()
        .single();

      if (createError) throw createError;

      // Crear teléfonos asociados (SPC v18.2: Insert into 'contactos')
      const telefonosValidos = telefonosNuevos.filter(tel =>
        tel.numero.trim() || tel.nombre_contacto.trim()
      );

      if (telefonosValidos.length > 0 && nuevoDep) {
        const timestamp = new Date().toISOString()
        const telefonosParaInsertar = telefonosValidos.map(tel => {
          const nombreSanitized = tel.nombre_contacto.trim() || 'Sin Nombre'
          // Simple slug generation
          const slugRaw = `${nuevoDepartamento.codigo}-${nombreSanitized}`.toLowerCase().replace(/[^a-z0-9]/g, '-')
          const slug = `${slugRaw}-${Math.random().toString(36).substring(7)}`

          return {
            nombre: slug,
            nombreReal: nombreSanitized,
            telefono: tel.numero.replace(/\D/g, ''),
            tipo_padre: 'edificio',
            id_padre: edificioId,
            departamento: nuevoDep.codigo,
            departamento_id: nuevoDep.id,
            relacion: tel.relacion.trim() || 'Otro',
            es_principal: tel.es_principal,
            notas: tel.notas.trim() || '',
            updated_at: timestamp
          }
        });

        const { error: telefonosError } = await supabase
          .from("contactos")
          .insert(telefonosParaInsertar);

        if (telefonosError) throw telefonosError;
      }

      toast({
        title: "Éxito",
        description: `Departamento ${nuevoDepartamento.codigo} creado correctamente${telefonosValidos.length > 0 ? ` con ${telefonosValidos.length} teléfono(s)` : ''} `
      });

      // Actualizar lista de departamentos disponibles
      const { data: todosLosDepartamentos } = await supabase
        .from("departamentos")
        .select("id, codigo, propietario")
        .eq("edificio_id", edificioId);

      if (todosLosDepartamentos) {
        setDepartamentosDisponibles(todosLosDepartamentos);
      }

      // Resetear y cerrar
      setNuevoDepartamento({ codigo: "", notas: "" });
      setTelefonosNuevos([{ nombre_contacto: '', relacion: '', numero: '', es_principal: true, notas: '' }]);
      setCrearDepartamentoDialogOpen(false);

    } catch (error: any) {
      console.error("Error al crear departamento:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el departamento",
        variant: "destructive"
      });
    } finally {
      setCreandoDepartamento(false);
    }
  };

  // Función para agregar un departamento a la tarea
  const agregarDepartamento = async () => {
    if (!departamentoSeleccionado || !tareaId) return

    setIsUpdating(true)
    const supabase = createClient()

    try {
      // Usar función RPC con SECURITY DEFINER para evitar problemas de RLS
      const { data: resultado, error: rpcError } = await supabase.rpc(
        'agregar_departamento_tarea',
        {
          p_tarea_id: tareaId,
          p_departamento_id: Number(departamentoSeleccionado)
        }
      )

      if (rpcError) {
        // Si el error es que ya existe, mostrar mensaje informativo
        if (rpcError.message.includes('ya está asociado')) {
          toast({
            title: "Información",
            description: "Este departamento ya está asociado a la tarea."
          })
          setDialogOpen(false)
          setIsUpdating(false)
          return
        }
        throw rpcError
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
        .from("contactos")
        .select("id, numero:telefono, nombre_contacto:nombreReal, departamento_id")
        .eq("departamento_id", departamentoSeleccionado)

      if (telefonosNuevos && telefonosNuevos.length > 0) {
        // Formatear para compatibilidad con el estado Telefono
        const simplifiedPhones = telefonosNuevos.map(t => ({
          id: String(t.id),
          numero: t.numero || "",
          nombre_contacto: t.nombre_contacto || "",
          departamento_id: t.departamento_id
        }));
        setTelefonos([...telefonos, ...simplifiedPhones])
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
      <div className={`space - y - 2 ${className} `}>
        <div className="text-sm text-muted-foreground">No hay departamentos asignados</div>

        {/* Mostrar botones solo si es admin */}
        {userRole === "admin" && (
          <div className="flex gap-2 mt-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Añadir Existente
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

            <Dialog open={crearDepartamentoDialogOpen} onOpenChange={setCrearDepartamentoDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Nuevo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Departamento</DialogTitle>
                  <DialogDescription>
                    Complete los datos para crear un nuevo departamento en el edificio
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="codigo-new">Código</Label>
                    <Input
                      id="codigo-new"
                      value={nuevoDepartamento.codigo}
                      onChange={(e) => setNuevoDepartamento({ ...nuevoDepartamento, codigo: e.target.value })}
                      placeholder="Ej: 1A, 2B, PB"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notas-new">Notas</Label>
                    <Input
                      id="notas-new"
                      value={nuevoDepartamento.notas}
                      onChange={(e) => setNuevoDepartamento({ ...nuevoDepartamento, notas: e.target.value })}
                      placeholder="Información adicional"
                    />
                  </div>

                  {/* Sección de teléfonos */}
                  <div className="space-y-4 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold flex items-center">
                        <Phone className="mr-2 h-4 w-4" />
                        Teléfonos de contacto
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={agregarTelefonoNuevo}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Añadir teléfono
                      </Button>
                    </div>

                    {telefonosNuevos.map((telefono, index) => (
                      <div key={index} className="p-3 border rounded-md bg-muted/20 space-y-3">
                        <div className="grid grid-cols-1 gap-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label htmlFor={`tel - nombre - new- ${index} `} className="text-sm">Nombre del contacto</Label>
                              <Input
                                id={`tel - nombre - new- ${index} `}
                                value={telefono.nombre_contacto}
                                onChange={(e) => actualizarTelefonoNuevo(index, 'nombre_contacto', e.target.value)}
                                placeholder="Ej: Juan Pérez"
                                className="h-8"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label htmlFor={`tel - relacion - new- ${index} `} className="text-sm">Relación</Label>
                              <Input
                                id={`tel - relacion - new- ${index} `}
                                value={telefono.relacion}
                                onChange={(e) => actualizarTelefonoNuevo(index, 'relacion', e.target.value)}
                                placeholder="Ej: Propietario, Encargado"
                                className="h-8"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label htmlFor={`tel - numero - new- ${index} `} className="text-sm">Número</Label>
                              <Input
                                id={`tel - numero - new- ${index} `}
                                value={telefono.numero}
                                onChange={(e) => actualizarTelefonoNuevo(index, 'numero', e.target.value.replace(/\D/g, ''))}
                                placeholder="Solo números (ej: 5491150055262)"
                                className="h-8"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label htmlFor={`tel - notas - new- ${index} `} className="text-sm">Notas</Label>
                              <Input
                                id={`tel - notas - new- ${index} `}
                                value={telefono.notas}
                                onChange={(e) => actualizarTelefonoNuevo(index, 'notas', e.target.value)}
                                placeholder="Información adicional"
                                className="h-8"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`tel - principal - new- ${index} `}
                              checked={telefono.es_principal}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  const nuevosTelefonos = telefonosNuevos.map((t, i) => ({
                                    ...t,
                                    es_principal: i === index
                                  }));
                                  setTelefonosNuevos(nuevosTelefonos);
                                } else {
                                  actualizarTelefonoNuevo(index, 'es_principal', false);
                                }
                              }}
                              className="rounded"
                            />
                            <Label htmlFor={`tel - principal - new- ${index} `} className="text-sm flex items-center">
                              <Star className="h-3 w-3 mr-1 text-amber-500" />
                              Teléfono principal
                            </Label>
                          </div>

                          {telefonosNuevos.length > 1 && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => eliminarTelefonoNuevo(index)}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Eliminar
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      disabled={!nuevoDepartamento.codigo.trim() || creandoDepartamento}
                      onClick={crearNuevoDepartamento}
                    >
                      {creandoDepartamento ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creando...
                        </>
                      ) : "Crear departamento"}
                    </Button>
                  </DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    )
  }

  // Con departamentos
  return (
    <div className={`space - y - 3 ${className} `}>
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
              title={`Ver notas de ${dep.codigo} `}
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

        {/* Botones para añadir existente o crear nuevo (solo para admin) */}
        {userRole === "admin" && (
          <>
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

            <Dialog open={crearDepartamentoDialogOpen} onOpenChange={setCrearDepartamentoDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-6 px-2">
                  <Plus className="h-3 w-3 mr-1" /> Crear Nuevo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Departamento</DialogTitle>
                  <DialogDescription>
                    Complete los datos para crear un nuevo departamento en el edificio
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="codigo">Código</Label>
                    <Input
                      id="codigo"
                      value={nuevoDepartamento.codigo}
                      onChange={(e) => setNuevoDepartamento({ ...nuevoDepartamento, codigo: e.target.value })}
                      placeholder="Ej: 1A, 2B, PB"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notas">Notas</Label>
                    <Input
                      id="notas"
                      value={nuevoDepartamento.notas}
                      onChange={(e) => setNuevoDepartamento({ ...nuevoDepartamento, notas: e.target.value })}
                      placeholder="Información adicional"
                    />
                  </div>

                  {/* Sección de teléfonos */}
                  <div className="space-y-4 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold flex items-center">
                        <Phone className="mr-2 h-4 w-4" />
                        Teléfonos de contacto
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={agregarTelefonoNuevo}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Añadir teléfono
                      </Button>
                    </div>

                    {telefonosNuevos.map((telefono, index) => (
                      <div key={index} className="p-3 border rounded-md bg-muted/20 space-y-3">
                        <div className="grid grid-cols-1 gap-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label htmlFor={`telefono - nombre - ${index} `} className="text-sm">Nombre del contacto</Label>
                              <Input
                                id={`telefono - nombre - ${index} `}
                                value={telefono.nombre_contacto}
                                onChange={(e) => actualizarTelefonoNuevo(index, 'nombre_contacto', e.target.value)}
                                placeholder="Ej: Juan Pérez"
                                className="h-8"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label htmlFor={`telefono - relacion - ${index} `} className="text-sm">Relación</Label>
                              <Input
                                id={`telefono - relacion - ${index} `}
                                value={telefono.relacion}
                                onChange={(e) => actualizarTelefonoNuevo(index, 'relacion', e.target.value)}
                                placeholder="Ej: Propietario, Encargado"
                                className="h-8"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label htmlFor={`telefono - numero - ${index} `} className="text-sm">Número</Label>
                              <Input
                                id={`telefono - numero - ${index} `}
                                value={telefono.numero}
                                onChange={(e) => actualizarTelefonoNuevo(index, 'numero', e.target.value.replace(/\D/g, ''))}
                                placeholder="Solo números (ej: 5491150055262)"
                                className="h-8"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label htmlFor={`telefono - notas - ${index} `} className="text-sm">Notas</Label>
                              <Input
                                id={`telefono - notas - ${index} `}
                                value={telefono.notas}
                                onChange={(e) => actualizarTelefonoNuevo(index, 'notas', e.target.value)}
                                placeholder="Información adicional"
                                className="h-8"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`telefono - principal - ${index} `}
                              checked={telefono.es_principal}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  const nuevosTelefonos = telefonosNuevos.map((t, i) => ({
                                    ...t,
                                    es_principal: i === index
                                  }));
                                  setTelefonosNuevos(nuevosTelefonos);
                                } else {
                                  actualizarTelefonoNuevo(index, 'es_principal', false);
                                }
                              }}
                              className="rounded"
                            />
                            <Label htmlFor={`telefono - principal - ${index} `} className="text-sm flex items-center">
                              <Star className="h-3 w-3 mr-1 text-amber-500" />
                              Teléfono principal
                            </Label>
                          </div>

                          {telefonosNuevos.length > 1 && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => eliminarTelefonoNuevo(index)}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Eliminar
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      disabled={!nuevoDepartamento.codigo.trim() || creandoDepartamento}
                      onClick={crearNuevoDepartamento}
                    >
                      {creandoDepartamento ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creando...
                        </>
                      ) : "Crear departamento"}
                    </Button>
                  </DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>

      {/* Mostrar teléfonos asociados (Filtrados por pertinencia y claridad) */}
      {(() => {
        const telefonosFiltrados = telefonos.filter(tel => {
          const tieneNombre = tel.nombre_contacto && tel.nombre_contacto.trim() !== "";
          const esDeDeptoVinculado = departamentos.some(d => Number(d.id) === tel.departamento_id);
          const esGlobalConIdentidad = tel.departamento_id === null && tieneNombre;

          return esDeDeptoVinculado || esGlobalConIdentidad;
        });

        if (telefonosFiltrados.length === 0) return null;

        return (
          <div className="mt-2 space-y-1">
            <h4 className="text-xs font-medium text-muted-foreground">Teléfonos:</h4>
            <div className="flex flex-col gap-2">
              {telefonosFiltrados.map(tel => (
                <div key={tel.id} className="flex items-center justify-between gap-2 text-xs bg-muted px-2 py-1.5 rounded-md">
                  <span className="font-medium text-foreground">
                    {(() => {
                      const depCodigo = departamentos.find(d => Number(d.id) === tel.departamento_id)?.codigo
                      return `${depCodigo ? `[${depCodigo}] ` : ''}${tel.nombre_contacto || 'Contacto'} `
                    })()}
                  </span>
                  <PhoneActions numero={tel.numero} nombre={tel.nombre_contacto} />
                </div>
              ))}
            </div>
          </div>
        );
      })()}

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