import { Suspense } from "react"
import { validateSessionAndGetUser } from "@/lib/rbac"
import { getFacturas, getInvoiceKPIs, getFiltrosData } from "./loader"
import { InvoiceList } from "@/components/invoice-list" // We'll likely reuse or adapt this
import { ExportFacturasButton } from "@/components/export-facturas-button"
import Link from "next/link"
import { Plus, AlertTriangle, Filter, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
// We might need a Client Component wrapper for the interactive parts (filters, tabs)
// Let's create a Client Component for the main view logic if InvoiceList doesn't cover it all.
// Actually, converting the *entire* previous page logic to a Client Component wrapper that takes initialData is the safest Bridge strategy for complex pages.
// BUT Protocol says: "NO SUPABASE CLIENT: el cliente solo usa bridge (props)."
// So we must fetch data here and pass it down.

import FacturasClientWrapper from "./client-wrapper" // We will create this next

export default async function FacturasPage() {
  const { user, rol } = await validateSessionAndGetUser()

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
        initialFacturas={facturas}
        kpis={kmisData}
        filtros={filtrosData}
        userRole={rol}
      />
    </div>
  )
}
