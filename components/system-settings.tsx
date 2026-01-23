"use client"

import { useState } from "react"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2 } from "lucide-react"
import { MFASecuritySection } from "@/components/mfa-security-section"
import { AIToolsManager } from "@/components/ai-tools-manager"
import { KnowledgeBaseManager } from "@/components/knowledge-base-manager"

export function SystemSettings() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  // Configuración general
  const [companyName, setCompanyName] = useState("SPC")
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [autoAssignTasks, setAutoAssignTasks] = useState(false)

  // Configuración de tareas
  const [defaultTaskPriority, setDefaultTaskPriority] = useState("media")
  const [requireCommentOnComplete, setRequireCommentOnComplete] = useState(true)

  // Configuración financiera
  const [defaultProfitSplit, setDefaultProfitSplit] = useState("50")
  const [taxRate, setTaxRate] = useState("21")

  const handleSaveGeneral = () => {
    setIsSubmitting(true)
    setTimeout(() => {
      setIsSubmitting(false)
      toast({
        title: "Configuración guardada",
        description: "La configuración general ha sido actualizada correctamente",
      })
    }, 1000)
  }

  const handleSaveTasks = () => {
    setIsSubmitting(true)
    setTimeout(() => {
      setIsSubmitting(false)
      toast({
        title: "Configuración guardada",
        description: "La configuración de tareas ha sido actualizada correctamente",
      })
    }, 1000)
  }

  const handleSaveFinancial = () => {
    setIsSubmitting(true)
    setTimeout(() => {
      setIsSubmitting(false)
      toast({
        title: "Configuración guardada",
        description: "La configuración financiera ha sido actualizada correctamente",
      })
    }, 1000)
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Configura los parámetros generales del sistema, gestiona herramientas de IA y administra la base de conocimientos.
      </p>
      <Tabs defaultValue="general">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="tasks">Tareas</TabsTrigger>
          <TabsTrigger value="financial">Financiera</TabsTrigger>
          <TabsTrigger value="security">Seguridad</TabsTrigger>
          <TabsTrigger value="aitools">AI Tools</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
        </TabsList>
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Configuración General</CardTitle>
              <CardDescription>Ajustes generales del sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Nombre de la Empresa</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Nombre de la empresa"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="emailNotifications">Notificaciones por Email</Label>
                  <p className="text-sm text-muted-foreground">Enviar notificaciones por email a los usuarios</p>
                </div>
                <Switch id="emailNotifications" checked={emailNotifications} onCheckedChange={setEmailNotifications} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="autoAssignTasks">Asignación Automática de Tareas</Label>
                  <p className="text-sm text-muted-foreground">Asignar tareas automáticamente según disponibilidad</p>
                </div>
                <Switch id="autoAssignTasks" checked={autoAssignTasks} onCheckedChange={setAutoAssignTasks} />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveGeneral} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Guardar Cambios
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Tareas</CardTitle>
              <CardDescription>Ajustes relacionados con la gestión de tareas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="defaultTaskPriority">Prioridad Predeterminada</Label>
                <select
                  id="defaultTaskPriority"
                  value={defaultTaskPriority}
                  onChange={(e) => setDefaultTaskPriority(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="requireCommentOnComplete">Requerir Comentario al Completar</Label>
                  <p className="text-sm text-muted-foreground">
                    Exigir un comentario cuando se marca una tarea como completada
                  </p>
                </div>
                <Switch
                  id="requireCommentOnComplete"
                  checked={requireCommentOnComplete}
                  onCheckedChange={setRequireCommentOnComplete}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveTasks} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Guardar Cambios
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="financial">
          <Card>
            <CardHeader>
              <CardTitle>Configuración Financiera</CardTitle>
              <CardDescription>Ajustes relacionados con presupuestos, facturas y liquidaciones</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="defaultProfitSplit">División de Ganancias Predeterminada (%)</Label>
                <Input
                  id="defaultProfitSplit"
                  type="number"
                  min="0"
                  max="100"
                  value={defaultProfitSplit}
                  onChange={(e) => setDefaultProfitSplit(e.target.value)}
                  placeholder="50"
                />
                <p className="text-xs text-muted-foreground">
                  Porcentaje de ganancias para el supervisor (el resto va para el administrador)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxRate">Tasa de Impuestos (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  min="0"
                  max="100"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  placeholder="21"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveFinancial} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Guardar Cambios
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="security">
          <MFASecuritySection />
        </TabsContent>
        <TabsContent value="aitools">
          <AIToolsManager />
        </TabsContent>
        <TabsContent value="knowledge">
          <KnowledgeBaseManager />
        </TabsContent>
      </Tabs>
    </div>
  )
}
