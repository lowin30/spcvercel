import { getComprobantesData, getAdminStats } from "./loader"
import { ComprobantesClientWrapper } from "@/components/comprobantes-client-wrapper"
import { Suspense } from "react"
import { Loader2 } from "lucide-react"

export const metadata = {
    title: "Auditoría de Comprobantes | SPC",
    description: "Control de gastos y comprobantes de tareas",
}

export default async function ComprobantesPage() {
    const [gastos, stats] = await Promise.all([
        getComprobantesData(),
        getAdminStats()
    ])

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Comprobantes</h2>
            </div>

            <Suspense fallback={
                <div className="flex h-[400px] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            }>
                <ComprobantesClientWrapper
                    initialData={gastos}
                    stats={stats}
                />
            </Suspense>
        </div>
    )
}
