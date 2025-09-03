# Instrucciones para corregir el problema de bucle infinito en la página de tareas

Este archivo contiene las instrucciones para corregir el problema de renderizado múltiple y bucle infinito en la página de tareas.

## Problema identificado

El problema principal es que la función `cargarDatosTarea` se está llamando repetidamente, causando:
1. Múltiples logs en consola del mismo mensaje "Intentando cargar tarea con ID: 39"
2. Múltiples llamadas innecesarias a la base de datos
3. Posible degradación del rendimiento

## Solución

### 1. Optimiza la función cargarDatosTarea

La función debe estar definida con `useCallback` y tener las dependencias correctas:

```tsx
const cargarDatosTarea = useCallback(async () => {
  if (!id) return;

  setLoading(true);
  setError(null);
  
  // Agregamos un console.log único para diagnóstico inicial
  console.log(`[ÚNICO] Cargando datos para tarea ID: ${tareaId}`);

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
      
    // El resto de la función permanece igual
    
  } catch (error) {
    console.error('Error al cargar los datos:', error);
    setError('Error al cargar los datos');
  } finally {
    setLoading(false);
  }
}, [id, tareaId, router]); // Dependencias mínimas y estables
```

### 2. Implementa un useEffect con dependencias correctas

```tsx
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
```

### 3. Eliminar o modificar useEffects redundantes

Si hay otros useEffects que llaman a `cargarDatosTarea` o hacen trabajos similares, elimínalos o combínalos con el nuevo useEffect.

## Verificación

Una vez implementados estos cambios:
1. Verifica en la consola que solo aparezca una vez el mensaje de log
2. Confirma que la tarea se carga correctamente sin errores RPC
3. Comprueba que no hay llamadas repetidas a la base de datos
