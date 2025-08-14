"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardShell } from "@/components/dashboard-shell"
import { ProductoForm } from "@/components/producto-form"
import { Loader2 } from "lucide-react"
import { createBrowserSupabaseClient } from "@/lib/supabase-client"

export default function EditarProductoPage({ params }: { params: { id: string } }) {
  const [producto, setProducto] = useState<any>(null)
  const [categorias, setCategorias] = useState<any[]>([])
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
        
        // Verificar si el usuario tiene permisos para editar productos
        if (userData?.rol !== "admin") {
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

        // Obtener categorías
        const categoriasResponse = await supabase
          .from("categorias_productos")
          .select("id, nombre")
          .order("nombre", { ascending: true })
          
        const categoriasData = categoriasResponse.data
        setCategorias(categoriasData || [])

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
    <DashboardShell userDetails={userDetails}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Editar Producto</h1>
            <p className="text-muted-foreground">Modifica los detalles del producto.</p>
          </div>
          <a
            href="/dashboard/productos"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background border border-input hover:bg-accent hover:text-accent-foreground h-10 py-2 px-4"
          >
            Volver a Productos
          </a>
        </div>
        <div className="grid gap-6">
          <ProductoForm producto={producto} categorias={categorias} />
        </div>
      </div>
    </DashboardShell>
  )
}
