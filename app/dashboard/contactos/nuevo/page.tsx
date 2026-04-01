"use client"

import { useState, useEffect } from "react"
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import Link from "next/link"
import { Loader2, ArrowLeft, Building2, UserPlus, Phone, PlusCircle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { DepartamentoForm, DepartamentoFormData } from "@/components/departamento-form"
import { UnifiedDeptContactForm } from "@/components/unified-dept-contact-form"

type Step = "edificio" | "departamento" | "contacto"

export default function NuevoContactoPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [step, setStep] = useState<Step>("edificio")
  const [initialLoading, setInitialLoading] = useState(true)
  const [loadingDeptos, setLoadingDeptos] = useState(false)
  const [savingDepto, setSavingDepto] = useState(false)
  const [showNewDeptoForm, setShowNewDeptoForm] = useState(false)

  const [edificios, setEdificios] = useState<any[]>([])
  const [departamentos, setDepartamentos] = useState<any[]>([])
  const [currentContacts, setCurrentContacts] = useState<any[]>([])

  const [selectedEdificio, setSelectedEdificio] = useState<any>(null)
  const [selectedDepto, setSelectedDepto] = useState<any>(null)

  const [newDeptoForm, setNewDeptoForm] = useState<DepartamentoFormData>({
    codigo: '',
    propietario: '',
    notas: '',
    telefonos: []
  })

  // Carga inicial
  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }
      const { data: eds } = await supabase.from("edificios").select("id, nombre").order("nombre")
      setEdificios(eds || [])
      setInitialLoading(false)
    }
    init()
  }, [router])

  // Carga de departamentos al seleccionar edificio
  async function loadDeptos(edificioId: number) {
    setLoadingDeptos(true)
    setDepartamentos([])
    setSelectedDepto(null)
    setShowNewDeptoForm(false)
    const supabase = createClient()
    const { data } = await supabase
      .from("departamentos")
      .select("id, codigo, propietario")
      .eq("edificio_id", edificioId)
      .order("codigo")
    setDepartamentos(data || [])
    setLoadingDeptos(false)
    setStep("departamento")
  }

  // Carga de contactos al seleccionar departamento
  async function loadContacts(deptoId: number) {
    const supabase = createClient()
    const { data } = await supabase
      .from("contactos")
      .select("*")
      .eq("departamento_id", deptoId)
      .order("es_principal", { ascending: false })
    setCurrentContacts(data || [])
    setStep("contacto")
  }

  // Crear nuevo departamento
  async function handleCreateDepto() {
    if (!newDeptoForm.codigo || !selectedEdificio) return
    setSavingDepto(true)
    try {
      const supabase = createClient()
      const { data: newDepto, error } = await supabase
        .from("departamentos")
        .insert({
          edificio_id: selectedEdificio.id,
          codigo: newDeptoForm.codigo,
          propietario: newDeptoForm.propietario || null,
          notas: newDeptoForm.notas || null,
        })
        .select()
        .single()

      if (error) throw error

      toast({ title: "departamento creado", description: `depto ${newDepto.codigo} agregado correctamente.` })

      // Refrescar lista y seleccionar el nuevo
      await loadDeptos(selectedEdificio.id)
      setSelectedDepto(newDepto)
      setShowNewDeptoForm(false)
      setNewDeptoForm({ codigo: '', propietario: '', notas: '', telefonos: [] })
      setCurrentContacts([])
      setStep("contacto")
    } catch (err: any) {
      toast({ title: "error", description: err.message, variant: "destructive" })
    } finally {
      setSavingDepto(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight lowercase">nuevo contacto</h2>
          <p className="text-zinc-500 text-sm lowercase">gestion unificada de contactos por departamento</p>
        </div>
        <Link href="/dashboard/contactos">
          <Button variant="outline" size="sm" className="h-8 text-xs lowercase">
            <ArrowLeft className="mr-2 h-3 w-3" /> volver
          </Button>
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Panel Izquierdo: Navegacion */}
        <div className="lg:col-span-1 space-y-4">

          {/* Paso 1: Edificio */}
          <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
            <CardHeader className="p-4 pb-3">
              <div className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${selectedEdificio ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'bg-zinc-200 text-zinc-500'}`}>
                  {selectedEdificio ? <CheckCircle2 className="w-3 h-3" /> : '1'}
                </div>
                <CardTitle className="text-sm font-medium lowercase">edificio</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Select
                onValueChange={(val) => {
                  const ed = edificios.find(e => e.id.toString() === val)
                  setSelectedEdificio(ed)
                  if (ed) loadDeptos(ed.id)
                }}
                value={selectedEdificio?.id?.toString() || ""}
              >
                <SelectTrigger className="h-9 bg-white dark:bg-zinc-900">
                  <SelectValue placeholder="seleccionar edificio" />
                </SelectTrigger>
                <SelectContent>
                  {edificios.map(ed => (
                    <SelectItem key={ed.id} value={ed.id.toString()}>{ed.nombre.toLowerCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Paso 2: Departamento */}
          {selectedEdificio && (
            <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
              <CardHeader className="p-4 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${selectedDepto ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'bg-zinc-200 text-zinc-500'}`}>
                      {selectedDepto ? <CheckCircle2 className="w-3 h-3" /> : '2'}
                    </div>
                    <CardTitle className="text-sm font-medium lowercase">departamento</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-zinc-400 hover:text-zinc-900"
                    onClick={() => setShowNewDeptoForm(!showNewDeptoForm)}
                    title="crear nuevo departamento"
                  >
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                {loadingDeptos ? (
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <Loader2 className="h-3 w-3 animate-spin" /> cargando deptos...
                  </div>
                ) : (
                  <>
                    <Select
                      onValueChange={(val) => {
                        const d = departamentos.find(d => d.id.toString() === val)
                        setSelectedDepto(d)
                        if (d) loadContacts(d.id)
                        setShowNewDeptoForm(false)
                      }}
                      value={selectedDepto?.id?.toString() || ""}
                    >
                      <SelectTrigger className="h-9 bg-white dark:bg-zinc-900">
                        <SelectValue placeholder={departamentos.length === 0 ? "sin deptos, crea uno ↑" : "seleccionar depto"} />
                      </SelectTrigger>
                      <SelectContent>
                        {departamentos.map(d => (
                          <SelectItem key={d.id} value={d.id.toString()}>
                            {d.codigo.toLowerCase()} {d.propietario ? `(${d.propietario.toLowerCase()})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Formulario inline para nuevo departamento */}
                    {showNewDeptoForm && (
                      <div className="border border-zinc-200 dark:border-zinc-700 rounded-md p-3 bg-white dark:bg-zinc-900 space-y-3 animate-in fade-in duration-200">
                        <p className="text-xs font-medium text-zinc-500 lowercase">crear nuevo departamento en {selectedEdificio?.nombre?.toLowerCase()}</p>
                        <DepartamentoForm
                          formData={newDeptoForm}
                          onChange={setNewDeptoForm}
                          onSubmit={handleCreateDepto}
                          onCancel={() => setShowNewDeptoForm(false)}
                          isLoading={savingDepto}
                          submitLabel="crear departamento"
                          hidePhones={true}
                        />
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Contactos actuales */}
          {selectedDepto && currentContacts.length > 0 && (
            <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm animate-in fade-in duration-300">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-medium text-zinc-500 lowercase">contactos actuales</CardTitle>
                  <Badge variant="outline" className="text-[9px] h-4">{currentContacts.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-2">
                {currentContacts.map(c => (
                  <div key={c.id} className="flex flex-col p-2 rounded border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{c.nombreReal?.toLowerCase()}</span>
                      {c.es_principal && <Badge className="text-[9px] h-4 bg-zinc-100 text-zinc-800 border-zinc-200 px-1">principal</Badge>}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                      <Phone className="w-3 h-3" /> {c.telefono || 'sin numero'}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Panel Derecho: Formulario de Contacto */}
        <div className="lg:col-span-2">
          {!selectedDepto ? (
            <Card className="border-dashed border-zinc-200 dark:border-zinc-800 bg-transparent flex items-center justify-center p-12">
              <div className="text-center space-y-2">
                <div className="bg-zinc-100 dark:bg-zinc-900 rounded-full p-4 w-fit mx-auto mb-4">
                  <UserPlus className="w-8 h-8 text-zinc-300" />
                </div>
                <h3 className="text-sm font-medium text-zinc-500 lowercase">seleccione un departamento para continuar</h3>
                <p className="text-xs text-zinc-400 lowercase italic">si el departamento no existe, crealo con el boton <PlusCircle className="inline w-3 h-3" /></p>
              </div>
            </Card>
          ) : (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <UnifiedDeptContactForm
                edificioId={selectedEdificio?.id}
                edificioNombre={selectedEdificio?.nombre}
                departamentoId={selectedDepto.id}
                departamentoCodigo={selectedDepto.codigo}
                onSuccess={() => {
                  loadContacts(selectedDepto.id)
                  toast({ title: "contacto guardado", description: "sincronizado con google contactos." })
                }}
                onCancel={() => router.push("/dashboard/contactos")}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}