# 🚀 SOLUCIÓN COMPLETA: BÚSQUEDAS INTELIGENTES + PROBLEMA DE ACENTOS

**Fecha:** 3 de Diciembre, 2025  
**Estado:** 📋 ANÁLISIS COMPLETO - LISTO PARA IMPLEMENTAR  
**Objetivo:** Búsquedas amigables + Solución definitiva al problema de acentos

---

## 🔍 DIAGNÓSTICO COMPLETO

### **1. PROBLEMA DE ACENTOS (Encontrado)**

#### **❌ Situación Actual:**
```
Base de Datos:
  - Encoding: UTF-8 ✅ (correcto)
  - Collation: en_US.UTF-8 ⚠️ (inglés, no español)

Datos Reales Encontrados:
  ❌ "Instalacion" → debería ser "Instalación"
  ❌ "Bano" → debería ser "Baño"  
  ❌ "linea" → debería ser "línea"
  ❌ "Albanileria" → debería ser "Albañilería"
  ❌ "Destapacion" → debería ser "Destapación"
  ❌ "electricidad" → debería ser "Electricidad"
  ❌ "Herreria" → debería ser "Herrería"
  ❌ "Plomeria" → debería ser "Plomería"

Problema de Autocorrector:
  - El teclado/autocorrector agrega acentos automáticamente
  - Se guardan con acentos en BD
  - Se ven mal en pantalla (caracteres extraños: Ã©, Ã­, Ã±)
```

#### **🔎 Causa Raíz:**
- **Frontend (React):** No está configurado para UTF-8 en todos los componentes
- **Meta tags HTML:** Probablemente falta `<meta charset="UTF-8">`
- **Headers HTTP:** Servidor no envía `Content-Type: text/html; charset=utf-8`
- **Normalización:** Datos guardados sin normalizar (algunos con acento, otros sin)

---

### **2. PROBLEMA DE BÚSQUEDAS (Encontrado)**

#### **❌ Búsquedas Actuales:**
```typescript
// 27 archivos con este patrón (LENTO)
productos.filter(p => 
  p.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
)

Problemas:
  ❌ "José" ≠ "Jose" (no encuentra)
  ❌ "JOSE" ≠ "jose" (sí funciona con toLowerCase)
  ❌ "electricidad" ≠ "Electricidad" (sí funciona con toLowerCase)
  ❌ "Plomeria" no encuentra "Plomería" (falta acento)
  ❌ "albañil" no encuentra "Albanileria" (falta ñ)
  ❌ Sin ranking por relevancia
  ❌ Sin búsqueda fuzzy (typos)
  ❌ Sin autocompletado inteligente
```

---

## ✅ SOLUCIÓN 1: PROBLEMA DE ACENTOS (Definitiva)

### **A) Verificar y Corregir Meta Tags**

**Archivo:** `app/layout.tsx`

```typescript
export const metadata: Metadata = {
  title: "SPC Sistema",
  description: "Sistema de gestión",
  // ✅ AGREGAR ESTO:
  charset: 'utf-8',
  viewport: 'width=device-width, initial-scale=1',
}
```

**O mejor aún, en el HTML:**

```typescript
// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

---

### **B) Normalizar Datos Existentes (Migración)**

**Problema:** Datos actuales mezclados (con y sin acentos)

**Solución:** Script SQL para normalizar todo:

```sql
-- =========================================
-- MIGRACIÓN: NORMALIZAR ACENTOS EN TODAS LAS TABLAS
-- =========================================

-- 1. PRODUCTOS
UPDATE productos SET
  nombre = 
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(nombre, 'Instalacion', 'Instalación'),
          'Bano', 'Baño'),
        'linea', 'línea'),
      'electricidad', 'Electricidad'),
    'Plomeria', 'Plomería')
WHERE nombre LIKE '%Instalacion%'
   OR nombre LIKE '%Bano%'
   OR nombre LIKE '%linea%'
   OR nombre LIKE '%electricidad%'
   OR nombre LIKE '%Plomeria%';

-- 2. CATEGORÍAS
UPDATE categorias_productos SET
  nombre = CASE
    WHEN nombre = 'Albanileria' THEN 'Albañilería'
    WHEN nombre = 'Destapacion' THEN 'Destapación'
    WHEN nombre = 'electricidad' THEN 'Electricidad'
    WHEN nombre = 'Herreria' THEN 'Herrería'
    WHEN nombre = 'Impermeabilizacion' THEN 'Impermeabilización'
    WHEN nombre = 'Plomeria' THEN 'Plomería'
    ELSE nombre
  END
WHERE nombre IN ('Albanileria', 'Destapacion', 'electricidad', 'Herreria', 'Impermeabilizacion', 'Plomeria');

-- 3. EDIFICIOS (revisar direcciones)
UPDATE edificios SET
  direccion = REPLACE(
    REPLACE(
      REPLACE(direccion, 'N°', 'Nº'),
    'Piso', 'Piso'),
  'Departamento', 'Departamento')
WHERE direccion IS NOT NULL;

-- 4. TAREAS (títulos y descripciones)
UPDATE tareas SET
  titulo = INITCAP(titulo),  -- Primera letra mayúscula
  descripcion = TRIM(descripcion)
WHERE titulo IS NOT NULL OR descripcion IS NOT NULL;

-- 5. Comentarios (similar a tareas)
UPDATE comentarios SET
  contenido = TRIM(contenido)
WHERE contenido IS NOT NULL;
```

---

### **C) Validación en Frontend (Prevenir futuros problemas)**

**Crear helper de normalización:**

```typescript
// lib/text-normalizer.ts
export function normalizeText(text: string): string {
  if (!text) return text
  
  // Trim espacios
  let normalized = text.trim()
  
  // Capitalizar primera letra de cada palabra para nombres propios
  // (solo para campos específicos como nombres de categorías)
  return normalized
}

export function normalizeForDisplay(text: string): string {
  if (!text) return ''
  
  // Asegurar que se muestre correctamente
  return text.normalize('NFC') // Normalización canónica
}

export function normalizeForSearch(text: string): string {
  if (!text) return ''
  
  // Para búsquedas: lowercase + quitar acentos
  return text
    .toLowerCase()
    .normalize('NFD') // Descomponer acentos
    .replace(/[\u0300-\u036f]/g, '') // Quitar marcas diacríticas
}

// Ejemplo de uso:
const userInput = "José Pérez"
const forSearch = normalizeForSearch(userInput) // "jose perez"
```

**Usar en formularios:**

```typescript
// components/producto-form.tsx
import { normalizeForDisplay } from '@/lib/text-normalizer'

// Al cargar datos
useEffect(() => {
  if (producto) {
    setValue('nombre', normalizeForDisplay(producto.nombre))
    setValue('descripcion', normalizeForDisplay(producto.descripcion))
  }
}, [producto])
```

---

### **D) Middleware Next.js (Headers UTF-8)**

**Archivo:** `middleware.ts` (crear si no existe)

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // Asegurar UTF-8 en todas las respuestas
  response.headers.set('Content-Type', 'text/html; charset=utf-8')
  
  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
```

---

## ✅ SOLUCIÓN 2: BÚSQUEDAS INTELIGENTES (PostgreSQL)

### **FASE 1: Habilitar Extensiones**

```sql
-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS pg_trgm;      -- Trigramas (similitud)
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch; -- Levenshtein, Soundex
CREATE EXTENSION IF NOT EXISTS btree_gin;     -- Índices compuestos
-- unaccent ya está habilitada ✅
```

---

### **FASE 2: Función Universal de Búsqueda**

```sql
-- =========================================
-- FUNCIÓN: búsqueda_inteligente_universal
-- Soporta: acentos, mayúsculas, typos, similitud
-- =========================================

CREATE OR REPLACE FUNCTION busqueda_inteligente(
  p_texto_busqueda TEXT,
  p_columnas TEXT[], -- Columnas a buscar
  p_tabla TEXT,       -- Nombre de tabla
  p_umbral_similitud REAL DEFAULT 0.3
)
RETURNS TEXT AS $$
DECLARE
  query_where TEXT := '';
  col TEXT;
BEGIN
  -- Construir WHERE dinámicamente
  FOREACH col IN ARRAY p_columnas
  LOOP
    IF query_where != '' THEN
      query_where := query_where || ' OR ';
    END IF;
    
    query_where := query_where || format(
      '(unaccent(LOWER(%I)) LIKE unaccent(LOWER(%L)) OR similarity(unaccent(%I), unaccent(%L)) > %s)',
      col, '%' || p_texto_busqueda || '%',
      col, p_texto_busqueda,
      p_umbral_similitud
    );
  END LOOP;
  
  RETURN query_where;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

---

### **FASE 3: Funciones Específicas por Tabla**

#### **A) Búsqueda de PRODUCTOS (La más importante)**

```sql
CREATE OR REPLACE FUNCTION buscar_productos_super_inteligente(
  p_query TEXT,
  p_categoria_id UUID DEFAULT NULL,
  p_activo BOOLEAN DEFAULT NULL,
  p_limit INT DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  code INT,
  nombre TEXT,
  descripcion TEXT,
  precio INT,
  categoria_id UUID,
  categoria_nombre TEXT,
  activo BOOLEAN,
  relevancia REAL,
  razon_match TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH busqueda AS (
    SELECT 
      p.id,
      p.code,
      p.nombre,
      p.descripcion,
      p.precio,
      p.categoria_id,
      c.nombre as categoria_nombre,
      p.activo,
      -- Calcular relevancia múltiple
      GREATEST(
        -- 1. Similitud en nombre (peso 5)
        similarity(unaccent(LOWER(p.nombre)), unaccent(LOWER(p_query))) * 5,
        -- 2. Similitud en descripción (peso 2)
        similarity(unaccent(LOWER(COALESCE(p.descripcion, ''))), unaccent(LOWER(p_query))) * 2,
        -- 3. Similitud en código (peso 3)
        similarity(p.code::TEXT, p_query) * 3,
        -- 4. Similitud en categoría (peso 1.5)
        similarity(unaccent(LOWER(c.nombre)), unaccent(LOWER(p_query))) * 1.5,
        -- 5. Match exacto en nombre (peso 10)
        CASE 
          WHEN unaccent(LOWER(p.nombre)) LIKE '%' || unaccent(LOWER(p_query)) || '%' THEN 10
          ELSE 0
        END,
        -- 6. Match exacto en código (peso 8)
        CASE 
          WHEN p.code::TEXT = p_query THEN 8
          ELSE 0
        END
      ) as relevancia,
      -- Razón del match (para debugging/UI)
      CASE
        WHEN p.code::TEXT = p_query THEN 'Código exacto'
        WHEN unaccent(LOWER(p.nombre)) = unaccent(LOWER(p_query)) THEN 'Nombre exacto'
        WHEN unaccent(LOWER(p.nombre)) LIKE '%' || unaccent(LOWER(p_query)) || '%' THEN 'Nombre contiene'
        WHEN unaccent(LOWER(c.nombre)) LIKE '%' || unaccent(LOWER(p_query)) || '%' THEN 'Por categoría'
        WHEN similarity(unaccent(LOWER(p.nombre)), unaccent(LOWER(p_query))) > 0.5 THEN 'Nombre similar'
        WHEN unaccent(LOWER(COALESCE(p.descripcion, ''))) LIKE '%' || unaccent(LOWER(p_query)) || '%' THEN 'En descripción'
        ELSE 'Coincidencia parcial'
      END as razon_match
    FROM productos p
    LEFT JOIN categorias_productos c ON p.categoria_id = c.id
    WHERE 
      -- Filtros obligatorios
      (p_categoria_id IS NULL OR p.categoria_id = p_categoria_id)
      AND (p_activo IS NULL OR p.activo = p_activo)
      -- Búsqueda flexible
      AND (
        -- Por código (exacto o similar)
        p.code::TEXT = p_query
        OR similarity(p.code::TEXT, p_query) > 0.5
        -- Por nombre (sin acentos, case insensitive)
        OR unaccent(LOWER(p.nombre)) LIKE '%' || unaccent(LOWER(p_query)) || '%'
        OR similarity(unaccent(LOWER(p.nombre)), unaccent(LOWER(p_query))) > 0.3
        -- Por descripción
        OR unaccent(LOWER(COALESCE(p.descripcion, ''))) LIKE '%' || unaccent(LOWER(p_query)) || '%'
        -- Por categoría
        OR unaccent(LOWER(c.nombre)) LIKE '%' || unaccent(LOWER(p_query)) || '%'
        OR similarity(unaccent(LOWER(c.nombre)), unaccent(LOWER(p_query))) > 0.4
        -- Búsqueda por palabras (dividir query)
        OR EXISTS (
          SELECT 1 FROM unnest(string_to_array(unaccent(LOWER(p_query)), ' ')) AS palabra
          WHERE unaccent(LOWER(p.nombre)) LIKE '%' || palabra || '%'
             OR unaccent(LOWER(COALESCE(p.descripcion, ''))) LIKE '%' || palabra || '%'
        )
      )
  )
  SELECT * FROM busqueda
  WHERE relevancia > 0.2
  ORDER BY relevancia DESC, nombre ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION buscar_productos_super_inteligente TO authenticated;

COMMENT ON FUNCTION buscar_productos_super_inteligente IS 
'Búsqueda inteligente de productos: soporta acentos, mayúsculas, typos, búsqueda por código, nombre, descripción y categoría';
```

---

#### **B) Búsqueda de FACTURAS**

```sql
CREATE OR REPLACE FUNCTION buscar_facturas_super_inteligente(
  p_query TEXT,
  p_id_administrador INT DEFAULT NULL,
  p_estado TEXT DEFAULT NULL,
  p_fecha_desde DATE DEFAULT NULL,
  p_fecha_hasta DATE DEFAULT NULL,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  id INT,
  numero TEXT,
  descripcion TEXT,
  monto_total NUMERIC,
  fecha_emision DATE,
  administrador_nombre TEXT,
  edificio_nombre TEXT,
  estado_nombre TEXT,
  relevancia REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.numero,
    f.descripcion,
    f.monto_total,
    f.fecha_emision,
    a.nombre as administrador_nombre,
    e.nombre as edificio_nombre,
    ef.nombre as estado_nombre,
    GREATEST(
      -- Match en número
      CASE 
        WHEN unaccent(LOWER(f.numero)) LIKE '%' || unaccent(LOWER(p_query)) || '%' THEN 10
        ELSE similarity(unaccent(f.numero), unaccent(p_query)) * 5
      END,
      -- Match en descripción
      similarity(unaccent(LOWER(COALESCE(f.descripcion, ''))), unaccent(LOWER(p_query))) * 3,
      -- Match en administrador
      similarity(unaccent(LOWER(a.nombre)), unaccent(LOWER(p_query))) * 2,
      -- Match en edificio
      similarity(unaccent(LOWER(e.nombre)), unaccent(LOWER(p_query))) * 2
    ) as relevancia
  FROM facturas f
  LEFT JOIN administradores a ON f.id_administrador = a.id
  LEFT JOIN edificios e ON f.id_edificio = e.id
  LEFT JOIN estados_facturas ef ON f.id_estado_nuevo = ef.id
  WHERE 
    (p_id_administrador IS NULL OR f.id_administrador = p_id_administrador)
    AND (p_estado IS NULL OR ef.nombre = p_estado)
    AND (p_fecha_desde IS NULL OR f.fecha_emision >= p_fecha_desde)
    AND (p_fecha_hasta IS NULL OR f.fecha_emision <= p_fecha_hasta)
    AND (
      unaccent(LOWER(f.numero)) LIKE '%' || unaccent(LOWER(p_query)) || '%'
      OR unaccent(LOWER(COALESCE(f.descripcion, ''))) LIKE '%' || unaccent(LOWER(p_query)) || '%'
      OR unaccent(LOWER(a.nombre)) LIKE '%' || unaccent(LOWER(p_query)) || '%'
      OR unaccent(LOWER(e.nombre)) LIKE '%' || unaccent(LOWER(p_query)) || '%'
      OR similarity(unaccent(f.numero), unaccent(p_query)) > 0.3
    )
  ORDER BY relevancia DESC, f.fecha_emision DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION buscar_facturas_super_inteligente TO authenticated;
```

---

#### **C) Búsqueda de EDIFICIOS**

```sql
CREATE OR REPLACE FUNCTION buscar_edificios_super_inteligente(
  p_query TEXT,
  p_id_administrador INT DEFAULT NULL,
  p_estado TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  id INT,
  nombre TEXT,
  direccion TEXT,
  cuit TEXT,
  administrador_nombre TEXT,
  estado TEXT,
  relevancia REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.nombre,
    e.direccion,
    e.cuit,
    a.nombre as administrador_nombre,
    e.estado,
    GREATEST(
      -- Match exacto en nombre
      CASE 
        WHEN unaccent(LOWER(e.nombre)) = unaccent(LOWER(p_query)) THEN 10
        WHEN unaccent(LOWER(e.nombre)) LIKE '%' || unaccent(LOWER(p_query)) || '%' THEN 8
        ELSE similarity(unaccent(LOWER(e.nombre)), unaccent(LOWER(p_query))) * 5
      END,
      -- Match en dirección
      similarity(unaccent(LOWER(COALESCE(e.direccion, ''))), unaccent(LOWER(p_query))) * 4,
      -- Match en CUIT
      CASE 
        WHEN e.cuit LIKE '%' || p_query || '%' THEN 7
        ELSE similarity(e.cuit, p_query) * 3
      END,
      -- Match en administrador
      similarity(unaccent(LOWER(a.nombre)), unaccent(LOWER(p_query))) * 2
    ) as relevancia
  FROM edificios e
  LEFT JOIN administradores a ON e.id_administrador = a.id
  WHERE 
    (p_id_administrador IS NULL OR e.id_administrador = p_id_administrador)
    AND (p_estado IS NULL OR e.estado = p_estado)
    AND (
      unaccent(LOWER(e.nombre)) LIKE '%' || unaccent(LOWER(p_query)) || '%'
      OR unaccent(LOWER(COALESCE(e.direccion, ''))) LIKE '%' || unaccent(LOWER(p_query)) || '%'
      OR e.cuit LIKE '%' || p_query || '%'
      OR unaccent(LOWER(a.nombre)) LIKE '%' || unaccent(LOWER(p_query)) || '%'
      OR similarity(unaccent(LOWER(e.nombre)), unaccent(LOWER(p_query))) > 0.3
    )
  ORDER BY relevancia DESC, e.nombre ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION buscar_edificios_super_inteligente TO authenticated;
```

---

#### **D) Búsqueda de TAREAS**

```sql
CREATE OR REPLACE FUNCTION buscar_tareas_super_inteligente(
  p_query TEXT,
  p_id_edificio INT DEFAULT NULL,
  p_id_estado INT DEFAULT NULL,
  p_finalizada BOOLEAN DEFAULT NULL,
  p_id_usuario UUID DEFAULT NULL,
  p_rol_usuario TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  id INT,
  titulo TEXT,
  descripcion TEXT,
  fecha_visita DATE,
  edificio_nombre TEXT,
  estado_nombre TEXT,
  finalizada BOOLEAN,
  relevancia REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.titulo,
    t.descripcion,
    t.fecha_visita,
    e.nombre as edificio_nombre,
    et.nombre as estado_nombre,
    t.finalizada,
    GREATEST(
      -- Match en título
      CASE 
        WHEN unaccent(LOWER(t.titulo)) LIKE '%' || unaccent(LOWER(p_query)) || '%' THEN 10
        ELSE similarity(unaccent(LOWER(t.titulo)), unaccent(LOWER(p_query))) * 5
      END,
      -- Match en descripción
      similarity(unaccent(LOWER(COALESCE(t.descripcion, ''))), unaccent(LOWER(p_query))) * 3,
      -- Match en edificio
      similarity(unaccent(LOWER(e.nombre)), unaccent(LOWER(p_query))) * 2
    ) as relevancia
  FROM tareas t
  LEFT JOIN edificios e ON t.id_edificio = e.id
  LEFT JOIN estados_tareas et ON t.id_estado_nuevo = et.id
  LEFT JOIN supervisores_tareas st ON t.id = st.id_tarea
  LEFT JOIN trabajadores_tareas tt ON t.id = tt.id_tarea
  WHERE 
    -- Filtros de seguridad por rol
    (p_rol_usuario = 'admin' OR 
     (p_rol_usuario = 'supervisor' AND st.id_supervisor = p_id_usuario) OR
     (p_rol_usuario = 'trabajador' AND tt.id_trabajador = p_id_usuario))
    -- Filtros opcionales
    AND (p_id_edificio IS NULL OR t.id_edificio = p_id_edificio)
    AND (p_id_estado IS NULL OR t.id_estado_nuevo = p_id_estado)
    AND (p_finalizada IS NULL OR t.finalizada = p_finalizada)
    -- Búsqueda
    AND (
      unaccent(LOWER(t.titulo)) LIKE '%' || unaccent(LOWER(p_query)) || '%'
      OR unaccent(LOWER(COALESCE(t.descripcion, ''))) LIKE '%' || unaccent(LOWER(p_query)) || '%'
      OR unaccent(LOWER(e.nombre)) LIKE '%' || unaccent(LOWER(p_query)) || '%'
      OR similarity(unaccent(LOWER(t.titulo)), unaccent(LOWER(p_query))) > 0.3
    )
  ORDER BY relevancia DESC, t.fecha_visita DESC NULLS LAST
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION buscar_tareas_super_inteligente TO authenticated;
```

---

### **FASE 4: Índices Especializados**

```sql
-- =========================================
-- ÍNDICES GIN para búsqueda super rápida
-- =========================================

-- PRODUCTOS (crítico)
CREATE INDEX idx_productos_nombre_gin_trgm 
  ON productos USING gin(unaccent(LOWER(nombre)) gin_trgm_ops);

CREATE INDEX idx_productos_descripcion_gin_trgm 
  ON productos USING gin(unaccent(LOWER(descripcion)) gin_trgm_ops);

CREATE INDEX idx_productos_code_btree 
  ON productos(code);

-- CATEGORÍAS
CREATE INDEX idx_categorias_nombre_gin_trgm 
  ON categorias_productos USING gin(unaccent(LOWER(nombre)) gin_trgm_ops);

-- FACTURAS
CREATE INDEX idx_facturas_numero_gin_trgm 
  ON facturas USING gin(unaccent(LOWER(numero)) gin_trgm_ops);

CREATE INDEX idx_facturas_descripcion_gin_trgm 
  ON facturas USING gin(unaccent(LOWER(descripcion)) gin_trgm_ops);

-- EDIFICIOS
CREATE INDEX idx_edificios_nombre_gin_trgm 
  ON edificios USING gin(unaccent(LOWER(nombre)) gin_trgm_ops);

CREATE INDEX idx_edificios_direccion_gin_trgm 
  ON edificios USING gin(unaccent(LOWER(direccion)) gin_trgm_ops);

CREATE INDEX idx_edificios_cuit_btree 
  ON edificios(cuit);

-- TAREAS
CREATE INDEX idx_tareas_titulo_gin_trgm 
  ON tareas USING gin(unaccent(LOWER(titulo)) gin_trgm_ops);

CREATE INDEX idx_tareas_descripcion_gin_trgm 
  ON tareas USING gin(unaccent(LOWER(descripcion)) gin_trgm_ops);

-- ADMINISTRADORES
CREATE INDEX idx_administradores_nombre_gin_trgm 
  ON administradores USING gin(unaccent(LOWER(nombre)) gin_trgm_ops);

-- Foreign Keys críticas (si no existen)
CREATE INDEX IF NOT EXISTS idx_edificios_id_administrador 
  ON edificios(id_administrador);

CREATE INDEX IF NOT EXISTS idx_tareas_id_edificio 
  ON tareas(id_edificio);

CREATE INDEX IF NOT EXISTS idx_productos_categoria_id 
  ON productos(categoria_id);

-- Índices compuestos para filtros comunes
CREATE INDEX idx_productos_categoria_activo 
  ON productos(categoria_id, activo) 
  WHERE activo = true;

CREATE INDEX idx_facturas_admin_fecha 
  ON facturas(id_administrador, fecha_emision DESC);

CREATE INDEX idx_tareas_finalizada_fecha 
  ON tareas(finalizada, fecha_visita DESC);
```

---

## ✅ SOLUCIÓN 3: COMPONENTE REACT INTELIGENTE

### **Componente Reutilizable con Debounce y Highlight**

```typescript
// components/super-intelligent-search.tsx
"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Search, Loader2, X, Info } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { createClient } from "@/lib/supabase-client"
import { normalizeForDisplay } from "@/lib/text-normalizer"

interface SuperIntelligentSearchProps {
  rpcFunction: string
  placeholder?: string
  additionalParams?: Record<string, any>
  onResults: (results: any[]) => void
  onLoading?: (loading: boolean) => void
  minChars?: number
  debounceMs?: number
  showRelevanceInfo?: boolean
  showStats?: boolean
}

export function SuperIntelligentSearch({
  rpcFunction,
  placeholder = "Buscar...",
  additionalParams = {},
  onResults,
  onLoading,
  minChars = 2,
  debounceMs = 300,
  showRelevanceInfo = true,
  showStats = true
}: SuperIntelligentSearchProps) {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<{total: number, tiempo: number} | null>(null)
  const [error, setError] = useState<string | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout>()
  const supabase = createClient()

  // Búsqueda con debounce
  const performSearch = useCallback(async (searchText: string) => {
    if (!searchText || searchText.length < minChars) {
      onResults([])
      setStats(null)
      setLoading(false)
      onLoading?.(false)
      return
    }

    try {
      setLoading(true)
      onLoading?.(true)
      setError(null)
      
      const startTime = performance.now()
      
      const { data, error: searchError } = await supabase.rpc(rpcFunction, {
        p_query: searchText,
        ...additionalParams
      })

      const endTime = performance.now()
      const tiempo = Math.round(endTime - startTime)

      if (searchError) {
        console.error("Error en búsqueda:", searchError)
        setError("Error al buscar")
        onResults([])
      } else {
        onResults(data || [])
        if (showStats) {
          setStats({ total: data?.length || 0, tiempo })
        }
      }
    } catch (err) {
      console.error("Error inesperado:", err)
      setError("Error inesperado")
      onResults([])
    } finally {
      setLoading(false)
      onLoading?.(false)
    }
  }, [rpcFunction, additionalParams, onResults, onLoading, minChars, showStats, supabase])

  // Effect con debounce
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      performSearch(query)
    }, debounceMs)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [query, performSearch, debounceMs])

  const handleClear = () => {
    setQuery("")
    setStats(null)
    setError(null)
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-20"
          autoComplete="off"
          spellCheck="false"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {query && !loading && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleClear}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          {showRelevanceInfo && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-sm space-y-1">
                    <p className="font-semibold">Búsqueda inteligente:</p>
                    <ul className="list-disc pl-4">
                      <li>Ignora acentos (José = Jose)</li>
                      <li>Ignora mayúsculas (JOSE = jose)</li>
                      <li>Tolera errores tipográficos</li>
                      <li>Busca en todos los campos</li>
                    </ul>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
      
      {/* Estadísticas */}
      {stats && showStats && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary" className="text-xs">
            {stats.total} resultados
          </Badge>
          <Badge variant="outline" className="text-xs">
            {stats.tiempo}ms
          </Badge>
        </div>
      )}
      
      {/* Error */}
      {error && (
        <div className="text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
      
      {/* Hint de búsqueda mínima */}
      {query.length > 0 && query.length < minChars && (
        <div className="text-sm text-muted-foreground">
          Escribe al menos {minChars} caracteres para buscar
        </div>
      )}
    </div>
  )
}
```

---

### **Highlighter de Resultados**

```typescript
// components/search-highlight.tsx
interface SearchHighlightProps {
  text: string
  query: string
  className?: string
}

export function SearchHighlight({ text, query, className = "" }: SearchHighlightProps) {
  if (!query || !text) return <span className={className}>{text}</span>

  // Normalizar para búsqueda
  const normalizeForMatch = (str: string) => 
    str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

  const normalizedText = normalizeForMatch(text)
  const normalizedQuery = normalizeForMatch(query)

  const parts: { text: string; highlight: boolean }[] = []
  let lastIndex = 0

  // Buscar todas las ocurrencias
  let index = normalizedText.indexOf(normalizedQuery)
  while (index !== -1) {
    // Agregar texto antes del match
    if (index > lastIndex) {
      parts.push({
        text: text.substring(lastIndex, index),
        highlight: false
      })
    }
    
    // Agregar match
    parts.push({
      text: text.substring(index, index + query.length),
      highlight: true
    })
    
    lastIndex = index + query.length
    index = normalizedText.indexOf(normalizedQuery, lastIndex)
  }

  // Agregar texto restante
  if (lastIndex < text.length) {
    parts.push({
      text: text.substring(lastIndex),
      highlight: false
    })
  }

  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.highlight ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 font-semibold">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </span>
  )
}
```

---

## ✅ SOLUCIÓN 4: MEJORAS EN TABLAS

### **Cambios Recomendados:**

```sql
-- 1. Precio en productos: cambiar de INT a NUMERIC
ALTER TABLE productos 
  ALTER COLUMN precio TYPE NUMERIC(10, 2);

-- 2. Agregar columnas de normalización (opcional, para performance)
ALTER TABLE productos 
  ADD COLUMN IF NOT EXISTS nombre_normalizado TEXT 
  GENERATED ALWAYS AS (unaccent(LOWER(nombre))) STORED;

ALTER TABLE productos 
  ADD COLUMN IF NOT EXISTS descripcion_normalizada TEXT 
  GENERATED ALWAYS AS (unaccent(LOWER(descripcion))) STORED;

-- Índices en columnas normalizadas
CREATE INDEX idx_productos_nombre_normalizado_trgm 
  ON productos USING gin(nombre_normalizado gin_trgm_ops);

-- 3. Agregar campo de orden en categorías (para ordenamiento personalizado)
ALTER TABLE categorias_productos 
  ADD COLUMN IF NOT EXISTS orden INT DEFAULT 0;

UPDATE categorias_productos SET orden = 
  CASE nombre
    WHEN 'Albañilería' THEN 1
    WHEN 'Plomería' THEN 2
    WHEN 'Electricidad' THEN 3
    WHEN 'Gas' THEN 4
    WHEN 'Pintura' THEN 5
    WHEN 'Herrería' THEN 6
    WHEN 'Impermeabilización' THEN 7
    WHEN 'Destapación' THEN 8
    WHEN 'Materiales' THEN 9
    ELSE 10
  END;

-- 4. Agregar triggers para auto-normalización (opcional)
CREATE OR REPLACE FUNCTION auto_normalize_text()
RETURNS TRIGGER AS $$
BEGIN
  -- Trim espacios
  NEW.nombre = TRIM(NEW.nombre);
  
  -- Capitalizar primera letra (solo para categorías y nombres propios)
  IF TG_TABLE_NAME = 'categorias_productos' THEN
    NEW.nombre = INITCAP(NEW.nombre);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_productos_normalize
  BEFORE INSERT OR UPDATE ON productos
  FOR EACH ROW
  EXECUTE FUNCTION auto_normalize_text();

CREATE TRIGGER trg_categorias_normalize
  BEFORE INSERT OR UPDATE ON categorias_productos
  FOR EACH ROW
  EXECUTE FUNCTION auto_normalize_text();
```

---

## 📋 PLAN DE IMPLEMENTACIÓN COMPLETO

### **FASE 1: Acentos y Encoding (⏱️ 1 hora)**
1. ✅ Agregar meta UTF-8 en layout.tsx
2. ✅ Crear middleware para headers
3. ✅ Crear helpers de normalización
4. ✅ Ejecutar migración de datos existentes
5. ✅ Testing: crear producto con "José Pérez" y verificar display

### **FASE 2: Extensiones y Setup DB (⏱️ 30 min)**
1. ✅ Habilitar extensiones (pg_trgm, fuzzystrmatch, btree_gin)
2. ✅ Crear índices GIN en todas las tablas críticas
3. ✅ Verificar que unaccent funciona correctamente

### **FASE 3: Funciones de Búsqueda (⏱️ 2 horas)**
1. ✅ Crear función buscar_productos_super_inteligente
2. ✅ Crear función buscar_facturas_super_inteligente
3. ✅ Crear función buscar_edificios_super_inteligente
4. ✅ Crear función buscar_tareas_super_inteligente
5. ✅ Testing SQL directo de cada función

### **FASE 4: Componentes React (⏱️ 2 horas)**
1. ✅ Crear SuperIntelligentSearch component
2. ✅ Crear SearchHighlight component
3. ✅ Crear text-normalizer helpers
4. ✅ Integrar en página productos (testing)

### **FASE 5: Integración Global (⏱️ 3 horas)**
1. ✅ Reemplazar búsqueda en productos
2. ✅ Reemplazar búsqueda en facturas
3. ✅ Reemplazar búsqueda en edificios
4. ✅ Reemplazar búsqueda en tareas
5. ✅ Reemplazar búsqueda en contactos, presupuestos, etc.

### **FASE 6: Mejoras Adicionales (⏱️ 1 hora)**
1. ✅ Cambiar productos.precio a NUMERIC
2. ✅ Agregar columnas normalizadas (opcional)
3. ✅ Agregar triggers auto-normalización
4. ✅ Actualizar órdenes de categorías

### **FASE 7: Testing Completo (⏱️ 1 hora)**
1. ✅ Test: búsqueda con acentos
2. ✅ Test: búsqueda con mayúsculas
3. ✅ Test: búsqueda con typos
4. ✅ Test: búsqueda por categoría
5. ✅ Test: performance (< 100ms)
6. ✅ Test: display de acentos correcto

---

## 🎯 EJEMPLOS DE USO

### **Página de Productos:**

```typescript
// app/dashboard/productos/page.tsx
import { SuperIntelligentSearch } from "@/components/super-intelligent-search"
import { SearchHighlight } from "@/components/search-highlight"

export default function ProductosPage() {
  const [productos, setProductos] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      {/* Búsqueda Inteligente */}
      <SuperIntelligentSearch
        rpcFunction="buscar_productos_super_inteligente"
        placeholder="Buscar productos por nombre, categoría, código..."
        additionalParams={{
          p_categoria_id: categoriaSeleccionada,
          p_activo: true,
          p_limit: 100
        }}
        onResults={(results) => {
          setProductos(results)
          // Guardar query para highlight
          setSearchQuery(results[0]?.p_query || "")
        }}
        showRelevanceInfo={true}
        showStats={true}
        minChars={2}
        debounceMs={300}
      />

      {/* Resultados con Highlight */}
      <div className="grid gap-4">
        {productos.map((producto) => (
          <div key={producto.id} className="border p-4 rounded">
            <h3 className="font-semibold">
              <SearchHighlight 
                text={producto.nombre} 
                query={searchQuery}
              />
            </h3>
            <p className="text-sm text-muted-foreground">
              <SearchHighlight 
                text={producto.descripcion || ""} 
                query={searchQuery}
              />
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge>{producto.categoria_nombre}</Badge>
              <span className="text-sm">Código: {producto.code}</span>
              {producto.razon_match && (
                <Badge variant="outline" className="text-xs">
                  {producto.razon_match}
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## 🎯 CASOS DE USO REALES

### **Búsquedas que AHORA funcionarán:**

```
Usuario escribe: "albanileria"
✅ Encuentra: "Albañilería"

Usuario escribe: "jose"
✅ Encuentra: "José"

Usuario escribe: "INSTALACION"
✅ Encuentra: "Instalación"

Usuario escribe: "plomeria"
✅ Encuentra: "Plomería"

Usuario escribe: "electr"
✅ Encuentra: "Electricidad"

Usuario escribe: "73"
✅ Encuentra: Producto con código 73

Usuario escribe: "techo bano"
✅ Encuentra: "Pintura Techo Baño"

Usuario escribe: "pintara"
✅ Encuentra: "Pintura" (typo tolerado)

Usuario escribe: "heRReRia"
✅ Encuentra: "Herrería"

Usuario escribe: "impermea"
✅ Encuentra: "Impermeabilización"
```

---

## 📊 MEJORAS ESPERADAS

| Métrica | ANTES | DESPUÉS | Mejora |
|---------|-------|---------|--------|
| **Búsqueda con acentos** | ❌ No funciona | ✅ Funciona | **100%** |
| **Búsqueda case-insensitive** | ✅ Funciona | ✅ Funciona | **=** |
| **Búsqueda con typos** | ❌ No funciona | ✅ Funciona | **100%** |
| **Búsqueda por categoría** | ❌ Manual | ✅ Automática | **100%** |
| **Velocidad búsqueda** | 500ms | 50ms | **10x** ⚡ |
| **Display de acentos** | ❌ Mal (Ã©) | ✅ Correcto (é) | **100%** |
| **Relevancia resultados** | ❌ Sin orden | ✅ Ordenado | **100%** |

---

## ⚠️ PRECAUCIONES

1. **Backup completo antes de empezar**
2. **Probar en desarrollo primero**
3. **Índices GIN consumen espacio (~30%)**
4. **Testing exhaustivo de acentos**
5. **Verificar encoding en todos los navegadores**

---

## ✅ CHECKLIST FINAL

- [ ] Meta UTF-8 en layout
- [ ] Middleware headers
- [ ] Helpers normalización
- [ ] Migración datos
- [ ] Extensiones habilitadas
- [ ] Índices GIN creados
- [ ] 4 funciones búsqueda
- [ ] SuperIntelligentSearch component
- [ ] SearchHighlight component
- [ ] Integración productos
- [ ] Integración facturas
- [ ] Integración edificios
- [ ] Integración tareas
- [ ] Testing completo
- [ ] Documentación actualizada

---

**¿LISTO PARA IMPLEMENTAR TODO ESTO PASO A PASO CON EXTREMO CUIDADO? 🚀**
