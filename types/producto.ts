export interface Categoria {
  id: string
  nombre: string
  descripcion: string | null
  created_at: string
  updated_at: string
}

export interface Producto {
  id: string
  code: number
  nombre: string
  descripcion: string | null
  precio: number
  categoria_id: string
  activo: boolean
  created_at: string
  updated_at: string
  categorias_productos?: Categoria
}
