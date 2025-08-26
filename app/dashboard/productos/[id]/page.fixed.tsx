"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
// IMPORTANTE: Importación correcta como exportación nombrada para mantener consistencia
import { DashboardShell } from "@/components/dashboard-shell"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Edit, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getSupabaseClient } from "@/lib/supabase-singleton"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export default function DetalleProductoPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const supabase = getSupabaseClient()

  const [isLoading, setIsLoading] = useState(true)
  const [producto, setProducto] = useState<any>({})
  const [userDetails, setUserDetails] = useState<{ rol: string; email: string } | null>(null)

  useEffect(() => {
    const fetchProducto = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push("/login")
        return
      }

      // Obtener detalles del usuario
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (userData) {
        setUserDetails({
          rol: userData.rol,
          email: session.user.email || ""
        })
      }

      // Obtener datos del producto
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) {
        console.error("Error fetching product:", error)
        setIsLoading(false)
        return
      }

      setProducto(data)
      setIsLoading(false)
    }

    fetchProducto();
  }, [params.id, router, supabase])

  if (isLoading) {
    return (
      <DashboardShell userDetails={userDetails || { rol: "", email: "" }}>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Cargando producto...</span>
        </div>
      </DashboardShell>
    )
  }

  // Función para formatear la fecha
  const formatDate = (dateString: string) => {
    if (!dateString) return "Sin fecha";
    return format(new Date(dateString), "PPP", { locale: es });
  }

  // Para asegurar que tenemos una URL válida
  const getImageUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/productos/${url}`;
  }

  // Función para formatear el precio
  const formatPrice = (price: number) => {
    if (!price && price !== 0) return "No disponible";
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(price);
  }

  // Función para determinar el color del stock
  const getStockBadge = (stock: number) => {
    if (stock <= 0) return "destructive";
    if (stock < 10) return "warning";
    return "success";
  }

  // Función para formatear estado
  const getEstadoBadge = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case "activo": return "success";
      case "inactivo": return "destructive";
      case "descontinuado": return "warning";
      default: return "secondary";
    }
  }

  return (
    <DashboardShell userDetails={userDetails || { rol: "", email: "" }}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Detalle de Producto</h1>
            <p className="text-muted-foreground">Información detallada del producto.</p>
          </div>
          <div className="flex gap-3">
            <a
              href="/dashboard/productos"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background border border-input hover:bg-accent hover:text-accent-foreground h-10 py-2 px-4"
            >
              Volver a Productos
            </a>
            <Link href={`/dashboard/productos/${params.id}/editar`}>
              <Button size="sm">
                <Edit className="mr-1 h-4 w-4" />
                Editar Producto
              </Button>
            </Link>
          </div>
        </div>
        
        <div className="grid gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold">
                {producto.code} - {producto.nombre}
              </CardTitle>
              <CardDescription>
                {producto.descripcion || "Sin descripción disponible."}
              </CardDescription>
            </div>
            <Badge variant={getEstadoBadge(producto.estado)}>{producto.estado || "Sin estado"}</Badge>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="rounded-lg overflow-hidden border h-64 flex items-center justify-center bg-muted">
                  {producto.imagen ? (
                    <img
                      src={getImageUrl(producto.imagen)}
                      alt={producto.nombre}
                      className="w-full h-full object-contain p-4"
                    />
                  ) : (
                    <span className="text-muted-foreground">Sin imagen</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col justify-between">
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-medium">Categoría</span>
                    <span>{producto.categoria || "Sin categoría"}</span>
                  </div>
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-medium">Precio</span>
                    <span>{formatPrice(producto.precio)}</span>
                  </div>
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-medium">Stock</span>
                    <Badge variant={getStockBadge(producto.stock)}>
                      {producto.stock || "0"} unidades
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-medium">Ubicación</span>
                    <span>{producto.ubicacion || "No especificada"}</span>
                  </div>
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-medium">Proveedor</span>
                    <span>{producto.proveedor || "No especificado"}</span>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Fecha de creación:</span>
                      <span>{formatDate(producto.created_at)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Última actualización:</span>
                      <span>{formatDate(producto.updated_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
