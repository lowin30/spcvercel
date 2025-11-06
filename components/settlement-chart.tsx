"use client"

import { useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Settlement {
  gastos_reales: number
  ganancia_supervisor: number
  ganancia_admin: number
  presupuesto_base: {
    materiales: number
    mano_obra: number
  }
  presupuesto_final: {
    materiales: number
    mano_obra: number
  }
}

interface SettlementChartProps {
  settlement: Settlement
}

export function SettlementChart({ settlement }: SettlementChartProps) {
  const pieChartRef = useRef<HTMLCanvasElement>(null)
  const barChartRef = useRef<HTMLCanvasElement>(null)
  const pieChartInstance = useRef<any>(null)
  const barChartInstance = useRef<any>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { Chart, registerables } = await import("chart.js")
      Chart.register(...registerables)

      if (!pieChartRef.current || !barChartRef.current || cancelled) return
      // Destruir gráficos existentes si los hay
      if (pieChartInstance.current) {
        pieChartInstance.current.destroy()
      }
      if (barChartInstance.current) {
        barChartInstance.current.destroy()
      }

      // Datos para el gráfico de pastel
      const pieData = {
        labels: ["Gastos reales", "Ganancia supervisor", "Ganancia administrador"],
        datasets: [
          {
            data: [settlement.gastos_reales, settlement.ganancia_supervisor, settlement.ganancia_admin],
            backgroundColor: ["#94a3b8", "#22c55e", "#3b82f6"],
            hoverOffset: 4,
          },
        ],
      }

      // Datos para el gráfico de barras
      const barData = {
        labels: ["Presupuesto Base", "Presupuesto Final", "Resultado Real"],
        datasets: [
          {
            label: "Materiales",
            data: [
              settlement.presupuesto_base.materiales,
              settlement.presupuesto_final.materiales,
              settlement.gastos_reales * 0.6, // Estimación para visualización
            ],
            backgroundColor: "#3b82f6",
          },
          {
            label: "Mano de obra",
            data: [
              settlement.presupuesto_base.mano_obra,
              settlement.presupuesto_final.mano_obra,
              settlement.gastos_reales * 0.4, // Estimación para visualización
            ],
            backgroundColor: "#22c55e",
          },
          {
            label: "Ganancia",
            data: [0, 0, settlement.ganancia_supervisor + settlement.ganancia_admin],
            backgroundColor: "#f59e0b",
          },
        ],
      }

      // Crear gráfico de pastel
      pieChartInstance.current = new Chart(pieChartRef.current as HTMLCanvasElement, {
        type: "pie",
        data: pieData,
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: "bottom",
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const label = context.label || ""
                  const value = context.raw as number
                  const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0)
                  const percentage = ((value / total) * 100).toFixed(1)
                  return `${label}: $${value.toLocaleString()} (${percentage}%)`
                },
              },
            },
          },
        },
      })

      // Crear gráfico de barras
      barChartInstance.current = new Chart(barChartRef.current as HTMLCanvasElement, {
        type: "bar",
        data: barData,
        options: {
          responsive: true,
          scales: {
            x: {
              stacked: true,
            },
            y: {
              stacked: true,
              ticks: {
                callback: (value) => "$" + Number(value).toLocaleString(),
              },
            },
          },
          plugins: {
            legend: {
              position: "bottom",
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const label = context.dataset.label || ""
                  const value = context.raw as number
                  return `${label}: $${value.toLocaleString()}`
                },
              },
            },
          },
        },
      })
    })()

    return () => {
      cancelled = true
      if (pieChartInstance.current) {
        pieChartInstance.current.destroy()
      }
      if (barChartInstance.current) {
        barChartInstance.current.destroy()
      }
    }
  }, [settlement])

  return (
    <Tabs defaultValue="distribution">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="distribution">Distribución</TabsTrigger>
        <TabsTrigger value="comparison">Comparación</TabsTrigger>
      </TabsList>
      <TabsContent value="distribution" className="mt-4">
        <Card>
          <CardContent className="p-4">
            <div className="h-[300px] flex items-center justify-center">
              <canvas ref={pieChartRef}></canvas>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="comparison" className="mt-4">
        <Card>
          <CardContent className="p-4">
            <div className="h-[300px] flex items-center justify-center">
              <canvas ref={barChartRef}></canvas>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
