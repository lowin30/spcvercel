// dossier maestro de auditoria financiera y forense SPC
// portrait A4, mobile-first, jerarquia: ganancia neta dominante
// usa jsPDF + jspdf-autotable — misma pila que pdf-facturas-generator.ts

import { jsPDF } from "jspdf"
import { default as autoTable } from "jspdf-autotable"
import { format } from "date-fns"
import { es } from "date-fns/locale"

import type {
  BalanceTareaDTO,
  BalanceSupervisorAgrupado,
  BalanceAdministradorAgrupado,
} from "@/app/dashboard/auditoria/loader"

// ─── helpers ────────────────────────────────────────────────────────────────

const $ = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`
const pct = (n: number) => `${n}%`

function addPageHeader(doc: jsPDF, titulo: string, y: number): number {
  doc.setFontSize(8)
  doc.setFont("helvetica", "italic")
  doc.setTextColor(160, 160, 160)
  doc.text("SPC - dossier de auditoria financiera y forense", 14, y)
  doc.text(titulo, doc.internal.pageSize.width - 14, y, { align: "right" })
  doc.setDrawColor(220, 220, 220)
  doc.line(14, y + 2, doc.internal.pageSize.width - 14, y + 2)
  doc.setTextColor(0, 0, 0)
  return y + 8
}

function addSection(doc: jsPDF, titulo: string, y: number): number {
  doc.setFontSize(9)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(30, 30, 30)
  doc.setFillColor(240, 240, 240)
  doc.rect(14, y, doc.internal.pageSize.width - 28, 7, "F")
  doc.text(titulo.toUpperCase(), 16, y + 5)
  doc.setTextColor(0, 0, 0)
  return y + 10
}

// ─── tipos de entrada ────────────────────────────────────────────────────────

export interface DatosAuditoriaPDF {
  balances: BalanceTareaDTO[]
  supervisores: BalanceSupervisorAgrupado[]
  administradores: BalanceAdministradorAgrupado[]
  edificios?: Array<{
    nombre_edificio: string
    nombre_administrador: string
    tareas_totales: number
    total_facturado: number
    total_ajustes: number
    gastos_totales: number
    ganancia_supervisor: number
    ganancia_neta_spc: number
    margen_spc_pct: number
  }>
  rubros?: Array<{
    rubro: string
    obras_totales: number
    obras_liquidadas: number
    total_facturado: number
    total_ajustes: number
    gastos_totales: number
    gastos_pendientes: number
    ganancia_supervisor: number
    ganancia_neta_spc: number
    margen_spc_pct: number
  }>
  totalCobrado: number
  totalGastado: number
  totalGanancia: number
  totalFacturado?: number
  totalAjustes?: number
  totalGananciaSupervisores?: number
  filtrosActivos?: {
    mesDesde?: string
    mesHasta?: string
    filtroEdificio?: string
    filtroAdmin?: string
    filtroSupervisor?: string
    busqueda?: string
  }
}

// ─── generador principal ─────────────────────────────────────────────────────

export async function generarAuditoriaPDF(datos: DatosAuditoriaPDF): Promise<Blob> {
  const { 
    balances, 
    supervisores, 
    administradores, 
    edificios, 
    rubros,
    totalCobrado, 
    totalGastado, 
    totalGanancia, 
    totalFacturado, 
    totalAjustes, 
    totalGananciaSupervisores, 
    filtrosActivos 
  } = datos

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  })

  const W = doc.internal.pageSize.width   // 210
  const H = doc.internal.pageSize.height  // 297
  const ML = 14  // margen izquierdo
  const MR = 14  // margen derecho
  let y = 12

  // ═══════════════════════════════════════════════════════════════════════════
  // PORTADA — KPIs ejecutivos y metadatos
  // ═══════════════════════════════════════════════════════════════════════════

  // logo / titulo
  doc.setFontSize(20)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(20, 20, 20)
  doc.text("SPC", W / 2, y, { align: "center" })
  y += 8

  doc.setFontSize(12)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(80, 80, 80)
  doc.text("dossier de auditoria financiera y forense", W / 2, y, { align: "center" })
  y += 5

  doc.setFontSize(9)
  doc.setTextColor(130, 130, 130)
  doc.text(
    `generado el ${format(new Date(), "d 'de' MMMM 'de' yyyy — HH:mm", { locale: es })}`,
    W / 2, y, { align: "center" }
  )
  y += 8

  // ─── filtros activos ─────────────────────────────────────────────────────
  const hayFiltros = filtrosActivos && Object.values(filtrosActivos).some(v => v && v !== "todos" && v !== "")
  if (hayFiltros) {
    doc.setFillColor(245, 248, 250)
    doc.setDrawColor(200, 210, 220)
    doc.rect(ML, y, W - ML - MR, 18, "FD")
    doc.setFontSize(7.5)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(60, 90, 130)
    doc.text("filtros aplicados en este informe:", ML + 3, y + 5)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(60, 60, 60)
    const partes: string[] = []
    if (filtrosActivos?.mesDesde && filtrosActivos.mesDesde !== "todos") partes.push(`desde: ${filtrosActivos.mesDesde}`)
    if (filtrosActivos?.mesHasta && filtrosActivos.mesHasta !== "todos") partes.push(`hasta: ${filtrosActivos.mesHasta}`)
    if (filtrosActivos?.filtroEdificio && filtrosActivos.filtroEdificio !== "todos") partes.push(`edificio: ${filtrosActivos.filtroEdificio}`)
    if (filtrosActivos?.filtroAdmin && filtrosActivos.filtroAdmin !== "todos") partes.push(`admin: ${filtrosActivos.filtroAdmin}`)
    if (filtrosActivos?.filtroSupervisor && filtrosActivos.filtroSupervisor !== "todos") partes.push(`supervisor: ${filtrosActivos.filtroSupervisor}`)
    if (filtrosActivos?.busqueda && filtrosActivos.busqueda.trim() !== "") partes.push(`busqueda: "${filtrosActivos.busqueda}"`)
    doc.text(partes.join("   |   "), ML + 3, y + 12)
    y += 23
  }

  // ─── KPI cards en fila 4 columnas ────────────────────────────────────────
  const facturadoReal = totalFacturado ?? balances.reduce((acc, b) => acc + b.total_factura_base, 0)
  const ajustesReal = totalAjustes ?? balances.reduce((acc, b) => acc + b.total_ajustes_aprobados, 0)
  const gastosMat = totalGastado ?? balances.reduce((acc, b) => acc + b.gastos_reales_liquidacion, 0)
  const ganSupervisores = totalGananciaSupervisores ?? balances.reduce((acc, b) => acc + b.ganancia_supervisor, 0)
  const ganSpcReal = totalGanancia ?? balances.reduce((acc, b) => acc + b.ganancia_neta_total_spc, 0)

  const colW = (W - ML - MR - 9) / 4
  const cardH = 26

  type KPI = { label: string; valor: string; sub?: string; color: [number, number, number] }
  const kpis: KPI[] = [
    { label: "facturacion obras", valor: $(facturadoReal), sub: "volumen cotizado", color: [50, 100, 160] },
    { label: "gastos + ajustes", valor: $(gastosMat + ajustesReal), sub: `mat: ${$(gastosMat)}`, color: [120, 70, 30] },
    { label: "gan. supervisores", valor: $(ganSupervisores), sub: "honorarios netos", color: [40, 80, 180] },
    { label: "ganancia neta SPC", valor: $(ganSpcReal), sub: `margen: ${facturadoReal > 0 ? Math.round((ganSpcReal / facturadoReal) * 100) : 0}%`, color: [30, 120, 60] },
  ]

  kpis.forEach((kpi, i) => {
    const x = ML + i * (colW + 3)
    const isNeto = i === 3
    doc.setFillColor(isNeto ? 235 : 248, isNeto ? 250 : 248, isNeto ? 242 : 248)
    doc.setDrawColor(...kpi.color)
    doc.setLineWidth(isNeto ? 0.8 : 0.3)
    doc.rect(x, y, colW, cardH, "FD")
    doc.setLineWidth(0.2)
    // etiqueta
    doc.setFontSize(6.5)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(100, 100, 100)
    doc.text(kpi.label, x + colW / 2, y + 6, { align: "center" })
    // valor (dominante si es ganancia)
    doc.setFontSize(isNeto ? 11 : 9.5)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...kpi.color)
    doc.text(kpi.valor, x + colW / 2, y + 15, { align: "center" })
    // subtexto
    if (kpi.sub) {
      doc.setFontSize(6)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(130, 130, 130)
      doc.text(kpi.sub, x + colW / 2, y + 21, { align: "center" })
    }
  })

  y += cardH + 10

  // ─── indicadores secundarios ──────────────────────────────────────────────
  const totalObras = balances.length
  const obrasCobradas = balances.filter(b => b.saldo_pendiente_factura === 0 && b.total_cobrado_real > 0).length
  const sobrecostos = balances.filter(b => b.hay_sobrecosto).length
  const pendienteSaldo = balances.reduce((acc, b) => acc + b.saldo_pendiente_factura, 0)
  const gastosPendientesSup = supervisores.reduce((acc, s) => acc + s.gastos_pendientes, 0)

  const indicadores = [
    { label: "obras analizadas", valor: String(totalObras) },
    { label: "cobradas al 100%", valor: `${obrasCobradas} (${totalObras > 0 ? Math.round((obrasCobradas / totalObras) * 100) : 0}%)` },
    { label: "con sobrecosto", valor: String(sobrecostos), alerta: sobrecostos > 0 },
    { label: "saldo pendiente cobro", valor: $(pendienteSaldo), alerta: pendienteSaldo > 0 },
    { label: "gastos pend. rendicion", valor: $(gastosPendientesSup), alerta: gastosPendientesSup > 0 },
  ]

  const indW = (W - ML - MR - (indicadores.length - 1) * 2) / indicadores.length
  indicadores.forEach((ind, i) => {
    const x = ML + i * (indW + 2)
    doc.setFillColor(248, 248, 248)
    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.2)
    doc.rect(x, y, indW, 14, "FD")
    doc.setFontSize(6.5)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(120, 120, 120)
    doc.text(ind.label, x + indW / 2, y + 5, { align: "center" })
    doc.setFontSize(8.5)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(ind.alerta ? 180 : 40, ind.alerta ? 80 : 40, ind.alerta ? 0 : 40)
    doc.text(ind.valor, x + indW / 2, y + 11, { align: "center" })
  })

  y += 20

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCION 1 — RANKING DE SUPERVISORES
  // ═══════════════════════════════════════════════════════════════════════════

  y = addSection(doc, "1. ranking de supervisores — rentabilidad y eficiencia", y)

  const supRows = supervisores.map((s, i) => [
    `${i + 1}. ${s.nombre_supervisor}`,
    String(s.tareas_liquidadas),
    $(s.total_cobrado_cliente),
    $(s.gastos_reales),
    s.gastos_pendientes > 0 ? $(s.gastos_pendientes) : "$0",
    $(s.ganancia_supervisor),
    $(s.ganancia_real_spc),
    pct(s.eficiencia_pct),
  ])

  autoTable(doc, {
    head: [["supervisor", "obras cerr.", "cobrado cliente", "gastos reales", "gastos pend.", "gan. supervisor", "ganancia SPC", "eficiencia"]],
    body: supRows,
    startY: y,
    theme: "striped",
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [50, 80, 130], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: 14, halign: "center" },
      2: { cellWidth: 26, halign: "right" },
      3: { cellWidth: 22, halign: "right" },
      4: { cellWidth: 20, halign: "right" },
      5: { cellWidth: 22, halign: "right" },
      6: { cellWidth: 24, halign: "right", fontStyle: "bold" },
      7: { cellWidth: 14, halign: "center" },
    },
    didParseCell: (data) => {
      // gastos pendientes en ambar si > $0
      if (data.column.index === 4 && data.section === "body") {
        const val = data.cell.text[0]
        if (val && val !== "$0") {
          data.cell.styles.textColor = [180, 100, 0]
          data.cell.styles.fontStyle = "bold"
        }
      }
      // ganancia SPC en verde
      if (data.column.index === 6 && data.section === "body") {
        data.cell.styles.textColor = [30, 120, 60]
      }
    },
    didDrawPage: (d: any) => { y = d.cursor.y + 4 },
  })

  y = (doc as any).lastAutoTable.finalY + 8

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCION 2 — RANKING DE ADMINISTRADORES
  // ═══════════════════════════════════════════════════════════════════════════

  // pagina nueva si queda menos de 60mm
  if (y > H - 80) { doc.addPage(); y = addPageHeader(doc, "administradores", 10) }

  y = addSection(doc, "2. ranking de administradores — rentabilidad neta y cobranza", y)

  const admRows = administradores.map((a, i) => [
    `${i + 1}. ${a.nombre_administrador}`,
    `${a.tareas_cobradas_100} / ${a.tareas_totales}`,
    $(a.total_facturado),
    a.total_ajustes > 0 ? $(a.total_ajustes) : "$0",
    $(a.total_cobrado),
    a.saldo_adeudado > 0 ? $(a.saldo_adeudado) : "$0",
    $(a.costo_total_obras),
    $(a.ganancia_liquida),
    `${a.aporte_spc_pct}%`,
  ])

  autoTable(doc, {
    head: [["administrador", "cerradas", "facturado", "ajustes", "cobrado", "deuda", "costo obras", "gan. liquida", "aporte %"]],
    body: admRows,
    startY: y,
    theme: "striped",
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [80, 50, 130], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7 },
    columnStyles: {
      0: { cellWidth: 36 },
      1: { cellWidth: 14, halign: "center" },
      2: { cellWidth: 21, halign: "right" },
      3: { cellWidth: 18, halign: "right" },
      4: { cellWidth: 21, halign: "right" },
      5: { cellWidth: 18, halign: "right" },
      6: { cellWidth: 21, halign: "right" },
      7: { cellWidth: 21, halign: "right", fontStyle: "bold" },
      8: { cellWidth: 12, halign: "center" },
    },
    didParseCell: (data) => {
      if (data.column.index === 3 && data.section === "body") {
        const val = data.cell.text[0]
        if (val && val !== "$0") data.cell.styles.textColor = [180, 100, 0]
      }
      if (data.column.index === 5 && data.section === "body") {
        const val = data.cell.text[0]
        if (val && val !== "$0") data.cell.styles.textColor = [180, 100, 0]
      }
      if (data.column.index === 7 && data.section === "body") {
        data.cell.styles.textColor = [30, 120, 60]
      }
    },
  })

  y = (doc as any).lastAutoTable.finalY + 8

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCION 3 — EFICIENCIA POR TAREA (SPC VS SUPERVISOR)
  // ═══════════════════════════════════════════════════════════════════════════

  if (y > H - 80) { doc.addPage(); y = addPageHeader(doc, "eficiencia de obras", 10) }

  const obrasEficientes = balances
    .filter(b => b.total_factura_base > 0 || b.total_pb > 0)
    .sort((a, b) => b.ganancia_neta_total_spc - a.ganancia_neta_total_spc)
    .slice(0, 50)

  y = addSection(doc, `3. auditoria de eficiencia por tarea (${obrasEficientes.length} obras cerradas)`, y)

  const tracRows = obrasEficientes.map(b => {
    const pctMargen = b.total_factura_base > 0
      ? Math.round((b.ganancia_neta_total_spc / b.total_factura_base) * 100)
      : 0
    return [
      b.codigo_tarea,
      `${b.titulo_tarea}\n${b.nombre_edificio}`,
      b.nombre_supervisor || "-",
      $(b.total_pb),
      b.gastos_reales_liquidacion > 0 ? $(b.gastos_reales_liquidacion) : "$0",
      $(b.ganancia_supervisor),
      $(b.total_factura_base),
      $(b.total_ajustes_aprobados),
      $(b.ganancia_neta_total_spc),
      `${pctMargen}%`,
    ]
  })

  autoTable(doc, {
    head: [["cod.", "obra / edificio", "sup.", "pb", "mat.", "gan. sup.", "facturado", "ajustes", "gan. spc", "margen"]],
    body: tracRows,
    startY: y,
    theme: "striped",
    styles: { fontSize: 6.5, cellPadding: 1.5, overflow: "linebreak" },
    headStyles: { fillColor: [30, 120, 60], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 6.5 },
    columnStyles: {
      0: { cellWidth: 16 },
      1: { cellWidth: 38 },
      2: { cellWidth: 20 },
      3: { cellWidth: 15, halign: "right" },
      4: { cellWidth: 15, halign: "right" },
      5: { cellWidth: 17, halign: "right", fontStyle: "bold" },
      6: { cellWidth: 17, halign: "right" },
      7: { cellWidth: 15, halign: "right" },
      8: { cellWidth: 18, halign: "right", fontStyle: "bold" },
      9: { cellWidth: 11, halign: "center" },
    },
    didParseCell: (data) => {
      if (data.column.index === 5 && data.section === "body") {
        data.cell.styles.textColor = [40, 80, 180]
      }
      if (data.column.index === 8 && data.section === "body") {
        data.cell.styles.textColor = [30, 120, 60]
      }
      if (data.column.index === 9 && data.section === "body") {
        const val = parseInt(data.cell.text[0] || "0")
        data.cell.styles.textColor = val >= 50 ? [30, 130, 60] : val >= 30 ? [180, 130, 0] : [180, 50, 50]
        data.cell.styles.fontStyle = "bold"
      }
    },
  })

  y = (doc as any).lastAutoTable.finalY + 8

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCION 4 — RENTABILIDAD POR RUBRO / TIPOLOGIA DE OBRA
  // ═══════════════════════════════════════════════════════════════════════════

  if (rubros && rubros.length > 0) {
    if (y > H - 75) { doc.addPage(); y = addPageHeader(doc, "rubros de obra", 10) }
    y = addSection(doc, "4. rentabilidad por rubro y especialidad de obra", y)

    const rubroRows = rubros.map(r => [
      r.rubro,
      `${r.obras_liquidadas} / ${r.obras_totales}`,
      $(r.total_facturado),
      r.total_ajustes > 0 ? $(r.total_ajustes) : "$0",
      $(r.gastos_totales),
      $(r.ganancia_supervisor),
      $(r.ganancia_neta_spc),
      `${r.margen_spc_pct}%`,
    ])

    autoTable(doc, {
      head: [["rubro / especialidad", "obras liq/tot", "facturado", "ajustes", "materiales", "gan. sup.", "gan. spc", "margen"]],
      body: rubroRows,
      startY: y,
      theme: "striped",
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [40, 110, 80], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 44 },
        1: { cellWidth: 18, halign: "center" },
        2: { cellWidth: 20, halign: "right" },
        3: { cellWidth: 18, halign: "right" },
        4: { cellWidth: 20, halign: "right" },
        5: { cellWidth: 22, halign: "right", fontStyle: "bold" },
        6: { cellWidth: 24, halign: "right", fontStyle: "bold" },
        7: { cellWidth: 16, halign: "center" },
      },
      didParseCell: (data) => {
        if (data.column.index === 3 && data.section === "body") {
          const val = data.cell.text[0]
          if (val && val !== "$0") data.cell.styles.textColor = [180, 100, 0]
        }
        if (data.column.index === 5 && data.section === "body") {
          data.cell.styles.textColor = [40, 80, 180]
        }
        if (data.column.index === 6 && data.section === "body") {
          data.cell.styles.textColor = [30, 120, 60]
        }
        if (data.column.index === 7 && data.section === "body") {
          const val = parseInt(data.cell.text[0] || "0")
          data.cell.styles.textColor = val >= 50 ? [30, 130, 60] : val >= 30 ? [180, 130, 0] : [180, 50, 50]
          data.cell.styles.fontStyle = "bold"
        }
      },
    })

    y = (doc as any).lastAutoTable.finalY + 8
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCION 5 — ALERTAS FORENSES: SOBRECOSTOS + SALDOS PENDIENTES
  // ═══════════════════════════════════════════════════════════════════════════

  const conSobrecosto = balances.filter(b => b.hay_sobrecosto).sort((a, b) => b.monto_sobrecosto - a.monto_sobrecosto)
  const conSaldoPendiente = balances.filter(b => b.saldo_pendiente_factura > 0).sort((a, b) => b.saldo_pendiente_factura - a.saldo_pendiente_factura)

  if (conSobrecosto.length > 0 || conSaldoPendiente.length > 0) {
    if (y > H - 80) { doc.addPage(); y = addPageHeader(doc, "alertas forenses", 10) }
    y = addSection(doc, "5. alertas forenses — sobrecostos y saldos pendientes de cobro", y)

    if (conSobrecosto.length > 0) {
      doc.setFontSize(7.5)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(150, 50, 0)
      doc.text(`sobrecostos detectados (${conSobrecosto.length} obras):`, ML, y)
      y += 4

      autoTable(doc, {
        head: [["obra", "edificio", "supervisor", "pb", "gastos reales", "sobrecosto"]],
        body: conSobrecosto.slice(0, 20).map(b => [
          `${b.codigo_tarea} — ${b.titulo_tarea}`,
          b.nombre_edificio,
          b.nombre_supervisor || "-",
          $(b.total_pb),
          $(b.gastos_reales_liquidacion),
          $(b.monto_sobrecosto),
        ]),
        startY: y,
        theme: "striped",
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [180, 60, 0], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7 },
        columnStyles: {
          0: { cellWidth: 48 },
          1: { cellWidth: 36 },
          2: { cellWidth: 28 },
          3: { cellWidth: 18, halign: "right" },
          4: { cellWidth: 22, halign: "right" },
          5: { cellWidth: 22, halign: "right", fontStyle: "bold" },
        },
        didParseCell: (data) => {
          if (data.column.index === 5 && data.section === "body") {
            data.cell.styles.textColor = [180, 50, 0]
          }
        },
      })

      y = (doc as any).lastAutoTable.finalY + 6
    }

    if (conSaldoPendiente.length > 0) {
      if (y > H - 60) { doc.addPage(); y = addPageHeader(doc, "saldos pendientes", 10) }

      doc.setFontSize(7.5)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(150, 100, 0)
      doc.text(`saldos pendientes de cobro (${conSaldoPendiente.length} obras):`, ML, y)
      y += 4

      autoTable(doc, {
        head: [["obra", "edificio", "administrador", "facturado", "cobrado", "saldo pendiente"]],
        body: conSaldoPendiente.slice(0, 20).map(b => [
          `${b.codigo_tarea} — ${b.titulo_tarea}`,
          b.nombre_edificio,
          b.nombre_administrador,
          $(b.total_facturado_neto),
          $(b.total_cobrado_real),
          $(b.saldo_pendiente_factura),
        ]),
        startY: y,
        theme: "striped",
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [160, 110, 0], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7 },
        columnStyles: {
          0: { cellWidth: 48 },
          1: { cellWidth: 30 },
          2: { cellWidth: 28 },
          3: { cellWidth: 20, halign: "right" },
          4: { cellWidth: 20, halign: "right" },
          5: { cellWidth: 22, halign: "right", fontStyle: "bold" },
        },
        didParseCell: (data) => {
          if (data.column.index === 5 && data.section === "body") {
            data.cell.styles.textColor = [160, 100, 0]
          }
        },
      })

      y = (doc as any).lastAutoTable.finalY + 6
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCION 6 — GASTOS PENDIENTES DE RENDICION POR SUPERVISOR
  // ═══════════════════════════════════════════════════════════════════════════

  const supersConPendientes = supervisores.filter(s => s.gastos_pendientes > 0)
  if (supersConPendientes.length > 0) {
    if (y > H - 60) { doc.addPage(); y = addPageHeader(doc, "gastos pendientes", 10) }
    y = addSection(doc, "6. gastos pendientes de rendicion por supervisor", y)

    autoTable(doc, {
      head: [["supervisor", "tareas liq.", "gastos reales liquidados", "pendiente de rendicion"]],
      body: supersConPendientes.map(s => [
        s.nombre_supervisor,
        `${s.tareas_liquidadas} / ${s.tareas_totales}`,
        $(s.gastos_reales),
        $(s.gastos_pendientes),
      ]),
      startY: y,
      theme: "striped",
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [150, 90, 0], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 52 },
        1: { cellWidth: 22, halign: "center" },
        2: { cellWidth: 44, halign: "right" },
        3: { cellWidth: 44, halign: "right", fontStyle: "bold" },
      },
      didParseCell: (data) => {
        if (data.column.index === 3 && data.section === "body") {
          data.cell.styles.textColor = [150, 80, 0]
        }
      },
    })

    y = (doc as any).lastAutoTable.finalY + 8
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PIE DE PAGINA EN TODAS LAS PAGINAS
  // ═══════════════════════════════════════════════════════════════════════════

  const totalPaginas = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(160, 160, 160)
    doc.setDrawColor(220, 220, 220)
    doc.line(ML, H - 8, W - MR, H - 8)
    doc.text(
      `pagina ${i} de ${totalPaginas}`,
      W / 2, H - 4, { align: "center" }
    )
    doc.text(
      `SPC — auditoria financiera — ${format(new Date(), "dd/MM/yyyy HH:mm")}`,
      ML, H - 4
    )
    doc.text(
      `ganancia neta: ${$(totalGanancia)}`,
      W - MR, H - 4, { align: "right" }
    )
  }

  return doc.output("blob")
}
