"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { ClonarTareaDialog } from "@/components/clonar-tarea-dialog"

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
  currentUserEmail?: string
  supervisoresMap?: Record<string, { nombre?: string; color_perfil?: string }>
}

export function TaskList({ tasks, userRole, currentUserEmail, supervisoresMap }: TaskListProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [taskInAction, setTaskInAction] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isCloning, setIsCloning] = useState(false)

  // Estado para el diálogo de clonado rápido
  const [clonarDialogOpen, setClonarDialogOpen] = useState(false)
  const [selectedTaskIdForClone, setSelectedTaskIdForClone] = useState<number | null>(null)

  const filteredTasks = tasks.filter(
    (task) =>
      task.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.nombre_edificio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.direccion_edificio?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Estados normalizados para las tareas

  // Función para obtener el color del estado por id (se mantiene la lógica de colores)
  const getEstadoColorName = (id: number) => {
    const map: Record<number, string> = {
      1: "gray", 2: "blue", 3: "purple", 4: "indigo", 5: "green",
      6: "orange", 7: "green", 8: "red", 9: "purple", 10: "yellow"
    }
    return map[id] || "gray"
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
    const colorName = getEstadoColorName(idEstado as number)
    switch (colorName) {
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
    if (!confirm("¿estas seguro de que deseas eliminar esta tarea? esta accion no se puede deshacer.")) {
      return
    }

    setTaskInAction(taskId)
    setIsDeleting(true)

    try {
      const result = await deleteTask(taskId)
      if (result.success) {
        toast.success("tarea eliminada con exito")
      } else {
        toast.error("error al eliminar la tarea")
      }
    } catch (error) {
      toast.error("ocurrio un error inesperado")
      console.error("Error al eliminar tarea:", error)
    } finally {
      setIsDeleting(false)
      setTaskInAction(null)
    }
  }

  // Función para manejar clonación de tarea (Abre diálogo de clonado rápido)
  const handleCloneTask = (taskId: number) => {
    if (!taskId) return
    setSelectedTaskIdForClone(taskId)
    setClonarDialogOpen(true)
  }

  // Callback para refrescar la lista después de clonar
  const handleCloneSuccess = () => {
    window.location.reload()
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

                        {/* Botones de acción para admin o supervisor asignado */}
                        {(userRole === "admin" || (userRole === "supervisor" && currentUserEmail && task.supervisores_emails?.toLowerCase().includes(currentUserEmail.toLowerCase()))) && (
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
                                    handleCloneTask(task.id);
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
                            {task.estado_tarea?.toLowerCase()}
                          </Badge>
                        </div>

                      </div>

                      {/* Indicador de acción en proceso */}
                      {taskInAction === task.id && (isDeleting || isCloning) && (
                        <div className="absolute inset-0 bg-white/70 dark:bg-black/70 flex items-center justify-center rounded-md">
                          <div className="flex items-center gap-2">
                            <Loader2 className="animate-spin h-4 w-4" />
                            <span>{isDeleting ? "eliminando..." : "clonando..."}</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )
            })
          )}
        </div>

        {/* Vista para escritorio */}
        <div className="hidden md:block rounded-md border">
          <Table className="w-full text-sm">
            <colgroup>
              <col className="w-auto" />
              <col className="w-24" />
              <col className="w-32" />
              <col className="w-36" />
              {userRole === "admin" && <col className="w-24" />}
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead className="px-2 py-2 text-xs whitespace-nowrap">titulo</TableHead>
                <TableHead className="px-1 py-1 text-xs whitespace-nowrap">estado</TableHead>
                <TableHead className="px-1 py-1 text-xs whitespace-nowrap">fecha de visita</TableHead>
                <TableHead className="px-2 py-2 text-xs whitespace-nowrap">supervisor</TableHead>
                {userRole === "admin" && <TableHead className="px-2 py-2 text-xs whitespace-nowrap w-[80px]">acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={userRole === "admin" ? 5 : 4} className="h-24 text-center">
                    no se encontraron tareas
                  </TableCell>
                </TableRow>
              ) : (
                filteredTasks.map((task) => {

                  return (
                    <TableRow key={task.id}>
                      <TableCell className="px-3 py-3">
                        <Link href={`/dashboard/tareas/${task.id}`} className="text-primary hover:underline">
                          <div className="line-clamp-2 leading-snug">{task.titulo}</div>
                        </Link>
                      </TableCell>
                      <TableCell className="px-2 py-3 whitespace-nowrap">
                        <Badge className={`${getEstadoColor(task.id_estado_nuevo)} text-xs px-2 py-0.5`}>
                          {task.estado_tarea?.toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-2 py-3 whitespace-nowrap">
                        {task.fecha_visita ? (
                          <div className="flex items-center whitespace-nowrap">
                            <Calendar className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs">{formatDateTime(task.fecha_visita)}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">no programada</span>
                        )}
                      </TableCell>
                      <TableCell className="px-3 py-3">
                        {(() => {
                          const sup = getSupervisorInfo(task)
                          return (
                            <div className="flex items-center">
                              <span className="inline-block w-2.5 h-2.5 rounded-full mr-2 flex-shrink-0" style={{ backgroundColor: sup.color }} />
                              <span className="truncate text-xs" style={{ color: sup.color }}>{sup.nombre || 'S/N'}</span>
                            </div>
                          )
                        })()}
                      </TableCell>
                      {(userRole === "admin" || (userRole === "supervisor" && currentUserEmail && task.supervisores_emails?.toLowerCase().includes(currentUserEmail.toLowerCase()))) && (
                        <TableCell className="px-2 py-3 whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              title="clonar tarea"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleCloneTask(task.id);
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

      {/* Diálogo de Clonado Rápido */}
      <ClonarTareaDialog
        tareaId={selectedTaskIdForClone}
        open={clonarDialogOpen}
        onOpenChange={setClonarDialogOpen}
        onSuccess={handleCloneSuccess}
      />
    </Card>
  )
}
