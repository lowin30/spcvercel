"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from "@/lib/supabase-client";
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { PaymentForm } from '@/components/payment-form';

// El tipo local para la página, asegurando que `total` es un número.
interface PagoAnterior {
  monto_pagado: number;
  fecha_pago: string;
  modalidad_pago: string;
}

interface Factura {
  id: string;
  code: string;
  total: number;
  total_pagado?: number;
  saldo_pendiente?: number;
  pagosAnteriores?: PagoAnterior[];
}

export default function NewPaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const factura_id = searchParams.get('factura_id');

  const [factura, setFactura] = useState<Factura | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      if (!factura_id) {
        setError("No se ha especificado un ID de factura.");
        setLoading(false);
        return;
      }
      
      const supabase = createClient();
      
      // Verificar que supabase se haya inicializado correctamente
      if (!supabase) {
        console.error('Error: No se pudo inicializar el cliente de Supabase');
        setError('Error de conexión: No se pudo inicializar el cliente de Supabase.');
        setLoading(false);
        return;
      }
      
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      // Intentamos encontrar la factura primero con el ID tal como viene
      let facturaExists;
      let existsError;
      
      // Primera búsqueda con el ID original
      const resultOriginal = await supabase
        .from('facturas')
        .select('id')
        .eq('id', factura_id)
        .maybeSingle();
      
      facturaExists = resultOriginal.data;
      existsError = resultOriginal.error;
      
      // Si no encontramos resultados, intentamos con una conversión de tipo
      if (!facturaExists && !existsError) {
        const idNumerico = Number(factura_id);
        
        const resultNum = await supabase
          .from('facturas')
          .select('id')
          .eq('id', idNumerico)
          .maybeSingle();
          
        facturaExists = resultNum.data;
        existsError = resultNum.error;
      }

      if (existsError) {
        console.error('Error al verificar la existencia de la factura:', existsError);
        setError(`Error al buscar la factura con ID ${factura_id}: ${existsError.message}`);
        setLoading(false);
        return;
      }
      
      if (!facturaExists) {
        console.error(`La factura con ID ${factura_id} no existe.`);
        setError(`La factura con ID ${factura_id} no existe en la base de datos.`);
        setLoading(false);
        return;
      }

      // Obtener datos completos de la factura usando el ID que ya verificamos que existe
      // Usamos el ID que nos devolvió la verificación anterior
      const facturaId = facturaExists?.id;
      
      const { data: facturaData, error: facturaError } = await supabase
        .from('facturas')
        .select('id, code, total, total_pagado, saldo_pendiente')
        .eq('id', facturaId)
        .single();

      if (facturaError || !facturaData) {
        setError(`No se pudo encontrar la factura con ID ${factura_id}.`);
        setLoading(false);
        return;
      }
      
      // Obtener historial de pagos - usamos el mismo ID que verificamos
      const { data: pagosAnteriores, error: pagosError } = await supabase
        .from('pagos_facturas')
        .select('monto_pagado, fecha_pago, modalidad_pago')
        .eq('id_factura', facturaId)
        .order('fecha_pago', { ascending: false });
        
      if (pagosError) {
        console.error('Error al obtener pagos anteriores:', pagosError);
        // No bloqueamos el flujo, solo logueamos el error
      }
      
      // Aserción de tipo para informar a TypeScript sobre la forma de los datos.
      const typedFacturaData = facturaData as { 
        id: string; 
        code: string; 
        total: string | number;
        total_pagado: string | number | null;
        saldo_pendiente: string | number | null;
      };
      
      // Convertir todos los valores a números para trabajar con ellos
      const totalNumerico = Number(typedFacturaData.total || 0);
      const totalPagadoNumerico = Number(typedFacturaData.total_pagado || 0);
      
      // El saldo pendiente debe ser calculado como total - total_pagado si no está presente
      // o si parece incorrecto (por ejemplo, si es igual al total cuando total_pagado > 0)
      let saldoPendienteNumerico;
      if (typedFacturaData.saldo_pendiente !== null && typedFacturaData.saldo_pendiente !== undefined) {
        saldoPendienteNumerico = Number(typedFacturaData.saldo_pendiente);
      } else {
        saldoPendienteNumerico = Math.max(0, totalNumerico - totalPagadoNumerico);
      }
      
      // Verificación de coherencia: si hay un total pagado mayor que cero pero el saldo pendiente es igual al total,
      // probablemente hay un error en los datos
      if (totalPagadoNumerico > 0 && Math.abs(saldoPendienteNumerico - totalNumerico) < 0.001) {
        console.warn('Posible inconsistencia: total_pagado > 0 pero saldo_pendiente = total');
        saldoPendienteNumerico = Math.max(0, totalNumerico - totalPagadoNumerico);
      }
      
      setFactura({
        id: typedFacturaData.id,
        code: typedFacturaData.code,
        total: totalNumerico,
        total_pagado: totalPagadoNumerico,
        saldo_pendiente: saldoPendienteNumerico,
        pagosAnteriores: pagosAnteriores || []
      });

      setLoading(false);
    };

    loadData();
  }, [factura_id, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Cargando datos del pago...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <p className="text-red-500">Error: {error}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/dashboard/facturas">Volver a Facturas</Link>
        </Button>
      </div>
    );
  }

  if (!factura) {
    return (
      <div className="p-4">
        <p className="text-red-500">No se pudo cargar la información de la factura.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/dashboard/facturas">Volver a Facturas</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" suppressHydrationWarning>
        <div className="flex items-center">
            <Button variant="ghost" size="sm" asChild className="mr-2">
              <Link href={`/dashboard/facturas/${factura.id}`}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Volver a la Factura
              </Link>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">Registrar Pago para Factura {factura.code}</h1>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Nuevo Pago</CardTitle>
                <CardDescription>Complete el formulario para registrar un nuevo pago para la factura {factura.code}.</CardDescription>
            </CardHeader>
            
            <div className="p-6 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Monto total</p>
                        <p className="text-lg font-semibold">${factura.total.toLocaleString('es-AR')}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Total pagado</p>
                        <p className="text-lg font-semibold">${(factura.total_pagado || 0).toLocaleString('es-AR')}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Saldo pendiente</p>
                        <p className="text-lg font-semibold text-blue-600">
                            ${(factura.saldo_pendiente !== undefined && factura.saldo_pendiente !== null 
                              ? factura.saldo_pendiente 
                              : factura.total).toLocaleString('es-AR')}
                        </p>
                    </div>
                </div>
                
                {factura.pagosAnteriores && factura.pagosAnteriores.length > 0 && (
                    <div className="mt-4">
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Pagos anteriores</h3>
                        <div className="bg-gray-50 rounded-md p-3">
                            <ul className="divide-y divide-gray-200">
                                {factura.pagosAnteriores.map((pago, index) => (
                                    <li key={index} className="py-2 flex justify-between">
                                        <span className="text-sm">
                                            {new Date(pago.fecha_pago).toLocaleDateString('es-AR')}
                                        </span>
                                        <span className="text-sm font-medium">
                                            ${Number(pago.monto_pagado).toLocaleString('es-AR')}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
            </div>
            
            <PaymentForm 
                facturaId={factura.id} 
                montoTotalFactura={factura.total}
                saldoPendiente={factura.saldo_pendiente}
            />
        </Card>
    </div>
  );
}
