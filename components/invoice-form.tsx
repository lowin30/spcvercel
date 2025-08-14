"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { format } from "date-fns"
import { es } from 'date-fns/locale'
import { CalendarIcon, Loader2, Trash2, PlusCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"


import { toast } from "sonner"


// Esquema de validación del formulario principal
const invoiceFormSchema = z.object({
  id_presupuesto: z.string().optional(),
  code: z.string().optional(),
  total: z.coerce.number(),
})

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>

// Tipos para los props del componente
interface Presupuesto {
  id: string;
  code: string;
  titulo: string;
  monto_total: number;
  edificios: { id: number; nombre: string; id_administrador: number; } | null;
  estado: string;
}

interface ItemFactura {
  id?: number;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal_item: number; // Corregido para coincidir con la DB
}

interface InvoiceFormProps {
  presupuestos: Presupuesto[];
  factura?: InvoiceFormValues & { id: number };
  items?: ItemFactura[];
  onSave: (
    data: InvoiceFormValues,
    items: ItemFactura[],
    facturaIdToEdit?: number
  ) => Promise<{ success: boolean; message: string }>;
}

export function InvoiceForm({ presupuestos, factura, items: initialItems = [], onSave }: InvoiceFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const [items, setItems] = useState<ItemFactura[]>(() =>
    initialItems.map(item => {
      const cantidad = item.cantidad || 0;
      const precio_unitario = item.precio_unitario || 0;
      // Aseguramos que el subtotal se llame 'subtotal_item' y se calcule si no existe
      const subtotal_item = (item as any).subtotal_item ?? (item as any).total ?? (cantidad * precio_unitario);
      return {
        ...item,
        descripcion: item.descripcion || '',
        cantidad,
        precio_unitario,
        subtotal_item,
      };
    })
  );

  const isEditMode = !!factura



  const defaultValues = {
    id_presupuesto: factura?.id_presupuesto ? String(factura.id_presupuesto) : '',
    code: factura?.code || (isEditMode ? '' : 'Se generará automáticamente'),
    total: factura?.total || 0,
  };

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues,
  })

  // --- Lógica de Items ---
  useEffect(() => {
    const totalFactura = items.reduce((acc, item) => acc + (item.subtotal_item || 0), 0);
    form.setValue('total', totalFactura, { shouldValidate: true });
  }, [items, form]);

  const handleAddItem = () => {
    setItems([...items, { descripcion: '', cantidad: 1, precio_unitario: 0, subtotal_item: 0 }]);
  };

  const handleItemChange = (index: number, field: keyof ItemFactura, value: string | number) => {
    const newItems = [...items];
    const item = { ...newItems[index] };
    (item[field] as any) = value;

    const cantidad = typeof item.cantidad === 'string' ? parseFloat(item.cantidad) : item.cantidad;
    const precio_unitario = typeof item.precio_unitario === 'string' ? parseFloat(item.precio_unitario) : item.precio_unitario;
    if (!isNaN(cantidad) && !isNaN(precio_unitario)) {
      item.subtotal_item = cantidad * precio_unitario; // Corregido para calcular el subtotal del item
    }
    newItems[index] = item;
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // --- Enviar Formulario ---
  async function onSubmit(data: InvoiceFormValues) {
    setIsLoading(true);
    
    // Llamamos a la Server Action a través de la prop onSave
    const result = await onSave(data, items, factura?.id);

    setIsLoading(false);

    if (result.success) {
        toast.success(result.message);
        router.push('/dashboard/facturas');
        router.refresh(); // Forzar la actualización de la cache del router
    } else {
        toast.error(result.message);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Detalles de la Factura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="code" render={({ field }) => (
                <FormItem>
                  <FormLabel>Código de Factura</FormLabel>
                  <FormControl>
                    <Input placeholder="Se generará automáticamente" {...field} readOnly />
                  </FormControl>
                  <FormDescription>
                    Este código es generado por el sistema y no puede ser modificado.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="id_presupuesto" render={({ field }) => (
                <FormItem>
                  <FormLabel>Presupuesto Asociado</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isEditMode}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un presupuesto" />
                    </SelectTrigger>
                    <SelectContent>
                      {presupuestos.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.code} - {p.titulo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>{isEditMode ? "No se puede cambiar el presupuesto de una factura existente." : "Asocia un presupuesto aprobado."}</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />


              <FormField control={form.control} name="total" render={({ field }) => (
                <FormItem>
                  <FormLabel>Total</FormLabel>
                  <FormControl><Input type="number" placeholder="0.00" {...field} readOnly className="bg-gray-100" /></FormControl>
                  <FormDescription>El total se calcula automáticamente a partir de los ítems.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </CardContent>
        </Card>

        {/* Card para la gestión de Items */}
        <Card>
          <CardHeader>
            <CardTitle>Ítems de la Factura</CardTitle>
            <CardDescription>Añade, edita o elimina los ítems de la factura.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50%]">Descripción</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Precio Unit.</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead><span className="sr-only">Acciones</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input
                        placeholder="Descripción del servicio o producto"
                        value={item.descripcion}
                        onChange={(e) => handleItemChange(index, 'descripcion', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.cantidad}
                        onChange={(e) => handleItemChange(index, 'cantidad', parseFloat(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.precio_unitario}
                        onChange={(e) => handleItemChange(index, 'precio_unitario', parseFloat(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.subtotal_item.toFixed(2)}
                        readOnly
                        className="bg-gray-100 border-none"
                      />
                    </TableCell>
                    <TableCell>
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={handleAddItem}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Añadir Ítem
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Guardando..." : isEditMode ? "Guardar Cambios" : "Crear Factura"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
