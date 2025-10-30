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
import { ResumenLiquidaciones } from "@/components/resumen-liquidaciones"
import { HistorialJornalesGlobal } from "@/components/historial-jornales-global"
import { HistorialPagos } from "@/components/historial-pagos"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase-client"
import { UserSessionData, GastoCompleto } from "@/lib/types"
import { Plus, Receipt, DollarSign, Loader2, CheckCircle2, AlertCircle, Check, X, ArrowLeft, CalendarDays, TrendingUp } from "lucide-react"

interface Tarea {
  id: number
  titulo: string
  code: string
}

interface Liquidacion {
  gastos_reembolsados: number;
  created_at: string;
  total_pagar: number;
}

interface ParteTrabajoConSalario {
  id: number;
  fecha: string;
  tipo_jornada: 'dia_completo' | 'medio_dia';
  id_tarea: number;
  id_trabajador: string;
  liquidado: boolean;
  titulo_tarea: string;
  code_tarea: string;
  nombre_edificio: string;
  salario_diario: number;
}

interface ResumenPorTarea {
  id_tarea: number;
  titulo_tarea: string;
  code_tarea: string;
  gastos_monto: number;
  gastos_count: number;
  jornales_monto: number;
  jornales_dias: number;
  total_tarea: number;
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
  const [jornalesPendientes, setJornalesPendientes] = useState<ParteTrabajoConSalario[]>([])
  const [totalJornales, setTotalJornales] = useState(0)
  const [totalDias, setTotalDias] = useState(0)
  const [desglosePorTarea, setDesglosePorTarea] = useState<ResumenPorTarea[]>([])
  const [tabActual, setTabActual] = useState('resumen')

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

      let idsTareasSuper: number[] = [];
      if (userData.rol === 'supervisor') {
        const { data: tareasSuper, error: tareasError } = await supabase
          .from('supervisores_tareas')
          .select('id_tarea')
          .eq('id_supervisor', session.user.id);
        if (tareasError) throw new Error(tareasError.message);
        idsTareasSuper = (tareasSuper || []).map((t: any) => t.id_tarea);
      }

      let gastosQuery = supabase
        .from('vista_gastos_tarea_completa')
        .select('*')
        .eq('liquidado', false);
      if (userData.rol === 'trabajador') {
        gastosQuery = gastosQuery.eq('id_usuario', session.user.id);
      } else if (userData.rol === 'supervisor') {
        if (idsTareasSuper.length > 0) {
          const idsList = idsTareasSuper.join(',');
          gastosQuery = gastosQuery.or(`id_usuario.eq.${session.user.id},id_tarea.in.(${idsList})`);
        } else {
          gastosQuery = gastosQuery.eq('id_usuario', session.user.id);
        }
      }

      // Construir consulta de jornales según rol (para el Desglose por Tarea)
      let jornalesQuery = supabase
        .from('vista_partes_trabajo_completa')
        .select('*')
        .eq('liquidado', false);

      if (userData.rol === 'trabajador') {
        jornalesQuery = jornalesQuery.eq('id_trabajador', session.user.id);
      } else if (userData.rol === 'supervisor') {
        if (idsTareasSuper.length > 0) {
          const idsList = idsTareasSuper.join(',');
          jornalesQuery = jornalesQuery.or(`id_trabajador.eq.${session.user.id},id_tarea.in.(${idsList})`);
        } else {
          jornalesQuery = jornalesQuery.eq('id_trabajador', session.user.id);
        }
      }

      const [gastosResponse, liquidacionResponse, tareasResponse, jornalesResponse] = await Promise.all([
        gastosQuery.order('fecha_gasto', { ascending: false }),
        supabase
          .from('liquidaciones_trabajadores')
          .select('gastos_reembolsados, created_at, total_pagar')
          .eq('id_trabajador', session.user.id)
          .order('created_at', { ascending: false })
          .limit(1),
        userData.rol === 'trabajador' ?
          supabase.from('trabajadores_tareas').select('tareas(id, titulo, code, finalizada)').eq('id_trabajador', session.user.id) :
          userData.rol === 'supervisor' ?
          supabase.from('supervisores_tareas').select('tareas(id, titulo, code, finalizada)').eq('id_supervisor', session.user.id) :
          supabase.from('tareas').select('id, titulo, code').eq('finalizada', false).order('titulo'),
        jornalesQuery.order('fecha', { ascending: false })
      ]);

      if (gastosResponse.error) throw new Error(gastosResponse.error.message);
      if (liquidacionResponse.error) throw new Error(liquidacionResponse.error.message);
      if (tareasResponse.error) throw new Error(tareasResponse.error.message);
      if (jornalesResponse.error) throw new Error(jornalesResponse.error.message);

      const gastos = gastosResponse.data as GastoCompleto[] || [];
      setAllNonLiquidatedExpenses(gastos);
      setLastLiquidation(liquidacionResponse.data?.[0] || null);

      const tareasData = (userData.rol === 'trabajador' || userData.rol === 'supervisor')
        ? (tareasResponse.data?.map((item: any) => item.tareas).filter((t: any) => t && t.finalizada === false) || [])
        : (tareasResponse.data || []);
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

      // Procesar jornales pendientes
      const jornalesData = jornalesResponse.data || [];
      const jornalesConSalario: ParteTrabajoConSalario[] = [];

      for (const parte of jornalesData) {
        // Obtener salario del trabajador
        const { data: configData } = await supabase
          .from('configuracion_trabajadores')
          .select('salario_diario')
          .eq('id_trabajador', parte.id_trabajador)
          .single();

        if (configData) {
          jornalesConSalario.push({
            ...parte,
            salario_diario: configData.salario_diario
          });
        }
      }

      setJornalesPendientes(jornalesConSalario);

      // Calcular total de jornales
      const totalJornalesMonto = jornalesConSalario.reduce((sum, parte) => {
        const monto = parte.tipo_jornada === 'dia_completo' ? parte.salario_diario : parte.salario_diario * 0.5;
        return sum + monto;
      }, 0);

      const totalDiasTrabajados = jornalesConSalario.reduce((sum, parte) => {
        return sum + (parte.tipo_jornada === 'dia_completo' ? 1 : 0.5);
      }, 0);

      setTotalJornales(totalJornalesMonto);
      setTotalDias(totalDiasTrabajados);

      // Calcular desglose por tarea
      const tareaMap: Record<number, ResumenPorTarea> = {};

      // Agregar gastos
      gastos.forEach(gasto => {
        if (!tareaMap[gasto.id_tarea]) {
          tareaMap[gasto.id_tarea] = {
            id_tarea: gasto.id_tarea,
            titulo_tarea: gasto.titulo_tarea,
            code_tarea: gasto.code_tarea,
            gastos_monto: 0,
            gastos_count: 0,
            jornales_monto: 0,
            jornales_dias: 0,
            total_tarea: 0
          };
        }
        tareaMap[gasto.id_tarea].gastos_monto += gasto.monto;
        tareaMap[gasto.id_tarea].gastos_count += 1;
      });

      // Agregar jornales
      jornalesConSalario.forEach(parte => {
        if (!tareaMap[parte.id_tarea]) {
          tareaMap[parte.id_tarea] = {
            id_tarea: parte.id_tarea,
            titulo_tarea: parte.titulo_tarea,
            code_tarea: parte.code_tarea,
            gastos_monto: 0,
            gastos_count: 0,
            jornales_monto: 0,
            jornales_dias: 0,
            total_tarea: 0
          };
        }
        const monto = parte.tipo_jornada === 'dia_completo' ? parte.salario_diario : parte.salario_diario * 0.5;
        const dias = parte.tipo_jornada === 'dia_completo' ? 1 : 0.5;
        tareaMap[parte.id_tarea].jornales_monto += monto;
        tareaMap[parte.id_tarea].jornales_dias += dias;
      });

      // Calcular totales por tarea
      const resumenTareas = Object.values(tareaMap).map(tarea => ({
        ...tarea,
        total_tarea: tarea.gastos_monto + tarea.jornales_monto
      }));

      setDesglosePorTarea(resumenTareas.sort((a, b) => b.total_tarea - a.total_tarea));

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
        <div>
          <h1 className="text-3xl font-bold">{mostrarFormulario ? 'Registrar Nuevo Gasto' : 'Mi Centro de Liquidaciones'}</h1>
          {!mostrarFormulario && (
            <p className="text-muted-foreground mt-1">Gestiona tus gastos, jornales y pagos en un solo lugar</p>
          )}
        </div>
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
        <Tabs value={tabActual} onValueChange={setTabActual} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="resumen" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Resumen</span>
            </TabsTrigger>
            <TabsTrigger value="gastos" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              <span className="hidden sm:inline">Gastos</span>
            </TabsTrigger>
            <TabsTrigger value="jornales" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">Jornales</span>
            </TabsTrigger>
            <TabsTrigger value="historial" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Pagos</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="resumen" className="mt-6">
            <ResumenLiquidaciones
              userId={usuario?.id || ''}
              userRole={usuario?.rol || 'trabajador'}
              gastosPendientes={{
                total: allNonLiquidatedExpenses.reduce((sum, g) => sum + g.monto, 0),
                count: allNonLiquidatedExpenses.length
              }}
              jornalesPendientes={{
                total: totalJornales,
                count: jornalesPendientes.length,
                dias: totalDias
              }}
              ultimaLiquidacion={lastLiquidation ? {
                monto: lastLiquidation.total_pagar,
                fecha: lastLiquidation.created_at
              } : null}
              desglosePorTarea={desglosePorTarea}
            />
          </TabsContent>

          <TabsContent value="gastos" className="mt-6">
            <HistorialGastos gastos={filteredHistory} isLoading={loading} />
          </TabsContent>

          <TabsContent value="jornales" className="mt-6">
            <HistorialJornalesGlobal
              userId={usuario?.id || ''}
              userRole={usuario?.rol || 'trabajador'}
              showOnlyPending={true}
            />
          </TabsContent>

          <TabsContent value="historial" className="mt-6">
            <HistorialPagos
              userId={usuario?.id || ''}
              userRole={usuario?.rol || 'trabajador'}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
