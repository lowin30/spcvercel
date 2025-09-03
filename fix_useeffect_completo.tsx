// Este fragmento de código optimiza la función cargarDatosTarea
// y añade un useEffect bien configurado para evitar bucles infinitos

// 1. Optimiza la función cargarDatosTarea con dependencias correctas
const cargarDatosTarea = useCallback(async () => {
  if (!id) return;

  // Evitamos múltiples logs que causan confusión
  // Solo logueamos una vez al inicio de la carga
  console.log(`[ÚNICO] Cargando datos para tarea ID: ${tareaId}`);
  
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

    // Resto del código de cargarDatosTarea permanece igual
    
    // ...

  } catch (error) {
    console.error('Error al cargar los datos:', error);
    setError('Error al cargar los datos');
  } finally {
    setLoading(false);
  }
}, [id, tareaId, router]); // Dependencias mínimas y estables

// 2. Añadir este useEffect al inicio del componente, justo después de los estados
useEffect(() => {
  // Esta función solo se ejecuta una vez al montar el componente
  // o cuando cambia el ID de la tarea
  const iniciarCarga = async () => {
    try {
      await cargarDatosTarea();
      await cargarPresupuestos();
    } catch (err) {
      console.error("Error en la carga inicial:", err);
    }
  };
  
  iniciarCarga();
  
  // Este console.log solo se ejecutará cuando las dependencias cambien
  console.log("Effect ejecutado para ID:", tareaId);
  
}, [tareaId, cargarDatosTarea, cargarPresupuestos]); // Solo dependencias necesarias
