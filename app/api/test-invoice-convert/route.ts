import { NextResponse } from 'next/server';
import { convertirPresupuestoADosFacturas } from '@/app/actions/facturas-actions';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';

export async function GET(request: Request) {
    const url = new URL(request.url);
    const idStr = url.searchParams.get('id');
    if (!idStr) return NextResponse.json({ error: 'Missing ID' });
    const id = parseInt(idStr, 10);

    try {
        const { data: presupuesto, error: pfError } = await supabase
            .from('presupuestos_finales')
            .select('*, items (*)')
            .eq('id', id)
            .single();

        const fetchResult = {
            presupuestoId: id,
            itemsCount: presupuesto?.items?.length,
            pfError
        };

        // We DO NOT want to actually run the conversion if it might break production data,
        // but running it here will show exactly what it returns!
        // CAUTION: IF IT THROWS, IT WILL BE CAUGHT HERE. IF IT RETURNS {success}, WE WILL SEE IT.
        const conversionResult = await convertirPresupuestoADosFacturas(id);

        return NextResponse.json({
            fetchResult,
            conversionResult
        });
    } catch (error: any) {
        return NextResponse.json({ errorTrace: error.message, stack: error.stack });
    }
}
