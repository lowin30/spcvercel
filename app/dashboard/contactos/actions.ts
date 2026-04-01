'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { createServerClient } from '@/lib/supabase-server';

const formSchema = z.object({
  departamento_id: z.string(),
  telefonos: z.array(z.object({
    nombre_contacto: z.string(),
    relacion: z.string(),
    numero: z.string(),
    es_principal: z.boolean(),
    notas: z.string().optional(),
  }))
});

export async function createContactos(formData: z.infer<typeof formSchema>) {
  const supabase = await createServerClient();

  // Validar datos con Zod
  const validatedFields = formSchema.safeParse(formData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Error de validación. Por favor, revise los campos.',
    };
  }

  const { departamento_id, telefonos } = validatedFields.data;

  // 1. Obtener contexto para generar SLUG (Platinum v84)
  const { data: depto } = await supabase
    .from('departamentos')
    .select('codigo, edificios(nombre, id)')
    .eq('id', departamento_id)
    .single();

  if (!depto) return { message: 'Departamento no encontrado' };

  const edName = (depto.edificios as any).nombre;
  const edId = (depto.edificios as any).id;
  const depCode = depto.codigo;

  const normalizeForSlug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const contactosParaGuardar = telefonos.map((tel, index) => {
    // Generación de slug quirúrgico
    const slugBase = `${normalizeForSlug(edName)}-${normalizeForSlug(depCode)}-${normalizeForSlug(tel.nombre_contacto)}-${Date.now()}-${index}`;
    
    return {
      nombre: slugBase, // Slug único
      'nombreReal': tel.nombre_contacto,
      telefono: tel.numero,
      tipo_padre: 'edificio',
      id_padre: edId,
      departamento: depCode,
      departamento_id: parseInt(departamento_id),
      relacion: tel.relacion,
      es_principal: tel.es_principal,
      notas: tel.notas || null,
      updated_at: new Date().toISOString()
    };
  });

  const { error } = await supabase
    .from('contactos')
    .insert(contactosParaGuardar);

  if (error) {
    console.error('Error guardando contactos:', error);
    return {
      message: `Error al guardar los contactos: ${error.message}`,
    };
  }

  revalidatePath('/dashboard/contactos');
  redirect('/dashboard/contactos');
}
