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
import Image from "next/image"
import { Fingerprint, Loader2 } from "lucide-react"
import { useBiometricLogin } from "@/hooks/use-biometric-login"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [nombre, setNombre] = useState("")
  const [loading, setLoading] = useState(false)
  const { supabase, user } = useSupabase()
  const router = useRouter()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("login")

  // Biometric login hook
  const { biometricLoading, biometricEmail, showEmailInput, handleBiometricLogin } = useBiometricLogin({ supabase, toast })

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


  const getURL = () => {
    // 1. In the browser, ALWAYS prefer the actual current origin
    if (typeof window !== 'undefined') {
      return window.location.origin
    }

    // 2. Server-side fallback (if needed)
    let url =
      process.env.NEXT_PUBLIC_SITE_URL ??
      process.env.NEXT_PUBLIC_VERCEL_URL ??
      'http://localhost:3000'

    // Normalize: remove trailing slash if present to avoid double slashes later
    url = url.endsWith('/') ? url.slice(0, -1) : url

    // Ensure protocol
    url = url.includes('http') ? url : `https://${url}`

    return url
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      const origin = getURL()
      const redirectUrl = `${origin}/api/auth/callback`
      console.log('Initiating Google OAuth with redirect:', redirectUrl)

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
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
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-amber-50 via-white to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Card className="w-full max-w-md shadow-2xl">
        {/* Header con Logo */}
        <div className="flex justify-center pt-6 pb-4">
          <Image
            src="/spc-logo-main.png"
            alt="Servicios Para Consorcio"
            width={200}
            height={200}
            priority
            className="object-contain"
          />
        </div>

        <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
            <TabsTrigger value="register">Registrarse</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl font-bold">Bienvenido</CardTitle>
              <CardDescription>Selecciona tu método de acceso preferido</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pb-4">
              {/* Botón destacado de huella biométrica */}
              <Button
                variant="default"
                type="button"
                className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                onClick={() => handleBiometricLogin()}
                disabled={biometricLoading || loading}
              >
                {biometricLoading ? (
                  <>
                    <Loader2 className="h-6 w-6 mr-2 animate-spin" />
                    verificando...
                  </>
                ) : (
                  <>
                    <Fingerprint className="h-6 w-6 mr-2" />
                    {biometricEmail ? 'entrar con mi huella' : 'entrar con huella'}
                  </>
                )}
              </Button>

              {/* Input de email de emergencia */}
              {showEmailInput && (
                <div className="space-y-2 animate-in fade-in-50 slide-in-from-top-2 duration-300">
                  <Label htmlFor="biometric-email" className="text-sm text-gray-600">
                    ingresa tu email para usar la huella
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="biometric-email"
                      type="email"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleBiometricLogin(email)
                        }
                      }}
                      autoFocus
                      className="flex-1"
                    />
                    <Button
                      onClick={() => handleBiometricLogin(email)}
                      disabled={!email || biometricLoading}
                      size="icon"
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      <Fingerprint className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    tu email se guardara para la proxima vez
                  </p>
                </div>
              )}

              {/* Separador */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-300"></span>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white dark:bg-gray-800 px-3 text-gray-500">o continúa con</span>
                </div>
              </div>

              {/* Botón de Google (método de respaldo) */}
              <Button
                variant="outline"
                type="button"
                className="w-full h-12 border-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                <svg className="h-5 w-5 mr-2" aria-hidden="true" viewBox="0 0 488 512">
                  <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                </svg>
                Continuar con Google
              </Button>
            </CardContent>

            {/* Opción de email/password colapsada */}
            <div className="px-6 pb-4">
              <details className="group">
                <summary className="cursor-pointer text-center text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 list-none flex items-center justify-center gap-2">
                  <span>Otras opciones de acceso</span>
                  <svg className="h-4 w-4 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
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
              </details>
            </div>
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
