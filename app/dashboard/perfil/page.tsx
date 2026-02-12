import { obtenerPerfilUsuario } from "@/app/actions/perfil-actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, Mail, Shield, Briefcase, Palette } from "lucide-react"
import { MFASecuritySection } from "@/components/mfa-security-section"
import { PersonalAppearanceSettings } from "@/components/personal-appearance-settings"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default async function PerfilPage() {
  // Bridge: Obtener datos seguros desde el servidor (bypass RLS)
  const userDetails = await obtenerPerfilUsuario()

  // Mapeo de roles a colores
  const rolBadgeVariant = (rol: string) => {
    switch (rol) {
      case "admin":
        return "default"
      case "supervisor":
        return "secondary"
      case "trabajador":
        return "outline"
      default:
        return "outline"
    }
  }

  // Mapeo de roles a etiquetas legibles
  const rolLabel = (rol: string) => {
    switch (rol) {
      case "admin":
        return "Administrador"
      case "supervisor":
        return "Supervisor"
      case "trabajador":
        return "Trabajador"
      default:
        return rol
    }
  }

  return (
    <div className="container mx-auto py-6 md:py-10 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mi Perfil</h1>
        <p className="text-muted-foreground">
          Gestiona tu información personal, seguridad y apariencia
        </p>
      </div>

      {/* Tabs de perfil */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="info" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Información</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Seguridad</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Apariencia</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Información Personal */}
        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Información Personal
              </CardTitle>
              <CardDescription>
                Datos de tu cuenta en el sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Email */}
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{userDetails?.email}</p>
                </div>
              </div>

              {/* Rol */}
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
                <Briefcase className="h-5 w-5 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">Rol:</p>
                  <Badge variant={rolBadgeVariant(userDetails?.rol)}>
                    {rolLabel(userDetails?.rol)}
                  </Badge>
                </div>
              </div>

              {/* Fecha de creación */}
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Cuenta creada</p>
                  <p className="text-sm text-muted-foreground">
                    {userDetails?.created_at
                      ? new Date(userDetails.created_at).toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric"
                      })
                      : "N/A"
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Seguridad (MFA) */}
        <TabsContent value="security" className="space-y-4">
          <MFASecuritySection />

          {/* Nota informativa */}
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Protege tu cuenta con MFA
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    La autenticación de dos factores (MFA) agrega una capa extra de seguridad a tu cuenta.
                    Recomendamos encarecidamente habilitarla, especialmente si eres administrador o supervisor.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Apariencia */}
        <TabsContent value="appearance">
          <PersonalAppearanceSettings
            userId={userDetails?.id}
            initialColorPerfil={userDetails?.color_perfil}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
