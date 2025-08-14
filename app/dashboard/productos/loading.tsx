import { DashboardShell } from "@/components/dashboard-shell"
import { Skeleton } from "@/components/ui/skeleton"

export default function ProductosLoading() {
  return (
    <DashboardShell title="Productos" description="Gestiona los productos para presupuestos y facturas.">
      <div className="divide-y divide-border rounded-md border">
        <div className="p-4">
          <div className="space-y-3">
            <Skeleton className="h-5 w-1/5" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            <Skeleton className="h-5 w-1/5" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            <Skeleton className="h-5 w-1/5" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
