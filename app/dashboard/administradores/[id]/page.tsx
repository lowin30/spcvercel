"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { createBrowserSupabaseClient } from "@/lib/supabase-client"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Loader2, Save, Calculator } from "lucide-react"
import Link from "next/link"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"

interface AdminData {
  id: string;
  nombre: string;
  telefono: string;
  estado: string;
  aplica_ajustes: boolean;
  porcentaje_default: number;
}

export default function EditarAdministradorPage() {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [estado, setEstado] = useState("activo");
  const [aplicaAjustes, setAplicaAjustes] = useState(false);
  const [porcentajeAjuste, setPorcentajeAjuste] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const supabase = createBrowserSupabaseClient();
  
  const id = params.id as string;

  useEffect(() => {
    async function fetchAdmin() {
      if (!id || !supabase) {
        setError("Error: ID o Supabase no están disponibles.");
        setLoading(false);
        return;
      }

      setLoading(true); // Asegurarse de poner loading a true al inicio de la carga
      try {
        const { data, error: fetchError } = await supabase
          .from("vista_administradores")
          .select("*")
          .eq("id", id)
          .single();

        if (fetchError) {
          // Si el error es porque no se encontró (PGRST116), es un 404 de datos
          if (fetchError.code === 'PGRST116') {
            setError("No se encontró el administrador con el ID proporcionado.");
          } else {
            throw fetchError;
          }
        }

        if (data) {
          setNombre(data.nombre);
          setTelefono(data.telefono);
          setEstado(data.estado);
          setAplicaAjustes(data.aplica_ajustes || false);
          setPorcentajeAjuste(data.porcentaje_default || 0);
        } else if (!fetchError) { // Si no hay datos y no hubo error de fetch, es un caso raro o un ID no encontrado sin error PGRST116
          setError("No se encontró el administrador.");
        }
      } catch (err: any) {
        console.error("Error al cargar administrador:", err);
        setError(`No se pudo cargar la información del administrador: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }

    if (id) { // Solo ejecutar si el id está presente
        fetchAdmin();
    } else {
        setLoading(false);
        setError("ID de administrador no encontrado en la URL.");
    }
  }, [id, supabase, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nombre.trim() || !telefono.trim()) {
      toast({
        title: "Error de validación",
        description: "El nombre y el teléfono son campos requeridos.",
        variant: "destructive",
      });
      return;
    }
    // Validar formato de teléfono
    if (!/^[0-9]{10,15}$/.test(telefono)) {
      toast({
        title: "Error de validación",
        description: "El teléfono debe contener entre 10 y 15 dígitos numéricos.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Nota: Para actualizar siempre usamos la tabla original, no la vista
      const { error: updateError } = await supabase
        .from("administradores")
        .update({ 
          nombre, 
          telefono, 
          estado, 
          aplica_ajustes: aplicaAjustes,
          porcentaje_default: porcentajeAjuste
        })
        .eq("id", id);

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Éxito",
        description: "Administrador actualizado correctamente.",
      });
      router.push("/dashboard/administradores"); // Redirigir al listado después de editar
      router.refresh(); // Refrescar datos del listado
    } catch (err: any) {
      console.error("Error al actualizar administrador:", err);
      toast({
        title: "Error al guardar",
        description: `No se pudo actualizar el administrador: ${err.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-10 flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <span className="ml-3 text-lg">Cargando datos del administrador...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-10 space-y-4">
        <div className="bg-destructive/10 text-destructive p-4 rounded-md border border-destructive/30">
          <h2 className="text-lg font-semibold">Error al cargar administrador</h2>
          <p>{error}</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/administradores">
            <ArrowLeft className="h-4 w-4 mr-2" /> Volver al listado de administradores
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 md:py-10 space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard/administradores">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Volver</span>
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Editar Administrador</h1>
      </div>
      
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Información del Administrador</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre completo *</Label>
              <Input
                id="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Juan Pérez"
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono *</Label>
              <Input
                id="telefono"
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej: 1122334455"
                required
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">Ingresa solo números (entre 10 y 15 dígitos).</p>
            </div>
            
            <div className="pt-4 border-t">
              <h3 className="text-lg font-medium flex items-center mb-3">
                <Calculator className="mr-2 h-5 w-5 text-orange-500" />
                Configuración de Ajustes
              </h3>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="aplica-ajustes" className="text-base">Aplica ajustes en facturas</Label>
                    <p className="text-sm text-muted-foreground">Si está desactivado, no se generarán ajustes automáticos para este administrador.</p>
                  </div>
                  <Switch
                    id="aplica-ajustes"
                    checked={aplicaAjustes}
                    onCheckedChange={setAplicaAjustes}
                    disabled={isSubmitting}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="porcentaje-ajuste">Porcentaje de ajuste</Label>
                    <span className="font-medium text-lg">{porcentajeAjuste}%</span>
                  </div>
                  <Slider
                    id="porcentaje-ajuste"
                    min={0}
                    max={30}
                    step={1}
                    value={[porcentajeAjuste]}
                    onValueChange={(values) => setPorcentajeAjuste(values[0])}
                    disabled={!aplicaAjustes || isSubmitting}
                    className={!aplicaAjustes ? "opacity-50" : ""}
                  />
                  <p className="text-xs text-muted-foreground">Se aplicará este porcentaje de ajuste a los ítems de mano de obra en las facturas.</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <Select value={estado} onValueChange={setEstado} disabled={isSubmitting}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="inactivo">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit" disabled={isSubmitting} size="lg">
              {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}\
              {isSubmitting ? "Guardando cambios..." : "Guardar Cambios"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}