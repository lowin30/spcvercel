"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Edit } from "lucide-react"
import Link from "next/link"
import { DeleteContacto } from "./delete-contacto"

interface Contacto {
  id: string
  nombre: string
  apellido: string
  email: string
  telefono: string
  edificioId: string
  departamentoId: string
}

interface ContactosListProps {
  initialContactos: Contacto[]
  userRole: string
  administradores: string[]
  edificios: { id: string; nombre: string }[]
  departamentos?: { id: string; nombre: string }[]
}

export function ContactosList({
  initialContactos,
  userRole,
  administradores,
  edificios,
  departamentos = [],
}: ContactosListProps) {
  const [contactos, setContactos] = useState<Contacto[]>(initialContactos)
  const [searchTerm, setSearchTerm] = useState("")
  const [edificioFilter, setEdificioFilter] = useState("")
  const [departamentoFilter, setDepartamentoFilter] = useState("")

  useEffect(() => {
    setContactos(initialContactos)
  }, [initialContactos])

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value)
  }

  const handleEdificioFilter = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setEdificioFilter(event.target.value)
  }

  const handleDepartamentoFilter = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setDepartamentoFilter(event.target.value)
  }

  const filteredContactos = contactos.filter((contacto) => {
    const searchMatch =
      contacto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contacto.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contacto.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contacto.telefono.toLowerCase().includes(searchTerm.toLowerCase())

    const edificioMatch = edificioFilter === "" || contacto.edificioId === edificioFilter
    const departamentoMatch = departamentoFilter === "" || contacto.departamentoId === departamentoFilter

    return searchMatch && edificioMatch && departamentoMatch
  })

  const canEdit = userRole === "admin" || userRole === "supervisor"
  const canDelete = userRole === "admin"

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por nombre, apellido, email o teléfono"
          className="border rounded p-2 w-full"
          value={searchTerm}
          onChange={handleSearch}
        />
      </div>

      <div className="mb-4 flex space-x-2">
        <div>
          <label htmlFor="edificioFilter" className="block text-sm font-medium text-gray-700">
            Edificio:
          </label>
          <select
            id="edificioFilter"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            value={edificioFilter}
            onChange={handleEdificioFilter}
          >
            <option value="">Todos los edificios</option>
            {edificios.map((edificio) => (
              <option key={edificio.id} value={edificio.id}>
                {edificio.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="departamentoFilter" className="block text-sm font-medium text-gray-700">
            Departamento:
          </label>
          <select
            id="departamentoFilter"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            value={departamentoFilter}
            onChange={handleDepartamentoFilter}
          >
            <option value="">Todos los departamentos</option>
            {departamentos.map((departamento) => (
              <option key={departamento.id} value={departamento.id}>
                {departamento.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Apellido</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredContactos.length > 0 ? (
            filteredContactos.map((contacto) => (
              <tr key={contacto.id}>
                <td className="px-6 py-4 whitespace-nowrap">{contacto.nombre}</td>
                <td className="px-6 py-4 whitespace-nowrap">{contacto.apellido}</td>
                <td className="px-6 py-4 whitespace-nowrap">{contacto.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">{contacto.telefono}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    {canEdit && (
                      <Link href={`/dashboard/contactos/${contacto.id}/editar`}>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                    {canDelete && <DeleteContacto 
                      contactoId={typeof contacto.id === 'number' ? contacto.id : parseInt(contacto.id) || contacto.id} 
                      contactoNombre={`${contacto.nombre || ''} ${contacto.apellido || ''}`} 
                    />}
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="px-6 py-4 whitespace-nowrap text-center">
                No se encontraron resultados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
