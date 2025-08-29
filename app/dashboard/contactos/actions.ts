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
  const supabase = createServerClient();

  // Validar datos con Zod
  const validatedFields = formSchema.safeParse(formData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Error de validación. Por favor, revise los campos.',
    };
  }

  const { departamento_id, telefonos } = validatedFields.data;

  // Asegurar que al menos un teléfono sea principal
  if (telefonos.length > 0 && !telefonos.some(tel => tel.es_principal)) {
    telefonos[0].es_principal = true;
  }

  const contactosParaGuardar = telefonos.map(telefono => ({
    departamento_id: parseInt(departamento_id),
    nombre_contacto: telefono.nombre_contacto,
    relacion: telefono.relacion,
    numero: telefono.numero,
    es_principal: telefono.es_principal,
    notas: telefono.notas || null,
  }));

  const { error } = await supabase
    .from('telefonos_departamento')
    .insert(contactosParaGuardar);

  if (error) {
    return {
      message: `Error al guardar los contactos: ${error.message}`,
    };
  }

  revalidatePath('/dashboard/contactos');
  redirect('/dashboard/contactos');
}
