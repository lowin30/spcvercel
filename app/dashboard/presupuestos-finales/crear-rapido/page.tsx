import { redirect } from "next/navigation"
import { validateSessionAndGetUser } from "@/lib/auth-bridge"
import { createServerClient } from "@/lib/supabase-server"
import { ExpressBudgetForm } from "@/components/presupuestos/express-budget-form"

export const dynamic = 'force-dynamic'

export default async function CrearRapidoPresupuestoPage() {
    const user = await validateSessionAndGetUser()
    const { rol, id: currentUserId } = user

    if (rol !== "admin") {
        redirect("/dashboard")
    }

    const supabase = await createServerClient();

    // Cargar Catálogos iniciales
    const [adminsRes, supervisorsRes] = await Promise.all([
        supabase.from('administradores').select('id, nombre').order('nombre'),
        supabase.from('usuarios').select('id, email').eq('rol', 'supervisor').order('email')
    ]);

    const lists = {
        administradores: (adminsRes.data || []).map(a => ({ id: a.id.toString(), nombre: a.nombre })),
        supervisores: (supervisorsRes.data || []).map(s => ({ id: s.id, email: s.email }))
    };

    return (
        <div className="container mx-auto py-10 px-4">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Proyecto Express
                    </h1>
                    <p className="text-muted-foreground text-lg">
                        Crea un presupuesto final en segundos seleccionando en cascada.
                    </p>
                </div>
                
                <ExpressBudgetForm 
                    administradores={lists.administradores} 
                    supervisores={lists.supervisores}
                    currentUserId={currentUserId}
                />
            </div>
        </div>
    )
}
