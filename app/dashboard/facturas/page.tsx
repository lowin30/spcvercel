import { Suspense } from "react"
import { validateSessionAndGetUser } from "@/lib/auth-bridge"
import { getFacturas, getInvoiceKPIs, getFiltrosData } from "./loader"
import { InvoiceList } from "@/components/invoice-list"
import { ExportFacturasButton } from "@/components/export-facturas-button"
import Link from "next/link"
import { Plus, AlertTriangle, Filter, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"


import FacturasClientWrapper from "./client-wrapper"

export default async function FacturasPage() {
  const user = await validateSessionAndGetUser()
  const { rol } = user

  // Security Gate
  if (rol !== 'admin') {
    return <div className="p-8 text-center text-red-600">Acceso restringido. Requiere rol de Administrador.</div>
  }

  // Parallel Data Fetching
  const [facturas, kmisData, filtrosData] = await Promise.all([
    getFacturas(rol, user.id),
    getInvoiceKPIs(rol),
    getFiltrosData(rol)
  ])

  return (
    <div className="space-y-6 container mx-auto py-6">
      <FacturasClientWrapper
        initialFacturas={facturas || []}
        kpis={kmisData || null}
        filtros={filtrosData || { administradores: [], edificios: [], estados: [] }}
        userRole={rol}
      />
    </div>
  )
}
