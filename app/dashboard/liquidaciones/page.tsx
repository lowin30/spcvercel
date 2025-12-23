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
import { Checkbox } from '@/components/ui/checkbox'
import { generarPagoLiquidacionesPDF } from '@/lib/pdf-liquidaciones-bulk-generator'

// Define la estructura de la liquidación del supervisor
interface LiquidacionSupervisor {
  id: number;
  created_at: string;
  ganancia_neta: number;
  ganancia_supervisor: number;
  ganancia_admin: number;
  titulo_tarea: string;
  total_base?: number;
  code_factura?: string;
  email_supervisor?: string;
  email_admin?: string;
  pagada?: boolean;
  fecha_pago?: string | null;
  total_supervisor?: number;
}

export default function LiquidacionesSupervisorPage() {
  const [liquidaciones, setLiquidaciones] = useState<LiquidacionSupervisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [supervisores, setSupervisores] = useState<{ id: string; email: string }[]>([])
  const [supervisorEmail, setSupervisorEmail] = useState<string | '_todos_' | ''>('_todos_')
  const [estado, setEstado] = useState<'no_pagadas' | 'pagadas' | 'todas'>('no_pagadas')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [refresh, setRefresh] = useState(0)

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
          .from(rol === 'supervisor' ? 'vista_liquidaciones_supervisores_listado' : 'vista_liquidaciones_completa')
          .select(
            rol === 'supervisor'
              ? `
            id,
            created_at,
            ganancia_neta,
            ganancia_supervisor,
            ganancia_admin,
            titulo_tarea,
            total_base,
            email_supervisor,
            email_admin,
            pagada,
            fecha_pago
          `
              : `
            id,
            created_at,
            ganancia_neta,
            ganancia_supervisor,
            ganancia_admin,
            titulo_tarea,
            total_base,
            code_factura,
            email_supervisor,
            email_admin
          `
          )
          .order('created_at', { ascending: false });

        if (rol === 'supervisor' && userEmail) {
          // Supervisores: siempre ver solo sus propias liquidaciones
          query = query.eq('email_supervisor', userEmail);
          if (estado === 'no_pagadas') {
            query = query.eq('pagada', false);
          } else if (estado === 'pagadas') {
            query = query.eq('pagada', true);
          }
        }

        if (rol === 'admin' && supervisorEmail && supervisorEmail !== '_todos_') {
          // Admin: puede filtrar por supervisor seleccionado
          query = query.eq('email_supervisor', supervisorEmail)
        }

        

        const { data, error: fetchError } = await query;

        if (fetchError) {
          throw fetchError;
        }

        let merged: any[] = data || []
        if (rol === 'admin' && merged.length > 0) {
          const ids = merged.map((d: any) => d.id)
          const { data: pagos } = await supabase
            .from('liquidaciones_nuevas')
            .select('id, pagada, fecha_pago, total_supervisor')
            .in('id', ids)
          if (pagos && Array.isArray(pagos)) {
            const map = new Map(pagos.map((p: any) => [p.id, p]))
            merged = merged.map((d: any) => ({ ...d, ...(map.get(d.id) || {}) }))
          }
          
          if (estado === 'no_pagadas') {
            merged = merged.filter((d: any) => d.pagada !== true)
          } else if (estado === 'pagadas') {
            merged = merged.filter((d: any) => d.pagada === true)
          }
        }
        setLiquidaciones(merged);
        setSelectedIds([])
      } catch (err: any) {
        console.error("Error fetching supervisor liquidations:", err);
        setError("No se pudieron cargar las liquidaciones. " + err.message);
        toast.error("Error al cargar liquidaciones", { description: err.message });
      } finally {
        setLoading(false);
      }
    };

    fetchLiquidaciones();
  }, [supabase, supervisorEmail, estado, refresh]);

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
      if (userRole !== 'admin') return;
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, email')
        .eq('rol', 'supervisor')
        .order('email')
      if (!error && data) setSupervisores(data)
    }
    fetchSupervisores()
  }, [supabase, userRole])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  
  const visibleSelectableIds = liquidaciones.filter(l => !l.pagada).map(l => l.id)
  const allSelected = visibleSelectableIds.length > 0 && visibleSelectableIds.every(id => selectedIds.includes(id))
  const totalSeleccionado = liquidaciones.reduce((acc, liq) => {
    return selectedIds.includes(liq.id) && !liq.pagada ? acc + (liq.total_supervisor || 0) : acc
  }, 0)

  const toggleSelectAll = (checked: boolean | string) => {
    const isChecked = checked === true || checked === 'indeterminate'
    if (isChecked) {
      setSelectedIds(visibleSelectableIds)
    } else {
      setSelectedIds(prev => prev.filter(id => !visibleSelectableIds.includes(id)))
    }
  }

  const toggleSelect = (id: number, checked: boolean | string) => {
    const isChecked = checked === true || checked === 'indeterminate'
    setSelectedIds(prev => isChecked ? Array.from(new Set([...prev, id])) : prev.filter(x => x !== id))
  }

  const pagarSeleccionadas = async () => {
    if (selectedIds.length === 0) return
    const confirmado = window.confirm(`Confirmar pago de ${selectedIds.length} liquidación(es) por un total de ${formatCurrency(totalSeleccionado)}?`)
    if (!confirmado) return
    const { data, error } = await supabase.rpc('pagar_liquidaciones_supervisores', { p_ids: selectedIds })
    if (error) {
      toast.error('Error al pagar', { description: error.message })
      return
    }
    const result = Array.isArray(data) ? data[0] : (data as any)
    const count = result?.cantidad_actualizadas || 0
    const tot = Number(result?.total_pagado || 0)
    toast.success('Pago masivo completado', { description: `Actualizadas: ${count} — Total: ${formatCurrency(tot)}` })
    try {
      const { data: filas } = await supabase
        .from('vista_liquidaciones_supervisores_listado')
        .select('id, titulo_tarea, total_base, gastos_reales, ganancia_neta, ganancia_supervisor, total_supervisor, email_supervisor')
        .in('id', selectedIds)
        .eq('pagada', true)
      const items = (filas || []).map((f: any) => ({
        titulo_tarea: f.titulo_tarea || 'N/A',
        total_base: f.total_base || 0,
        gastos_reales: f.gastos_reales || 0,
        ganancia_neta: f.ganancia_neta || 0,
        ganancia_supervisor: f.ganancia_supervisor || 0,
        total_supervisor: f.total_supervisor || 0,
      }))
      const supEmail = (supervisorEmail && supervisorEmail !== '_todos_') ? supervisorEmail : ((filas && filas[0]?.email_supervisor) || undefined)
      const blob = await generarPagoLiquidacionesPDF({ liquidaciones: items, totalPagado: tot, supervisorEmail: supEmail })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const fecha = new Date()
      const yyyy = fecha.getFullYear()
      const mm = String(fecha.getMonth() + 1).padStart(2, '0')
      const dd = String(fecha.getDate()).padStart(2, '0')
      const filename = `Pago_Liquidaciones_${yyyy}-${mm}-${dd}_Total_$${Math.round(tot)}.pdf`
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
    }
    setSelectedIds([])
    setRefresh(x => x + 1)
  }

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
          {userRole === 'admin' && (
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
          )}
          {(userRole === 'supervisor' || userRole === 'admin') && (
            <Select value={estado} onValueChange={(v) => setEstado(v as any)}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no_pagadas">No pagadas</SelectItem>
                <SelectItem value="pagadas">Pagadas</SelectItem>
                <SelectItem value="todas">Todas</SelectItem>
              </SelectContent>
            </Select>
          )}
          {userRole === 'admin' && (
            <Button asChild className="w-full sm:w-auto">
              <Link href="/dashboard/liquidaciones/nueva">
                <PlusCircle className="mr-2 h-4 w-4" />
                Nueva Liquidación
              </Link>
            </Button>
          )}
        </div>
      </div>

      {userRole === 'admin' && (
        <Card>
          <CardContent className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm">Seleccionar todo (solo impagas visibles)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm">
                Seleccionadas: <strong>{selectedIds.length}</strong> — Total: <strong>{formatCurrency(totalSeleccionado)}</strong>
              </span>
              <Button onClick={pagarSeleccionadas} disabled={selectedIds.length === 0}>
                Pagar seleccionadas
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vista de tabla para pantallas medianas y grandes */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {userRole === 'admin' && (
                  <TableHead className="w-10">
                    <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
                  </TableHead>
                )}
                <TableHead>Tarea</TableHead>
                <TableHead>Ganancia Neta</TableHead>
                <TableHead>Ganancia Supervisor</TableHead>
                {userRole === 'admin' && (<TableHead>Total Supervisor</TableHead>)}
                {userRole === 'admin' && (<TableHead>Estado</TableHead>)}
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {liquidaciones.length > 0 ? (
                liquidaciones.map((liq) => (
                  <TableRow key={liq.id}>
                    {userRole === 'admin' && (
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(liq.id)}
                          onCheckedChange={(c) => toggleSelect(liq.id, c)}
                          disabled={!!liq.pagada}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">
                      {(userRole === 'admin' || userRole === 'supervisor') ? (
                        <Link href={`/dashboard/liquidaciones/${liq.id}`} className="hover:underline">
                          {liq.titulo_tarea || 'N/A'}
                        </Link>
                      ) : (
                        liq.titulo_tarea || 'N/A'
                      )}
                    </TableCell>
                    <TableCell>{formatCurrency(liq.ganancia_neta)}</TableCell>
                    <TableCell className="font-semibold text-green-600">{formatCurrency(liq.ganancia_supervisor)}</TableCell>
                    {userRole === 'admin' && (
                      <TableCell className="font-semibold">{formatCurrency(liq.total_supervisor || 0)}</TableCell>
                    )}
                    {userRole === 'admin' && (
                      <TableCell>
                        {liq.pagada ? (
                          <Badge variant="secondary">Pagada</Badge>
                        ) : (
                          <Badge variant="outline">No pagada</Badge>
                        )}
                      </TableCell>
                    )}
                    <TableCell>{formatDate(liq.created_at)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={userRole === 'admin' ? 7 : 4} className="text-center h-24">
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
                  
                  <div className="text-sm text-muted-foreground">Ganancia Neta:</div>
                  <div className="text-sm font-medium">{formatCurrency(liq.ganancia_neta)}</div>
                  
                  <div className="text-sm text-muted-foreground">Ganancia Supervisor:</div>
                  <div className="text-sm font-medium text-green-600">{formatCurrency(liq.ganancia_supervisor)}</div>

                  {userRole === 'admin' && (
                    <>
                      <div className="text-sm text-muted-foreground">Total Supervisor:</div>
                      <div className="text-sm font-medium">{formatCurrency(liq.total_supervisor || 0)}</div>
                    </>
                  )}

                  {userRole === 'admin' && (
                    <>
                      <div className="text-sm text-muted-foreground">Estado:</div>
                      <div className="text-sm font-medium">{liq.pagada ? 'Pagada' : 'No pagada'}</div>
                    </>
                  )}
                  
                  <div className="text-sm text-muted-foreground">Fecha:</div>
                  <div className="text-sm font-medium">{formatDate(liq.created_at)}</div>
                </div>
                {(userRole === 'admin' || userRole === 'supervisor') && (
                  <div className="pt-2 flex items-center gap-3">
                    {userRole === 'admin' && (
                      <Checkbox
                        checked={selectedIds.includes(liq.id)}
                        onCheckedChange={(c) => toggleSelect(liq.id, c)}
                        disabled={!!liq.pagada}
                      />
                    )}
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