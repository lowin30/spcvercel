import { validateSessionAndGetUser } from "@/lib/auth-bridge"
import { createServerClient } from "@/lib/supabase-server"
import { BudgetForm } from "@/components/budget-form"
import { redirect } from "next/navigation"

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{
    id: string
  }>
}

export default async function EditarPresupuestoFinalPage({ params }: Props) {
  const user = await validateSessionAndGetUser()
  const { rol } = user

  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id)

  if (isNaN(id)) {
    return <div>ID inválido</div>
  }

  if (rol !== 'admin') {
    redirect("/dashboard")
  }

  const supabase = await createServerClient();

  // 1. Obtener Presupuesto Final Copleto desde la vista
  const { data: presupuestoFinal, error: pfError } = await supabase
    .from('vista_presupuestos_finales_completa')
    .select('*')
    .eq('id', id)
    .single()

  if (pfError || !presupuestoFinal) {
    return <div>Presupuesto no encontrado o no autorizado.</div>
  }

  // Obtener items asociados
  const { data: itemsFinal } = await supabase
    .from('items_presupuesto_final')
    .select('*')
    .eq('id_presupuesto', id);

  let itemsBase = [];
  if (itemsFinal) {
    itemsBase = itemsFinal.map(item => ({
      ...item,
      es_material: !!item.es_material, // Lógica base antigua heredada
      cantidad: item.cantidad || 1,
      precio: item.precio || 0,
    }));
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
      <h1 className="text-2xl font-bold mb-6">Editar Presupuesto Final: {presupuestoFinal.code}</h1>
      <BudgetForm
        tipo="final"
        presupuestoAEditar={presupuestoFinal}
        itemsBase={itemsBase}
        initialData={{
          id_administrador: presupuestoFinal.id_administrador,
          id_edificio: presupuestoFinal.id_edificio,
          id_presupuesto_base: presupuestoFinal.id_presupuesto_base
        }}
        userId={user.id}
        listas={listas}
      />
    </div>
  )
}
