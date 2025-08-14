"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ProductosList } from "@/components/productos-list"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus, Loader2 } from "lucide-react"
import { createBrowserSupabaseClient } from "@/lib/supabase-client"

export default function ProductosPage() {
  const [productos, setProductos] = useState<any[]>([])
  const [categorias, setCategorias] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userDetails, setUserDetails] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const supabase = createBrowserSupabaseClient()
        
        if (!supabase) {
          setError("No se pudo inicializar el cliente de Supabase")
          return
        }

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
          return
        }
        
        setUserDetails(userData)
        
        // Verificar si el usuario tiene permisos para ver productos
        if (userData?.rol !== "admin") {
          router.push("/dashboard")
          return
        }

        // Obtener productos
        const productosResponse = await supabase
          .from("productos")
          .select(`
            *,
            categorias_productos (
              id,
              nombre
            )
          `)
          .order("code", { ascending: true })

        // Obtener categorías
        const categoriasResponse = await supabase
          .from("categorias_productos")
          .select("*")
          .order("nombre", { ascending: true })

        if (productosResponse.error) {
          console.error("Error al cargar productos:", productosResponse.error)
          setError("Error al cargar productos")
          return
        }
        
        setProductos(productosResponse.data || [])
        setCategorias(categoriasResponse.data || [])
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
          <span className="ml-2">Cargando productos...</span>
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
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Productos</h1>
        <Link href="/dashboard/productos/nuevo">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Nuevo Producto
          </Button>
        </Link>
      </div>

      <ProductosList initialProductos={productos} categorias={categorias} />
    </div>
  )
}
