"use client"

import { useState } from "react"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Save, ShieldAlert } from "lucide-react"
import { MFASecuritySection } from "@/components/mfa-security-section"
import { AIToolsManager } from "@/components/ai-tools-manager"
import { KnowledgeBaseManager } from "@/components/knowledge-base-manager"
import { actualizarPreferenciasUsuario } from "@/app/actions/perfil-actions"
import { useRouter } from "next/navigation"

interface SystemSettingsProps {
  user: any
}

export function SystemSettings({ user }: SystemSettingsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  // Extraer preferencias actuales o usar defaults
  const prefs = user?.preferencias || {}

  // Configuración general
  const [companyName, setCompanyName] = useState(prefs.companyName || "SPC")
  const [emailNotifications, setEmailNotifications] = useState(prefs.emailNotifications !== false)
  const [autoAssignTasks, setAutoAssignTasks] = useState(prefs.autoAssignTasks === true)

  // Configuración de tareas
  const [defaultTaskPriority, setDefaultTaskPriority] = useState(prefs.defaultTaskPriority || "media")
  const [requireCommentOnComplete, setRequireCommentOnComplete] = useState(prefs.requireCommentOnComplete !== false)

  // Configuración financiera
  const [defaultProfitSplit, setDefaultProfitSplit] = useState(prefs.defaultProfitSplit || "50")
  const [taxRate, setTaxRate] = useState(prefs.taxRate || "21")

  const handleSaveSettings = async (section: string, data: Record<string, any>) => {
    setIsSubmitting(true)
    try {
      const result = await actualizarPreferenciasUsuario(data)

      if (result.ok) {
        toast({
          title: "Configuración sincronizada",
          description: `Los ajustes de ${section} se han guardado en la nube.`,
        })
        router.refresh()
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      toast({
        title: "Error al guardar",
        description: error.message || "No se pudo conectar con el servidor",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex gap-3 items-start">
        <ShieldAlert className="h-5 w-5 text-amber-600 mt-0.5" />
        <div className="text-sm text-amber-800 dark:text-amber-200">
          <p className="font-bold">Modo Administrador Global</p>
          <p>Estos ajustes afectan el comportamiento general del sistema para todos los usuarios. Los cambios se sincronizan en tu Pasaporte Digital.</p>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 h-auto p-1 bg-muted/50">
          <TabsTrigger value="general" className="py-2">General</TabsTrigger>
          <TabsTrigger value="tasks" className="py-2">Tareas</TabsTrigger>
          <TabsTrigger value="financial" className="py-2">Financiera</TabsTrigger>
          <TabsTrigger value="security" className="py-2">Seguridad</TabsTrigger>
          <TabsTrigger value="aitools" className="py-2">AI Tools</TabsTrigger>
          <TabsTrigger value="knowledge" className="py-2">Knowledge Base</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4">
          <Card className="border-primary/10 shadow-sm">
            <CardHeader>
              <CardTitle>Configuración General</CardTitle>
              <CardDescription>Ajustes de identidad y notificaciones</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Nombre de la Empresa</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Ej: Serviproz C.A."
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-dashed">
                <div className="space-y-0.5">
                  <Label htmlFor="emailNotifications">Notificaciones por Email</Label>
                  <p className="text-xs text-muted-foreground">Enviar alertas automáticas a clientes y empleados</p>
                </div>
                <Switch id="emailNotifications" checked={emailNotifications} onCheckedChange={setEmailNotifications} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-dashed">
                <div className="space-y-0.5">
                  <Label htmlFor="autoAssignTasks">Asignación Automática</Label>
                  <p className="text-xs text-muted-foreground">Distribuir tareas según carga de trabajo actual</p>
                </div>
                <Switch id="autoAssignTasks" checked={autoAssignTasks} onCheckedChange={setAutoAssignTasks} />
              </div>
            </CardContent>
            <CardFooter className="bg-muted/10 border-t pt-4">
              <Button
                onClick={() => handleSaveSettings("General", { companyName, emailNotifications, autoAssignTasks })}
                disabled={isSubmitting}
                className="gap-2"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Actualizar Sistema
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <Card className="border-primary/10 shadow-sm">
            <CardHeader>
              <CardTitle>Comportamiento de Tareas</CardTitle>
              <CardDescription>Reglas de negocio para el flujo de trabajo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="defaultTaskPriority">Prioridad por Defecto</Label>
                <select
                  id="defaultTaskPriority"
                  value={defaultTaskPriority}
                  onChange={(e) => setDefaultTaskPriority(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                </select>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-dashed">
                <div className="space-y-0.5">
                  <Label htmlFor="requireCommentOnComplete">Feedback obligatorio</Label>
                  <p className="text-xs text-muted-foreground">
                    Exigir comentario al finalizar una orden para auditoría
                  </p>
                </div>
                <Switch
                  id="requireCommentOnComplete"
                  checked={requireCommentOnComplete}
                  onCheckedChange={setRequireCommentOnComplete}
                />
              </div>
            </CardContent>
            <CardFooter className="bg-muted/10 border-t pt-4">
              <Button
                onClick={() => handleSaveSettings("Tareas", { defaultTaskPriority, requireCommentOnComplete })}
                disabled={isSubmitting}
                className="gap-2"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar Reglas
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="mt-4">
          <Card className="border-primary/10 shadow-sm">
            <CardHeader>
              <CardTitle>Parámetros Financieros</CardTitle>
              <CardDescription>Cálculos de impuestos y repartición de beneficios</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="defaultProfitSplit">Reparto Base de Ganancias (%)</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="defaultProfitSplit"
                    type="number"
                    min="0"
                    max="100"
                    value={defaultProfitSplit}
                    onChange={(e) => setDefaultProfitSplit(e.target.value)}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">para el Supervisor</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxRate">IVA / Tasa Impositiva (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  min="0"
                  max="100"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  className="w-24"
                />
              </div>
            </CardContent>
            <CardFooter className="bg-muted/10 border-t pt-4">
              <Button
                onClick={() => handleSaveSettings("Finanzas", { defaultProfitSplit, taxRate })}
                disabled={isSubmitting}
                className="gap-2"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Registrar Tasas
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          <MFASecuritySection />
        </TabsContent>
        <TabsContent value="aitools" className="mt-4">
          <AIToolsManager />
        </TabsContent>
        <TabsContent value="knowledge" className="mt-4">
          <KnowledgeBaseManager />
        </TabsContent>
      </Tabs>
    </div>
  )
}
