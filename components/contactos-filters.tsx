"use client"

import type React from "react"

import { useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ContactosFiltersProps {
  administradores: { id: number; nombre: string }[]
  edificios: { id: number; nombre: string }[]
  departamentos: { id: number; nombre: string }[]
  filters: {
    tipoPadre: string
    idPadre: string
  }
  setFilters: React.Dispatch<
    React.SetStateAction<{
      tipoPadre: string
      idPadre: string
    }>
  >
}

export function ContactosFilters({
  administradores,
  edificios,
  departamentos,
  filters,
  setFilters,
}: ContactosFiltersProps) {
  // Resetear el id_padre cuando cambia el tipo_padre
  useEffect(() => {
    if (filters.tipoPadre) {
      setFilters((prev) => ({ ...prev, idPadre: "" }))
    }
  }, [filters.tipoPadre, setFilters])

  // Obtener las opciones para el segundo select según el tipo seleccionado
  const getOptions = () => {
    switch (filters.tipoPadre) {
      case "administrador":
        return administradores
      case "edificio":
        return edificios
      case "departamento":
        return departamentos
      default:
        return []
    }
  }

  const options = getOptions()

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Select
        value={filters.tipoPadre}
        onValueChange={(value) => setFilters((prev) => ({ ...prev, tipoPadre: value }))}
      >
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Tipo de entidad" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="administrador">Administrador</SelectItem>
          <SelectItem value="edificio">Edificio</SelectItem>
          <SelectItem value="departamento">Departamento</SelectItem>
        </SelectContent>
      </Select>

      {filters.tipoPadre && filters.tipoPadre !== "all" && (
        <Select value={filters.idPadre} onValueChange={(value) => setFilters((prev) => ({ ...prev, idPadre: value }))}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder={`Seleccionar ${filters.tipoPadre}`} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {options.map((option) => (
              <SelectItem key={option.id} value={option.id.toString()}>
                {option.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
