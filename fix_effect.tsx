// Corrección para el bucle infinito en app/dashboard/tareas/[id]/page.tsx
// El problema está probablemente en un useEffect que se ejecuta continuamente

// Buscar el useEffect que contiene cargarDatosTarea y modificarlo para incluir las dependencias correctas:

useEffect(() => {
  const fetchData = async () => {
    setIsLoading(true);
    try {
      await cargarDatosTarea();
    } catch (error) {
      console.error('Error al cargar los datos de la tarea:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los datos de la tarea."
      });
    } finally {
      setIsLoading(false);
    }
  };

  fetchData();
  // Este array vacío de dependencias es crítico para evitar el bucle infinito
}, [id]); // Solo poner id como dependencia, no incluir cargarDatosTarea

// Otra opción es definir cargarDatosTarea con useCallback:
const cargarDatosTarea = useCallback(async () => {
  // ... código existente
}, [id, supabase]); // Solo incluir dependencias que realmente cambien
