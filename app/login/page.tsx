"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/lib/supabase-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { registrarUsuario } from "./register"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [nombre, setNombre] = useState("")
  const [loading, setLoading] = useState(false)
  const { supabase, user } = useSupabase()
  const router = useRouter()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("login")

  // Verificar si ya hay una sesión activa
  useEffect(() => {
    if (user) {
      router.push("/dashboard")
    }
  }, [user, router])

  // Función para sincronizar el usuario creado en Auth con la tabla usuarios
  const sincronizarUsuario = async (userId: string, userData: {email: string, nombre: string}) => {
    try {
      // Primero verificamos si el usuario ya existe en la tabla usuarios
      const { data: existingUser } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .single()
        
      if (!existingUser) {
        // Si no existe, lo creamos
        const { error: insertError } = await supabase
          .from('usuarios')
          .insert({
            id: userId,
            email: userData.email,
            nombre: userData.nombre || userData.email.split('@')[0],
            rol: 'trabajador', // Rol por defecto
            activo: true
          })
          
        if (insertError) {
          console.error("Error al sincronizar usuario con tabla usuarios:", insertError)
          return false
        }
      }
      return true
    } catch (error) {
      console.error("Error en sincronización de usuario:", error)
      return false
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast({
          title: "Error al iniciar sesión",
          description: error.message,
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      // Asegurar sincronización con tabla usuarios
      if (data.user) {
        await sincronizarUsuario(data.user.id, {
          email: data.user.email || email,
          nombre: data.user.user_metadata?.nombre || ''
        })
      }

      toast({
        title: "Inicio de sesión exitoso",
        description: "Redirigiendo al dashboard...",
      })
    } catch (error: any) {
      console.error("Error al iniciar sesión:", error)
      toast({
        title: "Error al iniciar sesión",
        description: "Ha ocurrido un error inesperado",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      console.log('Intentando registrar usuario con método optimizado:', { email, nombre })
      
      // Usamos directamente la función del servidor que es más robusta
      const resultado = await registrarUsuario(email, password, nombre)
      console.log('Resultado del registro:', resultado)
      
      if (!resultado.success) {
        // Si hay un error en el registro
        toast({
          title: "Error al registrarse",
          description: resultado.message,
          variant: "destructive",
        })
        return
      }
      
      // Si el registro fue exitoso pero requiere confirmación por email
      if (resultado.requiresConfirmation) {
        toast({
          title: "Confirmación requerida",
          description: resultado.message,
          variant: "default",
        })
        setActiveTab("login")
        return
      }
      
      // Si el registro fue exitoso pero hubo problemas en la sincronización
      if (resultado.incompleteSync) {
        toast({
          title: "Registro completado",
          description: resultado.message,
          variant: "default",
        })
        setActiveTab("login")
        return
      }
      
      // Registro completamente exitoso
      toast({
        title: "Registro exitoso",
        description: "Usuario creado correctamente. Ahora puedes iniciar sesión.",
      })
      setActiveTab("login")
    } catch (error: any) {
      console.error('Error inesperado en el registro:', error)
      toast({
        title: "Error en el sistema",
        description: "Ocurrió un error inesperado. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
            <TabsTrigger value="register">Registrarse</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <CardHeader>
              <CardTitle className="text-2xl">Iniciar sesión</CardTitle>
              <CardDescription>Ingresa tus credenciales para acceder al sistema</CardDescription>
            </CardHeader>
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Contraseña</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Iniciando sesión..." : "Iniciar sesión"}
                </Button>
              </CardFooter>
            </form>
          </TabsContent>
          
          <TabsContent value="register">
            <CardHeader>
              <CardTitle className="text-2xl">Registrarse</CardTitle>
              <CardDescription>Crea una nueva cuenta en el sistema</CardDescription>
            </CardHeader>
            <form onSubmit={handleRegister}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-nombre">Nombre</Label>
                  <Input
                    id="register-nombre"
                    type="text"
                    placeholder="Tu nombre completo"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-email">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">Contraseña</Label>
                  <Input
                    id="register-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Registrando..." : "Registrarse"}
                </Button>
              </CardFooter>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}
