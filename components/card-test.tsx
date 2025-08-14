"use client"

import React from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function CardTest() {
  return (
    <div className="p-4">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Componente de Prueba</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Esta es una prueba de los componentes UI</p>
          <Button className="mt-4">Botón de Prueba</Button>
        </CardContent>
      </Card>
    </div>
  )
}
