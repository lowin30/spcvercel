"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CategoriasProductosList } from "@/components/categorias-productos-list"
import { Loader2 } from "lucide-react"
import { createBrowserSupabaseClient } from "@/lib/supabase-client"

export default function CategoriasProductosPage() {
  const [categorias, setCategorias] = useState<any[]>([])
  const [conteoProductos, setConteoProductos] = useState<Map<string, number>>(new Map())
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
        
        // Verificar si el usuario tiene permisos para gestionar categorías
        if (userData?.rol !== "admin") {
          router.push("/dashboard")
          return
        }

        // Obtener categorías
        const categoriasResponse = await supabase
          .from("categorias_productos")
          .select("*")
          .order("nombre", { ascending: true })
          
        const categoriasData = categoriasResponse.data
        const categoriasError = categoriasResponse.error
        
        if (categoriasError) {
          console.error("Error al obtener categorías:", categoriasError)
          setError("Error al obtener categorías")
          setLoading(false)
          return
        }
        
        setCategorias(categoriasData || [])

        // Obtener todos los productos para contar por categoría
        const productosResponse = await supabase.from("productos").select("categoria_id")
        const productosData = productosResponse.data
        
        // Crear un mapa de conteo de productos por categoría
        const nuevoConteoProductos = new Map()

        // Contar productos por categoría
        if (productosData) {
          productosData.forEach((producto) => {
            if (producto.categoria_id) {
              const count = nuevoConteoProductos.get(producto.categoria_id) || 0
              nuevoConteoProductos.set(producto.categoria_id, count + 1)
            }
          })
        }
        
        setConteoProductos(nuevoConteoProductos)

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
          <span className="ml-2">Cargando categorías...</span>
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
  
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Categorías de Productos</h1>
            <p className="text-muted-foreground">Gestiona las categorías para clasificar los productos.</p>
          </div>
          <a
            href="/dashboard/productos"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background border border-input hover:bg-accent hover:text-accent-foreground h-10 py-2 px-4"
          >
            Volver a Productos
          </a>
        </div>
      </div>
      <CategoriasProductosList initialCategorias={categorias} conteoProductos={conteoProductos} />
    </div>
  )
}
