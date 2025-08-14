"use client"

import { useState, useEffect } from "react"
import { useSupabase } from "@/lib/supabase-provider";
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Settings, Plus, Trash2 } from "lucide-react"

interface ConfigAjuste {
  id?: number
  nombre_administrador: string
  aplica_ajustes: boolean
  porcentaje_default: number
}

export function ConfiguracionAjustesForm() {
  const [configs, setConfigs] = useState<ConfigAjuste[]>([])
  const [newConfig, setNewConfig] = useState<ConfigAjuste>({
    nombre_administrador: "",
    aplica_ajustes: true,
    porcentaje_default: 10.0,
  })
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const { supabase } = useSupabase();

  useEffect(() => {
    loadConfigs()
  }, [])

  const loadConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from("config_ajustes_administradores")
        .select("*")
        .order("nombre_administrador");

      if (error) throw error;
      setConfigs(data || []);
    } catch (error) {
      console.error("Error al cargar configuraciones:", error)
    }
  }

  const handleSave = async () => {
    if (!newConfig.nombre_administrador.trim()) {
      toast({
        title: "Error",
        description: "El nombre del administrador es requerido",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const { error } = await supabase.from("config_ajustes_administradores").insert([newConfig]);

      if (error) throw error;

      toast({
        title: "Configuración guardada",
        description: "La configuración del administrador se guardó correctamente",
      })

      setNewConfig({
        nombre_administrador: "",
        aplica_ajustes: true,
        porcentaje_default: 10.0,
      })

      loadConfigs()
    } catch (error) {
      console.error("Error al guardar:", error)
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      const { error } = await supabase.from("config_ajustes_administradores").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Configuración eliminada",
        description: "La configuración se eliminó correctamente",
      })

      loadConfigs()
    } catch (error) {
      console.error("Error al eliminar:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar la configuración",
        variant: "destructive",
      })
    }
  }

  const updateConfig = async (id: number, field: keyof ConfigAjuste, value: any) => {
    try {
      const { error } = await supabase
        .from("config_ajustes_administradores")
        .update({ [field]: value })
        .eq("id", id);

      if (error) throw error;

      loadConfigs()
    } catch (error) {
      console.error("Error al actualizar:", error)
    }
  }

  return (
    <Card className="border-red-200">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-red-600">
          <Settings className="h-5 w-5" />
          <span>Configuración de Ajustes</span>
        </CardTitle>
        <CardDescription>Administrar configuraciones de ajustes por administrador</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lista de configuraciones existentes */}
        <div className="space-y-3">
          {configs.map((config) => (
            <div key={config.id} className="p-3 border rounded-lg bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">{config.nombre_administrador}</div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => config.id && handleDelete(config.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={config.aplica_ajustes}
                    onCheckedChange={(checked) => config.id && updateConfig(config.id, "aplica_ajustes", checked)}
                  />
                  <span className="text-sm">Aplica ajustes</span>
                </div>
                <Badge variant={config.aplica_ajustes ? "default" : "secondary"}>{config.porcentaje_default}%</Badge>
              </div>
            </div>
          ))}
        </div>

        {/* Formulario para nueva configuración */}
        <div className="border-t pt-4 space-y-3">
          <div>
            <Label htmlFor="nombre">Nuevo Administrador</Label>
            <Input
              id="nombre"
              value={newConfig.nombre_administrador}
              onChange={(e) => setNewConfig((prev) => ({ ...prev, nombre_administrador: e.target.value }))}
              placeholder="Nombre del administrador"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={newConfig.aplica_ajustes}
              onCheckedChange={(checked) => setNewConfig((prev) => ({ ...prev, aplica_ajustes: checked }))}
            />
            <Label>Aplica ajustes por defecto</Label>
          </div>

          <div>
            <Label htmlFor="porcentaje">Porcentaje (%)</Label>
            <Input
              id="porcentaje"
              type="number"
              value={newConfig.porcentaje_default}
              onChange={(e) =>
                setNewConfig((prev) => ({ ...prev, porcentaje_default: Number.parseFloat(e.target.value) || 0 }))
              }
              min="0"
              max="100"
              step="0.1"
            />
          </div>

          <Button onClick={handleSave} disabled={isLoading} className="w-full">
            <Plus className="h-4 w-4 mr-1" />
            {isLoading ? "Guardando..." : "Agregar Configuración"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
