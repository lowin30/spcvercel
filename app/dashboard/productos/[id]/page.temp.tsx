"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Edit, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { createBrowserSupabaseClient } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";

// Componente temporal simplificado para despliegue
export default function DetalleProductoPage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true);
  
  // Componente de carga mientras se soluciona el problema con DashboardShell
  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-3xl font-bold mb-4">Cargando Detalle de Producto...</h1>
        <p className="text-muted-foreground mb-6">Estamos trabajando para resolver problemas de despliegue.</p>
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Página en mantenimiento</span>
        </div>
        <div className="mt-4">
          <Link href="/dashboard/productos">
            <Button variant="outline">Volver al listado</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
