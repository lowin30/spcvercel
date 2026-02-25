import { getPresupuestoBaseById } from "@/app/dashboard/presupuestos-base/loader";
import { PresupuestoDetailClient } from "./presupuesto-detail-client";
import { notFound, redirect } from "next/navigation";
import { validateSessionAndGetUser } from "@/lib/auth-bridge";

export default async function PresupuestoBaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // 1. Seguridad: Verificar sesión válida
  try {
    await validateSessionAndGetUser();
  } catch (error) {
    redirect("/login");
  }

  // 2. Fetching de datos (Server-Side)
  const presupuesto = await getPresupuestoBaseById(id);

  if (!presupuesto) {
    return notFound();
  }

  // 3. Renderizar Cliente con datos listos
  return <PresupuestoDetailClient presupuesto={presupuesto} />;
}
