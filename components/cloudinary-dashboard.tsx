"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { 
  Cloud, 
  Download, 
  HardDrive, 
  Wifi, 
  Zap, 
  AlertTriangle, 
  CheckCircle,
  Calendar,
  FileText
} from "lucide-react"

interface CloudinaryStats {
  storage: {
    used: number
    limit: number
    percentage: number
    formatted: {
      used: string
      limit: string
    }
  }
  bandwidth: {
    used: number
    limit: number
    percentage: number
    formatted: {
      used: string
      limit: string
    }
  }
  transformations: {
    used: number
    limit: number
    percentage: number
  }
  objects: any
  derivedResources: any
  alerts: Array<{
    type: string
    message: string
    severity: "warning" | "critical"
  }>
  folderStats?: any
  lastUpdated: string
  isDemo?: boolean
}

export function CloudinaryDashboard() {
  const [stats, setStats] = useState<CloudinaryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch("/api/cloudinary/stats")
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      setStats(data)
    } catch (err: any) {
      setError(err.message || "Error cargando estadísticas")
    } finally {
      setLoading(false)
    }
  }, [])

  const testConnection = async () => {
    try {
      const response = await fetch("/api/cloudinary/test")
      const result = await response.json()
      
      if (result.success) {
        alert("✅ Conexión a Cloudinary exitosa")
      } else {
        alert(`❌ Error de conexión: ${result.error}\n\nRevisa las credenciales en .env.local`)
      }
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`)
    }
  }

  const downloadBackup = (year: string, month: string) => {
    const url = `/api/backup/cloudinary/${year}/${month}`
    window.open(url, "_blank")
  }

  const generateBackupButtons = () => {
    const currentDate = new Date()
    const buttons = []
    
    // Generar botones para los últimos 6 meses
    for (let i = 0; i < 6; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      const year = date.getFullYear().toString()
      const month = (date.getMonth() + 1).toString().padStart(2, "0")
      const monthName = date.toLocaleDateString("es-ES", { month: "long", year: "numeric" })
      
      buttons.push(
        <Button
          key={`${year}-${month}`}
          variant="outline"
          size="sm"
          onClick={() => downloadBackup(year, month)}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
        </Button>
      )
    }
    
    return buttons
  }

  const getAlertIcon = (severity: "warning" | "critical") => {
    return severity === "critical" ? (
      <AlertTriangle className="h-4 w-4" />
    ) : (
      <AlertTriangle className="h-4 w-4" />
    )
  }

  const getAlertVariant = (severity: "warning" | "critical") => {
    return severity === "critical" ? "destructive" : "default"
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!stats) return null

  return (
    <div className="space-y-6">
      {/* Alertas */}
      {stats.alerts.length > 0 && (
        <div className="space-y-2">
          {stats.alerts.map((alert, index) => (
            <Alert key={index} variant={getAlertVariant(alert.severity)}>
              {getAlertIcon(alert.severity)}
              <AlertTitle>
                {alert.severity === "critical" ? "Crítico" : "Advertencia"}
              </AlertTitle>
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Métricas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Almacenamiento</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.storage.formatted.used}</div>
            <p className="text-xs text-muted-foreground">
              de {stats.storage.formatted.limit}
            </p>
            <Progress value={stats.storage.percentage} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {stats.storage.percentage.toFixed(1)}% usado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ancho de Banda</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.bandwidth.formatted.used}</div>
            <p className="text-xs text-muted-foreground">
              de {stats.bandwidth.formatted.limit}
            </p>
            <Progress value={stats.bandwidth.percentage} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {stats.bandwidth.percentage.toFixed(1)}% usado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transformaciones</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.transformations.used.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              de {stats.transformations.limit.toLocaleString()}
            </p>
            <Progress value={stats.transformations.percentage} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {stats.transformations.percentage.toFixed(1)}% usado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Objetos</CardTitle>
            <Cloud className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.objects?.count?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats.objects?.count?.images || 0} imágenes, {stats.objects?.count?.videos || 0} videos
            </p>
            <Badge variant="secondary" className="mt-2">
              <CheckCircle className="h-3 w-3 mr-1" />
              Activo
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Sistema de Backup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Sistema de Backup
          </CardTitle>
          <CardDescription>
            Descarga backups mensuales de archivos de Cloudinary para almacenamiento local
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Últimos 6 meses disponibles para backup
            </div>
            
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {generateBackupButtons()}
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              Los backups incluyen metadatos y estructura original de carpetas
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estado del sistema */}
      <Card>
        <CardHeader>
          <CardTitle>Estado del Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="text-sm font-medium mb-2">Recursos Derivados</h4>
              <p className="text-2xl font-bold">{stats.derivedResources?.count || 0}</p>
              <p className="text-xs text-muted-foreground">
                Versiones optimizadas generadas
              </p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-2">Última Actualización</h4>
              <p className="text-sm">
                {new Date(stats.lastUpdated).toLocaleString("es-AR")}
              </p>
              <div className="flex gap-2 mt-2">
                <Button variant="outline" size="sm" onClick={fetchStats}>
                  Actualizar ahora
                </Button>
                <Button variant="outline" size="sm" onClick={testConnection}>
                  Probar conexión
                </Button>
              </div>
            </div>
          </div>
          
          {stats.isDemo && (
            <Alert className="mt-4">
              <Cloud className="h-4 w-4" />
              <AlertTitle>Modo Demo</AlertTitle>
              <AlertDescription>
                Los datos mostrados son de demostración. Conecta tu cuenta Cloudinary para ver estadísticas reales.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
