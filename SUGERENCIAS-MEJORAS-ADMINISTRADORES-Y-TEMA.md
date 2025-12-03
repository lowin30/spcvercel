# 💡 SUGERENCIAS: MEJORAS ADMINISTRADORES + MODO OSCURO GLOBAL

**Fecha:** 3 de Diciembre, 2025  
**Estado:** 📋 ANÁLISIS Y SUGERENCIAS  
**Objetivo:** Mejorar Tab Administradores + Modo Oscuro Accesible Globalmente

---

## 🔍 ANÁLISIS DE BASE DE DATOS

### ✅ **Tabla `administradores` - CAMPOS EXISTENTES**

```sql
-- ✅ CAMPOS QUE YA EXISTEN EN LA BD:
id                  INTEGER (PK)
code                TEXT
nombre              TEXT (NOT NULL)
telefono            TEXT (NOT NULL)  ✅ YA EXISTE
estado              TEXT (DEFAULT 'activo')  ✅ YA EXISTE
aplica_ajustes      BOOLEAN (DEFAULT false)  ✅ YA EXISTE
porcentaje_default  NUMERIC (DEFAULT 0)  ✅ YA EXISTE
email1              TEXT
email2              TEXT
created_at          TIMESTAMP
```

**✅ EXCELENTE:** Todos los campos que pediste **YA EXISTEN** en la base de datos.

---

### ✅ **Tabla `usuarios` - ESTRUCTURA ACTUAL**

```sql
id               UUID (PK)
code             TEXT
email            TEXT (NOT NULL)
rol              TEXT (NOT NULL)
color_perfil     TEXT (DEFAULT '#3498db')  ← Ya hay un campo de personalización
last_login       TIMESTAMP
nombre           TEXT
es_propietario   BOOLEAN (DEFAULT false)
```

**📊 OBSERVACIÓN:** Ya existe `color_perfil` pero NO hay campos para preferencias de UI.

---

### 📊 **Conteo de Edificios por Administrador (Datos Reales)**

```sql
administrador         | total_edificios | aplica_ajustes | porcentaje
---------------------|----------------|----------------|------------
rodrigo fernandez    | 23             | true           | 10%
pilar ferreras mapi  | 13             | false          | 0%
santiago             | 7              | false          | 0%
leandro portillo     | 5              | false          | 0%
adrian levi          | 3              | false          | 0%
```

---

## 🎯 SUGERENCIA 1: MEJORA TAB ADMINISTRADORES

### **Problema Actual:**
- ❌ Solo muestra: Nombre + Edificio (singular, no tiene sentido)
- ❌ No muestra teléfono, estado, aplica_ajustes, porcentaje
- ❌ No muestra conteo de edificios
- ❌ Datos cargados incorrectamente (no trae campos necesarios)

---

### **📋 PROPUESTA DE MEJORA - VERSIÓN COMPLETA**

#### **A) Actualizar Query de Carga**

**Archivo:** `app/dashboard/configuracion/page.tsx`

```typescript
// 🔴 ACTUAL (incorrecto):
const { data: administradoresData } = await supabase
  .from("administradores")
  .select("*, edificio:edificios(nombre)")  // ❌ Solo trae un edificio

// ✅ PROPUESTO (correcto):
const { data: administradoresData } = await supabase
  .from("administradores")
  .select(`
    id,
    code,
    nombre,
    telefono,
    estado,
    aplica_ajustes,
    porcentaje_default,
    email1,
    email2,
    created_at
  `)
  .order('nombre', { ascending: true })

// Luego hacer conteo de edificios por administrador
const administradoresConConteo = await Promise.all(
  administradoresData.map(async (admin) => {
    const { count } = await supabase
      .from('edificios')
      .select('id', { count: 'exact', head: true })
      .eq('id_administrador', admin.id)
    
    return {
      ...admin,
      total_edificios: count || 0
    }
  })
)
```

---

#### **B) Nueva Tabla Desktop**

```typescript
<table className="min-w-full divide-y divide-gray-200">
  <thead className="bg-gray-50 dark:bg-gray-800">
    <tr>
      <th className="px-4 py-3 text-left text-xs font-medium uppercase">Nombre</th>
      <th className="px-4 py-3 text-left text-xs font-medium uppercase">Teléfono</th>
      <th className="px-4 py-3 text-left text-xs font-medium uppercase">Estado</th>
      <th className="px-4 py-3 text-center text-xs font-medium uppercase">Edificios</th>
      <th className="px-4 py-3 text-center text-xs font-medium uppercase">Aplica Ajustes</th>
      <th className="px-4 py-3 text-right text-xs font-medium uppercase">% Default</th>
      <th className="px-4 py-3 text-right text-xs font-medium uppercase">Acciones</th>
    </tr>
  </thead>
  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
    {administradores.map((admin) => (
      <tr key={admin.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
        <td className="px-4 py-3">
          <Link href={`/dashboard/administradores/${admin.id}`} 
                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 font-medium">
            {admin.nombre}
          </Link>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
          <a href={`tel:${admin.telefono}`} className="hover:underline">
            {admin.telefono}
          </a>
        </td>
        <td className="px-4 py-3">
          <Badge variant={admin.estado === 'activo' ? 'default' : 'secondary'}>
            {admin.estado}
          </Badge>
        </td>
        <td className="px-4 py-3 text-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href={`/dashboard/edificios?admin=${admin.id}`} 
                      className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                  <Building2 className="h-4 w-4" />
                  <span className="font-semibold">{admin.total_edificios}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                Ver edificios de {admin.nombre}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </td>
        <td className="px-4 py-3 text-center">
          {admin.aplica_ajustes ? (
            <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
          ) : (
            <XCircle className="h-5 w-5 text-gray-400 mx-auto" />
          )}
        </td>
        <td className="px-4 py-3 text-right font-mono">
          {admin.porcentaje_default > 0 ? (
            <span className="font-semibold text-blue-600">
              {admin.porcentaje_default}%
            </span>
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </td>
        <td className="px-4 py-3 text-right">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/dashboard/administradores/${admin.id}/editar`}>
              <Edit className="h-4 w-4" />
            </Link>
          </Button>
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

---

#### **C) Tarjetas Móvil Mejoradas**

```typescript
<div className="grid grid-cols-1 gap-4 md:hidden">
  {administradores.map((admin) => (
    <div key={admin.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg border shadow-sm">
      {/* Header con nombre y estado */}
      <div className="flex justify-between items-start mb-3">
        <Link href={`/dashboard/administradores/${admin.id}`} 
              className="font-semibold text-blue-600 dark:text-blue-400">
          {admin.nombre}
        </Link>
        <Badge variant={admin.estado === 'activo' ? 'default' : 'secondary'}>
          {admin.estado}
        </Badge>
      </div>
      
      {/* Información en grid */}
      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
        <div>
          <span className="text-gray-500 dark:text-gray-400">Teléfono:</span>
          <a href={`tel:${admin.telefono}`} className="block font-medium text-blue-600 hover:underline">
            {admin.telefono}
          </a>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Edificios:</span>
          <Link href={`/dashboard/edificios?admin=${admin.id}`} 
                className="block font-semibold text-blue-600 hover:underline">
            {admin.total_edificios} edificios
          </Link>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Aplica Ajustes:</span>
          <span className="block font-medium">
            {admin.aplica_ajustes ? '✓ Sí' : '✗ No'}
          </span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">% Default:</span>
          <span className="block font-semibold text-blue-600">
            {admin.porcentaje_default > 0 ? `${admin.porcentaje_default}%` : '—'}
          </span>
        </div>
      </div>
      
      {/* Botones de acción */}
      <div className="flex gap-2 pt-3 border-t">
        <Button variant="outline" size="sm" asChild className="flex-1">
          <Link href={`/dashboard/administradores/${admin.id}`}>
            <Eye className="h-4 w-4 mr-1" />
            Ver
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild className="flex-1">
          <Link href={`/dashboard/administradores/${admin.id}/editar`}>
            <Edit className="h-4 w-4 mr-1" />
            Editar
          </Link>
        </Button>
      </div>
    </div>
  ))}
</div>
```

---

#### **D) Estadísticas Mejoradas**

```typescript
<div className="grid gap-4 grid-cols-1 md:grid-cols-4">
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">Total Administradores</CardTitle>
      <Users2 className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{administradores.length}</div>
    </CardContent>
  </Card>
  
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">Administradores Activos</CardTitle>
      <CheckCircle className="h-4 w-4 text-green-600" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">
        {administradores.filter(a => a.estado === 'activo').length}
      </div>
    </CardContent>
  </Card>
  
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">Total Edificios</CardTitle>
      <Building2 className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">
        {administradores.reduce((sum, a) => sum + a.total_edificios, 0)}
      </div>
    </CardContent>
  </Card>
  
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">Con Ajustes</CardTitle>
      <Percent className="h-4 w-4 text-blue-600" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">
        {administradores.filter(a => a.aplica_ajustes).length}
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Aplican porcentaje
      </p>
    </CardContent>
  </Card>
</div>
```

---

## 🌙 SUGERENCIA 2: MODO OSCURO GLOBAL PERSISTENTE

### **Problema Actual:**
- ❌ Modo oscuro solo en `/dashboard/configuracion?tab=apariencia`
- ❌ Solo usa localStorage (no persistente entre dispositivos)
- ❌ No accesible fácilmente para todos los usuarios

---

### **🎯 PROPUESTA: CREAR TABLA `preferencias_usuarios`**

#### **A) Nueva Tabla en Base de Datos**

```sql
CREATE TABLE preferencias_usuarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  id_usuario UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  
  -- Preferencias de apariencia
  tema VARCHAR(10) DEFAULT 'system' CHECK (tema IN ('light', 'dark', 'system')),
  tamano_texto VARCHAR(10) DEFAULT 'medium' CHECK (tamano_texto IN ('small', 'medium', 'large')),
  color_primario VARCHAR(20) DEFAULT 'blue',
  
  -- Preferencias de notificaciones (futuro)
  notificaciones_email BOOLEAN DEFAULT true,
  notificaciones_push BOOLEAN DEFAULT false,
  
  -- Preferencias de dashboard (futuro)
  dashboard_layout VARCHAR(20) DEFAULT 'default',
  mostrar_graficos BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(id_usuario)
);

-- Índice para búsqueda rápida
CREATE INDEX idx_preferencias_usuarios_id_usuario ON preferencias_usuarios(id_usuario);

-- RLS (Row Level Security)
ALTER TABLE preferencias_usuarios ENABLE ROW LEVEL SECURITY;

-- Policy: Usuarios solo ven sus propias preferencias
CREATE POLICY "Usuarios pueden ver sus preferencias"
  ON preferencias_usuarios
  FOR SELECT
  USING (auth.uid() = id_usuario);

CREATE POLICY "Usuarios pueden actualizar sus preferencias"
  ON preferencias_usuarios
  FOR UPDATE
  USING (auth.uid() = id_usuario);

CREATE POLICY "Usuarios pueden insertar sus preferencias"
  ON preferencias_usuarios
  FOR INSERT
  WITH CHECK (auth.uid() = id_usuario);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_preferencias_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_preferencias_updated_at
BEFORE UPDATE ON preferencias_usuarios
FOR EACH ROW
EXECUTE FUNCTION update_preferencias_updated_at();

-- Función para crear preferencias por defecto al crear usuario
CREATE OR REPLACE FUNCTION create_default_preferencias()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO preferencias_usuarios (id_usuario, tema, tamano_texto, color_primario)
  VALUES (NEW.id, 'system', 'medium', 'blue')
  ON CONFLICT (id_usuario) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_default_preferencias
AFTER INSERT ON usuarios
FOR EACH ROW
EXECUTE FUNCTION create_default_preferencias();
```

---

#### **B) Toggle Global de Modo Oscuro**

**Ubicación:** Agregar en `components/dashboard-nav.tsx` (desktop) y `components/mobile-nav.tsx` (móvil)

**Componente Nuevo:** `components/theme-toggle.tsx`

```typescript
"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase-client"
import { useToast } from "@/components/ui/use-toast"

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const supabase = createClient()

  // Cargar preferencias del usuario
  useEffect(() => {
    async function loadUserPreferences() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          // Si no hay usuario, usar localStorage
          const savedTheme = localStorage.getItem('theme-mode') as 'light' | 'dark' | 'system' | null
          const currentTheme = savedTheme || 'system'
          setTheme(currentTheme)
          applyTheme(currentTheme)
          setLoading(false)
          return
        }

        // Cargar de BD
        const { data: prefs } = await supabase
          .from('preferencias_usuarios')
          .select('tema')
          .eq('id_usuario', user.id)
          .maybeSingle()

        const currentTheme = prefs?.tema || 'system'
        setTheme(currentTheme)
        applyTheme(currentTheme)
        
        // Sincronizar con localStorage como fallback
        localStorage.setItem('theme-mode', currentTheme)
      } catch (error) {
        console.error('Error al cargar preferencias:', error)
        // Fallback a localStorage
        const savedTheme = localStorage.getItem('theme-mode') as 'light' | 'dark' | 'system' | null
        const currentTheme = savedTheme || 'system'
        setTheme(currentTheme)
        applyTheme(currentTheme)
      } finally {
        setLoading(false)
      }
    }

    loadUserPreferences()
  }, [])

  const applyTheme = (newTheme: 'light' | 'dark' | 'system') => {
    const root = document.documentElement
    
    if (newTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      root.classList.remove('light', 'dark')
      root.classList.add(systemTheme)
    } else {
      root.classList.remove('light', 'dark')
      root.classList.add(newTheme)
    }
  }

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    applyTheme(newTheme)
    
    // Guardar en localStorage inmediatamente
    localStorage.setItem('theme-mode', newTheme)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Guardar en BD (async, no bloqueante)
      const { error } = await supabase
        .from('preferencias_usuarios')
        .upsert({
          id_usuario: user.id,
          tema: newTheme,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id_usuario'
        })

      if (error) throw error
    } catch (error) {
      console.error('Error al guardar tema:', error)
      // No mostrar toast de error, ya se guardó en localStorage
    }
  }

  if (loading) {
    return <div className="w-9 h-9" /> // Placeholder
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="relative"
      title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
```

---

#### **C) Integración en Nav Desktop**

**Archivo:** `components/dashboard-nav.tsx`

```typescript
// Agregar import
import { ThemeToggle } from "@/components/theme-toggle"

// En el header (después del logo, antes del UserNav):
<div className="ml-auto flex items-center space-x-4">
  <ThemeToggle />
  <UserNav user={user} userRole={userRole} />
</div>
```

---

#### **D) Integración en Nav Móvil**

**Archivo:** `components/mobile-nav.tsx`

```typescript
// En el Sheet, agregar en el header:
<SheetHeader className="flex flex-row items-center justify-between border-b pb-4">
  <SheetTitle>Menú</SheetTitle>
  <ThemeToggle />
</SheetHeader>
```

---

### **🎯 VENTAJAS DE ESTA SOLUCIÓN:**

#### **✅ Para el Usuario:**
1. **Acceso inmediato:** Sol/Luna visible en todo momento
2. **Persistente entre dispositivos:** Se guarda en BD, se sincroniza
3. **Rápido:** localStorage como cache, BD como backup
4. **Sin fricción:** Un click y listo

#### **✅ Para el Sistema:**
1. **Escalable:** Tabla preparada para más preferencias
2. **Seguro:** RLS protege datos de cada usuario
3. **Performante:** Índice en id_usuario
4. **Robusto:** Fallback a localStorage si falla BD

#### **✅ Flujo de Trabajo:**
```
1. Usuario hace click en Sol/Luna
   ↓
2. Cambia tema INMEDIATAMENTE (localStorage)
   ↓
3. Guarda en BD en background (async)
   ↓
4. Si usuario cambia de dispositivo:
   → Carga desde BD
   → Sincroniza localStorage
   → Aplica tema automáticamente
```

---

## 📊 COMPARACIÓN: ANTES vs DESPUÉS

### **Tab Administradores:**

| Aspecto | ANTES | DESPUÉS |
|---------|-------|---------|
| **Columnas** | 2 (Nombre, Edificio) | 7 (Nombre, Teléfono, Estado, Edificios, Ajustes, %, Acciones) |
| **Datos mostrados** | Nombre + 1 edificio | Todos los datos importantes |
| **Conteo edificios** | ❌ No | ✅ Sí, con link filtrado |
| **Estado** | ❌ No | ✅ Badge visual |
| **Aplica ajustes** | ❌ No | ✅ Check/X visual |
| **Porcentaje** | ❌ No | ✅ Formato % resaltado |
| **Teléfono** | ❌ No | ✅ Link tel: clickeable |
| **Acciones** | ❌ Solo link nombre | ✅ Botón editar |
| **Estadísticas** | 1 card (total) | 4 cards (total, activos, edificios, con ajustes) |
| **Móvil** | Tarjetas básicas | Tarjetas completas con grid |

### **Modo Oscuro:**

| Aspecto | ANTES | DESPUÉS |
|---------|-------|---------|
| **Acceso** | Solo en /configuracion?tab=apariencia | Toggle global en nav (siempre visible) |
| **Persistencia** | Solo localStorage (1 dispositivo) | BD + localStorage (todos los dispositivos) |
| **Usuarios** | Solo admin (quien accede a config) | TODOS los usuarios (admin, supervisor, trabajador) |
| **Clicks** | 3 (menú → config → apariencia → cambiar) | 1 (click en sol/luna) |
| **Velocidad** | Lenta (carga página completa) | Instantánea (localStorage) |
| **Sincronización** | ❌ No | ✅ Sí (entre dispositivos) |
| **Fallback** | ❌ Se pierde | ✅ localStorage como cache |

---

## ⚠️ PRECAUCIONES Y CONSIDERACIONES

### **1. Migración de Datos Existentes**

Si implementas la tabla `preferencias_usuarios`, necesitas:

```sql
-- Crear preferencias para usuarios existentes
INSERT INTO preferencias_usuarios (id_usuario, tema, tamano_texto)
SELECT id, 'system', 'medium'
FROM usuarios
WHERE id NOT IN (SELECT id_usuario FROM preferencias_usuarios);
```

### **2. Actualizar Políticas RLS**

Verificar que las policies permiten a cada usuario:
- ✅ SELECT sus propias preferencias
- ✅ INSERT sus preferencias (primera vez)
- ✅ UPDATE sus preferencias

### **3. Testing Recomendado**

```typescript
// Test 1: Usuario sin preferencias guardadas
- Login nuevo usuario
- Debe ver tema 'system' por defecto
- Al cambiar, debe crearse registro en BD

// Test 2: Usuario con preferencias
- Login usuario existente
- Debe cargar su tema desde BD
- Debe aplicarse automáticamente

// Test 3: Múltiples dispositivos
- Cambiar tema en dispositivo A
- Login en dispositivo B
- Debe verse el mismo tema

// Test 4: Sin conexión
- Cambiar tema offline
- Debe funcionar (localStorage)
- Al reconectar, debe sincronizar
```

---

## 🎯 RECOMENDACIÓN FINAL

### **Orden de Implementación Sugerido:**

#### **FASE 1 - Modo Oscuro Global (1-2 horas):**
1. ✅ Crear tabla `preferencias_usuarios`
2. ✅ Crear componente `ThemeToggle`
3. ✅ Integrar en nav desktop y móvil
4. ✅ Testing básico

**Impacto:** ⭐⭐⭐⭐⭐ Todos los usuarios contentos

---

#### **FASE 2 - Tab Administradores (2-3 horas):**
1. ✅ Actualizar query de carga (agregar conteo edificios)
2. ✅ Actualizar tabla desktop (7 columnas)
3. ✅ Actualizar tarjetas móvil
4. ✅ Agregar 4 cards de estadísticas

**Impacto:** ⭐⭐⭐⭐ Información completa y útil

---

### **¿Por qué este orden?**

1. **Modo Oscuro primero:** Más rápido, más impacto, todos los usuarios
2. **Tab Administradores después:** Más trabajo, solo afecta a admins

---

## 📝 CAMBIOS NECESARIOS POR ARCHIVO

### **MODO OSCURO:**
- [ ] Migration SQL (crear tabla `preferencias_usuarios`)
- [ ] `components/theme-toggle.tsx` (nuevo)
- [ ] `components/dashboard-nav.tsx` (agregar toggle)
- [ ] `components/mobile-nav.tsx` (agregar toggle)

### **TAB ADMINISTRADORES:**
- [ ] `app/dashboard/configuracion/page.tsx` (query mejorada)
- [ ] `components/administradores-tab.tsx` (tabla completa)

**Total:** 6 archivos

---

## ❓ PREGUNTAS PARA TI

1. **¿Quieres implementar ambas mejoras o solo una?**
2. **¿Prefieres empezar con Modo Oscuro (rápido) o Tab Administradores (más trabajo)?**
3. **¿Hay alguna columna adicional que quieras en la tabla de administradores?**
4. **¿Quieres que también sincronice el tamaño de texto entre dispositivos?**
5. **¿Prefieres el toggle Sol/Luna en la derecha del nav o en otro lugar?**

---

**¿Te parece bien esta propuesta? Dame el OK y empiezo a implementar. 🚀**
