"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useSupabase } from "@/lib/supabase-provider"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Plus, Star, Phone, Edit, Trash, ChevronDown, ChevronUp } from "lucide-react"
import { cleanCuit } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

interface Administrador {
  id: number
  nombre: string
}

interface Telefono {
  id: number;
  departamento_id: number;
  numero: string;
  nombre_contacto: string;
  es_principal: boolean;
  relacion: string;
  notas: string;
}

interface Departamento {
  id?: number;
  edificio_id: number;
  codigo: string;
  propietario: string;
  notas: string;
  telefonos?: Telefono[];
}

interface Edificio {
  id: number
  nombre: string
  direccion: string
  mapa_url: string | null
  id_administrador: number
  estado: string
  latitud: number | null
  longitud: number | null
  cuit: string | null
  departamentos?: Departamento[]
}

interface EditBuildingFormProps {
  edificio: Edificio
  administradores: Administrador[]
}

export function EditBuildingForm({ edificio, administradores }: EditBuildingFormProps) {
  const [nombre, setNombre] = useState(edificio.nombre)
  const [direccion, setDireccion] = useState(edificio.direccion)
  const [mapaUrl, setMapaUrl] = useState(edificio.mapa_url || "")
  const [idAdministrador, setIdAdministrador] = useState(edificio.id_administrador.toString())
  const [estado, setEstado] = useState(edificio.estado)
  const [latitud, setLatitud] = useState(edificio.latitud?.toString() || "")
  const [longitud, setLongitud] = useState(edificio.longitud?.toString() || "")
  const [cuit, setCuit] = useState(edificio.cuit || "")
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Estados para gestión de departamentos
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [cargandoDepartamentos, setCargandoDepartamentos] = useState(false)
  const [departamentosDialogOpen, setDepartamentosDialogOpen] = useState(false)
  const [nuevoDepartamento, setNuevoDepartamento] = useState({ codigo: "", propietario: "", notas: "" })
  const [creandoDepartamento, setCreandoDepartamento] = useState(false)
  
  // Estados para gestión de teléfonos
  const [telefonoDialogOpen, setTelefonoDialogOpen] = useState(false)
  const [departamentoSeleccionado, setDepartamentoSeleccionado] = useState<number | null>(null)
  const [nuevoTelefono, setNuevoTelefono] = useState({
    numero: "",
    nombre_contacto: "",
    es_principal: false,
    relacion: "",
    notas: ""
  })
  const [editandoTelefono, setEditandoTelefono] = useState<number | null>(null)
  const [procesandoTelefono, setProcesandoTelefono] = useState(false)

  const { supabase } = useSupabase()
  const { toast } = useToast()
  const router = useRouter()
  
  // Función para ordenar departamentos (porterías primero, plantas bajas después, orden alfabético)
  const ordenarDepartamentos = (deptos: Departamento[]) => {
    return [...deptos].sort((a, b) => {
      const codA = a.codigo.toLowerCase();
      const codB = b.codigo.toLowerCase();
      
      // Porterías primero
      if (codA.includes('porter') && !codB.includes('porter')) return -1;
      if (!codA.includes('porter') && codB.includes('porter')) return 1;
      
      // Plantas bajas después
      if (codA.includes('pb') && !codB.includes('pb')) return -1;
      if (!codA.includes('pb') && codB.includes('pb')) return 1;
      
      // Orden alfanumérico
      return codA.localeCompare(codB, 'es', { numeric: true });
    });
  };
  
  // Cargar departamentos y teléfonos cuando cambia el id del edificio
  useEffect(() => {
    const cargarDepartamentos = async () => {
      if (!edificio.id) return;
      
      setCargandoDepartamentos(true);
      try {
        // Consultar departamentos
        const { data: departamentosData, error: departamentosError } = await supabase
          .from("departamentos")
          .select('id, codigo, propietario, notas, edificio_id')
          .eq("edificio_id", edificio.id);
        
        if (departamentosError) {
          console.error("Error cargando departamentos:", departamentosError.message);
          toast({
            title: "Advertencia",
            description: "Hubo un problema al cargar los departamentos.",
            variant: "destructive"
          });
          setDepartamentos([]);
          setCargandoDepartamentos(false);
          return;
        }
        
        if (!departamentosData || departamentosData.length === 0) {
          setDepartamentos([]);
          setCargandoDepartamentos(false);
          return;
        }
        
        // Obtener todos los IDs de departamentos
        const idsDepartamentos = departamentosData.map((d) => d.id);
        
        // Consultar todos los teléfonos de estos departamentos
        const { data: telefonosData, error: telefonosError } = await supabase
          .from("telefonos_departamento")
          .select('*')
          .in("departamento_id", idsDepartamentos);
        
        if (telefonosError) {
          console.error("Error cargando teléfonos:", telefonosError.message);
          // Continuamos sin teléfonos
          setDepartamentos(departamentosData);
        } else {
          // Asignar teléfonos a sus departamentos correspondientes
          const departamentosConTelefonos = departamentosData.map((depto) => ({
            ...depto,
            telefonos: telefonosData?.filter((tel) => tel.departamento_id === depto.id) || []
          }));
          
          setDepartamentos(departamentosConTelefonos);
        }
      } catch (error) {
        console.error("Error inesperado cargando departamentos:", error);
        toast({
          title: "Error",
          description: "Ocurrió un error al cargar los departamentos",
          variant: "destructive",
        });
      } finally {
        setCargandoDepartamentos(false);
      }
    };
    
    cargarDepartamentos();
  }, [edificio.id, supabase, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nombre.trim() || !direccion.trim() || !idAdministrador) {
      toast({
        title: "Error",
        description: "Por favor completa los campos requeridos",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const { error } = await supabase
        .from("edificios")
        .update({
          nombre,
          direccion,
          mapa_url: mapaUrl || null,
          id_administrador: Number.parseInt(idAdministrador),
          estado,
          latitud: latitud ? Number.parseFloat(latitud) : null,
          longitud: longitud ? Number.parseFloat(longitud) : null,
          cuit: cuit ? cleanCuit(cuit) : null,
        })
        .eq("id", edificio.id)

      if (error) {
        throw new Error(error.message)
      }

      toast({
        title: "Edificio actualizado",
        description: "El edificio ha sido actualizado correctamente",
      })

      router.push(`/dashboard/edificios/${edificio.id}`)
      router.refresh()
    } catch (error) {
      console.error("Error al actualizar edificio:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el edificio",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Información del Edificio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre *</Label>
            <Input
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre del edificio"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="direccion">Dirección *</Label>
            <Textarea
              id="direccion"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Dirección completa"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cuit">CUIT</Label>
            <Input
              id="cuit"
              value={cuit}
              onChange={(e) => setCuit(e.target.value)}
              placeholder="30-70792457-4"
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">Se almacenará sin guiones ni espacios (ej: 707924574)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="administrador">Administrador *</Label>
            <Select value={idAdministrador} onValueChange={setIdAdministrador} disabled={isSubmitting} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un administrador" />
              </SelectTrigger>
              <SelectContent>
                {administradores.map((admin) => (
                  <SelectItem key={admin.id} value={admin.id.toString()}>
                    {admin.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="estado">Estado</Label>
            <Select value={estado} onValueChange={setEstado} disabled={isSubmitting}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="activo">Activo</SelectItem>
                <SelectItem value="en_obra">En Obra</SelectItem>
                <SelectItem value="finalizado">Finalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mapaUrl">URL del Mapa (opcional)</Label>
            <Input
              id="mapaUrl"
              value={mapaUrl}
              onChange={(e) => setMapaUrl(e.target.value)}
              placeholder="https://maps.google.com/?q=..."
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="latitud">Latitud (opcional)</Label>
              <Input
                id="latitud"
                value={latitud}
                onChange={(e) => setLatitud(e.target.value)}
                placeholder="-34.6037"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitud">Longitud (opcional)</Label>
              <Input
                id="longitud"
                value={longitud}
                onChange={(e) => setLongitud(e.target.value)}
                placeholder="-58.3816"
                disabled={isSubmitting}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/dashboard/edificios/${edificio.id}`)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Guardar Cambios
          </Button>
        </CardFooter>
      </Card>
      
      {/* Sección de Departamentos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Departamentos</CardTitle>
          <div className="flex gap-2">
            <Dialog open={departamentosDialogOpen} onOpenChange={setDepartamentosDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="flex items-center gap-1">
                  <Plus className="h-4 w-4" />
                  <span className="hidden md:inline">Agregar departamento</span>
                  <span className="md:hidden">Agregar</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Departamento</DialogTitle>
                  <DialogDescription>
                    Complete los datos para crear un nuevo departamento
                  </DialogDescription>
                </DialogHeader>
                
                {edificio?.id && (
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label htmlFor="codigo">Código *</Label>
                      <Input 
                        id="codigo" 
                        value={nuevoDepartamento.codigo} 
                        onChange={(e) => setNuevoDepartamento({...nuevoDepartamento, codigo: e.target.value})}
                        placeholder="Ej: 1A, 2B, PB"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="propietario">Propietario</Label>
                      <Input 
                        id="propietario" 
                        value={nuevoDepartamento.propietario} 
                        onChange={(e) => setNuevoDepartamento({...nuevoDepartamento, propietario: e.target.value})}
                        placeholder="Nombre del propietario"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="notas">Notas</Label>
                      <Textarea 
                        id="notas" 
                        value={nuevoDepartamento.notas} 
                        onChange={(e) => setNuevoDepartamento({...nuevoDepartamento, notas: e.target.value})}
                        placeholder="Información adicional"
                        rows={2}
                      />
                    </div>
                    
                    <DialogFooter>
                      <Button 
                        type="button" 
                        disabled={!nuevoDepartamento.codigo || creandoDepartamento} 
                        onClick={async () => {
                          if (!nuevoDepartamento.codigo || !edificio.id) return;
                          
                          setCreandoDepartamento(true);
                          
                          try {
                            const { data, error } = await supabase
                              .from("departamentos")
                              .insert({
                                edificio_id: edificio.id,
                                codigo: nuevoDepartamento.codigo,
                                propietario: nuevoDepartamento.propietario || null,
                                notas: nuevoDepartamento.notas || null
                              })
                              .select();
                              
                            if (error) throw error;
                            
                            toast({
                              title: "Departamento creado",
                              description: `El departamento ${nuevoDepartamento.codigo} ha sido creado correctamente`,
                            });
                            
                            // Actualizar la lista de departamentos
                            if (data && data[0]) {
                              setDepartamentos([...departamentos, { ...data[0], telefonos: [] }]);
                            }
                            
                            // Resetear formulario y cerrar diálogo
                            setNuevoDepartamento({ codigo: "", propietario: "", notas: "" });
                            setDepartamentosDialogOpen(false);
                            
                          } catch (error: any) {
                            console.error("Error al crear departamento:", error);
                            toast({
                              title: "Error al crear departamento",
                              description: error.message || "Ha ocurrido un error al crear el departamento",
                              variant: "destructive",
                            });
                          } finally {
                            setCreandoDepartamento(false);
                          }
                        }}
                      >
                        {creandoDepartamento ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creando...
                          </>
                        ) : "Crear departamento"}
                      </Button>
                    </DialogFooter>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          {cargandoDepartamentos ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : departamentos.length > 0 ? (
            <Accordion type="multiple" className="w-full">
              {ordenarDepartamentos(departamentos).map((depto: Departamento) => {
                const tieneTelefonoPrincipal = depto.telefonos?.some((tel) => tel.es_principal);
                const cantidadTelefonos = depto.telefonos?.length || 0;
                
                return (
                  <AccordionItem key={depto.id} value={`depto-${depto.id}`} className="border rounded-md mb-2 overflow-hidden">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
                      <div className="flex items-center w-full justify-between mr-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{depto.codigo}</span>
                          {tieneTelefonoPrincipal && <Badge className="bg-green-500"><Star className="h-3 w-3 mr-1" /> Principal</Badge>}
                          {cantidadTelefonos > 0 && <Badge variant="outline" className="text-xs"><Phone className="h-3 w-3 mr-1" /> {cantidadTelefonos}</Badge>}
                        </div>
                        <div className="text-sm text-muted-foreground truncate max-w-[150px]">
                          {depto.propietario || "Sin propietario"}
                        </div>
                      </div>
                    </AccordionTrigger>
                    
                    <AccordionContent className="px-4 pb-3 pt-0">
                      <div className="space-y-3">
                        {/* Detalles del departamento */}
                        <div className="border-b pb-2">
                          {depto.propietario && <p className="text-sm"><span className="font-medium">Propietario:</span> {depto.propietario}</p>}
                          {depto.notas && <p className="text-sm mt-1"><span className="font-medium">Notas:</span> {depto.notas}</p>}
                          <div className="mt-2 flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-8 w-8 p-1 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                
                                if (confirm(`¿Está seguro que desea eliminar el departamento ${depto.codigo}?\nEsta acción eliminará también todos los teléfonos asociados.`)) {
                                  try {
                                    const { error } = await supabase
                                      .from("departamentos")
                                      .delete()
                                      .eq("id", depto.id);
                                      
                                    if (error) throw error;
                                    
                                    toast({
                                      title: "Departamento eliminado",
                                      description: "El departamento ha sido eliminado correctamente",
                                    });
                                    
                                    // Actualizar la lista local
                                    setDepartamentos(departamentos.filter(d => d.id !== depto.id));
                                    
                                  } catch (error: any) {
                                    console.error("Error al eliminar departamento:", error);
                                    toast({
                                      title: "Error al eliminar departamento",
                                      description: error.message || "Ha ocurrido un error al eliminar el departamento",
                                      variant: "destructive",
                                    });
                                  }
                                }
                              }}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Sección de teléfonos */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium">Teléfonos</h4>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 px-2 text-xs" 
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setDepartamentoSeleccionado(depto.id as number);
                                setEditandoTelefono(null);
                                setNuevoTelefono({
                                  numero: "",
                                  nombre_contacto: "",
                                  es_principal: false,
                                  relacion: "",
                                  notas: ""
                                });
                                setTelefonoDialogOpen(true);
                              }}
                            >
                              <Plus className="h-3 w-3 mr-1" /> Agregar
                            </Button>
                          </div>
                          
                          {depto.telefonos && depto.telefonos.length > 0 ? (
                            <div className="space-y-2">
                              {depto.telefonos.map((tel: Telefono) => (
                                <div key={tel.id} className={`flex items-start justify-between p-2 rounded-md ${tel.es_principal ? 'bg-green-50 border border-green-100' : 'bg-gray-50 border border-gray-100'}`}>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1">
                                      {tel.es_principal && <Star className="h-3 w-3 text-green-500" />}
                                      <span className="font-medium">{tel.numero}</span>
                                    </div>
                                    {tel.nombre_contacto && (
                                      <p className="text-xs text-muted-foreground">
                                        {tel.nombre_contacto} 
                                        {tel.relacion && <span className="text-xs"> ({tel.relacion})</span>}
                                      </p>
                                    )}
                                    {tel.notas && <p className="text-xs italic text-muted-foreground">{tel.notas}</p>}
                                  </div>
                                  
                                  <div className="flex gap-1">
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setDepartamentoSeleccionado(depto.id as number);
                                        setEditandoTelefono(tel.id);
                                        setNuevoTelefono({
                                          numero: tel.numero || "",
                                          nombre_contacto: tel.nombre_contacto || "",
                                          es_principal: tel.es_principal || false,
                                          relacion: tel.relacion || "",
                                          notas: tel.notas || ""
                                        });
                                        setTelefonoDialogOpen(true);
                                      }}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                      onClick={async (e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        
                                        if (confirm(`¿Está seguro que desea eliminar este teléfono?`)) {
                                          try {
                                            const { error } = await supabase
                                              .from("telefonos_departamento")
                                              .delete()
                                              .eq("id", tel.id);
                                              
                                            if (error) throw error;
                                            
                                            toast({
                                              title: "Teléfono eliminado",
                                              description: "El teléfono ha sido eliminado correctamente",
                                            });
                                            
                                            // Actualizar la lista local
                                            const departamentosActualizados = departamentos.map(d => {
                                              if (d.id === depto.id) {
                                                return {
                                                  ...d,
                                                  telefonos: (d.telefonos || []).filter(t => t.id !== tel.id)
                                                };
                                              }
                                              return d;
                                            });
                                            setDepartamentos(departamentosActualizados);
                                            
                                          } catch (error: any) {
                                            console.error("Error al eliminar teléfono:", error);
                                            toast({
                                              title: "Error al eliminar teléfono",
                                              description: error.message || "Ha ocurrido un error al eliminar el teléfono",
                                              variant: "destructive",
                                            });
                                          }
                                        }
                                      }}
                                    >
                                      <Trash className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">No hay teléfonos registrados para este departamento.</p>
                          )}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          ) : (
            <p className="text-sm text-muted-foreground mb-2">
              No hay departamentos registrados. Haga clic en "Agregar departamento" para añadir nuevos departamentos.
            </p>
          )}
        </CardContent>
      </Card>
      
      {/* Modal para gestionar teléfonos */}
      <Dialog open={telefonoDialogOpen} onOpenChange={setTelefonoDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editandoTelefono ? "Editar Teléfono" : "Agregar Nuevo Teléfono"}
            </DialogTitle>
            <DialogDescription>
              {editandoTelefono 
                ? "Modifique la información del teléfono seleccionado" 
                : "Complete los datos para agregar un nuevo teléfono"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="numero">Número de Teléfono *</Label>
              <Input 
                id="numero" 
                value={nuevoTelefono.numero} 
                onChange={(e) => setNuevoTelefono({...nuevoTelefono, numero: e.target.value})}
                placeholder="Ej: 555-123-4567"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="nombre_contacto">Nombre del Contacto</Label>
              <Input 
                id="nombre_contacto" 
                value={nuevoTelefono.nombre_contacto} 
                onChange={(e) => setNuevoTelefono({...nuevoTelefono, nombre_contacto: e.target.value})}
                placeholder="Nombre de la persona"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="relacion">Relación</Label>
              <Input 
                id="relacion" 
                value={nuevoTelefono.relacion} 
                onChange={(e) => setNuevoTelefono({...nuevoTelefono, relacion: e.target.value})}
                placeholder="Ej: Propietario, Inquilino, Familiar"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="es_principal" 
                checked={nuevoTelefono.es_principal}
                onCheckedChange={(checked) => 
                  setNuevoTelefono({...nuevoTelefono, es_principal: checked as boolean})
                }
              />
              <Label 
                htmlFor="es_principal" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Marcar como teléfono principal
              </Label>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notas">Notas</Label>
              <Textarea 
                id="notas" 
                value={nuevoTelefono.notas} 
                onChange={(e) => setNuevoTelefono({...nuevoTelefono, notas: e.target.value})}
                placeholder="Información adicional"
                rows={2}
              />
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                disabled={!nuevoTelefono.numero || procesandoTelefono} 
                onClick={async () => {
                  if (!nuevoTelefono.numero || !departamentoSeleccionado) return;
                  
                  setProcesandoTelefono(true);
                  
                  try {
                    if (editandoTelefono) {
                      // Actualizar teléfono existente
                      const { error } = await supabase
                        .from("telefonos_departamento")
                        .update({
                          numero: nuevoTelefono.numero,
                          nombre_contacto: nuevoTelefono.nombre_contacto || null,
                          es_principal: nuevoTelefono.es_principal,
                          relacion: nuevoTelefono.relacion || null,
                          notas: nuevoTelefono.notas || null
                        })
                        .eq("id", editandoTelefono);
                        
                      if (error) throw error;
                      
                      toast({
                        title: "Teléfono actualizado",
                        description: `El teléfono ha sido actualizado correctamente`,
                      });
                      
                      // Actualizar la lista local
                      const departamentosActualizados = departamentos.map(d => {
                        if (d.id === departamentoSeleccionado) {
                          return {
                            ...d,
                            telefonos: (d.telefonos || []).map(t => 
                              t.id === editandoTelefono ? {
                                ...t,
                                numero: nuevoTelefono.numero,
                                nombre_contacto: nuevoTelefono.nombre_contacto || null,
                                es_principal: nuevoTelefono.es_principal,
                                relacion: nuevoTelefono.relacion || null,
                                notas: nuevoTelefono.notas || null
                              } : t
                            )
                          };
                        }
                        return d;
                      });
                      setDepartamentos(departamentosActualizados);
                      
                    } else {
                      // Crear nuevo teléfono
                      const { data, error } = await supabase
                        .from("telefonos_departamento")
                        .insert({
                          departamento_id: departamentoSeleccionado,
                          numero: nuevoTelefono.numero,
                          nombre_contacto: nuevoTelefono.nombre_contacto || null,
                          es_principal: nuevoTelefono.es_principal,
                          relacion: nuevoTelefono.relacion || null,
                          notas: nuevoTelefono.notas || null
                        })
                        .select();
                        
                      if (error) throw error;
                      
                      toast({
                        title: "Teléfono agregado",
                        description: `El teléfono ha sido agregado correctamente`,
                      });
                      
                      // Actualizar la lista local
                      if (data && data[0]) {
                        const departamentosActualizados = departamentos.map(d => {
                          if (d.id === departamentoSeleccionado) {
                            return {
                              ...d,
                              telefonos: [...(d.telefonos || []), data[0]]
                            };
                          }
                          return d;
                        });
                        setDepartamentos(departamentosActualizados);
                      }
                    }
                    
                    // Resetear formulario y cerrar diálogo
                    setNuevoTelefono({
                      numero: "",
                      nombre_contacto: "",
                      es_principal: false,
                      relacion: "",
                      notas: ""
                    });
                    setTelefonoDialogOpen(false);
                    setEditandoTelefono(null);
                    setDepartamentoSeleccionado(null);
                    
                  } catch (error: any) {
                    console.error("Error al gestionar teléfono:", error);
                    toast({
                      title: `Error al ${editandoTelefono ? 'actualizar' : 'agregar'} teléfono`,
                      description: error.message || `Ha ocurrido un error al ${editandoTelefono ? 'actualizar' : 'agregar'} el teléfono`,
                      variant: "destructive",
                    });
                  } finally {
                    setProcesandoTelefono(false);
                  }
                }}
              >
                {procesandoTelefono ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : editandoTelefono ? "Guardar cambios" : "Agregar teléfono"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </form>
  )
}
