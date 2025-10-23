"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ProcesadorImagen } from "@/components/procesador-imagen"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { HistorialGastos } from "@/components/historial-gastos"
import { HistorialGastosOCR } from "@/components/historial-gastos-ocr"
import { HistorialJornalesTarea } from "@/components/historial-jornales-tarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase-client"
import { UserSessionData, GastoCompleto } from "@/lib/types"
import { Plus, Receipt, DollarSign, Loader2, CheckCircle2, AlertCircle, Check, X, ArrowLeft, CalendarDays } from "lucide-react"

interface Tarea {
  id: number
  titulo: string
  code: string
}

interface Liquidacion {
  gastos_reembolsados: number;
  created_at: string;
}

export default function GastosPage() {
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [usuario, setUsuario] = useState<UserSessionData | null>(null)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [tareaSeleccionada, setTareaSeleccionada] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const [allNonLiquidatedExpenses, setAllNonLiquidatedExpenses] = useState<GastoCompleto[]>([])
  const [lastLiquidation, setLastLiquidation] = useState<Liquidacion | null>(null)
  const [weekStats, setWeekStats] = useState({ total: 0, count: 0 })
  const [pendingStats, setPendingStats] = useState({ total: 0, count: 0 })
  const [historyFilter, setHistoryFilter] = useState<'all' | 'this_week' | 'pending_previous'>('all')
  const [filteredHistory, setFilteredHistory] = useState<GastoCompleto[]>([])

  const cargarDatos = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!supabase) throw new Error("Cliente Supabase no inicializado");

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) throw new Error(sessionError?.message || "No hay sesión activa");

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('id, email, rol')
        .eq('id', session.user.id)
        .single();
      if (userError) throw new Error(userError.message);
      setUsuario(userData as UserSessionData);

      let gastosQuery = supabase
        .from('vista_gastos_tarea_completa')
        .select('*')
        .eq('liquidado', false);
      if (userData.rol === 'trabajador') {
        gastosQuery = gastosQuery.eq('id_usuario', session.user.id);
      }

      const [gastosResponse, liquidacionResponse, tareasResponse] = await Promise.all([
        gastosQuery.order('fecha_gasto', { ascending: false }),
        supabase
          .from('liquidaciones_trabajadores')
          .select('gastos_reembolsados, created_at')
          .eq('id_trabajador', session.user.id)
          .order('created_at', { ascending: false })
          .limit(1),
        userData.rol === 'trabajador' ?
          supabase.from('trabajadores_tareas').select('tareas(id, titulo, code)').eq('id_trabajador', session.user.id) :
          supabase.from('tareas').select('id, titulo, code').eq('finalizada', false).order('titulo')
      ]);

      if (gastosResponse.error) throw new Error(gastosResponse.error.message);
      if (liquidacionResponse.error) throw new Error(liquidacionResponse.error.message);
      if (tareasResponse.error) throw new Error(tareasResponse.error.message);

      const gastos = gastosResponse.data as GastoCompleto[] || [];
      setAllNonLiquidatedExpenses(gastos);
      setLastLiquidation(liquidacionResponse.data?.[0] || null);

      const tareasData = userData.rol === 'trabajador' ? tareasResponse.data?.map((item: any) => item.tareas).filter(Boolean) || [] : tareasResponse.data || [];
      setTareas(tareasData);

      const hoy = new Date();
      const inicioSemana = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - hoy.getDay() + (hoy.getDay() === 0 ? -6 : 1));
      inicioSemana.setHours(0, 0, 0, 0);

      const gastosDeLaSemana = gastos.filter((g: GastoCompleto) => new Date(g.fecha_gasto) >= inicioSemana);
      const gastosPendientesAnteriores = gastos.filter((g: GastoCompleto) => new Date(g.fecha_gasto) < inicioSemana);

      setWeekStats({
        total: gastosDeLaSemana.reduce((sum, g) => sum + g.monto, 0),
        count: gastosDeLaSemana.length
      });

      setPendingStats({
        total: gastosPendientesAnteriores.reduce((sum, g) => sum + g.monto, 0),
        count: gastosPendientesAnteriores.length
      });

    } catch (error: any) {
      console.error("Error cargando datos:", error);
      setError(error.message || "Error inesperado al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    const hoy = new Date();
    const inicioSemana = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - hoy.getDay() + (hoy.getDay() === 0 ? -6 : 1));
    inicioSemana.setHours(0, 0, 0, 0);

    if (historyFilter === 'this_week') {
      const gastosDeLaSemana = allNonLiquidatedExpenses.filter((g: GastoCompleto) => new Date(g.fecha_gasto) >= inicioSemana);
      setFilteredHistory(gastosDeLaSemana);
    } else if (historyFilter === 'pending_previous') {
      const gastosPendientesAnteriores = allNonLiquidatedExpenses.filter((g: GastoCompleto) => new Date(g.fecha_gasto) < inicioSemana);
      setFilteredHistory(gastosPendientesAnteriores);
    } else {
      setFilteredHistory(allNonLiquidatedExpenses);
    }
  }, [historyFilter, allNonLiquidatedExpenses]);

  if (loading) {
    return (
      <div className="container py-6">
        <div className="flex justify-center items-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Cargando...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container py-6">
        <div className="bg-red-50 p-4 rounded-md mb-4">
          <h2 className="text-red-800 text-lg font-medium">Error</h2>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{mostrarFormulario ? 'Registrar Nuevo Gasto' : 'Gastos de Materiales'}</h1>
        {!mostrarFormulario && (
          <Button 
            onClick={() => setMostrarFormulario(true)} 
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Registrar Gasto
          </Button>
        )}
      </div>

      {mostrarFormulario ? (
        !tareaSeleccionada ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Seleccionar Tarea</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setMostrarFormulario(false);
                    setTareaSeleccionada("");
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tarea">Seleccionar Tarea *</Label>
                <Select value={tareaSeleccionada} onValueChange={setTareaSeleccionada}>
                  <SelectTrigger id="tarea">
                    <SelectValue placeholder="Selecciona una tarea" />
                  </SelectTrigger>
                  <SelectContent>
                    {tareas.map((tarea) => (
                      <SelectItem key={tarea.id} value={tarea.id.toString()}>
                        {tarea.code} - {tarea.titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {tareas.find(t => t.id === Number(tareaSeleccionada))?.code} - {tareas.find(t => t.id === Number(tareaSeleccionada))?.titulo}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Vista detallada de gastos y jornales</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTareaSeleccionada("");
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="gastos" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="gastos" className="flex items-center gap-2">
                    <Receipt className="h-4 w-4" />
                    Gastos
                  </TabsTrigger>
                  <TabsTrigger value="jornales" className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    Jornales
                  </TabsTrigger>
                  <TabsTrigger value="registrar" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Registrar
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="gastos" className="mt-4">
                  <HistorialGastosOCR
                    tareaId={Number(tareaSeleccionada)}
                    userRole={usuario?.rol}
                    userId={usuario?.id}
                  />
                </TabsContent>
                
                <TabsContent value="jornales" className="mt-4">
                  <HistorialJornalesTarea
                    tareaId={Number(tareaSeleccionada)}
                    userRole={usuario?.rol}
                    userId={usuario?.id}
                  />
                </TabsContent>
                
                <TabsContent value="registrar" className="mt-4">
                  <ProcesadorImagen
                    tareaId={Number(tareaSeleccionada)}
                    tareaCodigo={tareas.find(t => t.id === Number(tareaSeleccionada))?.code}
                    tareaTitulo={tareas.find(t => t.id === Number(tareaSeleccionada))?.titulo}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )
      ) : (
        <>
          {/* Resumen rápido */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card onClick={() => setHistoryFilter('this_week')} className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gastos de Esta Semana</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${weekStats.total.toLocaleString('es-CL')}</div>
                <p className="text-xs text-muted-foreground">{weekStats.count} comprobantes registrados</p>
              </CardContent>
            </Card>
            <Card onClick={() => pendingStats.total > 0 && setHistoryFilter('pending_previous')} className={pendingStats.total > 0 ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pendiente de Pago (Acumulado)</CardTitle>
                {pendingStats.total === 0 ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <AlertCircle className="h-4 w-4 text-red-500" />}
              </CardHeader>
              <CardContent>
                {pendingStats.total === 0 ? (
                  <>
                    <div className="text-2xl font-bold text-green-600">¡Estás al día!</div>
                    <p className="text-xs text-muted-foreground">No hay gastos atrapados.</p>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-red-600">${pendingStats.total.toLocaleString('es-CL')}</div>
                    <p className="text-xs text-muted-foreground">{pendingStats.count} gastos de semanas anteriores sin pagar.</p>
                  </>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Último Reembolso Pagado</CardTitle>
                <Check className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {lastLiquidation ? `$${lastLiquidation.gastos_reembolsados.toLocaleString('es-CL')}` : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {lastLiquidation ? `Pagado el ${new Date(lastLiquidation.created_at).toLocaleDateString('es-CL')}` : '---'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Historial de Gastos */}
          <HistorialGastos gastos={filteredHistory} isLoading={loading} />
        </>
      )}
    </div>
  )
}
