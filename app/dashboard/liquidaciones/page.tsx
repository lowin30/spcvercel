"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { PlusCircle, Loader2, AlertCircle } from 'lucide-react'
import { formatDate } from '@/lib/date-utils'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Define la estructura de la liquidación del supervisor
interface LiquidacionSupervisor {
  id: number;
  created_at: string;
  ganancia_neta: number;
  ganancia_supervisor: number;
  ganancia_admin: number;
  titulo_tarea: string;
  code_presupuesto_final: string;
  total_base?: number;
  code_factura?: string;
  email_supervisor?: string;
  email_admin?: string;
}

export default function LiquidacionesSupervisorPage() {
  const [liquidaciones, setLiquidaciones] = useState<LiquidacionSupervisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [supervisores, setSupervisores] = useState<{ id: string; email: string }[]>([])
  const [supervisorEmail, setSupervisorEmail] = useState<string | '_todos_' | ''>('_todos_')

  useEffect(() => {
    const fetchLiquidaciones = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        const userEmail = session?.user?.email || null;

        let rol: string | null = null;
        if (userId) {
          const { data: userData } = await supabase
            .from('usuarios')
            .select('rol')
            .eq('id', userId)
            .single();
          rol = userData?.rol || null;
          setUserRole(rol);
        }

        let query = supabase
          .from('vista_liquidaciones_completa')
          .select(`
            id,
            created_at,
            ganancia_neta,
            ganancia_supervisor,
            ganancia_admin,
            titulo_tarea,
            code_presupuesto_final,
            total_base,
            code_factura,
            email_supervisor,
            email_admin
          `)
          .order('created_at', { ascending: false });

        if (rol === 'supervisor' && userEmail) {
          query = query.eq('email_supervisor', userEmail);
        }

        if (supervisorEmail && supervisorEmail !== '_todos_') {
          query = query.eq('email_supervisor', supervisorEmail)
        }

        const { data, error: fetchError } = await query;

        if (fetchError) {
          throw fetchError;
        }

        setLiquidaciones(data || []);
      } catch (err: any) {
        console.error("Error fetching supervisor liquidations:", err);
        setError("No se pudieron cargar las liquidaciones. " + err.message);
        toast.error("Error al cargar liquidaciones", { description: err.message });
      } finally {
        setLoading(false);
      }
    };

    fetchLiquidaciones();
  }, [supabase, supervisorEmail]);

  // Cargar rol del usuario para habilitar navegación al detalle solo a admin/supervisor
  useEffect(() => {
    const cargarRol = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        if (!userId) return;
        const { data } = await supabase
          .from('usuarios')
          .select('rol')
          .eq('id', userId)
          .single();
        setUserRole(data?.rol || null);
      } catch (e) {
        // ignorar
      }
    };
    cargarRol();
  }, [supabase]);

  useEffect(() => {
    const fetchSupervisores = async () => {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, email')
        .eq('rol', 'supervisor')
        .order('email')
      if (!error && data) setSupervisores(data)
    }
    fetchSupervisores()
  }, [supabase])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Cargando liquidaciones...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Card className="border-destructive bg-destructive/10">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertCircle className="mr-2 h-5 w-5" />
              Error al Cargar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">Liquidaciones de Proyectos</h1>
          <p className="text-muted-foreground">
            Listado de ganancias calculadas por proyecto finalizado.
          </p>
        </div>
        <div className="flex w-full sm:w-auto flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Select
            value={supervisorEmail || '_todos_'}
            onValueChange={(v) => setSupervisorEmail(v)}
          >
            <SelectTrigger className="w-full sm:w-[240px]">
              <SelectValue placeholder="Todos los supervisores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_todos_">Todos los supervisores</SelectItem>
              {supervisores.map(s => (
                <SelectItem key={s.id} value={s.email}>{s.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/dashboard/liquidaciones/nueva">
              <PlusCircle className="mr-2 h-4 w-4" />
              Nueva Liquidación
            </Link>
          </Button>
        </div>
      </div>

      {/* Vista de tabla para pantallas medianas y grandes */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarea</TableHead>
                <TableHead>P. Final</TableHead>
                <TableHead>Ganancia Neta</TableHead>
                <TableHead>Ganancia Supervisor</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {liquidaciones.length > 0 ? (
                liquidaciones.map((liq) => (
                  <TableRow key={liq.id}>
                    <TableCell className="font-medium">
                      {(userRole === 'admin' || userRole === 'supervisor') ? (
                        <Link href={`/dashboard/liquidaciones/${liq.id}`} className="hover:underline">
                          {liq.titulo_tarea || 'N/A'}
                        </Link>
                      ) : (
                        liq.titulo_tarea || 'N/A'
                      )}
                    </TableCell>
                    <TableCell>{liq.code_presupuesto_final || 'N/A'}</TableCell>
                    <TableCell>{formatCurrency(liq.ganancia_neta)}</TableCell>
                    <TableCell className="font-semibold text-green-600">{formatCurrency(liq.ganancia_supervisor)}</TableCell>
                    <TableCell>{formatDate(liq.created_at)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    No se encontraron liquidaciones.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Vista de tarjetas para móvil */}
      <div className="md:hidden space-y-4">
        {liquidaciones.length > 0 ? (
          liquidaciones.map((liq) => (
            <Card key={liq.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-md">
                  {liq.titulo_tarea || 'Tarea no especificada'}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3 pt-0 space-y-2">
                <div className="grid grid-cols-2 gap-1">
                  <div className="text-sm text-muted-foreground">P. Final:</div>
                  <div className="text-sm font-medium">{liq.code_presupuesto_final || 'N/A'}</div>
                  
                  <div className="text-sm text-muted-foreground">Ganancia Neta:</div>
                  <div className="text-sm font-medium">{formatCurrency(liq.ganancia_neta)}</div>
                  
                  <div className="text-sm text-muted-foreground">Ganancia Supervisor:</div>
                  <div className="text-sm font-medium text-green-600">{formatCurrency(liq.ganancia_supervisor)}</div>
                  
                  <div className="text-sm text-muted-foreground">Fecha:</div>
                  <div className="text-sm font-medium">{formatDate(liq.created_at)}</div>
                </div>
                {(userRole === 'admin' || userRole === 'supervisor') && (
                  <div className="pt-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/dashboard/liquidaciones/${liq.id}`}>Ver detalle</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No se encontraron liquidaciones.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}