"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardShell } from "@/components/dashboard-shell"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Edit, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { getSupabaseClient } from "@/lib/supabase-singleton"

export default function DetalleProductoPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const supabase = getSupabaseClient()
  const [producto, setProducto] = useState<any>(null)
  const [presupuestosCount, setPresupuestosCount] = useState<number>(0)
  const [userDetails, setUserDetails] = useState<{ rol: string; email: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Verificar sesión
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          router.push("/login")
          return
        }

        // Cargar detalles del usuario actual
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

        // Cargar detalles del producto
        const { data: productoData, error: productoError } = await supabase
          .from('productos')
          .select(`
            *,
            categoria:categoria_id (nombre),
            proveedor:proveedor_id (nombre, email, telefono)
          `)
          .eq('id', params.id)
          .single()
        
        if (productoError) {
          setError("Error al cargar el producto")
          console.error("Error al cargar producto:", productoError)
          setLoading(false)
          return
        }
        
        setProducto(productoData)
        
        // Contar presupuestos que incluyen este producto
        const { count } = await supabase
          .from('presupuesto_items')
          .select('presupuesto_id', { count: 'exact', head: true })
          .eq('producto_id', params.id)
        
        setPresupuestosCount(count || 0)
        setLoading(false)
      } catch (error) {
        console.error("Error:", error)
        setError("Ocurrió un error inesperado")
        setLoading(false)
      }
    }
    
    fetchData()
  }, [params.id, router, supabase])

  if (loading) {
    return (
      <DashboardShell userDetails={userDetails || { rol: "", email: "" }}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Cargando detalles del producto...</span>
        </div>
      </DashboardShell>
    )
  }

  if (error || !producto) {
    return (
      <DashboardShell userDetails={userDetails || { rol: "", email: "" }}>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <p className="text-red-500 mb-4">{error || "Producto no encontrado"}</p>
          <Button onClick={() => router.push("/dashboard/productos")}>
            Volver a productos
          </Button>
        </div>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell userDetails={userDetails || { rol: "", email: "" }}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{producto.nombre}</h1>
            <p className="text-muted-foreground">
              Detalles del producto y especificaciones técnicas
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/productos/${params.id}/editar`}>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Editar Producto
              </Button>
            </Link>
            <Link href="/dashboard/productos">
              <Button variant="outline" size="sm">
                Ver Todos
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Información General</CardTitle>
              <CardDescription>
                Detalles principales y características del producto
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Código</p>
                  <p>{producto.codigo || "No especificado"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Categoría</p>
                  <p>{producto.categoria?.nombre || "Sin categoría"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Precio</p>
                  <p className="font-semibold">{formatCurrency(producto.precio || 0)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Stock</p>
                  <div className="flex items-center gap-2">
                    <span>{producto.stock || 0} unidades</span>
                    {producto.stock <= producto.stock_minimo && (
                      <Badge variant="destructive">Stock bajo</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-1">Descripción</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {producto.descripcion || "Sin descripción disponible"}
                </p>
              </div>

              {producto.especificaciones_tecnicas && (
                <div>
                  <p className="text-sm font-medium mb-1">Especificaciones Técnicas</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {producto.especificaciones_tecnicas}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Proveedor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {producto.proveedor ? (
                  <>
                    <p className="font-medium">{producto.proveedor.nombre}</p>
                    <p className="text-sm text-muted-foreground">
                      {producto.proveedor.email}
                    </p>
                    {producto.proveedor.telefono && (
                      <p className="text-sm text-muted-foreground">
                        {producto.proveedor.telefono}
                      </p>
                    )}
                    <div className="mt-2">
                      <Link href={`/dashboard/proveedores/${producto.proveedor_id}`}>
                        <Button size="sm" variant="outline" className="w-full">
                          Ver Proveedor
                        </Button>
                      </Link>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No hay información de proveedor
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Inventario</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm font-medium">Stock Actual</p>
                  <p>{producto.stock || 0} unidades</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Stock Mínimo</p>
                  <p>{producto.stock_minimo || 0} unidades</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Ubicación</p>
                  <p>{producto.ubicacion || "No especificada"}</p>
                </div>
                <div className="mt-4">
                  <p className="text-sm font-medium">Presupuestos</p>
                  <p>Usado en {presupuestosCount} presupuesto(s)</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
