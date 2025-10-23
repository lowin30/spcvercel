# 📄 Cómo Usar PDFs de Liquidaciones (On-Demand)

## ✅ Sistema Implementado: Generación On-Demand

Los PDFs de liquidaciones **NO se guardan en Storage**. Se generan solo cuando el usuario los solicita y se descargan directamente al navegador.

---

## 🎯 Ventajas de este enfoque:

- ✅ **Sin costos de almacenamiento**
- ✅ **Datos siempre actualizados** (si cambias el diseño del PDF, se aplica a todos)
- ✅ **Simple de mantener** (no necesitas bucket ni RLS policies)
- ✅ **Rápido** (genera en 1-2 segundos)

---

## 🔧 Cómo Usar

### **Opción 1: Función Simple (Sin React)**

```typescript
import { descargarLiquidacionPDF } from '@/lib/descargar-liquidacion-pdf'

// En cualquier función async:
try {
  await descargarLiquidacionPDF(liquidacionId)
  toast.success('PDF descargado con éxito')
} catch (error) {
  toast.error('Error al descargar PDF')
}
```

### **Opción 2: Hook de React (Con Loading State)**

```typescript
import { useDescargarLiquidacionPDF } from '@/lib/descargar-liquidacion-pdf'

function MiComponente() {
  const { descargar, isDownloading, error } = useDescargarLiquidacionPDF()

  return (
    <Button 
      onClick={() => descargar(liquidacionId)}
      disabled={isDownloading}
    >
      {isDownloading ? 'Generando PDF...' : 'Descargar PDF'}
    </Button>
  )
}
```

---

## 📋 Ejemplo Completo: Botón en Listado de Liquidaciones

```typescript
'use client'

import { useDescargarLiquidacionPDF } from '@/lib/descargar-liquidacion-pdf'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { toast } from 'sonner'

export function ListadoLiquidaciones({ liquidaciones }) {
  const { descargar, isDownloading } = useDescargarLiquidacionPDF()

  const handleDescargar = async (id: number) => {
    try {
      await descargar(id)
      toast.success('PDF descargado con éxito')
    } catch (error) {
      toast.error('Error al generar el PDF')
    }
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Código</th>
          <th>Supervisor</th>
          <th>Total</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {liquidaciones.map((liq) => (
          <tr key={liq.id}>
            <td>{liq.code}</td>
            <td>{liq.email_supervisor}</td>
            <td>${liq.total_supervisor.toLocaleString('es-AR')}</td>
            <td>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDescargar(liq.id)}
                disabled={isDownloading}
              >
                <Download className="h-4 w-4 mr-2" />
                {isDownloading ? 'Generando...' : 'PDF'}
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

---

## 📊 Contenido del PDF

El PDF generado incluye:

1. ✅ **Encabezado** con logo y datos de contacto
2. ✅ **Información de la tarea** (título, supervisor)
3. ✅ **Resumen de liquidación**
   - Presupuesto base
   - Gastos reales
   - Ganancia neta
   - Distribución 50/50
4. ✅ **Desglose de gastos reales**
   - 📦 Materiales (con comprobantes)
   - 💼 Jornales (con detalle de días)
5. ✅ **Liquidación final** (destacada)
   - Ganancia del supervisor
   - Gastos reales (reembolso)
   - **TOTAL A PAGAR**
6. ✅ **Advertencia de sobrecosto** (si aplica)
7. ✅ **Pie de página** con datos de contacto

---

## ⚡ Rendimiento

- **Tiempo de generación:** 1-2 segundos
- **Tamaño del PDF:** ~50-100 KB (según cantidad de gastos)
- **Compatibilidad:** Todos los navegadores modernos

---

## 🔄 Regenerar PDFs

Si cambias el diseño del PDF (colores, formato, etc.):

1. Modifica `lib/pdf-liquidacion-generator.ts`
2. ✅ **Todos los PDFs se regenerarán con el nuevo diseño automáticamente**
3. No necesitas hacer nada más

---

## 📝 Notas Importantes

- ❌ **NO** se guarda en Storage
- ❌ **NO** se guarda `url_pdf` en la base de datos
- ✅ Se genera cada vez que el usuario hace click
- ✅ Siempre refleja los datos actuales de la BD
- ✅ El usuario puede descargar el PDF las veces que quiera

---

## 🚀 Próximos Pasos Sugeridos

Puedes agregar el botón de descarga en:

1. **Listado de liquidaciones** (`/dashboard/liquidaciones`)
2. **Vista detalle de liquidación** (`/dashboard/liquidaciones/[id]`)
3. **Dashboard del supervisor** (para que vea sus propias liquidaciones)

---

## 🛠️ Archivos Creados

- ✅ `lib/pdf-liquidacion-generator.ts` - Generador de PDF
- ✅ `lib/descargar-liquidacion-pdf.ts` - Función helper on-demand
- ✅ Este archivo de documentación

---

## ❓ FAQ

**¿Qué pasa si el usuario pierde el PDF?**
→ Lo vuelve a generar con un click.

**¿El PDF siempre será el mismo?**
→ Sí, mientras los datos en la BD no cambien.

**¿Puedo enviar el PDF por email?**
→ Sí, genera el blob y adjúntalo al email.

**¿Necesito configurar Storage?**
→ No, nada de Storage.

**¿Funciona offline?**
→ No, necesita conexión para obtener datos de Supabase.
