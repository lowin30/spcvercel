"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { createBrowserSupabaseClient } from "@/lib/supabase-client"
import { formatDateTime } from "@/lib/utils"
import { Receipt, Eye, EyeOff, Trash2, AlertCircle, CheckCircle, Target, FileText, Download } from "lucide-react"
import { generarGastosTareaPDF } from "@/lib/gastos-pdf"
import { toast } from "sonner"
import { getSupabaseClient } from "@/lib/supabase-singleton"

interface HistorialGastosOCRProps {
  tareaId: number
  userRole?: string // Rol del usuario actual: 'admin', 'supervisor', 'trabajador'
  userId?: number // ID del usuario actual
}

interface Gasto {
  id: number
  monto: number
  descripcion: string
  fecha_gasto: string
  metodo_registro: string
  confianza_ocr: number | null
  datos_ocr: any
  comprobante_url: string | null
  imagen_procesada_url: string | null
  created_at: string
  usuarios: {
    email: string
    color_perfil: string
  }
}

export function HistorialGastosOCR({ tareaId, userRole = 'trabajador', userId }: HistorialGastosOCRProps) {
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [loading, setLoading] = useState(true)
  const [exportando, setExportando] = useState(false)
  const [mostrarDetalles, setMostrarDetalles] = useState<{ [key: number]: boolean }>({})
  const supabase = createBrowserSupabaseClient()
  const cargarGastos = async () => {
    try {
      const gastosResponse = await supabase
        .from("gastos_tarea")
        .select(`
          *,
          usuarios (email, color_perfil)
        `)
        .eq("id_tarea", tareaId)
        .is('liquidado', false) // Solo mostrar los gastos no liquidados
        .order("created_at", { ascending: false })

      if (gastosResponse.error) throw gastosResponse.error
      
      // Usar datos tipados correctamente
      const gastosData = gastosResponse.data as Gasto[] || []
      setGastos(gastosData)
    } catch (error: any) {
      console.error("Error cargando gastos:", error)
      toast.error("❌ Error al cargar gastos")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarGastos()
    
    // Configurar suscripciones en tiempo real
    try {
      // @ts-ignore - Ignoramos los errores de TypeScript porque sabemos que la API existe
      const channel = supabase.channel('gastos-tarea-realtime')
        // Suscripción para nuevos gastos
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'gastos_tarea', filter: `id_tarea=eq.${tareaId}` },
          (payload: any) => {
            console.log('Nuevo gasto detectado:', payload)
            cargarGastos()
          }
        )
        // Suscripción para gastos actualizados
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'gastos_tarea', filter: `id_tarea=eq.${tareaId}` },
          (payload: any) => {
            console.log('Gasto actualizado:', payload)
            cargarGastos()
          }
        )
        // Suscripción para gastos eliminados
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'gastos_tarea', filter: `id_tarea=eq.${tareaId}` },
          (payload: any) => {
            console.log('Gasto eliminado:', payload)
            if (payload.old && payload.old.id) {
              setGastos(prevGastos => prevGastos.filter(g => g.id !== payload.old.id))
            }
          }
        )
        .subscribe()

      // En caso de fallar la suscripción en tiempo real, usar polling como respaldo
      const interval = setInterval(() => {
        cargarGastos()
      }, 30000) // Cada 30 segundos
      
      // Limpieza
      return () => {
        clearInterval(interval)
        // @ts-ignore
        channel?.unsubscribe()
      }
    } catch (error) {
      console.error("Error con suscripción en tiempo real:", error)
      // Si falla la suscripción, usar polling como respaldo
      const interval = setInterval(() => {
        cargarGastos()
      }, 15000) // Cada 15 segundos
      
      return () => {
        clearInterval(interval)
      }
    }
  }, [tareaId])
  // Función para guardar el PDF en Supabase y actualizar la tarea
  const guardarPDFEnSupabase = async (blob: Blob, filename: string, tareaId: number): Promise<string> => {
    const supabase = getSupabaseClient();
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
  
  // Función para exportar a PDF los gastos
  const exportarPDF = async () => {
    // Validar que existan gastos para exportar
    if (!gastos || gastos.length === 0) {
      toast.error('No hay gastos para exportar');
      return;
    }
    
    try {
      setExportando(true);
      toast.info('Generando PDF de gastos con imágenes procesadas...');
      
      // Generar el PDF con las imágenes procesadas
      const resultado = await generarGastosTareaPDF(tareaId);
      
      // Mostrar el monto total
      toast.info(`Monto total de gastos: $${resultado.montoTotal.toLocaleString('es-CL')}`);
      
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
        toast.success('PDF de gastos generado, descargado y guardado en la base de datos');
      } catch (storageError: any) {
        console.error('Error al guardar en Supabase:', storageError);
        toast.error(`El PDF se descargó pero no se pudo guardar en la base de datos: ${storageError.message}`);
      }
      
    } catch (error: any) {
      console.error('Error al exportar PDF:', error);
      toast.error(`Error al generar PDF: ${error.message || 'Error desconocido'}`);
    } finally {
      setExportando(false);
    }
  };

  const toggleDetalles = (gastoId: number) => {
    setMostrarDetalles(prev => ({
      ...prev,
      [gastoId]: !prev[gastoId]
    }))
  }

  // Función para confirmar y eliminar un gasto
  const confirmarEliminarGasto = async (gastoId: number) => {
    if (userRole !== 'admin' && userRole !== 'supervisor') {
      toast.error('No tienes permisos para eliminar gastos');
      return;
    }

    const confirmDelete = confirm('¿Seguro que deseas eliminar este gasto? Esta acción no se puede deshacer.');
    if (!confirmDelete) return;

    try {
      setLoading(true);
      
      // Primero chequeamos que el gasto exista
      const { data: gastoCheck, error: checkError } = await supabase
        .from('gastos_tarea')
        .select('id, comprobante_url, imagen_procesada_url')
        .eq('id', gastoId)
        .single();

      if (checkError) throw checkError;

      // Si el gasto ya no existe, actualizamos la UI y salimos
      if (!gastoCheck) {
        console.log('El gasto ya no existe en la base de datos');
        setGastos(prevGastos => prevGastos.filter(g => g.id !== gastoId));
        toast.info('⚠️ Este gasto ya ha sido eliminado');
        return;
      }
      
      // Obtenemos los datos del gasto que existe
      const gastoData = gastoCheck;
      
      // Eliminar archivos del storage si existen
      if (gastoData) {
        // Extraer las rutas de los archivos desde las URLs
        // Las URLs tienen el formato: https://[dominio].supabase.co/storage/v1/object/public/[bucket]/[ruta]
        const extraerRutaDesdeURL = (url: string | null): {bucket: string, path: string} | null => {
          if (!url) return null;
          try {
            // Usamos URL para asegurarnos que es una URL válida
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            // El formato es /storage/v1/object/public/[bucket]/[ruta]
            const match = pathname.match(/^\/storage\/v1\/object\/public\/([^\/]+)\/(.*)/i);
            return match ? { bucket: match[1], path: decodeURIComponent(match[2]) } : null;
          } catch (e) {
            console.error('URL inválida:', url, e);
            return null;
          }
        };
        
        // Procesar la URL del comprobante original
        if (gastoData.comprobante_url) {
          const rutaComprobante = extraerRutaDesdeURL(gastoData.comprobante_url);
          if (rutaComprobante) {
            console.log('Intentando eliminar archivo original:', rutaComprobante);
            try {
              const { error: deleteError } = await supabase
                .storage
                .from(rutaComprobante.bucket)
                // @ts-expect-error - El tipado de Supabase puede variar entre versiones
                .remove([rutaComprobante.path]);
                
              if (deleteError) {
                console.error('Error al eliminar archivo original:', deleteError);
              } else {
                console.log('Archivo original eliminado con éxito');
              }
            } catch (storageError) {
              console.error('Error en storage al eliminar original:', storageError);
              // Continuamos a pesar del error
            }
          }
        }
        
        // Procesar la URL de la imagen procesada
        if (gastoData.imagen_procesada_url) {
          const rutaProcesada = extraerRutaDesdeURL(gastoData.imagen_procesada_url);
          if (rutaProcesada) {
            console.log('Intentando eliminar imagen procesada:', rutaProcesada);
            try {
              const { error: deleteError } = await supabase
                .storage
                .from(rutaProcesada.bucket)
                // @ts-expect-error - El tipado de Supabase puede variar entre versiones
                .remove([rutaProcesada.path]);
                
              if (deleteError) {
                console.error('Error al eliminar imagen procesada:', deleteError);
              } else {
                console.log('Imagen procesada eliminada con éxito');
              }
            } catch (storageError) {
              console.error('Error en storage al eliminar procesada:', storageError);
              // Continuamos a pesar del error
            }
          }
        }
      }
      
      // Finalmente eliminamos el registro de la base de datos
      console.log('Eliminando registro de la base de datos, ID:', gastoId);
      const { error: deleteError } = await supabase
        .from('gastos_tarea')
        .delete()
        .eq('id', gastoId);

      if (deleteError) throw deleteError;
      
      // Actualizamos la UI inmediatamente, sin esperar a la suscripción
      setGastos(prevGastos => prevGastos.filter(g => g.id !== gastoId));
      
      toast.success('✅ Gasto y archivos asociados eliminados');
    } catch (error: any) {
      console.error('Error eliminando gasto:', error);
      toast.error('❌ Error al eliminar gasto: ' + (error.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  }
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

  const totalGastos = gastos.reduce((sum, gasto) => sum + gasto.monto, 0)
  const gastosOCR = gastos.filter((g) => g.metodo_registro?.includes("ocr")).length
  const gastosManuales = gastos.filter((g) => g.metodo_registro === "manual").length
  const gastosCamara = gastos.filter((g) => g.metodo_registro === "camara").length
  const gastosArchivo = gastos.filter((g) => g.metodo_registro === "archivo").length

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="h-4 w-4" />
            Historial de Gastos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="animate-pulse">Cargando gastos...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-4 w-4" />
              Historial de Gastos ({gastos.length})
            </CardTitle>
            {gastos.length > 0 && (
              <div className="flex flex-wrap gap-2 text-xs mt-1">
                <Badge variant="outline">💰 Total: ${totalGastos.toLocaleString("es-CL")}</Badge>
                <Badge variant="outline">📸 Cámara: {gastosCamara}</Badge>
                <Badge variant="outline">📄 Archivo: {gastosArchivo}</Badge>
                <Badge variant="outline">✏️ Manual: {gastosManuales}</Badge>
              </div>
            )}
          </div>
          
          {gastos.length > 0 && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => exportarPDF()}
                disabled={exportando}
                className="text-xs h-7"
              >
                <Download className="h-3 w-3 mr-1" />
                Exportar PDF
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {gastos.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Receipt className="mx-auto h-12 w-12 mb-2 opacity-50" />
            <p className="text-sm">No hay gastos registrados</p>
            <p className="text-xs">Los gastos aparecerán aquí una vez registrados</p>
          </div>
        ) : (
          <div className="space-y-3">
            {gastos.map((gasto) => (
              <Card key={gasto.id} className="border-l-4 border-l-blue-200">
                <CardContent className="pt-3 pb-3">
                  <div className="space-y-2">
                    {/* Línea principal */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: gasto.usuarios.color_perfil }}
                        />
                        <span className="font-medium text-sm">${gasto.monto.toLocaleString("es-CL")}</span>
                        <Badge
                          variant={(gasto.metodo_registro === "camara" || gasto.metodo_registro === "archivo") ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {gasto.metodo_registro === "camara" ? "📸 Cámara" : 
                           gasto.metodo_registro === "archivo" ? "📄 Archivo" : "✏️ Manual"}
                        </Badge>
                        {gasto.confianza_ocr && (
                          <Badge variant="outline" className={`text-xs ${getConfianzaColor(gasto.confianza_ocr)}`}>
                            {getConfianzaIcon(gasto.confianza_ocr)}
                            {gasto.confianza_ocr}%
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {gasto.datos_ocr && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleDetalles(gasto.id)}
                            className="h-6 w-6 p-0"
                          >
                            {mostrarDetalles[gasto.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </Button>
                        )}
                        {(userRole === 'admin' || userRole === 'supervisor') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => confirmarEliminarGasto(gasto.id)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {/* Segunda línea */}
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-sm">{gasto.descripcion}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <span>{formatDateTime(gasto.fecha_gasto)}</span>
                          <span>•</span>
                          <span>{gasto.usuarios.email.split('@')[0]}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Detalles OCR si se muestran */}
                    {mostrarDetalles[gasto.id] && gasto.datos_ocr && (
                      <Card className="mt-2 bg-slate-50">
                        <CardContent className="p-2 text-xs">
                          <div className="space-y-1">
                            {gasto.datos_ocr.monto && (
                              <div className="flex gap-1">
                                <span className="font-medium">Monto detectado:</span>
                                <span>${parseFloat(gasto.datos_ocr.monto).toLocaleString("es-CL")}</span>
                              </div>
                            )}
                            
                            {gasto.datos_ocr.fecha && (
                              <div className="flex gap-1">
                                <span className="font-medium">Fecha detectada:</span>
                                <span>{gasto.datos_ocr.fecha}</span>
                              </div>
                            )}
                            
                            {gasto.datos_ocr.texto_extraido && (
                              <details className="mt-2">
                                <summary className="cursor-pointer font-medium">Ver texto extraído</summary>
                                <div className="mt-1 p-2 bg-white rounded border text-xs font-mono whitespace-pre-wrap max-h-20 overflow-y-auto">
                                  {gasto.datos_ocr.texto_extraido}
                                </div>
                              </details>
                            )}
                            
                            {gasto.datos_ocr.timestamp && (
                              <div className="text-xs text-muted-foreground">
                                Procesado: {formatDateTime(gasto.datos_ocr.timestamp)}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    
                    {/* Imagen del comprobante (preferir la procesada si existe) */}
                    {(gasto.imagen_procesada_url || gasto.comprobante_url) && (
                      <div className="mt-2">
                        <a href={gasto.imagen_procesada_url || gasto.comprobante_url || ''} target="_blank" rel="noopener noreferrer">
                          <img
                            src={gasto.imagen_procesada_url || gasto.comprobante_url || "/placeholder.svg"}
                            alt="Comprobante"
                            className="w-full max-w-xs h-20 object-cover rounded border hover:border-blue-500 cursor-pointer transition-all duration-200"
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
        )}
      </CardContent>
    </Card>
  )
}