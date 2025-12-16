// middleware.ts
export const runtime = 'experimental-edge'
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/ssr-middleware' // Asegúrate que la ruta a ssr-middleware.ts sea correcta

export async function middleware(request: NextRequest) {
  // updateSession actualiza la sesión del usuario basada en las cookies de la petición
  // y devuelve una respuesta actualizada.
  const response = await updateSession(request)

  return response
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
