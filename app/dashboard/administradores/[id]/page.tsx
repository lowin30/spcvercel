"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { createClient } from "@/lib/supabase-client"
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
  email1: string;
  email2: string;
  estado: string;
  aplica_ajustes: boolean;
  porcentaje_default: number;
}

export default function EditarAdministradorPage() {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email1, setEmail1] = useState("");
  const [email2, setEmail2] = useState("");
  const [estado, setEstado] = useState("activo");
  const [aplicaAjustes, setAplicaAjustes] = useState(false);
  const [porcentajeAjuste, setPorcentajeAjuste] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const supabase = createClient();
  
  const id = params.id as string;

  useEffect(() => {
    async function fetchAdmin() {
      if (!id || !supabase) {
        setError("Error: ID o Supabase no están disponibles.");
        setLoading(false);
        return;
      }

      setLoading(true); 
      try {
        const { data, error: fetchError } = await supabase
          .from("vista_administradores")
          .select("*")
          .eq("id", id)
          .single();

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            setError("No se encontró el administrador con el ID proporcionado.");
          } else {
            throw fetchError;
          }
        }

        if (data) {
          setNombre(data.nombre);
          setTelefono(data.telefono);
          setEmail1(data.email1 || "");
          setEmail2(data.email2 || "");
          setEstado(data.estado);
          setAplicaAjustes(data.aplica_ajustes || false);
          setPorcentajeAjuste(data.porcentaje_default || 0);
        } else if (!fetchError) { 
          setError("No se encontró el administrador.");
        }
      } catch (err: any) {
        console.error("Error al cargar administrador:", err);
        setError(`No se pudo cargar la información del administrador: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }

    if (id) { 
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
    if (!/^[0-9]{10,15}$/.test(telefono)) {
      toast({
        title: "Error de validación",
        description: "El teléfono debe contener entre 10 y 15 dígitos numéricos.",
        variant: "destructive",
      });
      return;
    }

    // Validar email1 si se proporciona
    if (email1.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email1)) {
      toast({
        title: "Error de validación",
        description: "El formato del email principal no es válido.",
        variant: "destructive",
      });
      return;
    }

    // Validar email2 si se proporciona
    if (email2.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email2)) {
      toast({
        title: "Error de validación",
        description: "El formato del email secundario no es válido.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error: updateError } = await supabase
        .from("administradores")
        .update({ 
          nombre, 
          telefono,
          email1: email1.trim() || null,
          email2: email2.trim() || null,
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
      router.push("/dashboard/administradores"); 
      router.refresh(); 
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
      
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
        {/* Información Básica */}
        <Card>
          <CardHeader>
            <CardTitle>Información Básica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre completo *</Label>
                <Input
                  id="nombre"
                  value={nombre}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNombre(e.target.value)}
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
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTelefono(e.target.value)}
                  placeholder="Ej: 1122334455"
                  required
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">Solo números (10-15 dígitos)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="email1">Email principal</Label>
                <Input
                  id="email1"
                  type="email"
                  value={email1}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail1(e.target.value)}
                  placeholder="Ej: admin@ejemplo.com"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">Email de contacto principal</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email2">Email secundario</Label>
                <Input
                  id="email2"
                  type="email"
                  value={email2}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail2(e.target.value)}
                  placeholder="Ej: admin2@ejemplo.com"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">Email alternativo (opcional)</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <Select 
                value={estado}
                onValueChange={setEstado}
                disabled={isSubmitting}
              >
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Seleccione un estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="inactivo">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Configuración de Ajustes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Configuración de Ajustes de Facturas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between space-x-4 p-4 border rounded-lg">
              <div className="flex-1">
                <Label htmlFor="aplica_ajustes" className="text-base font-medium">
                  Aplicar ajustes automáticos
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Cuando está activado, se generarán ajustes automáticamente para las facturas de este administrador
                </p>
              </div>
              <Switch
                id="aplica_ajustes"
                checked={aplicaAjustes}
                onCheckedChange={setAplicaAjustes}
                disabled={isSubmitting}
              />
            </div>

            {aplicaAjustes && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="porcentaje_ajuste" className="text-base font-medium">
                      Porcentaje de ajuste
                    </Label>
                    <span className="text-2xl font-bold text-primary">
                      {porcentajeAjuste}%
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Este porcentaje se aplicará sobre el monto de mano de obra (no materiales)
                  </p>
                </div>
                <Slider
                  id="porcentaje_ajuste"
                  min={0}
                  max={30}
                  step={0.5}
                  value={[porcentajeAjuste]}
                  onValueChange={(value) => setPorcentajeAjuste(value[0])}
                  disabled={isSubmitting}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span>15%</span>
                  <span>30%</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Botones de acción */}
        <div className="flex justify-end gap-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => router.push("/dashboard/administradores")}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting} size="lg">
            {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
            {isSubmitting ? "Guardando cambios..." : "Guardar Cambios"}
          </Button>
        </div>
      </form>
    </div>
  );
}