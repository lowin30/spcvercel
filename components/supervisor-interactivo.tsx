"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { toast } from "@/components/ui/use-toast"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { UserRound } from "lucide-react"

// Tipos
export interface SupervisorType {
  id: number
  email: string
  color_perfil?: string
}

interface SupervisorInteractivoProps {
  tareaId: number
  supervisorActual: SupervisorType | null
  supervisoresDisponibles: SupervisorType[]
  onSupervisorChange?: (identificadorSupervisor: string | null) => void
  userDetailsId?: number 
  className?: string
}

export function SupervisorInteractivo({
  tareaId,
  supervisorActual,
  supervisoresDisponibles,
  onSupervisorChange,
  userDetailsId,
  className = ""
}: SupervisorInteractivoProps) {
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

  // Función para manejar el cambio de supervisor
  const handleSupervisorChange = async (supervisor: SupervisorType | null) => {
    setIsLoading(true);
    
    try {
      // Simular un retraso para la actualización
      await new Promise(resolve => setTimeout(resolve, 600));
      
      console.log('Simulando actualización de supervisor:', {
        tareaId,
        supervisorAnteriorId: supervisorActual?.id || null,
        nuevoSupervisorId: supervisor?.id || null,
        nuevoSupervisorEmail: supervisor?.email || null
      });
      
      toast({
        title: "Supervisor actualizado", 
        description: supervisor 
          ? `La tarea ahora está asignada a ${supervisor.email}` 
          : "La tarea ya no tiene supervisor asignado",
      });

      // Notificar al componente padre usando el email como identificador seguro
      if (onSupervisorChange) {
        // Si hay supervisor, enviamos el email (que es una cadena) como identificador
        // Es más seguro usar una cadena que un ID numérico que puede generar NaN
        const identificador = supervisor ? supervisor.email : null;
        console.log('Enviando email de supervisor:', identificador);
        onSupervisorChange(identificador);
      }
    } catch (err) {
      console.error(`Error al actualizar supervisor:`, err);
      toast({
        title: "Error",
        description: `No se pudo actualizar el supervisor. ${err instanceof Error ? err.message : ""}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Función para desasignar supervisor
  const handleRemoveSupervisor = async () => {
    if (!supervisorActual) return;
    
    await handleSupervisorChange(null);
  };

  return (
    <div className={`${className}`}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={isLoading}>
          <Badge 
            variant={supervisorActual ? "outline" : "secondary"}
            className="cursor-pointer hover:opacity-80 transition-all flex items-center gap-1 pl-1 pr-2 py-1"
          >
            {supervisorActual ? (
              <>
                <Avatar className="h-5 w-5 mr-1">
                  <AvatarFallback 
                    style={{ backgroundColor: supervisorActual.color_perfil || '#ccc', color: 'white', fontSize: '10px' }}
                  >
                    {getInitials(supervisorActual.email)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate max-w-[150px]">
                  {supervisorActual.email}
                  {supervisorActual.id === userDetailsId && " (Tú)"}
                </span>
              </>
            ) : (
              <>
                <UserRound className="h-3.5 w-3.5 mr-1" />
                <span>{isLoading ? "Actualizando..." : "Sin supervisor"}</span>
              </>
            )}
          </Badge>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="start" className="w-[250px]">
          {supervisoresDisponibles.map((supervisor) => (
            <DropdownMenuItem
              key={supervisor.id}
              onClick={() => {
                // Pasar directamente el ID numérico en lugar del objeto supervisor
                const supervisorId = Number(supervisor.id);
                console.log('Click en supervisor:', supervisor.email, 'ID:', supervisorId);
                handleSupervisorChange({
                  ...supervisor,
                  id: supervisorId // Asegurar que el ID es numérico
                });
              }}
              className="flex items-center gap-2 cursor-pointer"
              disabled={isLoading}
            >
              <Avatar className="h-6 w-6">
                <AvatarFallback 
                  style={{ backgroundColor: supervisor.color_perfil || '#ccc', color: 'white', fontSize: '10px' }}
                >
                  {getInitials(supervisor.email)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">
                {supervisor.email}
                {supervisor.id === userDetailsId && " (Tú)"}
              </span>
            </DropdownMenuItem>
          ))}
          
          {supervisorActual && (
            <DropdownMenuItem
              onClick={handleRemoveSupervisor}
              className="flex items-center gap-2 cursor-pointer text-red-500 font-medium mt-2 border-t"
              disabled={isLoading}
            >
              Quitar supervisor
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
