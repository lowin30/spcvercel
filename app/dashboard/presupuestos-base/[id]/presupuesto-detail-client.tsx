"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Pencil, Loader2, CheckCircle2, Zap, Hammer, Clock, Building2, User2, MessageSquare } from "lucide-react"
import { formatDate } from "@/lib/date-utils"
import { formatCurrency } from "@/lib/utils"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { aprobarPresupuestoBase, anularAprobacionPresupuestoBase } from "../actions"
import { createClient } from "@/lib/supabase-client"
import { ToolPBWrapper } from "@/components/platinum/tools/pb/ToolPBWrapper"

interface PresupuestoDetailClientProps {
  presupuesto: any
}

export function PresupuestoDetailClient({ presupuesto }: PresupuestoDetailClientProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [validatedRole, setValidatedRole] = useState<string | null>(null)
  const [sessionStatus, setSessionStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading')
  const isAdmin = validatedRole === "admin"

  useEffect(() => {
    async function verificarSesion() {
      try {
        const supabase = createClient()
        const { data, error: sessionError } = await supabase.auth.getSession()

        if (sessionError || !data.session) {
          setSessionStatus('unauthenticated')
          return
        }

        setSessionStatus('authenticated')

        const { data: userData, error: userError } = await supabase
          .from("usuarios")
          .select("rol")
          .eq("id", data.session.user.id)
          .single()

        if (userError || !userData) return
        setValidatedRole(userData.rol)

      } catch (error) {
        console.error("Error al verificar sesión:", error)
        setSessionStatus('unauthenticated')
      }
    }

    verificarSesion()
  }, [])

  const handleAprobar = async () => {
    if (sessionStatus !== 'authenticated') {
      toast({ title: "Error", description: "Inicia sesión.", variant: "destructive" })
      return
    }

    try {
      setIsLoading(true)
      const { error: refreshError } = await createClient().auth.refreshSession()
      if (refreshError) throw refreshError

      const result = await aprobarPresupuestoBase(presupuesto.id)

      if (result && result.success === false) {
        toast({ title: "Error", description: result.message, variant: "destructive" })
      } else {
        toast({ title: "Éxito", description: "Presupuesto enviado." })
        router.refresh()
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnularAprobacion = async () => {
    if (!isAdmin) return

    setIsLoading(true)
    try {
      const { error: refreshError } = await createClient().auth.refreshSession()
      if (refreshError) throw refreshError

      const result = await anularAprobacionPresupuestoBase(presupuesto.id)

      if (result && result.success === false) {
        toast({ title: "Error", description: result.message, variant: "destructive" })
      } else {
        toast({ title: "Éxito", description: "Envío anulado." })
        router.refresh()
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = () => {
    const params = new URLSearchParams(window.location.search)
    params.set('edit-pb', presupuesto.id.toString())
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header Platinum */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 p-1"
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-border/50 hover:bg-violet-500/10 hover:text-violet-600 transition-all" asChild>
              <Link href="/dashboard/presupuestos-base">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] uppercase tracking-widest font-mono opacity-70">
                  {presupuesto.code}
                </Badge>
                <Badge className={presupuesto.aprobado ? "bg-green-600 text-white" : "bg-amber-500 text-white"}>
                  {presupuesto.aprobado ? "ENVIADO" : "PENDIENTE"}
                </Badge>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-foreground mt-1">
                Presupuesto <span className="text-violet-600 font-serif italic">Platinum</span>
              </h1>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:flex sm:flex-row gap-3 w-full md:w-auto">
          {(!presupuesto.aprobado || isAdmin) && (
            <Button 
              onClick={handleEdit}
              variant="secondary" 
              className="h-12 px-6 rounded-2xl font-black shadow-lg hover:shadow-violet-500/20 transition-all border-b-4 border-muted active:border-b-0 active:translate-y-1"
            >
              <Pencil className="h-5 w-5 mr-2" /> EDITAR MODO DIOS
            </Button>
          )}

          {isAdmin && !presupuesto.aprobado && (
            <Button 
              onClick={handleAprobar} 
              disabled={isLoading}
              className="h-12 px-6 rounded-2xl font-black shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all border-b-4 border-primary/50 active:border-b-0 active:translate-y-1"
            >
              {isLoading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <CheckCircle2 className="h-5 w-5 mr-2" />}
              ENVIAR AHORA
            </Button>
          )}

          {isAdmin && presupuesto.aprobado && (
            <Button 
              onClick={handleAnularAprobacion} 
              disabled={isLoading} 
              variant="outline"
              className="h-12 px-6 rounded-2xl font-black border-2 border-amber-200 text-amber-800 bg-amber-50/50 hover:bg-amber-100 transition-all"
            >
              {isLoading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : null}
              ANULAR ENVÍO
            </Button>
          )}
        </div>
      </motion.div>

      {/* KPI Bar Platinum */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard
          label="Materiales"
          value={presupuesto.materiales || 0}
          icon={Hammer}
          color="text-amber-500"
          bg="bg-amber-500/10"
          isCurrency
        />
        <KPICard
          label="Mano de Obra"
          value={presupuesto.mano_obra || 0}
          icon={Clock}
          color="text-blue-500"
          bg="bg-blue-500/10"
          isCurrency
        />
        <KPICard
          label="Inversión Total"
          value={presupuesto.total || 0}
          icon={Zap}
          color="text-violet-600"
          bg="bg-violet-600/10"
          isCurrency
          highlight
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Info Card con Glassmorphism */}
        <Card className="md:col-span-2 border-border/50 bg-background/50 backdrop-blur-xl shadow-xl rounded-3xl overflow-hidden group hover:border-violet-500/30 transition-all">
          <CardHeader className="border-b border-border/50 bg-muted/20 pb-4">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-violet-600" />
              Detalle del Proyecto
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid sm:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-2">Edificio / Ubicación</label>
                  <p className="text-lg font-bold text-foreground leading-tight">{presupuesto.nombre_edificio || "Sin especificar"}</p>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-2">Tarea Asociada</label>
                  <p className="text-sm font-medium text-foreground bg-muted/40 p-3 rounded-xl border border-border/30">
                    {presupuesto.titulo_tarea || `Tarea #${presupuesto.id_tarea}`}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-2">Administrador Responsable</label>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-violet-600/10 flex items-center justify-center">
                      <User2 className="w-4 h-4 text-violet-600" />
                    </div>
                    <p className="text-sm font-bold text-foreground">{presupuesto.nombre_administrador || "No asignado"}</p>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-2">Cronología</label>
                  <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Creado: {formatDate(presupuesto.created_at)}
                    </div>
                    {presupuesto.aprobado && (
                      <div className="flex items-center gap-1.5 text-green-600">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Aprobado: {formatDate(presupuesto.fecha_aprobacion)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar Card */}
        <div className="space-y-6">
          <Card className="border-border/50 bg-background/50 backdrop-blur-xl shadow-xl rounded-3xl overflow-hidden group hover:border-violet-500/30 transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Notas Internas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground/80 leading-relaxed italic border-l-2 border-violet-500/30 pl-4 py-2">
                {presupuesto.nota_pb || "Sin notas técnicas registradas para este presupuesto base."}
              </p>
            </CardContent>
          </Card>

          <div className="p-4 rounded-3xl bg-violet-600/5 border border-violet-600/20 text-center">
             <p className="text-[10px] font-black text-violet-600 uppercase tracking-tighter">Estado de Inversión</p>
             <p className="text-xs text-muted-foreground mt-1 px-4">Esta estimación es de carácter interno y sujeta a validación final de administración.</p>
          </div>
        </div>
      </div>

      <ToolPBWrapper />
    </div>
  )
}

function KPICard({ 
  label, 
  value, 
  icon: Icon, 
  color, 
  bg, 
  isCurrency = false,
  highlight = false 
}: { 
  label: string, 
  value: any, 
  icon: any, 
  color: string, 
  bg: string,
  isCurrency?: boolean,
  highlight?: boolean
}) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className={`p-4 sm:p-5 rounded-3xl bg-card border border-border/50 shadow-xl flex items-center gap-4 transition-all relative overflow-hidden ${highlight ? 'ring-2 ring-violet-600/20 bg-background' : ''}`}
    >
      {highlight && (
        <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/5 rounded-full -mr-12 -mt-12 blur-2xl" />
      )}
      <div className={`p-3 rounded-2xl ${bg} ${color} shrink-0`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className={`text-xl sm:text-2xl font-black ${highlight ? 'text-violet-600 font-mono italic' : 'text-foreground font-mono'}`}>
          {isCurrency ? formatCurrency(value) : value}
        </p>
      </div>
    </motion.div>
  )
}
