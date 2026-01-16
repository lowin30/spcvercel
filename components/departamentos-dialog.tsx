"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Building2, Phone, Edit2, Loader2, Star } from "lucide-react"
import { createClient } from "@/lib/supabase-client"
import { DepartamentoForm, DepartamentoFormData, TelefonoData } from "@/components/departamento-form"
import { toast } from "sonner"

interface Departamento {
  id: number
  codigo: string
  propietario: string | null
  notas: string | null
  telefonos: TelefonoData[]
}

interface DepartamentosDialogProps {
  edificioId: number
  edificioNombre: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onDepartamentosUpdated?: () => void
}

export function DepartamentosDialog({
  edificioId,
  edificioNombre,
  open,
  onOpenChange,
  onDepartamentosUpdated
}: DepartamentosDialogProps) {
  const supabase = createClient()
  
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  
  const [formData, setFormData] = useState<DepartamentoFormData>({
    codigo: '',
    propietario: '',
    notas: '',
    telefonos: []
  })

  const fetchDepartamentos = async () => {
    setLoading(true)
    try {
      const { data: deptosData, error: deptosError } = await supabase
        .from('departamentos')
        .select('id, codigo, propietario, notas')
        .eq('edificio_id', edificioId)
        .order('codigo', { ascending: true })

      if (deptosError) throw deptosError

      if (deptosData) {
        const deptosConTelefonos = await Promise.all(
          deptosData.map(async (depto) => {
            const { data: telefonosData } = await supabase
              .from('telefonos_departamento')
              .select('id, numero, nombre_contacto, relacion, es_principal, notas')
              .eq('departamento_id', depto.id)
              .order('es_principal', { ascending: false })

            return {
              ...depto,
              telefonos: telefonosData || []
            }
          })
        )
        
        setDepartamentos(deptosConTelefonos)
      }
    } catch (error: any) {
      console.error('Error cargando departamentos:', error)
      toast.error('No se pudieron cargar los departamentos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && edificioId) {
      fetchDepartamentos()
    } else if (!open) {
      // Limpiar formulario cuando se cierra el diálogo
      limpiarFormulario()
    }
  }, [open, edificioId])

  const limpiarFormulario = () => {
    setFormData({
      codigo: '',
      propietario: '',
      notas: '',
      telefonos: []
    })
    setEditandoId(null)
  }

  const handleEditarDepartamento = (depto: Departamento) => {
    setFormData({
      id: depto.id,
      codigo: depto.codigo,
      propietario: depto.propietario || '',
      notas: depto.notas || '',
      telefonos: depto.telefonos
    })
    setEditandoId(depto.id)
    
    const formElement = document.getElementById('departamento-form-section')
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleGuardarDepartamento = async () => {
    setSaving(true)
    try {
      if (editandoId) {
        const { error: updateError } = await supabase
          .from('departamentos')
          .update({
            codigo: formData.codigo,
            propietario: formData.propietario || null,
            notas: formData.notas || null
          })
          .eq('id', editandoId)

        if (updateError) throw updateError

        const { error: deleteTelError } = await supabase
          .from('telefonos_departamento')
          .delete()
          .eq('departamento_id', editandoId)

        if (deleteTelError) throw deleteTelError

        if (formData.telefonos.length > 0) {
          const telefonosInsert = formData.telefonos.map(tel => ({
            departamento_id: editandoId,
            numero: tel.numero,
            nombre_contacto: tel.nombre_contacto || null,
            relacion: tel.relacion || null,
            es_principal: tel.es_principal,
            notas: tel.notas || null
          }))

          const { error: insertTelError } = await supabase
            .from('telefonos_departamento')
            .insert(telefonosInsert)

          if (insertTelError) throw insertTelError
        }

        toast.success('Departamento actualizado correctamente')
      } else {
        const { data: newDepto, error: insertError } = await supabase
          .from('departamentos')
          .insert({
            edificio_id: edificioId,
            codigo: formData.codigo,
            propietario: formData.propietario || null,
            notas: formData.notas || null
          })
          .select()
          .single()

        if (insertError) throw insertError

        if (formData.telefonos.length > 0 && newDepto) {
          const telefonosInsert = formData.telefonos.map(tel => ({
            departamento_id: newDepto.id,
            numero: tel.numero,
            nombre_contacto: tel.nombre_contacto || null,
            relacion: tel.relacion || null,
            es_principal: tel.es_principal,
            notas: tel.notas || null
          }))

          const { error: insertTelError } = await supabase
            .from('telefonos_departamento')
            .insert(telefonosInsert)

          if (insertTelError) throw insertTelError
        }

        toast.success('Departamento creado correctamente')
      }

      limpiarFormulario()
      fetchDepartamentos()
      if (onDepartamentosUpdated) {
        onDepartamentosUpdated()
      }
    } catch (error: any) {
      console.error('Error guardando departamento:', error)
      toast.error('Error al guardar el departamento')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Building2 className="h-5 w-5" />
            Departamentos de {edificioNombre}
          </DialogTitle>
          <DialogDescription>
            Ver, editar y agregar departamentos del edificio
          </DialogDescription>
        </DialogHeader>

        {/* LISTA DE DEPARTAMENTOS */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              📋 DEPARTAMENTOS ACTUALES ({departamentos.length})
            </h3>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : departamentos.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay departamentos aún</p>
              <p className="text-xs">Agrega el primero usando el formulario abajo</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
              {departamentos.map((depto) => (
                <div
                  key={depto.id}
                  className={`
                    border border-border rounded-lg p-3 
                    hover:bg-muted/50 dark:hover:bg-muted/30 transition-colors
                    ${editandoId === depto.id ? 'bg-primary/10 dark:bg-primary/20 border-primary' : 'bg-card dark:bg-card'}
                  `}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        <span className="font-semibold text-base">{depto.codigo}</span>
                      </div>
                      
                      {depto.propietario && (
                        <p className="text-sm text-muted-foreground pl-6">
                          Propietario: {depto.propietario}
                        </p>
                      )}
                      
                      {depto.notas && (
                        <p className="text-xs text-muted-foreground pl-6 italic">
                          {depto.notas}
                        </p>
                      )}
                      
                      {depto.telefonos.length > 0 && (
                        <div className="space-y-1 pl-6 pt-1">
                          {depto.telefonos.map((tel) => (
                            <a
                              key={tel.id}
                              href={`tel:${tel.numero}`}
                              className="flex items-center gap-2 text-xs hover:text-primary transition-colors group"
                            >
                              <Phone className="h-3 w-3 flex-shrink-0 group-hover:scale-110 transition-transform" />
                              <span className="font-mono">{tel.numero}</span>
                              {tel.nombre_contacto && (
                                <span className="text-muted-foreground">
                                  ({tel.nombre_contacto})
                                </span>
                              )}
                              {tel.es_principal && (
                                <Star className="h-3 w-3 text-amber-500 fill-amber-500 flex-shrink-0" />
                              )}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditarDepartamento(depto)}
                      className="flex-shrink-0"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FORMULARIO */}
        <div className="border-t border-border pt-4" id="departamento-form-section">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            {editandoId ? '✏️ EDITAR DEPARTAMENTO' : '➕ AGREGAR NUEVO DEPARTAMENTO'}
          </h3>
          
          <DepartamentoForm
            formData={formData}
            onChange={setFormData}
            onSubmit={handleGuardarDepartamento}
            onCancel={editandoId ? limpiarFormulario : undefined}
            isLoading={saving}
            submitLabel={editandoId ? 'Actualizar Departamento' : 'Crear Departamento'}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
