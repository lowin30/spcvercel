"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileEdit, Phone, Mail, Building, User, Home, FileText, Loader2 } from "lucide-react"
import { DeleteContacto } from "@/components/delete-contacto"

// Define interfaces for better type safety
interface UserDetails {
  rol: string;
}

interface Contacto {
  id: number;
  nombre: string;
  telefono: string;
  email: string;
  tipo_padre: string;
  id_padre: number;
}

interface Tarea {
  id: number;
  descripcion: string;
  estado: string;
}

interface InitialData {
  contacto: Contacto;
  administradores: { id: number; nombre: string }[];
  edificios: { id: number; nombre: string }[];
  departamentos: { id: number; nombre: string }[];
  tareas: Tarea[];
  userDetails: UserDetails;
}

interface ContactoDetailClientProps {
  initialData: InitialData;
  contactoId: string;
}

export default function ContactoDetailClient({ initialData, contactoId }: ContactoDetailClientProps) {
  // Data is received as props, no need for local fetching state
  const { contacto, administradores, edificios, departamentos, tareas, userDetails } = initialData

  // Get parent name based on tipo_padre and id_padre
  const getParentName = (tipo: string, id: number) => {
    switch (tipo) {
      case "administrador":
        return administradores.find(a => a.id === id)?.nombre || "N/A"
      case "edificio":
        return edificios.find(e => e.id === id)?.nombre || "N/A"
      case "departamento":
        return departamentos.find(d => d.id === id)?.nombre || "N/A"
      default:
        return "N/A"
    }
  }

  if (!contacto) {
    return <div className="text-red-500">No se pudo cargar la información del contacto.</div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="h-6 w-6" />
                {contacto.nombre}
              </CardTitle>
              <CardDescription>Detalles del Contacto</CardDescription>
            </div>
            <div className="flex gap-2">
              {(userDetails.rol === "admin" || userDetails.rol === "supervisor") && (
                <Link href={`/dashboard/contactos/${contacto.id}/edit`}>
                  <Button variant="outline" size="icon">
                    <FileEdit className="h-4 w-4" />
                  </Button>
                </Link>
              )}
              {userDetails.rol === "admin" && <DeleteContacto contactoId={contacto.id} contactoNombre={contacto.nombre} />}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-gray-500" />
              <span>{contacto.telefono || "No disponible"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-gray-500" />
              <span>{contacto.email || "No disponible"}</span>
            </div>
            <div className="flex items-center gap-2">
              {contacto.tipo_padre === "administrador" ? <Building className="h-5 w-5 text-gray-500" /> : <Home className="h-5 w-5 text-gray-500" />}
              <span>
                {getParentName(contacto.tipo_padre, contacto.id_padre)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Tareas Asignadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tareas.length > 0 ? (
            <ul className="space-y-2">
              {tareas.map(tarea => (
                <li key={tarea.id} className="p-2 border rounded-md flex justify-between items-center">
                  <span>{tarea.descripcion}</span>
                  <span className="text-sm font-medium px-2 py-1 rounded-full bg-gray-200 text-gray-700">
                    {tarea.estado}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p>No hay tareas asignadas a este contacto.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
