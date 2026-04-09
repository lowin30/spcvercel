"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { format } from "date-fns"
import { es } from 'date-fns/locale'
import { CalendarIcon, Loader2, Trash2, PlusCircle, FileText, ArrowLeft, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"


import { toast } from "sonner"


// Esquema de validación del formulario principal
const invoiceFormSchema = z.object({
  id_presupuesto: z.string().optional(),
  id_presupuesto_final: z.string().optional(),
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
  // Chat Integration Props (SPC v9.5)
  isChatVariant?: boolean;
  initialData?: Partial<InvoiceFormValues & { items?: ItemFactura[] }>;
  onSuccess?: () => void;
}

export function InvoiceForm({ presupuestos, factura, items: initialItems = [], onSave, isChatVariant = false, initialData, onSuccess }: InvoiceFormProps) {
  // Merge initialData with factura
  const mergedData = { ...factura, ...initialData }
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
    id_presupuesto_final: (factura as any)?.id_presupuesto_final ? String((factura as any).id_presupuesto_final) : '',
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

      // Chat variant: trigger success callback
      if (isChatVariant && onSuccess) {
        onSuccess();
      } else {
        // Normal web flow: redirect
        router.push('/dashboard/facturas');
        router.refresh();
      }
    } else {
      toast.error(result.message);
    }
  }

  // --- RENDERING STRATEGY ---

  if (isChatVariant) {
    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="id_presupuesto_final" render={({ field }) => (
                <FormItem className="col-span-1">
                  <FormLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Presupuesto</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isEditMode}>
                    <SelectTrigger className="h-8 text-xs bg-muted/30 border-none transition-all hover:bg-muted/50">
                      <SelectValue placeholder="Presupuesto" />
                    </SelectTrigger>
                    <SelectContent>
                      {presupuestos.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                          {p.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="col-span-1 flex flex-col justify-end items-end">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Total Calculado</span>
                <span className="font-bold text-sm text-primary">
                  ${items.reduce((acc, i) => acc + (i.subtotal_item || 0), 0).toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Ítems</Label>
                <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={handleAddItem}>
                  <PlusCircle className="mr-1 h-3 w-3" /> Añadir
                </Button>
              </div>
              
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {items.map((item, index) => (
                  <div key={index} className="p-2 rounded-lg border bg-muted/10 space-y-2 relative group transition-colors hover:bg-muted/20">
                    <Textarea
                      placeholder="Descripción"
                      value={item.descripcion}
                      onChange={(e) => handleItemChange(index, 'descripcion', e.target.value)}
                      className="text-xs min-h-[40px] h-auto bg-transparent border-none p-0 focus-visible:ring-0 resize-none shadow-none"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={item.cantidad}
                          onChange={(e) => handleItemChange(index, 'cantidad', parseFloat(e.target.value) || 0)}
                          className="text-[10px] h-6 w-10 bg-muted/40 border-none px-1 text-center"
                        />
                        <span className="text-[10px] text-muted-foreground">x</span>
                        <Input
                          type="number"
                          value={item.precio_unitario}
                          onChange={(e) => handleItemChange(index, 'precio_unitario', parseFloat(e.target.value) || 0)}
                          className="text-[10px] h-6 w-20 bg-muted/40 border-none px-1"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-primary truncate">
                          ${item.subtotal_item.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                        </span>
                        <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(index)} className="h-6 w-6 text-red-500/50 hover:text-red-500 hover:bg-red-500/10">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full h-10 bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 hover:opacity-90">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : isEditMode ? "Guardar Cambios" : "Crear Factura"}
            </Button>
          </div>
        </form>
      </Form>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pb-20 sm:pb-0">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="md:col-span-2 border-none shadow-none bg-zinc-50 dark:bg-zinc-900/40">
            <CardHeader className="py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-zinc-500" />
                  Ítems de la Factura
                </CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={handleAddItem} className="h-8 border-dashed bg-transparent hover:bg-zinc-200 dark:hover:bg-zinc-800">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Añadir Ítem
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-4 sm:pt-0">
              {/* Desktop Table */}
              <div className="hidden sm:block overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                <Table>
                  <TableHeader className="bg-zinc-50 dark:bg-zinc-900">
                    <TableRow className="hover:bg-transparent border-b border-zinc-200 dark:border-zinc-800">
                      <TableHead className="w-auto text-xs font-bold uppercase tracking-wider py-3 pl-2">Descripción</TableHead>
                      <TableHead className="w-12 text-center text-xs font-bold uppercase tracking-wider py-3 px-0">Cant.</TableHead>
                      <TableHead className="w-24 text-right text-xs font-bold uppercase tracking-wider py-3 px-0">P. Unit</TableHead>
                      <TableHead className="w-28 text-right text-xs font-bold uppercase tracking-wider py-3 pl-0 pr-2">Subtotal</TableHead>
                      <TableHead className="w-8 px-0"></TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index} className="group border-b border-zinc-100 dark:border-zinc-900">
                        <TableCell className="py-2 pl-2 pr-1">
                          <Textarea
                            placeholder="Descripción detallada..."
                            value={item.descripcion}
                            onChange={(e) => handleItemChange(index, 'descripcion', e.target.value)}
                            className="w-full min-h-[72px] max-h-[250px] border-none shadow-none focus-visible:ring-1 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-600 bg-transparent px-0 py-1 resize-y text-sm leading-relaxed"
                          />
                        </TableCell>
                        <TableCell className="py-2 px-1 align-top pt-3">
                          <Input
                            type="number"
                            value={item.cantidad}
                            onChange={(e) => handleItemChange(index, 'cantidad', parseFloat(e.target.value) || 0)}
                            className="w-10 mx-auto text-center h-8 bg-zinc-50 dark:bg-zinc-900 border-none font-medium px-0"
                          />
                        </TableCell>
                        <TableCell className="py-2 px-1 align-top pt-3">
                          <div className="flex items-center gap-0.5 justify-end">
                            <span className="text-zinc-400 text-[10px]">$</span>
                            <Input
                              type="number"
                              value={item.precio_unitario}
                              onChange={(e) => handleItemChange(index, 'precio_unitario', parseFloat(e.target.value) || 0)}
                              className="w-20 text-right h-8 bg-zinc-50 dark:bg-zinc-900 border-none font-medium px-1"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="py-2 pl-1 pr-2 align-top pt-3 text-right">
                          <span className="font-bold text-sm text-primary whitespace-nowrap">
                            ${(item.subtotal_item || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                          </span>
                        </TableCell>
                        <TableCell className="py-2 px-0 align-top pt-3 text-right w-8">
                          <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(index)} className="h-7 w-7 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all rounded-full opacity-100">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>

                </Table>
              </div>

              {/* Mobile Cards View */}
              <div className="sm:hidden space-y-3 p-4">
                {items.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground italic text-sm">No hay ítems cargados</div>
                )}
                {items.map((item, index) => (
                  <div key={index} className="bg-white dark:bg-zinc-950 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-zinc-100 dark:bg-zinc-800 group-hover:bg-primary transition-colors" />
                    <div className="flex justify-between items-start mb-3 gap-2">
                       <Textarea
                          placeholder="Descripción..."
                          value={item.descripcion}
                          onChange={(e) => handleItemChange(index, 'descripcion', e.target.value)}
                          className="flex-1 min-h-[72px] bg-transparent border-none p-0 focus-visible:ring-0 resize-none text-sm font-medium"
                        />
                        <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(index)} className="h-8 w-8 text-red-400 -mt-1 -mr-1">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4 items-end border-t border-zinc-50 dark:border-zinc-900 pt-3">
                      <div className="flex items-center gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase text-zinc-400">Cant.</Label>
                          <Input
                            type="number"
                            value={item.cantidad}
                            onChange={(e) => handleItemChange(index, 'cantidad', parseFloat(e.target.value) || 0)}
                            className="h-8 w-14 bg-zinc-50 dark:bg-zinc-900 border-none text-center text-xs font-bold"
                          />
                        </div>
                        <div className="space-y-1 flex-1">
                          <Label className="text-[10px] uppercase text-zinc-400">P. Unit</Label>
                          <Input
                            type="number"
                            value={item.precio_unitario}
                            onChange={(e) => handleItemChange(index, 'precio_unitario', parseFloat(e.target.value) || 0)}
                            className="h-8 w-full bg-zinc-50 dark:bg-zinc-900 border-none text-xs font-bold px-2 min-w-[100px]"
                          />
                        </div>

                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className="text-[10px] uppercase text-zinc-400 mb-1 leading-none">Subtotal</span>
                        <span className="font-black text-base text-primary leading-none">
                          ${item.subtotal_item.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
             <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none bg-white dark:bg-zinc-900 animate-in fade-in slide-in-from-right-4 duration-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-zinc-400">Detalles de Factura</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="code" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs font-medium text-zinc-500">Número de Factura</FormLabel>
                    <FormControl>
                      <div className="relative flex items-center">
                        <Badge variant="outline" className="h-9 px-3 bg-zinc-50 dark:bg-zinc-800 border-none font-mono text-xs text-zinc-600 dark:text-zinc-300 w-full justify-start rounded-lg">
                          {field.value || 'AUTOGENERADO'}
                        </Badge>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="id_presupuesto_final" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs font-medium text-zinc-500">Presupuesto</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isEditMode}>
                      <SelectTrigger className="h-9 bg-zinc-50 dark:bg-zinc-800 border-none rounded-lg text-xs font-semibold">
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-zinc-200 dark:border-zinc-800">
                        {presupuestos.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)} className="text-xs py-2 rounded-lg m-1">
                            <span className="font-bold mr-1">{p.code}</span>
                            <span className="text-zinc-400">• {p.titulo}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="pt-4 border-t border-dashed border-zinc-200 dark:border-zinc-800">
                  <div className="flex flex-col items-center justify-center py-4 px-2 rounded-2xl bg-zinc-950 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-950 shadow-xl">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60 mb-1">Monto Total Neto</span>
                    <span className="text-3xl font-black tracking-tighter">
                      ${items.reduce((acc, i) => acc + (i.subtotal_item || 0), 0).toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="hidden sm:flex flex-col gap-2 pt-2">
              <Button type="submit" disabled={isLoading} className="w-full h-12 text-base font-bold rounded-xl bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 hover:scale-[1.02] transition-transform active:scale-[0.98]">
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : isEditMode ? "Guardar Cambios" : "Crear Factura"}
                {!isLoading && <PlusCircle className="ml-2 h-4 w-4" />}
              </Button>
              <Button type="button" variant="ghost" onClick={() => router.back()} className="w-full text-zinc-400 hover:text-zinc-600 transition-colors">
                Cancelar y Salir
              </Button>
            </div>
          </div>
        </div>

        {/* Sticky Mobile Actions */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-t border-zinc-200 dark:border-zinc-800 z-50 flex gap-3">
          <Button type="button" variant="outline" size="lg" onClick={() => router.back()} className="flex-1 rounded-xl h-12 border-zinc-200 dark:border-zinc-800">
             <ArrowLeft className="mr-2 h-4 w-4" /> Volver
          </Button>
          <Button type="submit" disabled={isLoading} className="flex-[2] rounded-xl h-12 font-bold bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 shadow-lg shadow-zinc-900/10 dark:shadow-none">
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : isEditMode ? "Guardar" : "Crear"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
