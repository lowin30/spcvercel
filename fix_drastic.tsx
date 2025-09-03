// Este es un enfoque más drástico para solucionar el bucle infinito
// Modifica estos fragmentos en el archivo app/dashboard/tareas/[id]/page.tsx

// 1. PRIMERO: Elimina cualquier useEffect existente que use cargarDatosTarea
// Busca todos los useEffect y elimínalos o comenta el contenido

// 2. SEGUNDO: Reemplaza la definición de cargarDatosTarea con esta versión estable
const cargarDatosTarea = useCallback(async () => {
  // Evitamos el bucle infinito con una variable de control
  const loadingRef = useRef(false);
  if (loadingRef.current) return;
  
  loadingRef.current = true;
  
  if (!id) return;

  console.log(`Carga única para tarea ${tareaId} (${new Date().toISOString()})`);
  
  setLoading(true);
  setError(null);

  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/login");
      return;
    }

    // 1. Cargar Tarea y Edificio usando la función RPC para evitar recursión RLS
    const { data: tareaData, error: rpcError } = await supabase
      .rpc('get_tarea_details', { tarea_id_param: tareaId })
      .single();

    // El resto de la función permanece igual...
    
  } catch (error) {
    console.error('Error al cargar los datos:', error);
    setError('Error al cargar los datos');
  } finally {
    setLoading(false);
    loadingRef.current = false;
  }
}, [id, tareaId, router]);

// 3. TERCERO: Usa React.useState al inicio del componente para cargar los datos una sola vez
// Añade esto justo después de todas las declaraciones useState, antes de useCallback
// =======================================

// Flag para asegurar que solo se cargan datos una vez
const [dataLoaded, setDataLoaded] = useState(false);

// Cargamos los datos una sola vez
useEffect(() => {
  if (dataLoaded) return;
  
  const loadInitialData = async () => {
    console.log("Cargando datos iniciales...");
    try {
      await cargarDatosTarea();
      await cargarPresupuestos();
      setDataLoaded(true);
      console.log("Datos iniciales cargados correctamente");
    } catch (error) {
      console.error("Error cargando datos iniciales:", error);
    }
  };

  loadInitialData();
}, [dataLoaded]); // Solo se ejecuta cuando cambia dataLoaded (nunca después de la primera carga)

// 4. CUARTO: Cambia este línea en cualquier lugar donde se haga referencia a cargarDatosTarea
// En CommentForm
<CommentForm idTarea={tarea.id} onComentarioCreado={() => {
  console.log("Comentario creado, recargando datos...");
  setDataLoaded(false); // Esto provocará que se vuelvan a cargar los datos
}} />

// También busca otros lugares donde se llame a cargarDatosTarea() directamente
// Y reemplázalos por setDataLoaded(false);
