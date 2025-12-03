"use client"

import { useState } from "react"
import { useSupabase } from "@/lib/supabase-provider"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatDateTime } from "@/lib/utils"
import { Loader2, RefreshCw, UserPlus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

interface User {
  id: string
  email: string
  rol: string
  color_perfil: string
  last_sign_in_at: string | null
  created_at: string
}

interface UserRoleManagerProps {
  users: User[]
}

export function UserRoleManager({ users }: UserRoleManagerProps) {
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [newUserEmail, setNewUserEmail] = useState("")
  const [newUserPassword, setNewUserPassword] = useState("")
  const [newUserRole, setNewUserRole] = useState("trabajador")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { supabase } = useSupabase()
  const { toast } = useToast()
  const router = useRouter()

  const handleRoleChange = async (userId: string, newRole: string) => {
    setIsUpdating(userId)

    try {
      console.log(`Actualizando usuario ${userId} a rol: ${newRole}`)

      // Actualizar el rol en la tabla usuarios
      const { error, data } = await supabase
        .from("usuarios")
        .update({ rol: newRole })
        .eq("id", userId)
        .select()

      console.log('Respuesta de Supabase:', { data, error })

      if (error) {
        throw new Error(error.message)
      }

      // Actualizar inmediatamente en la UI sin esperar el refresh
      const updatedUsers = users.map(user => {
        if (user.id === userId) {
          return { ...user, rol: newRole }
        }
        return user
      })

      // Este es un truco para forzar una actualización inmediata en la UI
      // Actualizamos manualmente el DOM
      const userRow = document.querySelector(`[data-user-id="${userId}"]`)
      if (userRow) {
        const roleText = userRow.querySelector('.role-value')
        if (roleText) roleText.textContent = newRole
      }

      toast({
        title: "Rol actualizado",
        description: `El rol del usuario ha sido actualizado a: ${newRole}`,
      })

      // Forzar un refresh completo después de un breve retraso
      setTimeout(() => {
        window.location.href = window.location.pathname + '?tab=usuarios&refresh=true'
      }, 1000)
    } catch (error) {
      console.error("Error al actualizar rol:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el rol del usuario. Verifica los permisos en la base de datos.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(null)
    }
  }

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserPassword) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)

    try {
      // Crear usuario en Supabase Auth
      const { data, error } = await supabase.auth.admin.createUser({
        email: newUserEmail,
        password: newUserPassword,
        email_confirm: true,
      })

      if (error) {
        throw new Error(error.message)
      }

      if (!data.user) {
        throw new Error("No se pudo crear el usuario")
      }

      // Crear entrada en la tabla usuarios
      const { error: dbError } = await supabase.from("usuarios").insert({
        id: data.user.id,
        email: newUserEmail,
        rol: newUserRole,
        color_perfil: "#3498db",
      })

      if (dbError) {
        throw new Error(dbError.message)
      }

      toast({
        title: "Usuario creado",
        description: "El usuario ha sido creado correctamente",
      })

      // Limpiar formulario
      setNewUserEmail("")
      setNewUserPassword("")
      setNewUserRole("trabajador")
      setIsDialogOpen(false)

      router.refresh()
    } catch (error) {
      console.error("Error al crear usuario:", error)
      toast({
        title: "Error",
        description: "No se pudo crear el usuario",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Nuevo Usuario
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Usuario</DialogTitle>
              <DialogDescription>Ingresa los datos del nuevo usuario para el sistema.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Contraseña segura"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Rol</Label>
                <Select value={newUserRole} onValueChange={setNewUserRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="trabajador">Trabajador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateUser} disabled={isCreating}>
                {isCreating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Crear Usuario
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabla para pantallas medianas y grandes */}
      <div className="rounded-md border hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} data-user-id={user.id}>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <span className="role-value hidden">{user.rol}</span>
                  <Select
                    value={user.rol}
                    onValueChange={(value) => handleRoleChange(user.id, value)}
                    disabled={isUpdating === user.id}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="trabajador">Trabajador</SelectItem>
                      <SelectItem value="sin_rol">Sin Rol</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right">
                  {isUpdating === user.id ? (
                    <Loader2 className="h-4 w-4 ml-auto animate-spin" />
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRoleChange(user.id, user.rol)}
                      title="Actualizar"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {/* Vista de tarjetas para móvil */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {users.map((user) => (
          <div key={user.id} className="bg-white p-4 rounded-lg border shadow-sm">
            <div className="mb-3">
              <h3 className="font-medium truncate">{user.email}</h3>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex-grow">
                <Select
                  value={user.rol}
                  onValueChange={(value) => handleRoleChange(user.id, value)}
                  disabled={isUpdating === user.id}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="trabajador">Trabajador</SelectItem>
                    <SelectItem value="sin_rol">Sin Rol</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="ml-2">
                {isUpdating === user.id ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRoleChange(user.id, user.rol)}
                    title="Actualizar"
                  >
                    <RefreshCw className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
