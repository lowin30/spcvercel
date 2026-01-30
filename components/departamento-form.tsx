"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Phone, Plus, X, Star } from "lucide-react"
import { toast } from "sonner"
import { sanitizeText } from "@/lib/utils"

export interface TelefonoData {
  id?: number
  nombre_contacto: string
  relacion: string
  numero: string
  es_principal: boolean
  notas: string
}

export interface DepartamentoFormData {
  id?: number
  codigo: string
  propietario: string
  notas: string
  telefonos: TelefonoData[]
}

interface DepartamentoFormProps {
  formData: DepartamentoFormData
  onChange: (data: DepartamentoFormData) => void
  onSubmit: () => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  submitLabel?: string
  // Chat Integration Props (SPC v9.5)
  isChatVariant?: boolean
  onSuccess?: () => void
  hidePhones?: boolean
}

export function DepartamentoForm({
  formData,
  onChange,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = "Guardar Departamento",
  isChatVariant = false,
  onSuccess,
  hidePhones = false
}: DepartamentoFormProps) {

  const agregarTelefono = () => {
    onChange({
      ...formData,
      telefonos: [
        ...formData.telefonos,
        {
          nombre_contacto: '',
          relacion: '',
          numero: '',
          es_principal: formData.telefonos.length === 0,
          notas: ''
        }
      ]
    })
  }

  const actualizarTelefono = (index: number, field: keyof TelefonoData, value: any) => {
    const nuevosTelefonos = [...formData.telefonos]
    nuevosTelefonos[index] = {
      ...nuevosTelefonos[index],
      [field]: value
    }
    onChange({ ...formData, telefonos: nuevosTelefonos })
  }

  const marcarTelefonoPrincipal = (index: number) => {
    const nuevosTelefonos = formData.telefonos.map((tel, i) => ({
      ...tel,
      es_principal: i === index
    }))
    onChange({ ...formData, telefonos: nuevosTelefonos })
  }

  const eliminarTelefono = (index: number) => {
    const nuevosTelefonos = formData.telefonos.filter((_, i) => i !== index)
    if (nuevosTelefonos.length > 0 && !nuevosTelefonos.some(t => t.es_principal)) {
      nuevosTelefonos[0].es_principal = true
    }
    onChange({ ...formData, telefonos: nuevosTelefonos })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.codigo) {
      toast.error('El código es requerido')
      return
    }
    await onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} className={isChatVariant ? "space-y-3" : "space-y-4"}>
      {/* ... inputs ... */}
      <div className="space-y-2">
        <Label htmlFor="codigo" className={isChatVariant ? "text-xs font-medium" : "text-sm font-medium"}>
          Código <span className="text-destructive">*</span>
        </Label>
        <Input
          id="codigo"
          value={formData.codigo}
          onChange={(e) => onChange({ ...formData, codigo: e.target.value })}
          onBlur={(e) => onChange({ ...formData, codigo: sanitizeText(e.target.value) })}
          placeholder="Ej: 1A, 2B, PB"
          className={isChatVariant ? "h-9" : "h-10"}
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="propietario" className="text-sm font-medium">Propietario</Label>
        <Input
          id="propietario"
          value={formData.propietario}
          onChange={(e) => onChange({ ...formData, propietario: e.target.value })}
          placeholder="Nombre del propietario"
          className="h-10"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notas" className="text-sm font-medium">Notas</Label>
        <Input
          id="notas"
          value={formData.notas}
          onChange={(e) => onChange({ ...formData, notas: e.target.value })}
          placeholder="Información adicional"
          className="h-10"
          disabled={isLoading}
        />
      </div>

      {/* Sección de teléfonos - CONDITIONAL */}
      {hidePhones ? (
        <div className="p-3 bg-blue-50 text-blue-700 text-sm rounded-md border border-builder-200 flex items-center">
          <Phone className="w-4 h-4 mr-2" />
          <span>Los contactos se podrán agregar en el siguiente paso.</span>
        </div>
      ) : (
        <div className="space-y-4 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold flex items-center">
              <Phone className="mr-2 h-4 w-4" />
              Teléfonos de contacto
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={agregarTelefono}
              disabled={isLoading}
            >
              <Plus className="h-4 w-4 mr-1" />
              Añadir
            </Button>
          </div>

          {formData.telefonos.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No hay teléfonos agregados
            </p>
          )}

          {formData.telefonos.map((telefono, index) => (
            <div
              key={index}
              className="p-3 border border-border rounded-lg bg-muted/20 dark:bg-muted/10 space-y-3"
            >
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor={`telefono-nombre-${index}`} className="text-xs">
                      Nombre del contacto
                    </Label>
                    <Input
                      id={`telefono-nombre-${index}`}
                      value={telefono.nombre_contacto}
                      onChange={(e) => actualizarTelefono(index, 'nombre_contacto', e.target.value)}
                      placeholder="Ej: Juan Pérez"
                      className="h-9"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor={`telefono-relacion-${index}`} className="text-xs">
                      Relación
                    </Label>
                    <Input
                      id={`telefono-relacion-${index}`}
                      value={telefono.relacion}
                      onChange={(e) => actualizarTelefono(index, 'relacion', e.target.value)}
                      placeholder="Ej: Propietario, Encargado"
                      className="h-9"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor={`telefono-numero-${index}`} className="text-xs">
                      Número
                    </Label>
                    <Input
                      id={`telefono-numero-${index}`}
                      value={telefono.numero}
                      onChange={(e) => actualizarTelefono(index, 'numero', e.target.value.replace(/\D/g, ''))}
                      placeholder="Solo números (ej: 5491150055262)"
                      className="h-9"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor={`telefono-notas-${index}`} className="text-xs">
                      Notas
                    </Label>
                    <Input
                      id={`telefono-notas-${index}`}
                      value={telefono.notas}
                      onChange={(e) => actualizarTelefono(index, 'notas', e.target.value)}
                      placeholder="Información adicional"
                      className="h-9"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`telefono-principal-${index}`}
                    checked={telefono.es_principal}
                    onChange={() => marcarTelefonoPrincipal(index)}
                    className="rounded"
                    disabled={isLoading}
                  />
                  <Label
                    htmlFor={`telefono-principal-${index}`}
                    className="text-sm flex items-center cursor-pointer"
                  >
                    <Star className="h-3 w-3 mr-1 text-amber-500" />
                    Teléfono principal
                  </Label>
                </div>

                {formData.telefonos.length > 1 && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => eliminarTelefono(index)}
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Eliminar
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full sm:flex-1"
        >
          {isLoading ? "Guardando..." : submitLabel}
        </Button>
      </div>
    </form>
  )
}
