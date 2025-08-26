"use client"

import { useParams } from "next/navigation"

export default function ProductPage() {
  const params = useParams()
  const productId = params.id as string
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Producto ID: {productId}</h1>
      <p>Esta página ha sido simplificada temporalmente para resolver problemas de compilación</p>
    </div>
  )
}
