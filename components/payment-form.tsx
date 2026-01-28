"use client"

import React from 'react';
import { useActionState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createPayment, type State } from '@/app/dashboard/pagos/nuevo/crear-pago';
import { useState, useEffect, FormEvent } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface PaymentFormProps {
  facturaId: string;
  montoTotalFactura: number | string;
  saldoPendiente?: number | string;
  // Chat Integration Props (SPC v9.5)
  isChatVariant?: boolean;
  onSuccess?: () => void;
}

// Componente para el botón con manejo personalizado
function SubmitButton({ onClick, isSubmitting, isPending }: {
  onClick?: () => void,
  isSubmitting?: boolean,
  isPending?: boolean
}) {
  const { pending: formPending } = useFormStatus();

  // Combinamos todos los estados de carga
  const isLoading = formPending || isSubmitting || isPending;

  return (
    <Button
      type="button"
      className="w-full"
      disabled={isLoading}
      onClick={onClick}
    >
      {isLoading ? 'Registrando...' : 'Registrar Pago'}
    </Button>
  );
}

export function PaymentForm({ facturaId, montoTotalFactura, saldoPendiente, isChatVariant = false, onSuccess }: PaymentFormProps) {
  const initialState: State = { message: null, errors: {} };
  const [state, dispatch] = useActionState(createPayment, initialState);
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  // Manejador para el envío del formulario usando startTransition
  const handleSubmit = () => {
    if (!formRef.current) return;

    // Marcar como enviando para desactivar el botón
    setIsSubmitting(true);

    try {
      const formData = new FormData(formRef.current);

      // Usar startTransition para envolver la llamada a dispatch
      // Esto evita el warning "An async function with useActionState was called outside of a transition"
      startTransition(async () => {
        try {
          // Enviar el formulario a la acción del servidor
          await dispatch(formData);
        } catch (error) {
          console.error('Error al enviar formulario:', error);
          toast.error('Error al procesar el pago');
        } finally {
          // Desactivar el estado de envío cuando termina la transición
          setIsSubmitting(false);
        }
      });
    } catch (error) {
      console.error('Error al preparar formulario:', error);
      toast.error('Error al preparar el formulario');
      setIsSubmitting(false);
    }
  };

  // Usar saldo pendiente como valor por defecto, sin importar si es 0
  const valorSaldoPendiente = saldoPendiente !== undefined && saldoPendiente !== null
    ? Number(saldoPendiente)
    : Number(montoTotalFactura);

  const [montoPago, setMontoPago] = useState(valorSaldoPendiente.toString());

  // Forzar la actualización del valor cuando cambian las props
  useEffect(() => {
    const valorActualizado = saldoPendiente !== undefined && saldoPendiente !== null
      ? Number(saldoPendiente)
      : Number(montoTotalFactura);

    setMontoPago(valorActualizado.toString());
  }, [saldoPendiente, montoTotalFactura]);

  // Manejar los mensajes del estado, tanto errores como éxitos
  useEffect(() => {
    if (state.success && state.message) {
      // Éxito: mostrar toast
      toast.success(state.message);

      // Chat variant: trigger callback
      if (isChatVariant && onSuccess) {
        onSuccess();
      } else {
        // Normal flow: redirect
        setTimeout(() => {
          router.push('/dashboard/facturas');
        }, 1500);
      }
    } else if (state.message) {
      // Error: mostrar toast de error
      toast.error(state.message);
    }
  }, [state, router, isChatVariant, onSuccess]);

  const handleSetMonto50 = () => {
    const saldo = valorSaldoPendiente;
    if (!isNaN(saldo)) {
      setMontoPago((saldo / 2).toFixed(2));
    }
  };

  const handleSetMontoTotal = () => {
    setMontoPago(valorSaldoPendiente.toString());
  };

  return (
    <form
      ref={formRef}
      // Eliminamos onSubmit ya que usaremos el botón con onClick
      onSubmit={(e) => e.preventDefault()} // Evitar envío tradicional
      suppressHydrationWarning
    >
      <CardContent className="space-y-4">
        {/* Campos ocultos */}
        <input type="hidden" name="facturaId" value={facturaId} />
        <input
          type="hidden"
          name="montoTotalFacturaOriginal"
          value={montoTotalFactura?.toString() || '0'}
        />
        <input
          type="hidden"
          name="saldoPendiente"
          value={valorSaldoPendiente?.toString() || '0'}
        />

        <div className="grid gap-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="monto">Monto del Pago</Label>
            <div className="space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSetMonto50}
                title={`Pagar el 50% del saldo pendiente ($${(valorSaldoPendiente / 2).toLocaleString('es-AR')})`}
              >
                Pagar 50%
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleSetMontoTotal}
                title={`Pagar el saldo completo ($${valorSaldoPendiente.toLocaleString('es-AR')})`}
              >
                Pagar Saldo
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
            className={Number(montoPago) > valorSaldoPendiente ? 'border-red-500 focus-visible:ring-red-500' : ''}
          />
          {Number(montoPago) > valorSaldoPendiente && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-2">
              <span className="text-red-600 font-semibold">⚠️</span>
              <div className="text-sm text-red-800">
                <p className="font-semibold">El monto excede el saldo pendiente</p>
                <p>Saldo disponible: <span className="font-bold">${valorSaldoPendiente.toLocaleString('es-AR')}</span></p>
              </div>
            </div>
          )}
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
        <SubmitButton
          onClick={handleSubmit}
          isSubmitting={isSubmitting}
          isPending={isPending}
        />
      </CardFooter>
    </form>
  );
}
