// middleware.ts
export const runtime = 'experimental-edge'
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/ssr-middleware' // Asegúrate que la ruta a ssr-middleware.ts sea correcta

export async function middleware(request: NextRequest) {
  // updateSession actualiza la sesión del usuario basada en las cookies de la petición
  // y devuelve una respuesta actualizada.
  const response = await updateSession(request)
  
  // Asegurar UTF-8 en todas las respuestas para correcto display de acentos
  response.headers.set('Content-Type', 'text/html; charset=utf-8')
  
  return response
}

export const config = {
  matcher: [
    /*
     * Coincidir con todas las rutas de petición excepto para:
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico (archivo favicon)
     * - api/ (rutas de API, si no quieres que el middleware las procese)
     * Siéntete libre de modificar esto según tus necesidades.
     */
    '/((?!_next/static|_next/image|favicon.ico|api/).*?)',
  ],
}
