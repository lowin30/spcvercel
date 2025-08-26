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
import { createBrowserSupabaseClient } from "@/lib/supabase-client"


export default function DetalleProductoPage({ params }: { params: { id: string } }) {
  const [producto, setProducto] = useState<any>(null)
  const [presupuestosCount, setPresupuestosCount] = useState<number>(0)
  const [userDetails, setUserDetails] = useState<{ rol: string; email: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const supabase = createBrowserSupabaseClient()
        
        // Verificar sesión de usuario
        const sessionResponse = await supabase.auth.getSession()
        const session = sessionResponse.data.session
        
        if (!session) {
          router.push("/login")
          return
        }
        
        // Obtener detalles del usuario
        const userResponse = await supabase
          .from("usuarios")
          .select("*")
          .eq("id", session.user.id)
          .single()
          
        const userData = userResponse.data
        const userError = userResponse.error
          
        if (userError) {
          console.error("Error al obtener detalles del usuario:", userError)
          setError("Error al obtener detalles del usuario")
          setLoading(false)
          return
        }
        
        setUserDetails(userData)
        
        // Verificar si el usuario tiene permisos para ver productos
        if (userData?.rol !== "admin" && userData?.rol !== "supervisor") {
          router.push("/dashboard")
          return
        }
        
        // Obtener producto
        const productoResponse = await supabase
          .from("productos")
          .select(`
            *,
            categorias_productos (
              id,
              nombre
            )
          `)
          .eq("id", params.id)
          .single()
        
        const productoData = productoResponse.data
        const productoError = productoResponse.error
        
        if (productoError || !productoData) {
          console.error("Error al obtener producto:", productoError)
          router.push("/dashboard/productos")
          return
        }
        
        setProducto(productoData)
        
        // Obtener estadísticas de uso en presupuestos
        const presupuestosResponse = await supabase
          .from("items")
          .select("id", { count: "exact", head: true })
          .eq("producto_id", params.id)
          .eq("es_producto", true)
          
        setPresupuestosCount(presupuestosResponse.count || 0)

        setLoading(false)
      } catch (err) {
        console.error("Error al cargar datos:", err)
        setError("Error al cargar datos")
        setLoading(false)
      }
    }
    
    loadData()
  }, [])
  
  if (loading) {
    return (
      <div className="container py-6">
        <div className="flex justify-center items-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Cargando producto...</span>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="container py-6">
        <div className="bg-red-50 p-4 rounded-md mb-4">
          <h2 className="text-red-800 text-lg font-medium">Error</h2>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    )
  }
  
  if (!producto) {
    return (
      <div className="container py-6">
        <div className="bg-yellow-50 p-4 rounded-md mb-4">
          <h2 className="text-yellow-800 text-lg font-medium">Producto no encontrado</h2>
          <p className="text-yellow-700">No se pudo encontrar el producto solicitado.</p>
        </div>
      </div>
    )
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
                <Badge variant={producto.activo ? "default" : "destructive"}>
                  {producto.activo ? "Activo" : "Inactivo"}
                </Badge>
                <Badge variant="outline" className="ml-2">
                  {producto.categorias_productos?.nombre || "Sin categoría"}
                </Badge>
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Precio</div>
              <div className="text-2xl font-bold">{formatCurrency(producto.precio)}</div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">Descripción</h3>
                <p className="text-muted-foreground">{producto.descripcion || "Sin descripción"}</p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <h3 className="font-medium">Información General</h3>
                  <div className="mt-2 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Código:</span>
                      <span>{producto.code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Categoría:</span>
                      <span>{producto.categorias_productos?.nombre || "Sin categoría"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Estado:</span>
                      <span>{producto.activo ? "Activo" : "Inactivo"}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium">Estadísticas</h3>
                  <div className="mt-2 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Usado en presupuestos:</span>
                      <span>{presupuestosCount || 0} veces</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fecha de creación:</span>
                      <span>{new Date(producto.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Última actualización:</span>
                      <span>{new Date(producto.updated_at).toLocaleDateString()}</span>
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
