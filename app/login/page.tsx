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
  const sincronizarUsuario = async (userId: string, userData: { email: string, nombre: string }) => {
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





  const handlePasskeyLogin = async () => {
    setLoading(true)
    try {
      const { data, error } = await (supabase.auth as any).signInWithWebAuthn({
        options: {
          publicKey: {
            // Default options
          }
        }
      })
      if (error) throw error
    } catch (error: any) {
      console.error("Passkey Login failed:", error)
      if (email) {
        const { error: error2 } = await (supabase.auth as any).signInWithWebAuthn({ email })
        if (error2) {
          toast({
            title: "Error con Huella",
            description: error2.message,
            variant: "destructive",
          })
        }
      } else {
        toast({
          title: "Error con Huella",
          description: "Ingresa tu email primero si falla la detección automática.",
          variant: "destructive",
        })
      }
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })
      if (error) throw error
    } catch (error: any) {
      toast({
        title: "Error con Google",
        description: error.message,
        variant: "destructive",
      })
      setLoading(false)
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

      // Asegurar sincronización con tabla usuarios (en segundo plano)
      if (data.user) {
        void sincronizarUsuario(data.user.id, {
          email: data.user.email || email,
          nombre: data.user.user_metadata?.nombre || ''
        }).catch(console.error)
      }

      toast({
        title: "Inicio de sesión exitoso",
        description: "Redirigiendo al dashboard...",
      })
      router.replace('/dashboard')
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
            <div className="mb-4 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" type="button" className="w-full flex gap-2" onClick={handleGoogleLogin} disabled={loading}>
                  <svg className="h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path></svg>
                  Google
                </Button>
                <Button variant="outline" type="button" className="w-full flex gap-2" onClick={handlePasskeyLogin} disabled={loading}>
                  <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M7.875 14.25l1.214 1.942a2.25 2.25 0 001.908 1.058h2.006c.776 0 1.497-.4 1.908-1.058l1.214-1.942M2.41 9h4.636a2.25 2.25 0 011.872 1.002l.164.246a2.25 2.25 0 001.872 1.002h2.092a2.25 2.25 0 001.872-1.002l.164-.246A2.25 2.25 0 0116.954 9h4.636M2.41 9a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 002.41 24h19.18a2.25 2.25 0 002.25-2.25V11.25a2.25 2.25 0 00-2.25-2.25h-4.636"></path></svg>
                  Huella
                </Button>
              </div>
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t"></span></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">O continúa con email</span></div>
              </div>
            </div>
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
