"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { toast } from "@/components/ui/use-toast"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { UserRound, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"

// Tipos
export interface TrabajadorType {
  id: number
  email: string
  color_perfil?: string
}

interface TrabajadoresInteractivosProps {
  tareaId: number
  trabajadoresAsignados: TrabajadorType[]
  trabajadoresDisponibles: TrabajadorType[]
  onTrabajadorAdd?: (nuevoTrabajadorId: number) => void
  onTrabajadorRemove?: (trabajadorId: number) => void
  className?: string
}

export function TrabajadoresInteractivos({
  tareaId,
  trabajadoresAsignados,
  trabajadoresDisponibles,
  onTrabajadorAdd,
  onTrabajadorRemove,
  className = ""
}: TrabajadoresInteractivosProps) {
  const [isLoading, setIsLoading] = useState(false)
  
  // Función para obtener las iniciales del email
  const getInitials = (email: string) => {
    if (!email) return "?";
    
    const parts = email.split('@');
    if (parts[0]) {
      return parts[0].charAt(0).toUpperCase();
    }
    return "?";
  };

  // Función para agregar un trabajador
  const handleAddTrabajador = async (trabajador: TrabajadorType) => {
    setIsLoading(true);
    
    try {
      // Simular un retraso para la actualización
      await new Promise(resolve => setTimeout(resolve, 600));
      
      console.log('Simulando agregar trabajador:', {
        tareaId,
        trabajadorId: trabajador.id,
        trabajadorEmail: trabajador.email
      });
      
      toast({
        title: "Trabajador agregado", 
        description: `${trabajador.email} ha sido asignado a esta tarea`
      });

      // Notificar al componente padre
      if (onTrabajadorAdd) {
        onTrabajadorAdd(trabajador.id);
      }
    } catch (err) {
      console.error(`Error al agregar trabajador:`, err);
      toast({
        title: "Error",
        description: `No se pudo agregar el trabajador. ${err instanceof Error ? err.message : ""}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Función para quitar un trabajador
  const handleRemoveTrabajador = async (trabajador: TrabajadorType) => {
    setIsLoading(true);
    
    try {
      // Simular un retraso para la actualización
      await new Promise(resolve => setTimeout(resolve, 600));
      
      console.log('Simulando quitar trabajador:', {
        tareaId,
        trabajadorId: trabajador.id,
        trabajadorEmail: trabajador.email
      });
      
      toast({
        title: "Trabajador removido", 
        description: `${trabajador.email} ha sido desasignado de esta tarea`
      });

      // Notificar al componente padre
      if (onTrabajadorRemove) {
        onTrabajadorRemove(trabajador.id);
      }
    } catch (err) {
      console.error(`Error al quitar trabajador:`, err);
      toast({
        title: "Error",
        description: `No se pudo quitar el trabajador. ${err instanceof Error ? err.message : ""}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrar trabajadores disponibles para no mostrar los ya asignados
  const trabajadoresNoAsignados = trabajadoresDisponibles.filter(
    disponible => !trabajadoresAsignados.some(asignado => asignado.id === disponible.id)
  );

  return (
    <div className={`${className}`}>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        {/* Lista de trabajadores asignados como badges */}
        {trabajadoresAsignados.map(trabajador => (
          <Badge 
            key={trabajador.id}
            variant="outline" 
            className="flex items-center gap-1 pl-1 pr-1 py-1"
          >
            <Avatar className="h-5 w-5 mr-1">
              <AvatarFallback 
                style={{ 
                  backgroundColor: trabajador.color_perfil || '#ccc', 
                  color: 'white', 
                  fontSize: '10px' 
                }}
              >
                {getInitials(trabajador.email)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate max-w-[140px]">{trabajador.email}</span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-4 w-4 ml-1 hover:bg-red-100" 
              onClick={() => handleRemoveTrabajador(trabajador)}
              disabled={isLoading}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}

        {/* Botón para agregar trabajadores */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={isLoading}>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 gap-1 text-xs flex items-center"
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent align="start" className="w-[250px]">
            {trabajadoresNoAsignados.length > 0 ? (
              trabajadoresNoAsignados.map((trabajador) => (
                <DropdownMenuItem
                  key={trabajador.id}
                  onClick={() => handleAddTrabajador(trabajador)}
                  className="flex items-center gap-2 cursor-pointer"
                  disabled={isLoading}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarFallback 
                      style={{ backgroundColor: trabajador.color_perfil || '#ccc', color: 'white', fontSize: '10px' }}
                    >
                      {getInitials(trabajador.email)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{trabajador.email}</span>
                </DropdownMenuItem>
              ))
            ) : (
              <div className="px-2 py-4 text-center text-muted-foreground">
                No hay más trabajadores disponibles
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {trabajadoresAsignados.length === 0 && (
        <span className="text-muted-foreground">No hay trabajadores asignados</span>
      )}
    </div>
  )
}
