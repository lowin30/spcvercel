"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight
} from "lucide-react"

// Importar Types y el Action Server
import type { TareaEnriquecida } from "./dashboard-supervisor.actions"

// Importar Los Sub-Drawers (Modal Tools)
import { CrearPBTool } from "./components/tools/CrearPBTool"
import { GastoRapidoTool } from "./components/tools/GastoRapidoTool"
import { GlowCard } from "./components/ui-platinum/GlowCard"
import { PremiumHeader } from "./components/ui-platinum/PremiumHeader"
import Link from "next/link"

export function SupervisorDashboard({ initialData }: { initialData: any }) {
  // Estado para los Modal Tools
  const [pbToolOpen, setPbToolOpen] = useState(false);
  const [gastoToolOpen, setGastoToolOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TareaEnriquecida | null>(null);

  // Parsear la info inyectada desde el Layout
  const bloques = initialData?.bloques || { bloque1: [], bloque2: [], bloque3: [] };
  const kpis = initialData?.kpis || {};

  // Handlers para abrir modales
  const handleOpenCrearPB = (tarea: TareaEnriquecida) => {
    setSelectedTask(tarea);
    setPbToolOpen(true);
  }

  const handleOpenGasto = (tarea: TareaEnriquecida) => {
    setSelectedTask(tarea);
    setGastoToolOpen(true);
  }

  return (
    <div className="flex flex-col gap-8 pb-32 w-full max-w-lg mx-auto md:max-w-4xl pt-4">

      {/* 1. HEADER PREMIUM HUD */}
      <PremiumHeader
        gananciaMes={kpis.ganancia_supervisor_mes || 0}
        liquidacionesPendientes={kpis.liquidaciones_pendientes || 0}
      />

      {/* 2. OPERACIONES CRITICAS (RADAR) */}
      <div className="flex flex-col gap-10">

        {/* BLOQUE 1: FRENADA POR MI (Urgencia Maxima) */}
        {bloques.bloque1.length > 0 && (
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-black text-rose-600 dark:text-rose-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
                Accion Requerida - {bloques.bloque1.length}
              </h3>
            </div>

            <div className="flex flex-col gap-4">
              {bloques.bloque1.map((tarea: TareaEnriquecida) => (
                <GlowCard key={tarea.id} glowColor="rose" intensity="high" className="group">
                  <div className="p-5 flex flex-col gap-5">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black text-rose-500/60 tracking-wider uppercase">{tarea.code_tarea}</span>
                        <h4 className="text-xl font-black text-foreground leading-none tracking-tight group-hover:text-rose-600 dark:group-hover:text-rose-300 transition-colors">
                          {tarea.titulo}
                        </h4>
                      </div>
                      {tarea.dias_inactivo > 5 && (
                        <div className="px-2 py-1 bg-rose-100 dark:bg-rose-500/20 border border-rose-300 dark:border-rose-500/30 rounded-lg">
                          <span className="text-[10px] font-black text-rose-600 dark:text-rose-400">{tarea.dias_inactivo}D</span>
                        </div>
                      )}
                    </div>

                    <Button
                      size="lg"
                      className="w-full h-14 font-black bg-rose-600 hover:bg-rose-500 text-white rounded-2xl shadow-lg shadow-rose-600/20 transition-all active:scale-[0.98]"
                      onClick={() => handleOpenCrearPB(tarea)}
                    >
                      <Plus className="mr-2 h-6 w-6" /> CREAR PRESUPUESTO BASE
                    </Button>
                  </div>
                </GlowCard>
              ))}
            </div>
          </section>
        )}

        {/* BLOQUE 3: ZONA DE RENTABILIDAD (En Obra - EL MOTOR) */}
        {bloques.bloque3.length > 0 && (
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                Motor de Ganancia - {bloques.bloque3.length}
              </h3>
            </div>

            <div className="flex flex-col gap-4">
              {bloques.bloque3.map((tarea: TareaEnriquecida) => (
                <GlowCard key={tarea.id} glowColor="slate" className="group">
                  <div className="p-5 flex flex-col gap-6">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black text-muted-foreground tracking-wider uppercase">{tarea.code_tarea}</span>
                        <h4 className="text-xl font-black text-foreground leading-none tracking-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {tarea.titulo}
                        </h4>
                      </div>
                      <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-500/5 border-emerald-300 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-black text-[10px]">OBRA</Badge>
                    </div>

                    {/* Termometro de Rentabilidad Premium */}
                    <div className="bg-muted/50 dark:bg-black/40 rounded-3xl p-4 border border-border space-y-3">
                      <div className="flex justify-between items-end">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Margen Neto</span>
                          <span className={cn(
                            "text-2xl font-black tabular-nums",
                            (tarea.margin_libre || 0) < 50000 ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400'
                          )}>
                            ${(tarea.margin_libre || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Consumo</span>
                          <div className="text-sm font-black text-foreground">{Math.round(tarea.porcentaje_consumido || 0)}%</div>
                        </div>
                      </div>

                      {/* Barra Termica */}
                      <div className="h-3 w-full bg-slate-200 dark:bg-slate-800/50 rounded-full overflow-hidden p-0.5 border border-border">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-1000",
                            (tarea.porcentaje_consumido || 0) > 85 ? 'bg-gradient-to-r from-orange-500 to-rose-500' :
                              (tarea.porcentaje_consumido || 0) > 60 ? 'bg-gradient-to-r from-emerald-500 to-amber-400' :
                                'bg-gradient-to-r from-emerald-600 to-emerald-400'
                          )}
                          style={{ width: `${Math.min(tarea.porcentaje_consumido || 0, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        size="lg"
                        className="flex-1 h-14 font-black bg-foreground text-background hover:bg-foreground/90 rounded-2xl transition-all active:scale-[0.98]"
                        onClick={() => handleOpenGasto(tarea)}
                      >
                        <Plus className="mr-2 h-6 w-6" /> GASTO RAPIDO
                      </Button>

                      <Button size="lg" variant="outline" className="h-14 w-14 rounded-2xl border-border bg-muted/50 hover:bg-muted group/btn" asChild>
                        <Link href={`/dashboard/tareas/${tarea.id}`}>
                          <ArrowRight className="h-6 w-6 text-foreground group-hover/btn:translate-x-1 transition-transform" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </GlowCard>
              ))}
            </div>
          </section>
        )}

        {/* BLOQUE 2: FRENADA POR ADMIN (Espera Silenciosa) */}
        {bloques.bloque2.length > 0 && (
          <section className="flex flex-col gap-4 opacity-60 hover:opacity-100 transition-opacity duration-300">
            <h3 className="text-xs font-black text-amber-600/80 dark:text-amber-500/80 uppercase tracking-[0.2em] flex items-center gap-2 px-1">
              <Clock className="h-3.5 w-3.5" />
              Tuberia Administrativa - {bloques.bloque2.length}
            </h3>

            <div className="grid grid-cols-1 gap-3">
              {bloques.bloque2.map((tarea: TareaEnriquecida) => (
                <div key={tarea.id} className="relative group overflow-hidden rounded-2xl border border-border bg-muted/30 p-4 flex justify-between items-center transition-all hover:bg-muted/50">
                  <div className="flex flex-col truncate pr-4">
                    <span className="text-[10px] font-black text-amber-600/60 dark:text-amber-500/60 uppercase tracking-widest">{tarea.code_tarea}</span>
                    <h4 className="text-sm font-bold text-foreground truncate">{tarea.titulo}</h4>
                  </div>
                  <div className="px-2 py-1 bg-amber-100 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/20 rounded-lg">
                    <span className="text-[10px] font-black text-amber-700 dark:text-amber-500 uppercase">{tarea.estado_nombre}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>

      {/* --- RENDERIZADO DE MODALS INVISIBLES (Drawers Tools) --- */}
      {selectedTask && (
        <>
          <CrearPBTool
            tareaId={selectedTask.id}
            codeTarea={selectedTask.code_tarea}
            diasInactivo={selectedTask.dias_inactivo}
            open={pbToolOpen}
            onOpenChange={setPbToolOpen}
          />
          <GastoRapidoTool
            tareaId={selectedTask.id}
            codeTarea={selectedTask.code_tarea}
            marginLibre={selectedTask.margin_libre || 0}
            open={gastoToolOpen}
            onOpenChange={setGastoToolOpen}
          />
        </>
      )}

    </div>
  )
}
