```
import { redirect } from "next/navigation"
import { validateSessionAndGetUser } from "@/lib/auth-bridge"
import { createServerClient } from "@/lib/supabase-server"
import { BudgetForm } from "@/components/budget-form"

export const dynamic = 'force-dynamic'

export default async function NuevoPresupuestoFinalPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const user = await validateSessionAndGetUser()
  const { rol } = user

  if (rol !== "admin") {
    redirect("/dashboard")
  }

  const resolvedParams = await searchParams;
  const initialTaskId = resolvedParams.id_tarea as string | undefined;

  const supabase = await createServerClient();

  // 1. Obtener Presupuesto Base Específico (si viene id_tarea)
  let presupuestoBase = null;
  let itemsBase = [];

  if (initialTaskId) {
    const { data: pbData, error: pbError } = await supabase
      .from('vista_presupuestos_base_completa')
      .select('*')
      .eq('id_tarea', initialTaskId)
      .maybeSingle();

    if (!pbError && pbData) {
      presupuestoBase = pbData;

      // Obtener items del PB para clonarlos si existen
      const { data: itemsData } = await supabase
        .from('items_presupuesto_base')
        .select('*')
        .eq('id_presupuesto', pbData.id);
        
      if (itemsData) {
        itemsBase = itemsData.map(item => ({
            ...item,
            es_material: !!item.es_producto, // Lógica base antigua heredada
            cantidad: item.cantidad || 1,
            precio: item.precio || 0,
        }));
      }
    }
  }

  // 2. Cargar diccionarios necesarios para el BudgetForm
  const [edificiosRes, adminsRes, productosRes] = await Promise.all([
    supabase.from('edificios').select('id, nombre, id_administrador').order('nombre'),
    supabase.from('administradores').select('id, nombre').order('nombre'),
    supabase.from('productos').select('*').order('nombre')
  ]);

  const listas = {
    edificios: edificiosRes.data || [],
    administradores: adminsRes.data || [],
    productos: productosRes.data || []
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Nuevo Presupuesto Final</h1>
      {presupuestoBase ? (
          <BudgetForm
            tipo="final"
            idTarea={initialTaskId}
            presupuestoBase={presupuestoBase}
            itemsBase={itemsBase}
            initialData={{
               id_administrador: presupuestoBase.id_administrador,
               id_edificio: presupuestoBase.id_edificio,
               id_presupuesto_base: presupuestoBase.id
            }}
            userId={user.id}
            listas={listas}
          />
      ) : (
          <div className="text-center py-10 bg-muted/20 rounded-lg border border-dashed">
            <h3 className="text-lg font-medium text-muted-foreground">No se encontró un presupuesto base para asociar.</h3>
            <p className="text-sm text-muted-foreground mt-2">Asegúrate de haber accedido desde una tarea válida y que su presupuesto base esté aprobado.</p>
          </div>
      )}
    </div>
  )
}
```
