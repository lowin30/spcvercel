"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { createClient } from '@/lib/supabase-client'
import { cleanPhoneNumber } from "@/lib/utils"
import { formatDate, formatCuit, getEstadoEdificioColor } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import Link from "next/link"
import { Building, MapPin, User, Calendar, ExternalLink, AlertTriangle, Loader2, ArrowLeft, Plus, Phone, Star } from "lucide-react"
import { DepartamentosDialog } from "@/components/departamentos-dialog"

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
  const router = useRouter()

  // Función para cargar datos del edificio
  const cargarEdificio = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      
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
    <div className="container mx-auto p-3 sm:p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl sm:text-2xl font-bold">{edificio.nombre}</h1>
        <Badge className={getEstadoEdificioColor(edificio.estado)}>
          {edificio.estado === "en_obra"
            ? "En Obra"
            : edificio.estado.charAt(0).toUpperCase() + edificio.estado.slice(1)}
        </Badge>
      </div>

      <Card className="mb-4">
        <CardHeader className="p-4 pb-3">
          <CardTitle className="text-base sm:text-lg">Información General</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Dirección</p>
                <p className="text-sm">{edificio.direccion}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <User className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Administrador</p>
                <p className="text-sm truncate">
                  {edificio.nombre_administrador || "Sin administrador"}
                </p>
              </div>
            </div>

            {edificio.cuit && (
              <div className="flex items-start gap-2">
                <Building className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">CUIT</p>
                  <p className="text-sm font-mono">{formatCuit(edificio.cuit)}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Creación</p>
                <p className="text-sm">{formatDate(edificio.created_at)}</p>
              </div>
            </div>
          </div>

          {edificio.mapa_url && (
            <div className="pt-2 border-t">
              <a
                href={edificio.mapa_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Ver ubicación en mapa
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card para Departamentos */}
      <Card className="mb-4">
        <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base sm:text-lg">
            Deptos ({edificio.departamentos?.length || 0})
          </CardTitle>
          <Button 
            size="sm" 
            onClick={() => setDepartamentosDialogOpen(true)}
            className="h-8 text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            <span className="hidden sm:inline">Gestionar</span>
            <span className="sm:hidden">Gestionar</span>
          </Button>
        </CardHeader>

        <CardContent className="p-4 pt-0">
          {edificio.departamentos && edificio.departamentos.length > 0 ? (
            <div className="space-y-1.5">
              {ordenarDepartamentos(edificio.departamentos).slice(0, 10).map((depto: any) => {
                const tieneTelefonoPrincipal = depto.telefonos?.some((tel: any) => tel.es_principal);
                const cantidadTelefonos = depto.telefonos?.length || 0;
                
                return (
                  <div 
                    key={depto.id} 
                    className="flex items-center justify-between p-2 sm:p-2.5 border border-border rounded-md hover:bg-muted/50 dark:hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-sm">{depto.codigo}</span>
                      {tieneTelefonoPrincipal && (
                        <Badge className="bg-green-500 text-[10px] h-5 px-1.5">
                          <Star className="h-2.5 w-2.5 mr-0.5" /> Principal
                        </Badge>
                      )}
                      {cantidadTelefonos > 0 && (
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                          <Phone className="h-2.5 w-2.5 mr-0.5" /> {cantidadTelefonos}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate max-w-[120px] sm:max-w-[200px]">
                      {depto.propietario || "Sin propietario"}
                    </div>
                  </div>
                );
              })}
              {edificio.departamentos.length > 10 && (
                <p className="text-[10px] sm:text-xs text-muted-foreground text-center pt-1">
                  ... y {edificio.departamentos.length - 10} más
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <Building className="h-10 w-10 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-xs text-muted-foreground mb-1">
                No hay departamentos
              </p>
              <p className="text-[10px] text-muted-foreground">
                Haz clic en "Gestionar"
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Diálogo completo de Departamentos */}
      <DepartamentosDialog
        edificioId={edificio.id}
        edificioNombre={edificio.nombre}
        open={departamentosDialogOpen}
        onOpenChange={setDepartamentosDialogOpen}
        onDepartamentosUpdated={cargarEdificio}
      />

      <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
        <Link href={`/dashboard/edificios/${edificioId}/editar`}>
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
            Editar Edificio
          </Button>
        </Link>
        <Link href="/dashboard/edificios">
          <Button variant="secondary" size="sm" className="w-full sm:w-auto">
            Volver a lista
          </Button>
        </Link>
      </div>
    </div>
  )
}
