"use client"

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom'; // useFormStatus se importa de react-dom
import { CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createPayment, type State } from '@/app/dashboard/pagos/actions';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface PaymentFormProps {
  facturaId: string;
  montoTotalFactura: number | string;
  saldoPendiente?: number | string;
}

// Componente para el botón, para poder usar useFormStatus
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Registrando...' : 'Registrar Pago'}
    </Button>
  );
}

export function PaymentForm({ facturaId, montoTotalFactura, saldoPendiente }: PaymentFormProps) {
  const initialState: State = { message: null, errors: {} };
  const [state, dispatch] = useActionState(createPayment, initialState);
  
  // Imprimir valores para debugging
  console.log('PaymentForm recibió:', { 
    montoTotalFactura, 
    saldoPendiente,
    tipoMontoTotal: typeof montoTotalFactura,
    tipoSaldoPendiente: typeof saldoPendiente
  });

  // Usar saldo pendiente como valor por defecto, sin importar si es 0
  const valorSaldoPendiente = saldoPendiente !== undefined && saldoPendiente !== null
    ? Number(saldoPendiente)
    : Number(montoTotalFactura);
    
  console.log('Valor calculado para el input:', valorSaldoPendiente);
    
  const [montoPago, setMontoPago] = useState(valorSaldoPendiente.toString());

  // Forzar la actualización del valor cuando cambian las props
  useEffect(() => {
    console.log('useEffect ejecutándose con:', { saldoPendiente, montoTotalFactura });
    const valorActualizado = saldoPendiente !== undefined && saldoPendiente !== null
      ? Number(saldoPendiente)
      : Number(montoTotalFactura);
    
    console.log('Actualizando montoPago a:', valorActualizado);
    setMontoPago(valorActualizado.toString());
  }, [saldoPendiente, montoTotalFactura]);

  // Cuando hay errores en el estado, mostrar notificación
  useEffect(() => {
    if (state.message) {
      toast.error(state.message);
    }
  }, [state.message]);

  const handleSetMonto50 = () => {
    const total = Number(montoTotalFactura);
    if (!isNaN(total)) {
      setMontoPago((total / 2).toFixed(2));
    }
  };
  
  const handleSetMontoTotal = () => {
    setMontoPago(montoTotalFactura.toString());
  };

  return (
    <form action={dispatch}>
        <CardContent className="space-y-4">
            {/* Campos ocultos */}
            <input type="hidden" name="facturaId" value={facturaId} />
            <input type="hidden" name="montoTotalFacturaOriginal" value={montoTotalFactura.toString()} />

            <div className="grid gap-2">
                <div className="flex justify-between items-center">
                    <Label htmlFor="monto">Monto del Pago</Label>
                    <div className="space-x-2">
                        <Button type="button" variant="outline" size="sm" onClick={handleSetMonto50}>
                            Pagar 50%
                        </Button>
                        <Button type="button" variant="default" size="sm" onClick={handleSetMontoTotal}>
                            Pago Total
                        </Button>
                    </div>
                </div>
                <Input 
                    id="monto"
                    name="monto"
                    type="number"
                    value={montoPago}
                    onChange={(e) => setMontoPago(e.target.value)}
                    required
                    step="0.01"
                    aria-describedby="monto-error"
                />
                 {state.errors?.monto && (
                    <p id="monto-error" className="text-sm text-red-500">
                        {state.errors.monto[0]}
                    </p>
                )}
            </div>
            <div className="grid gap-2">
                <Label htmlFor="fecha">Fecha de Pago</Label>
                <Input 
                    id="fecha"
                    name="fecha"
                    type="date"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    required
                    aria-describedby="fecha-error"
                />
                 {state.errors?.fecha && (
                    <p id="fecha-error" className="text-sm text-red-500">
                        {state.errors.fecha[0]}
                    </p>
                )}
            </div>
            {/* El Select de método de pago ha sido eliminado */}
            {state.message && <p className="text-sm text-red-500">{state.message}</p>}
        </CardContent>
        <CardFooter>
            <SubmitButton />
        </CardFooter>
    </form>
  );
}
