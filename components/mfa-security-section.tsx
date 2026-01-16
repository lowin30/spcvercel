"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase-client"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Shield, Smartphone, AlertTriangle, CheckCircle2, Loader2, Trash2, QrCode } from "lucide-react"
import QRCode from "qrcode"

interface MFAFactor {
  id: string
  friendly_name: string
  factor_type: string
  status: string
  created_at: string
}

export function MFASecuritySection() {
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [factors, setFactors] = useState<MFAFactor[]>([])
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("")
  const [secret, setSecret] = useState<string>("")
  const [factorId, setFactorId] = useState<string>("")
  const [verificationCode, setVerificationCode] = useState("")
  const [showEnrollDialog, setShowEnrollDialog] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  // Cargar factores MFA del usuario
  const loadMFAFactors = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.mfa.listFactors()
      
      if (error) {
        console.error("Error al cargar factores MFA:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los factores MFA",
          variant: "destructive"
        })
        return
      }

      setFactors(data?.totp || [])
    } catch (err) {
      console.error("Error inesperado:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMFAFactors()
  }, [])

  // Iniciar proceso de enrollment
  const handleStartEnrollment = async () => {
    try {
      setEnrolling(true)
      
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Dispositivo ${new Date().toLocaleDateString("es-AR")}`
      })

      if (error) {
        toast({
          title: "Error al iniciar MFA",
          description: error.message,
          variant: "destructive"
        })
        return
      }

      if (data) {
        setFactorId(data.id)
        setSecret(data.totp.secret)
        
        // Generar QR code
        const otpauthUrl = data.totp.uri
        const qrDataUrl = await QRCode.toDataURL(otpauthUrl, {
          width: 250,
          margin: 2
        })
        
        setQrCodeUrl(qrDataUrl)
        setShowEnrollDialog(true)
      }
    } catch (err) {
      console.error("Error inesperado:", err)
      toast({
        title: "Error",
        description: "Error inesperado al configurar MFA",
        variant: "destructive"
      })
    } finally {
      setEnrolling(false)
    }
  }

  // Verificar código y completar enrollment
  const handleVerifyAndComplete = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: "Código inválido",
        description: "El código debe tener 6 dígitos",
        variant: "destructive"
      })
      return
    }

    try {
      setVerifying(true)

      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: factorId,
        code: verificationCode
      })

      if (error) {
        toast({
          title: "Error de verificación",
          description: "El código ingresado es incorrecto",
          variant: "destructive"
        })
        return
      }

      toast({
        title: "✅ MFA Activado",
        description: "La autenticación de dos factores ha sido configurada correctamente"
      })

      // Recargar factores y cerrar diálogo
      await loadMFAFactors()
      setShowEnrollDialog(false)
      setVerificationCode("")
      setQrCodeUrl("")
      setSecret("")
      setFactorId("")
    } catch (err) {
      console.error("Error inesperado:", err)
      toast({
        title: "Error",
        description: "Error inesperado al verificar el código",
        variant: "destructive"
      })
    } finally {
      setVerifying(false)
    }
  }

  // Eliminar un factor MFA
  const handleRemoveFactor = async (factorId: string) => {
    const confirmed = confirm("¿Estás seguro de que deseas eliminar este factor de autenticación?")
    if (!confirmed) return

    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId })

      if (error) {
        toast({
          title: "Error",
          description: "No se pudo eliminar el factor MFA",
          variant: "destructive"
        })
        return
      }

      toast({
        title: "Factor eliminado",
        description: "El factor de autenticación ha sido eliminado correctamente"
      })

      await loadMFAFactors()
    } catch (err) {
      console.error("Error inesperado:", err)
    }
  }

  const hasActiveMFA = factors.some(f => f.status === "verified")

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header con estado */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className={`h-6 w-6 ${hasActiveMFA ? "text-green-600" : "text-muted-foreground"}`} />
              <div>
                <CardTitle>Autenticación de Dos Factores (MFA)</CardTitle>
                <CardDescription>
                  Protege tu cuenta con un segundo factor de autenticación
                </CardDescription>
              </div>
            </div>
            <Badge variant={hasActiveMFA ? "default" : "secondary"} className="text-xs">
              {hasActiveMFA ? (
                <><CheckCircle2 className="h-3 w-3 mr-1" /> Activo</>
              ) : (
                <>Inactivo</>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Explicación */}
          <Alert>
            <Smartphone className="h-4 w-4" />
            <AlertTitle>¿Qué es MFA?</AlertTitle>
            <AlertDescription>
              La autenticación de dos factores (MFA) agrega una capa extra de seguridad. 
              Necesitarás tu contraseña y un código de 6 dígitos desde tu teléfono para acceder.
            </AlertDescription>
          </Alert>

          {/* Acciones */}
          {hasActiveMFA ? (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">MFA Configurado</AlertTitle>
              <AlertDescription className="text-green-700">
                Tu cuenta está protegida con autenticación de dos factores.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive" className="bg-yellow-50 border-yellow-200">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-yellow-800">Cuenta sin MFA</AlertTitle>
              <AlertDescription className="text-yellow-700">
                Tu cuenta no está protegida con MFA. Habilítalo para mayor seguridad.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Dialog open={showEnrollDialog} onOpenChange={setShowEnrollDialog}>
              <DialogTrigger asChild>
                <Button 
                  onClick={handleStartEnrollment}
                  disabled={enrolling}
                  className="gap-2"
                >
                  {enrolling ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Smartphone className="h-4 w-4" />
                  )}
                  {hasActiveMFA ? "Agregar Nuevo Dispositivo" : "Configurar MFA"}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Configurar Autenticación de Dos Factores</DialogTitle>
                  <DialogDescription>
                    Escanea este código QR con tu app de autenticación
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  {/* QR Code */}
                  {qrCodeUrl && (
                    <div className="flex flex-col items-center gap-4 py-4">
                      <div className="bg-white p-4 rounded-lg border">
                        <img src={qrCodeUrl} alt="QR Code" className="w-[250px] h-[250px]" />
                      </div>
                      
                      <div className="text-center space-y-2">
                        <p className="text-sm font-medium">O ingresa este código manualmente:</p>
                        <code className="text-xs bg-muted px-3 py-1 rounded font-mono">
                          {secret}
                        </code>
                      </div>
                    </div>
                  )}

                  {/* Apps recomendadas */}
                  <Alert>
                    <QrCode className="h-4 w-4" />
                    <AlertTitle>Apps Recomendadas</AlertTitle>
                    <AlertDescription className="text-xs">
                      • Google Authenticator<br />
                      • Microsoft Authenticator<br />
                      • Authy<br />
                      • 1Password
                    </AlertDescription>
                  </Alert>

                  {/* Input de verificación */}
                  <div className="space-y-2">
                    <Label htmlFor="verification-code">Código de Verificación (6 dígitos)</Label>
                    <Input
                      id="verification-code"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                      className="text-center text-2xl font-mono tracking-widest"
                    />
                  </div>

                  <Button 
                    onClick={handleVerifyAndComplete}
                    disabled={verifying || verificationCode.length !== 6}
                    className="w-full"
                  >
                    {verifying ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando...</>
                    ) : (
                      <>Verificar y Activar</>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Lista de dispositivos */}
      {factors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dispositivos Configurados</CardTitle>
            <CardDescription>
              Gestiona tus dispositivos de autenticación
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {factors.map((factor) => (
                <div 
                  key={factor.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{factor.friendly_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Agregado el {new Date(factor.created_at).toLocaleDateString("es-AR")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={factor.status === "verified" ? "default" : "secondary"} className="text-xs">
                      {factor.status === "verified" ? "Activo" : "Pendiente"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveFactor(factor.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
