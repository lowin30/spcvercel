"use client"

export default function ProductPage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Producto ID: {params.id}</h1>
      <p>Esta página ha sido simplificada temporalmente para resolver problemas de compilación</p>
    </div>
  )
}
