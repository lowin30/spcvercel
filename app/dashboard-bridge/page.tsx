import { createServerClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

// Esta página actúa como un puente de enrutamiento en el servidor.
// Verifica la sesión del usuario y lo redirige a la página correcta (/login o /dashboard).
// No renderiza ninguna UI, solo realiza la lógica de redirección.
export default async function DashboardBridgePage() {
  const supabase = createServerClient();

  const { data, error } = await supabase.auth.getSession();

  // Si hay un error al obtener la sesión o no hay sesión, redirigir al login.
  if (error || !data.session) {
    redirect("/login");
  }

  // Si hay una sesión activa, redirigir al dashboard principal.
  redirect("/dashboard");

  // No se renderiza nada, la redirección ocurre en el servidor.
  // Se retorna null para cumplir con la firma de un componente React.
  return null;
}
