"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase-client"
import { formatDateTime } from "@/lib/utils"
import { Receipt, AlertCircle, CheckCircle, Target, Download } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { generarGastosTareaPDF } from "@/lib/gastos-pdf"

interface HistorialGastosFacturaProps {
  facturaId: number
  tareaId: number
  esFacturaMateriales: boolean // Determinado por items_factura.es_material
}

interface Gasto {
  id: number
  monto: number
  descripcion: string
  fecha_gasto: string
  metodo_registro: string
  tipo_gasto: string
  liquidado: boolean | null
  confianza_ocr: number | null
  comprobante_url: string | null
  imagen_procesada_url: string | null
  created_at: string
  usuarios: {
    email: string
    color_perfil: string
  }
}

export function HistorialGastosFactura({ 
  facturaId, 
  tareaId, 
  esFacturaMateriales 
}: HistorialGastosFacturaProps) {
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [loading, setLoading] = useState(true)
  const [exportando, setExportando] = useState(false)
  const supabase = createClient()

  const cargarGastos = async () => {
    try {
      // Construir query base
      let query = supabase
        .from('gastos_tarea')
        .select('*, usuarios(email, color_perfil)')
        .eq('id_tarea', tareaId)

      // Filtrar por tipo según si la factura es de materiales o no
      if (esFacturaMateriales) {
        // Factura de materiales → mostrar solo gastos de materiales
        query = query.eq('tipo_gasto', 'material')
      } else {
        // Factura regular → mostrar mano de obra y manuales
        query = query.in('tipo_gasto', ['mano_de_obra', 'manual'])
      }

      const { data, error } = await query.order('fecha_gasto', { ascending: false })

      if (error) throw error
      
      setGastos((data as Gasto[]) || [])
    } catch (error: any) {
      console.error('Error cargando gastos:', error)
      toast.error('Error al cargar gastos relacionados')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarGastos()
  }, [tareaId, esFacturaMateriales])

  // Función para guardar el PDF en Supabase y actualizar la tarea
  const guardarPDFEnSupabase = async (blob: Blob, filename: string, tareaId: number): Promise<string> => {
    const supabase = createClient();
    if (!supabase) throw new Error("No se pudo obtener cliente de Supabase");
    
    const fileExt = filename.split('.').pop();
    const filePath = `tarea_${tareaId}/${Date.now()}_${Math.floor(Math.random() * 10000)}.${fileExt}`;
    
    // Subir archivo a Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('comprobantes')
      .upload(filePath, blob, {
        contentType: 'application/pdf',
        cacheControl: '3600'
      });
      
    if (uploadError) {
      throw new Error(`Error al subir PDF: ${uploadError.message}`);
    }
    
    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from('comprobantes')
      .getPublicUrl(filePath);
      
    const pdfUrl = urlData?.publicUrl;
    if (!pdfUrl) throw new Error("No se pudo obtener URL pública del PDF");
    
    // Actualizar la tarea con la URL del PDF
    const { error: updateError } = await supabase
      .from('tareas')
      .update({ gastos_tarea_pdf: pdfUrl })
      .eq('id', tareaId);
      
    if (updateError) {
      throw new Error(`Error al actualizar tarea: ${updateError.message}`);
    }
    
    return pdfUrl;
  };
  
  // Función para exportar a PDF los gastos (SOLO MATERIALES CON FOTOS)
  const exportarPDF = async () => {
    // Validar que existan gastos para exportar
    if (!gastos || gastos.length === 0) {
      toast.error('No hay gastos para exportar');
      return;
    }
    
    try {
      setExportando(true);
      toast.info('Generando PDF de materiales con fotos...');
      
      // Generar el PDF (solo materiales con imágenes)
      const resultado = await generarGastosTareaPDF(tareaId);
      
      // Verificar si hay materiales con fotos
      if (resultado.montoTotal === 0) {
        toast.warning('⚠️ No hay gastos de materiales con fotos para exportar');
        setExportando(false);
        return;
      }
      
      // Mostrar el monto total
      toast.success(`PDF generado: $${resultado.montoTotal.toLocaleString('es-CL')} en materiales`);
      
      // Descargar el archivo automáticamente
      const url = window.URL.createObjectURL(resultado.blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', resultado.filename);
      document.body.appendChild(link);
      link.click();
      
      // Limpiar recursos del DOM después de descargar
      setTimeout(() => {
        link.parentNode?.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
      
      // Guardar la referencia en Supabase
      try {
        const pdfUrl = await guardarPDFEnSupabase(resultado.blob, resultado.filename, tareaId);
        toast.success('✅ PDF de materiales descargado y guardado en base de datos');
      } catch (storageError: any) {
        console.error('Error al guardar en Supabase:', storageError);
        toast.error(`El PDF se descargó pero no se pudo guardar: ${storageError.message}`);
      }
      
    } catch (error: any) {
      console.error('Error al exportar PDF:', error);
      toast.error(`Error al generar PDF: ${error.message || 'Error desconocido'}`);
    } finally {
      setExportando(false);
    }
  };

  const getConfianzaColor = (confianza: number | null) => {
    if (!confianza) return "text-gray-500"
    if (confianza >= 90) return "text-green-600"
    if (confianza >= 80) return "text-blue-600"
    if (confianza >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getConfianzaIcon = (confianza: number | null) => {
    if (!confianza) return <Receipt className="w-4 h-4" />
    if (confianza >= 80) return <CheckCircle className="w-4 h-4" />
    if (confianza >= 60) return <Target className="w-4 h-4" />
    return <AlertCircle className="w-4 h-4" />
  }

  // Estadísticas
  const totalGastos = gastos.reduce((sum, gasto) => sum + gasto.monto, 0)
  const gastosConFoto = gastos.filter(g => g.imagen_procesada_url || g.comprobante_url).length
  const gastosLiquidados = gastos.filter(g => g.liquidado).length

  if (loading) {
    return (
      <div className="text-center py-6">
        <div className="animate-pulse text-sm text-muted-foreground">
          Cargando gastos relacionados...
        </div>
      </div>
    )
  }

  if (gastos.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Receipt className="mx-auto h-12 w-12 mb-3 opacity-30" />
        <p className="text-sm font-medium">No hay gastos de este tipo en la tarea</p>
        <p className="text-xs mt-1">
          {esFacturaMateriales 
            ? 'Esta factura es de materiales, pero no se registraron gastos de materiales en la tarea'
            : 'Esta factura es de mano de obra, pero no se registraron gastos de ese tipo en la tarea'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header con botón de exportar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2 text-xs flex-1">
        <Badge variant="outline" className="bg-slate-50">
          💰 Total: ${totalGastos.toLocaleString("es-CL")}
        </Badge>
        <Badge variant="outline" className="bg-slate-50">
          📋 Gastos: {gastos.length}
        </Badge>
        <Badge variant="outline" className="bg-slate-50">
          📷 Con foto: {gastosConFoto}
        </Badge>
          {gastosLiquidados > 0 && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              ✓ Liquidados: {gastosLiquidados}
            </Badge>
          )}
        </div>
        
        {/* Botón exportar PDF */}
        {gastos.length > 0 && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => exportarPDF()}
            disabled={exportando}
            className="text-xs h-8 whitespace-nowrap"
            title="Exporta solo gastos de materiales con fotos"
          >
            <Download className="h-3 w-3 mr-1" />
            {exportando ? 'Generando...' : 'PDF Materiales'}
          </Button>
        )}
      </div>

      {/* Lista de gastos (solo lectura) */}
      <div className="space-y-3">
        {gastos.map((gasto) => (
          <Card key={gasto.id} className="border-l-4 border-l-indigo-200">
            <CardContent className="pt-3 pb-3">
              <div className="space-y-2">
                {/* Línea principal */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap flex-1">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: gasto.usuarios.color_perfil }}
                    />
                    <span className="font-medium text-sm">
                      ${gasto.monto.toLocaleString("es-CL")}
                    </span>
                    
                    {/* Badge Método */}
                    <Badge
                      variant={(gasto.metodo_registro === "camara" || gasto.metodo_registro === "archivo") ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {gasto.metodo_registro === "camara" ? "📸 Cámara" : 
                       gasto.metodo_registro === "archivo" ? "📄 Archivo" : "✏️ Manual"}
                    </Badge>
                    
                    {/* Badge Tipo */}
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        gasto.tipo_gasto === 'material' 
                          ? 'bg-blue-50 text-blue-700 border-blue-300' 
                          : 'bg-orange-50 text-orange-700 border-orange-300'
                      }`}
                    >
                      {gasto.tipo_gasto === 'material' ? '📦 Material' : '👷 M. Obra'}
                    </Badge>
                    
                    {/* Badge Liquidado */}
                    {gasto.liquidado && (
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                        ✓ Liquidado
                      </Badge>
                    )}
                    
                    {/* Badge OCR */}
                    {gasto.confianza_ocr && (
                      <Badge variant="outline" className={`text-xs ${getConfianzaColor(gasto.confianza_ocr)}`}>
                        {getConfianzaIcon(gasto.confianza_ocr)}
                        {gasto.confianza_ocr}%
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* Segunda línea - Descripción */}
                <div className="flex-1">
                  <div className="text-sm">{gasto.descripcion}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                    <span>{formatDateTime(gasto.fecha_gasto)}</span>
                    <span>•</span>
                    <span>{gasto.usuarios.email.split('@')[0]}</span>
                  </div>
                </div>
                
                {/* Imagen del comprobante */}
                {(gasto.imagen_procesada_url || gasto.comprobante_url) && (
                  <div className="mt-2">
                    <a 
                      href={gasto.imagen_procesada_url || gasto.comprobante_url || ''} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <img
                        src={gasto.imagen_procesada_url || gasto.comprobante_url || "/placeholder.svg"}
                        alt="Comprobante"
                        className="w-full max-w-xs h-20 object-cover rounded border hover:border-indigo-500 cursor-pointer transition-all duration-200"
                      />
                    </a>
                    <div className="flex justify-end mt-1 text-xs text-muted-foreground">
                      {gasto.imagen_procesada_url ? "Imagen procesada" : "Imagen original"}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
