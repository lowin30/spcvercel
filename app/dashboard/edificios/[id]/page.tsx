"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { createBrowserSupabaseClient } from "@/lib/supabase-client"
import { cleanPhoneNumber } from "@/lib/utils"
import { formatDate, formatCuit, getEstadoEdificioColor } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import Link from "next/link"
import { Building, MapPin, User, Calendar, ExternalLink, AlertTriangle, Loader2, ArrowLeft, Plus, Phone, Star, Edit, Trash, ChevronDown, ChevronUp, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

interface EdificioPageProps {
  params: {
    id: string
  }
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
  id: number;
  edificio_id: number;
  codigo: string;
  propietario: string;
  notas: string;
  telefonos?: Telefono[];
}

export default function EdificioPage() {
  // Usar hook useParams para obtener el ID de la URL (evita warnings de Next.js)
  const params = useParams();
  const edificioId = params.id as string;

  const [edificio, setEdificio] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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
  const router = useRouter()

  // Función para cargar datos del edificio
  const cargarEdificio = async () => {
    try {
      setLoading(true)
      const supabase = createBrowserSupabaseClient()
      
      if (!supabase) {
        setError("No se pudo inicializar el cliente de Supabase")
        return
      }

      // Verificar sesión de usuario
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push("/login")
        return
      }
      
      // Consulta usando la vista optimizada para datos del edificio
      const { data: edificioData, error: edificioError } = await supabase
        .from("vista_edificios_completa")
        .select('*')
        .eq("id", edificioId)
        .single()
      
      if (edificioError) {
        console.error("Error cargando el edificio:", edificioError.message)
        setError("No se pudo cargar el edificio. Por favor, intente nuevamente.")
        setLoading(false)
        return
      }
      
      // Consulta separada para los departamentos
      const { data: departamentosData, error: departamentosError } = await supabase
        .from("departamentos")
        .select('id, codigo, propietario, notas, edificio_id')
        .eq("edificio_id", edificioId)
      
      if (departamentosError) {
        console.error("Error cargando departamentos:", departamentosError.message)
        toast({
          title: "Advertencia",
          description: "Se cargó el edificio pero hubo un problema al cargar los departamentos.",
          variant: "destructive"
        })
      }
      
      // Cargar teléfonos para todos los departamentos
      let departamentosConTelefonos = departamentosData || [];
      
      if (departamentosData && departamentosData.length > 0) {
        // Obtener todos los IDs de departamentos
        const idsDepartamentos = departamentosData.map((d: any) => d.id);
        
        // Consultar todos los teléfonos de estos departamentos
        const { data: telefonosData, error: telefonosError } = await supabase
          .from("telefonos_departamento")
          .select('*')
          .in("departamento_id", idsDepartamentos);
        
        if (telefonosError) {
          console.error("Error cargando teléfonos:", telefonosError.message);
          toast({
            title: "Advertencia",
            description: "Se cargaron los departamentos pero hubo un problema al cargar los teléfonos.",
            variant: "destructive"
          });
        } else {
          // Asignar teléfonos a sus departamentos correspondientes
          departamentosConTelefonos = departamentosData.map((depto: any) => ({
            ...depto,
            telefonos: telefonosData?.filter((tel: any) => tel.departamento_id === depto.id) || []
          }));
        }
      }
      
      // Combinar los resultados
      const data = {
        ...edificioData,
        departamentos: departamentosConTelefonos
      }

      if (!data) {
        setError("Edificio no encontrado")
        setLoading(false)
        return
      }

      setEdificio(data)
      setLoading(false)
    } catch (error) {
      console.error("Error:", error)
      setError("Ocurrió un error. Por favor, intente nuevamente.")
      setLoading(false)
    }
  }

  // Función para ordenar departamentos según reglas específicas
  const ordenarDepartamentos = (departamentos: any[]) => {
    if (!departamentos) return [];
    
    return [...departamentos].sort((a, b) => {
      const codigoA = a.codigo.toLowerCase();
      const codigoB = b.codigo.toLowerCase();
      
      // Porterías primero
      if (codigoA.startsWith('port') && !codigoB.startsWith('port')) return -1;
      if (!codigoA.startsWith('port') && codigoB.startsWith('port')) return 1;
      
      // Plantas bajas después de porterías
      const esPBA = codigoA.startsWith('pb');
      const esPBB = codigoB.startsWith('pb');
      if (esPBA && !esPBB) return -1;
      if (!esPBA && esPBB) return 1;
      if (esPBA && esPBB) {
        // Si ambos son PB, ordenar por la letra
        return codigoA.localeCompare(codigoB);
      }
      
      // Extraer el número y la letra (si existe) de cada código
      const matchA = codigoA.match(/^(\d+)([a-z]*)$/);
      const matchB = codigoB.match(/^(\d+)([a-z]*)$/);
      
      if (matchA && matchB) {
        const numA = parseInt(matchA[1]);
        const numB = parseInt(matchB[1]);
        
        // Si los números son diferentes, ordenar por número
        if (numA !== numB) {
          return numA - numB;
        }
        
        // Si los números son iguales, ordenar por letra
        const letraA = matchA[2] || '';
        const letraB = matchB[2] || '';
        return letraA.localeCompare(letraB);
      }
      
      // Si no se puede aplicar lógica específica, usar orden alfabético
      return codigoA.localeCompare(codigoB);
    });
  };
  
  // Cargar edificio al iniciar
  useEffect(() => {
    cargarEdificio()
  }, [edificioId, router])
  
  // Renderizar estados de carga y error
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
        <Loader2 className="h-12 w-12 text-primary mb-4 animate-spin" />
        <h1 className="text-2xl font-bold mb-4">Cargando edificio</h1>
        <p className="text-muted-foreground mb-6 text-center">
          Espera un momento mientras cargamos la información...
        </p>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
        <h1 className="text-2xl font-bold mb-4">Error</h1>
        <p className="text-muted-foreground mb-6 text-center">{error}</p>
        <Button asChild>
          <Link href="/dashboard/edificios">Volver a edificios</Link>
        </Button>
      </div>
    )
  }
  
  if (!edificio) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
        <h1 className="text-2xl font-bold mb-4">Edificio no encontrado</h1>
        <p className="text-muted-foreground mb-6">El edificio que estás buscando no existe o ha sido eliminado.</p>
        <Button asChild>
          <Link href="/dashboard/edificios">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a la lista de edificios
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{edificio.nombre}</h1>
        <Badge className={getEstadoEdificioColor(edificio.estado)}>
          {edificio.estado === "en_obra"
            ? "En Obra"
            : edificio.estado.charAt(0).toUpperCase() + edificio.estado.slice(1)}
        </Badge>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Información General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-start">
                <MapPin className="h-5 w-5 mr-2 mt-0.5 text-gray-500" />
                <div>
                  <p className="font-medium">Dirección</p>
                  <p className="text-gray-600 dark:text-gray-400">{edificio.direccion}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-start">
                <User className="h-5 w-5 mr-2 mt-0.5 text-gray-500" />
                <div>
                  <p className="font-medium">Administrador</p>
                  <p className="text-gray-600 dark:text-gray-400">
                    {edificio.nombre_administrador || "Sin administrador"}
                  </p>
                </div>
              </div>
            </div>

            {edificio.cuit && (
              <div className="space-y-2">
                <div className="flex items-start">
                  <Building className="h-5 w-5 mr-2 mt-0.5 text-gray-500" />
                  <div>
                    <p className="font-medium">CUIT</p>
                    <p className="text-gray-600 dark:text-gray-400">{formatCuit(edificio.cuit)}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-start">
                <Calendar className="h-5 w-5 mr-2 mt-0.5 text-gray-500" />
                <div>
                  <p className="font-medium">Fecha de creación</p>
                  <p className="text-gray-600 dark:text-gray-400">{formatDate(edificio.created_at)}</p>
                </div>
              </div>
            </div>
          </div>

          {edificio.mapa_url && (
            <div className="pt-4">
              <a
                href={edificio.mapa_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Ver ubicación en mapa
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card para Departamentos con Acordeón */}
      <Card className="mb-6">
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
                          const supabase = createBrowserSupabaseClient();
                          
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
                            
                            // Recargar el edificio para actualizar la información
                            await cargarEdificio();
                            
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
          {edificio.departamentos && edificio.departamentos.length > 0 ? (
            <Accordion type="multiple" className="w-full">
              {ordenarDepartamentos(edificio.departamentos).map((depto: any) => {
                const tieneTelefonoPrincipal = depto.telefonos?.some((tel: any) => tel.es_principal);
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
                                setDepartamentoSeleccionado(depto.id);
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
                              {depto.telefonos.map((tel: any) => (
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
                                        setDepartamentoSeleccionado(depto.id);
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
                                          const supabase = createBrowserSupabaseClient();
                                          
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
                                            
                                            await cargarEdificio();
                                            
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
                  
                  // Generar nombre completo para el contacto
                  // Buscar el departamento seleccionado para obtener su código
                  const departamento = edificio.departamentos.find((d) => d.id === departamentoSeleccionado);
                  const nombreEdificio = edificio.nombre;
                  const codigoDepartamento = departamento?.codigo || '';
                  const nombreContactoOriginal = nuevoTelefono.nombre_contacto || '';
                  
                  // Formato: "Nombre Edificio Código Departamento Nombre Contacto"
                  const nombreContactoCompleto = `${nombreEdificio} ${codigoDepartamento} ${nombreContactoOriginal}`.trim();
                  
                  setProcesandoTelefono(true);
                  const supabase = createBrowserSupabaseClient();
                  
                  try {
                    if (editandoTelefono) {
                      // Actualizar teléfono existente
                      const { error } = await supabase
                        .from("telefonos_departamento")
                        .update({
                          numero: cleanPhoneNumber(nuevoTelefono.numero),
                          nombre_contacto: nombreContactoCompleto || null,
                          es_principal: nuevoTelefono.es_principal,
                          relacion: nuevoTelefono.relacion || "contacto", // Valor predeterminado
                          notas: nuevoTelefono.notas || null
                        })
                        .eq("id", editandoTelefono);
                        
                      if (error) throw error;
                      
                      toast({
                        title: "Teléfono actualizado",
                        description: `El teléfono ha sido actualizado correctamente`,
                      });
                    } else {
                      // Crear nuevo teléfono
                      const { error } = await supabase
                        .from("telefonos_departamento")
                        .insert({
                          departamento_id: departamentoSeleccionado,
                          numero: cleanPhoneNumber(nuevoTelefono.numero),
                          nombre_contacto: nombreContactoCompleto || null,
                          es_principal: nuevoTelefono.es_principal,
                          relacion: nuevoTelefono.relacion || "contacto", // Valor predeterminado
                          notas: nuevoTelefono.notas || null
                        });
                        
                      if (error) throw error;
                      
                      toast({
                        title: "Teléfono agregado",
                        description: `El teléfono ha sido agregado correctamente`,
                      });
                    }
                    
                    // Recargar el edificio para actualizar la información
                    await cargarEdificio();
                    
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

      <div className="flex justify-end space-x-4">
        <Link href={`/dashboard/edificios/${edificioId}/editar`}>
          <Button variant="outline">Editar Edificio</Button>
        </Link>
        <Link href="/dashboard/edificios">
          <Button variant="secondary">Volver a la lista</Button>
        </Link>
      </div>
    </div>
  )
}
