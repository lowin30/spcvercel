"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, ExternalLink, Loader2, PlusCircle } from "lucide-react"
import { formatDate } from "@/lib/date-utils"
import { createBrowserSupabaseClient } from "@/lib/supabase-client"
import { formatCurrency } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"
import { ExportPresupuestoButton } from "@/components/export-presupuesto-button"
import { AprobadoCheckbox } from "./aprobado-checkbox"

interface PresupuestoFinalItem {
  id: number
  id_presupuesto: number // Corrected to match 'items' table schema
  descripcion: string
  cantidad: number
  precio: number
  // Consider adding es_producto and producto_id if they are used by the component
  es_producto?: boolean 
  producto_id?: string 
}

interface PresupuestoFinalPageProps {
  params: Promise<{ id: string }>
}

export default function PresupuestoFinalPage({ params: paramsPromise }: PresupuestoFinalPageProps) {
  const { id } = use(paramsPromise);
  const [presupuesto, setPresupuesto] = useState<any>(null)
  const [items, setItems] = useState<PresupuestoFinalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const supabase = createBrowserSupabaseClient()
        if (!supabase) {
          throw new Error("No se pudo inicializar el cliente de Supabase")
        }

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        if (sessionError || !sessionData.session) {
          router.push("/login")
          return
        }

        const { data: userData, error: userError } = await supabase
          .from("usuarios")
          .select("rol")
          .eq("id", sessionData.session.user.id)
          .single()
        if (userError) throw userError
        if (userData?.rol !== "admin") {
          toast({ title: "Acceso denegado", description: "Solo los administradores pueden ver esta página.", variant: "destructive" })
          router.push("/dashboard")
          return
        }

        const { data, error: presupuestoError } = await supabase
          .from("vista_presupuestos_finales_completa")
          .select("*")
          .eq("id", id)
          .single()
        if (presupuestoError) {
          console.error("Supabase error raw object (presupuestoError):", presupuestoError);
          console.error("Supabase error details (JSON):", JSON.stringify(presupuestoError, null, 2));
          let detailedMessage = "Error al cargar el presupuesto final desde Supabase.";
          const specificError = presupuestoError as any; // Castear a any para acceder a propiedades dinámicas
          if (specificError.message) {
            detailedMessage = `Error Supabase: ${specificError.message}`;
            if (specificError.details) detailedMessage += ` Detalles: ${specificError.details}`;
            if (specificError.hint) detailedMessage += ` Pista: ${specificError.hint}`;
            if (specificError.code) detailedMessage += ` (Código: ${specificError.code})`;
          }
          throw new Error(detailedMessage);
        }
        if (!data) { // Esto se ejecutará si presupuestoError fue nulo pero data también es nulo
          const errorMessage = "No se pudo cargar el presupuesto final solicitado (no se encontraron datos y no hubo error explícito de Supabase).";
          console.error(errorMessage);
          throw new Error(errorMessage);
        }
        // Obtener información adicional del edificio (incluido CUIT)
        if (data.id_edificio) {
          const { data: edificioData, error: edificioError } = await supabase
            .from("vista_edificios_completa")
            .select("*")
            .eq("id", data.id_edificio)
            .single()
            
          if (!edificioError && edificioData) {
            // Agregar los datos del edificio al objeto del presupuesto
            data.edificio_info = edificioData
          }
        }
        
        setPresupuesto(data)

        const { data: itemsData, error: itemsError } = await supabase
          .from("items")
          .select("*") // Quitamos el tipo genérico que causa error de linting
          .eq("id_presupuesto", data!.id)
          .order("id", { ascending: true })
        setItems(itemsData || [])

      } catch (err) {
        console.error("Error detallado al cargar datos:", err);
        if (err instanceof Error) {
          setError(err.message);
        } else if (typeof err === 'string') {
          setError(err);
        } else {
          setError("Ocurrió un error inesperado al cargar los datos.");
        }
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id, router]) // 'id' here now refers to the unwrapped id from use(paramsPromise)

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !presupuesto) {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" className="mr-2" onClick={() => router.push('/dashboard/presupuestos-finales')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Presupuesto no encontrado</h1>
        </div>
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-lg font-semibold text-red-600">{error || "El presupuesto que buscas no existe."}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  console.log('Estructura completa del presupuesto:', JSON.stringify(presupuesto, null, 2));
  
  const datosParaPDF = {
    presupuestoId: presupuesto.id,
    codigo: presupuesto.code,
    fecha: new Date(presupuesto.created_at),
    referencia: '', // Eliminamos la referencia como solicitaste
    cliente: {
      nombre: presupuesto.nombre_edificio || 'N/A',
      cuit: presupuesto.edificio_info?.cuit || '',
      tarea: presupuesto.titulo_tarea || ''
    },
    items: items.map((item) => ({
      id: item.id,
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      tarifa: item.precio,
      total: item.cantidad * item.precio,
    })),
    totalPresupuesto: presupuesto.total,
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/presupuestos-finales">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Presupuesto Final: {presupuesto.code}</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <AprobadoCheckbox 
              presupuestoId={presupuesto.id} 
              initialValue={presupuesto.aprobado || false}
              disabled={Boolean(presupuesto.aprobado)}
            />
          </div>
          <div className="flex gap-2">
            <ExportPresupuestoButton {...datosParaPDF} />
            <Button asChild>
              <Link href={`/dashboard/facturas/nueva?presupuesto_final_id=${presupuesto.id}`}>
                <PlusCircle className="h-4 w-4 mr-2" /> Crear Factura
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/dashboard/presupuestos-finales/editar/${presupuesto.id}`}>
                <ExternalLink className="h-4 w-4 mr-2" /> Editar Presupuesto
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Detalles del Presupuesto Final</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Código</dt>
                <dd className="text-base">{presupuesto.code}</dd>
              </div>
              {/* Presupuesto Base Link commented out
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Presupuesto Base</dt>
                <dd className="text-base">
                  {presupuesto.presupuestos_base?.code || 'N/A'}
                </dd>
              </div>
              */}
              {/* Tarea Info commented out
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Tarea</dt>
                <dd className="text-base">
                  {presupuesto.presupuestos_base?.tareas?.titulo || 'N/A'} ({presupuesto.presupuestos_base?.tareas?.code || 'N/A'})
                </dd>
              </div>
              */}
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Estado</dt>
                <dd>
                  <span
                    className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                      presupuesto.aprobado 
                        ? "bg-green-100 text-green-800" 
                        : presupuesto.rechazado
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {presupuesto.aprobado 
                      ? "Aprobado" 
                      : presupuesto.rechazado
                      ? "Rechazado"
                      : "Pendiente"
                    }
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Fecha de Creación</dt>
                <dd className="text-base">{formatDate(presupuesto.created_at)}</dd>
              </div>
              {presupuesto.fecha_aprobacion && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Fecha de Aprobación</dt>
                  <dd className="text-base">{formatDate(presupuesto.fecha_aprobacion)}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Montos</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Mano de Obra</dt>
                <dd className="text-base">{formatCurrency(presupuesto.mano_obra || 0)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Materiales</dt>
                <dd className="text-base">{formatCurrency(presupuesto.materiales || 0)}</dd>
              </div>
              <div className="pt-2 border-t">
                <dt className="text-sm font-medium text-muted-foreground">Total</dt>
                <dd className="text-xl font-bold">{formatCurrency(presupuesto.total)}</dd>
              </div>
              <div className="pt-2 border-t">
                <dt className="text-sm font-medium text-muted-foreground">Total Presupuesto Base</dt>
                <dd className="text-base">{formatCurrency(presupuesto.presupuestos_base?.total)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Ajuste</dt>
                <dd className={`text-base ${(presupuesto.total || 0) - (presupuesto.presupuestos_base?.total || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency((presupuesto.total || 0) - (presupuesto.presupuestos_base?.total || 0))}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {(items && items.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Items del Presupuesto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">#</th>
                    <th className="text-left p-2">Descripción</th>
                    <th className="text-right p-2">Cantidad</th>
                    <th className="text-right p-2">Precio</th>
                    <th className="text-right p-2">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: PresupuestoFinalItem, idx: number) => (
                    <tr key={item.id} className={idx % 2 ? 'bg-muted/50' : ''}>
                      <td className="p-2">{idx+1}</td>
                      <td className="p-2">{item.descripcion}</td>
                      <td className="p-2 text-right">{item.cantidad}</td>
                      <td className="p-2 text-right">{formatCurrency(item.precio)}</td>
                      <td className="p-2 text-right">{formatCurrency(item.cantidad * (item.precio || 0))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-medium border-t">
                    <td colSpan={4} className="p-2 text-right">Total:</td>
                    <td className="p-2 text-right">{formatCurrency(presupuesto.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {presupuesto.observaciones_admin && (
        <Card>
          <CardHeader>
            <CardTitle>Observaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{presupuesto.observaciones_admin}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
