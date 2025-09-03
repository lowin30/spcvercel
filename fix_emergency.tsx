// Solución de emergencia para el bucle infinito
// Se ha identificado que hay un bucle infinito en la página de detalles de tarea

"use client"

import { useState, useEffect, use, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from '@/lib/supabase-client'
import { toast } from "@/components/ui/use-toast"

// Este es un componente mínimo para reemplazar la página actual
export default function TaskPage({ params: paramsPromise }: any) {
  const { id } = use(paramsPromise);
  const router = useRouter()
  const tareaId = parseInt(id);
  
  // Estados esenciales
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tarea, setTarea] = useState<any>(null)
  
  // Estado para evitar renders infinitos
  const loadingRef = useRef(false)
  const loadedRef = useRef(false)

  // Función para cargar datos de la tarea
  const cargarDatosTarea = useCallback(async () => {
    // Evitamos llamadas múltiples
    if (loadingRef.current || loadedRef.current) return;
    
    loadingRef.current = true;
    console.log(`[CARGA ÚNICA] Cargando tarea ID: ${tareaId}`);
    
    setLoading(true);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      // Cargar Tarea usando RPC
      const { data: tareaData, error: rpcError } = await supabase
        .rpc('get_tarea_details', { tarea_id_param: tareaId })
        .single();

      if (rpcError) {
        console.error('Error RPC al cargar la tarea:', rpcError);
        setError(`Error al cargar la tarea: ${rpcError.message}`);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo cargar la tarea solicitada."
        });
        return;
      }

      if (tareaData) {
        console.log("Tarea cargada correctamente:", tareaData.titulo);
        setTarea(tareaData);
        loadedRef.current = true;
      } else {
        setError('No se encontró la tarea solicitada');
        toast({
          variant: "destructive",
          title: "Tarea no encontrada",
          description: "No se pudo encontrar la tarea solicitada."
        });
      }
    } catch (error) {
      console.error('Error al cargar los datos:', error);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [tareaId, router]);

  // useEffect con dependencias mínimas
  useEffect(() => {
    cargarDatosTarea();
    // Este efecto solo se ejecuta una vez al montar el componente
  }, []); // <-- IMPORTANTE: array de dependencias vacío

  // Renderizado de la interfaz mínima
  return (
    <div className="container mx-auto p-4">
      <div className="mb-4">
        <button 
          onClick={() => router.push('/dashboard/tareas')}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Volver a tareas
        </button>
      </div>

      {loading && <p className="text-center py-8">Cargando detalles de la tarea...</p>}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}
      
      {tarea && !loading && !error && (
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              {tarea.titulo}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              ID: {tarea.id} | Estado: {tarea.estado}
            </p>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <p className="text-sm text-gray-500 mb-4">
              <strong>Edificio:</strong> {tarea.edificio_nombre}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              <strong>Dirección:</strong> {tarea.edificio_direccion}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              <strong>Administrador:</strong> {tarea.nombre_administrador}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              <strong>Descripción:</strong> {tarea.descripcion}
            </p>
          </div>
          <div className="px-4 py-4 sm:px-6 bg-gray-50">
            <p className="text-xs text-gray-500">
              La interfaz completa está temporalmente deshabilitada para resolver el problema de bucle infinito.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
