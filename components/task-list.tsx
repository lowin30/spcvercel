"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDateTime } from "@/lib/utils"
import Link from "next/link"
import { Search, Calendar, Trash2, Copy, MoreVertical, Loader2, Pencil } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { deleteTask, cloneTask } from "@/app/dashboard/tareas/actions"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Task {
  id: number
  titulo: string
  descripcion: string | null
  estado: string // Campo que debe ser eliminado eventualmente
  id_estado_nuevo: number
  prioridad: string
  fecha_visita: string | null
  created_at: string
  code: string
  finalizada: boolean
  // Campos de la vista optimizada vista_tareas_completa
  nombre_edificio: string // campo de la vista en lugar de edificio_nombre
  direccion_edificio: string // campo de la vista en lugar de edificio_direccion
  id_edificio: number
  id_administrador: number
  nombre_administrador: string
  telefono_administrador: string
  estado_edificio: string
  // Campos planos de la vista
  estado_tarea: string
  trabajadores_emails: string
  supervisores_emails: string
  // Campos adicionales de la vista
  latitud_edificio?: number
  longitud_edificio?: number
  mapa_edificio?: string
  gastos_tarea_pdf?: string
}

interface TaskListProps {
  tasks: Task[]
  userRole: string
  supervisoresMap?: Record<string, { nombre?: string; color_perfil?: string }>
}

export function TaskList({ tasks, userRole, supervisoresMap }: TaskListProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [taskInAction, setTaskInAction] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isCloning, setIsCloning] = useState(false)

  const filteredTasks = tasks.filter(
    (task) =>
      task.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.nombre_edificio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.direccion_edificio?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Estados normalizados para las tareas
  const estadosTarea = [
    { id: 1, nombre: "Organizar", color: "gray" },
    { id: 2, nombre: "Preguntar", color: "blue" },
    { id: 3, nombre: "Presupuestado", color: "purple" },
    { id: 4, nombre: "Enviado", color: "indigo" },
    { id: 5, nombre: "Aprobado", color: "green" },
    { id: 6, nombre: "Facturado", color: "orange" },
    { id: 7, nombre: "Terminado", color: "green" },
    { id: 8, nombre: "Reclamado", color: "red" },
    { id: 9, nombre: "Liquidada", color: "purple" },
    { id: 10, nombre: "Posible", color: "yellow" },
  ]
  
  // Función para obtener el nombre y color del estado por id
  const getEstadoById = (id: number) => {
    const estado = estadosTarea.find(e => e.id === id)
    return estado || { nombre: "Desconocido", color: "gray" }
  }

  const getSupervisorInfo = (task: Task) => {
    const emailsRaw = (task.supervisores_emails || '').toString()
    const email = emailsRaw.split(/[ ,;]+/).find(Boolean)?.trim().toLowerCase()
    const info = email && supervisoresMap ? supervisoresMap[email] : undefined
    return {
      nombre: info?.nombre || (email || ''),
      color: info?.color_perfil || '#9ca3af',
    }
  }

  // Función para obtener la clase CSS del color según el estado
  const getEstadoColor = (idEstado: number | string | null) => {
    // Si es null o undefined, devolver color por defecto
    if (idEstado === null || idEstado === undefined) {
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    }
    
    // Si es string (estado antiguo), usar compatibilidad
    if (typeof idEstado === 'string') {
      switch (idEstado.toLowerCase()) {
        case "pendiente":
          return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
        case "asignada":
          return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
        case "completada":
          return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
        case "cancelada":
          return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
        default:
          return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
      }
    }
    
    // Si es número (nuevo sistema normalizado)
    const estado = getEstadoById(idEstado as number)
    switch (estado.color) {
      case "gray":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
      case "blue":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "purple":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
      case "indigo":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300"
      case "green":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "orange":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
      case "red":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      case "yellow":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    }
  }
  
  // Función para manejar eliminación de tarea
  const handleDeleteTask = async (taskId: number) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta tarea? Esta acción no se puede deshacer.")) {
      return
    }
    
    setTaskInAction(taskId)
    setIsDeleting(true)
    
    try {
      const result = await deleteTask(taskId)
      if (result.success) {
        toast.success(result.message || "Tarea eliminada con éxito")
        // La página debe actualizarse automáticamente gracias a revalidatePath
      } else {
        toast.error(result.message || "Error al eliminar la tarea")
      }
    } catch (error) {
      toast.error("Ocurrió un error inesperado")
      console.error("Error al eliminar tarea:", error)
    } finally {
      setIsDeleting(false)
      setTaskInAction(null)
    }
  }
  
  // Función para manejar clonación de tarea
  const handleCloneTask = async (taskId: number) => {
    if (!taskId) {
      toast.error("ID de tarea no válido")
      return
    }
    
    setTaskInAction(taskId)
    setIsCloning(true)
    
    try {
      // Llamar a la función del servidor
      const result = await cloneTask(taskId)
      
      if (result.success) {
        toast.success(result.message || "Tarea clonada con éxito")
        
        // Forzar refresco de la página para mostrar la nueva tarea
        // Esto complementa el revalidatePath del servidor
        setTimeout(() => {
          window.location.reload()
        }, 500)
      } else {
        toast.error(result.message || "Error al clonar la tarea")
      }
    } catch (error: any) {
      toast.error("Ocurrió un error inesperado: " + (error?.message || ""))
      console.error("Error al clonar tarea:", error)
    } finally {
      setIsCloning(false)
      setTaskInAction(null)
    }
  }

  // Función para obtener el color de la prioridad
  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad.toLowerCase()) {
      case "alta":
        return "bg-red-500"
      case "media":
        return "bg-yellow-500"
      case "baja":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  return (
    <Card>
      <CardContent className="p-4">


        {/* Vista para móvil */}
        <div className="md:hidden space-y-4">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No se encontraron tareas</p>
            </div>
          ) : (
            filteredTasks.map((task) => {
              // Obtener información del estado normalizado
              const estadoInfo = getEstadoById(task.id_estado_nuevo);
              const supervisorInfo = getSupervisorInfo(task);
              
              return (
              <div key={task.id} className="block relative">
                <Card className="hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${getPrioridadColor(task.prioridad || "")}`} />
                        </div>
                        <h3 className="font-medium mt-2">
                          <Link href={`/dashboard/tareas/${task.id}`}>{task.titulo}</Link>
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {task.descripcion || "Sin descripción"}
                        </p>
                        <div className="mt-2 text-sm flex items-center">
                          <span className="inline-block w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: supervisorInfo.color }} />
                          <span className="truncate max-w-[180px]" style={{ color: supervisorInfo.color }}>{supervisorInfo.nombre || 'S/N'}</span>
                        </div>
                      </div>
                      
                      {/* Botones de acción para admin */}
                      {userRole === "admin" && (
                        <div className="flex items-center gap-1">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  // Llamada al manejador con confirmación
                                  if (confirm('¿Confirmas que deseas clonar esta tarea?')) {
                                    handleCloneTask(task.id);
                                  }
                                }}>
                                <Copy className="mr-2 h-4 w-4" />
                                Clonar tarea
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  // Redireccionar a la página de edición de tarea
                                  window.location.href = `/dashboard/tareas/editar/${task.id}`;
                                }}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar tarea
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDeleteTask(task.id);
                                }}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between items-center mt-4 pt-4 border-t text-sm">
                      <div className="flex items-center gap-2">
                        <Badge className={getEstadoColor(task.id_estado_nuevo)}>
                          {estadoInfo.nombre}
                        </Badge>
                      </div>
                      
                    </div>
                    
                    {/* Indicador de acción en proceso */}
                    {taskInAction === task.id && (isDeleting || isCloning) && (
                      <div className="absolute inset-0 bg-white/70 dark:bg-black/70 flex items-center justify-center rounded-md">
                        <div className="flex items-center gap-2">
                          <Loader2 className="animate-spin h-4 w-4" />
                          <span>{isDeleting ? "Eliminando..." : "Clonando..."}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )})
          )}
        </div>

        {/* Vista para escritorio */}
        <div className="hidden md:block rounded-md border">
          <Table className="table-fixed w-full text-sm leading-tight">
            <colgroup>
              <col className="w-[40%]" />
              <col className="w-24" />
              <col className="w-28" />
              <col className="w-[20%]" />
              {userRole === "admin" && <col className="w-20" />}
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead className="px-2 py-2 text-xs whitespace-nowrap">Título</TableHead>
                <TableHead className="px-1 py-1 text-xs whitespace-nowrap">Estado</TableHead>
                <TableHead className="px-1 py-1 text-xs whitespace-nowrap">Fecha de visita</TableHead>
                <TableHead className="px-2 py-2 text-xs whitespace-nowrap">Supervisor</TableHead>
                {userRole === "admin" && <TableHead className="px-2 py-2 text-xs whitespace-nowrap w-[80px]">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={userRole === "admin" ? 5 : 4} className="h-24 text-center">
                    No se encontraron tareas
                  </TableCell>
                </TableRow>
              ) : (
                filteredTasks.map((task) => {
                  // Obtener información del estado normalizado
                  const estadoInfo = getEstadoById(task.id_estado_nuevo);
                  
                  return (
                  <TableRow key={task.id}>
                    <TableCell className="px-2 py-2">
                      <Link href={`/dashboard/tareas/${task.id}`} className="text-primary hover:underline">
                        <span className="block truncate max-w-[200px]">{task.titulo}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="px-1 py-1 whitespace-nowrap">
                      <Badge className={`${getEstadoColor(task.id_estado_nuevo)} text-[11px] px-1.5 py-0` }>
                        {estadoInfo.nombre}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-1 py-1 whitespace-nowrap">
                      {task.fecha_visita ? (
                        <div className="flex items-center whitespace-nowrap">
                          <Calendar className="mr-0.5 h-3 w-3 text-muted-foreground" />
                          <span className="truncate max-w-[100px]">{formatDateTime(task.fecha_visita)}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No programada</span>
                      )}
                    </TableCell>
                    <TableCell className="px-2 py-2">
                      {(() => {
                        const sup = getSupervisorInfo(task)
                        return (
                          <div className="flex items-center">
                            <span className="inline-block w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: sup.color }} />
                            <span className="truncate max-w-[140px]" style={{ color: sup.color }}>{sup.nombre || 'S/N'}</span>
                          </div>
                        )
                      })()}
                    </TableCell>
                    {userRole === "admin" && (
                      <TableCell className="px-1 py-1 whitespace-nowrap">
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            title="Clonar tarea"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (confirm('¿Confirmas que deseas clonar esta tarea?')) {
                                handleCloneTask(task.id);
                              }
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleCloneTask(task.id);
                                }}>
                                <Copy className="mr-2 h-4 w-4" />
                                Clonar tarea
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  window.location.href = `/dashboard/tareas/editar/${task.id}`;
                                }}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar tarea
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDeleteTask(task.id);
                                }}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          {taskInAction === task.id && (isDeleting || isCloning) && (
                            <Loader2 className="h-4 w-4 animate-spin ml-1" />
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
