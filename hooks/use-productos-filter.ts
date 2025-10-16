import { useMemo } from 'react';
import type { Producto } from '@/types/producto';

/**
 * Normaliza un string removiendo acentos
 * "categoría" → "categoria"
 */
function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Hook personalizado para filtrar productos
 * Centraliza la lógica de filtrado usada en productos-list.tsx y productos-tab.tsx
 */
export function useProductosFilter(
  productos: Producto[],
  searchTerm: string,
  categoriaFilter: string,
  estadoFilter: string
) {
  return useMemo(() => {
    let result = [...productos];

    // 🔍 Filtro de búsqueda (mejorado con categoría y sin acentos)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const termSinAcentos = removeAccents(term);
      
      result = result.filter(
        (producto) => {
          // Buscar con y sin acentos
          const nombre = producto.nombre.toLowerCase();
          const nombreSinAcentos = removeAccents(nombre);
          
          const descripcion = producto.descripcion?.toLowerCase() || '';
          const descripcionSinAcentos = removeAccents(descripcion);
          
          const categoria = producto.categorias_productos?.nombre?.toLowerCase() || '';
          const categoriaSinAcentos = removeAccents(categoria);
          
          return (
            // Búsqueda normal (con acentos)
            nombre.includes(term) ||
            producto.code?.toString().includes(term) ||
            descripcion.includes(term) ||
            categoria.includes(term) ||
            // 🆕 Búsqueda sin acentos
            nombreSinAcentos.includes(termSinAcentos) ||
            descripcionSinAcentos.includes(termSinAcentos) ||
            categoriaSinAcentos.includes(termSinAcentos)
          );
        }
      );
    }

    // Filtro por categoría
    if (categoriaFilter && categoriaFilter !== 'all') {
      result = result.filter((producto) => producto.categoria_id === categoriaFilter);
    }

    // Filtro por estado activo/inactivo
    if (estadoFilter !== 'all') {
      const activo = estadoFilter === 'activo';
      result = result.filter((producto) => producto.activo === activo);
    }

    return result;
  }, [productos, searchTerm, categoriaFilter, estadoFilter]);
}
