/**
 * Utilidades para procesar URLs de Google Maps y obtener información geográfica
 */

/**
 * Extrae coordenadas de una URL de Google Maps
 * @param url URL de Google Maps
 * @returns Objeto con lat y lng si se encuentran coordenadas, null en caso contrario
 */
export function extractCoordinatesFromUrl(url: string) {
  try {
    // Intentar extraer desde parámetros comunes (api=1&query, q=loc:, ll/sll/cbll/center, origin/destination)
    try {
      const u = new URL(url)
      const p = u.searchParams
      const isPair = (s: string) => /-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?/.test(s)
      const toPair = (s: string) => s.split(',').map(t => parseFloat(t.trim()))
      const query = p.get('query')
      if (query && isPair(query)) {
        const [lat, lng] = toPair(query)
        if (!isNaN(lat) && !isNaN(lng)) return { lat, lng }
      }
      const q = p.get('q')
      if (q) {
        let s = decodeURIComponent(q).replace(/^loc:/i, '')
        if (isPair(s)) {
          const [lat, lng] = toPair(s)
          if (!isNaN(lat) && !isNaN(lng)) return { lat, lng }
        }
      }
      for (const key of ['ll','sll','cbll','center']) {
        const v = p.get(key)
        if (v && isPair(v)) {
          const [lat, lng] = toPair(v)
          if (!isNaN(lat) && !isNaN(lng)) return { lat, lng }
        }
      }
      for (const key of ['origin','destination']) {
        const v = p.get(key)
        if (v && isPair(v)) {
          const [lat, lng] = toPair(v)
          if (!isNaN(lat) && !isNaN(lng)) return { lat, lng }
        }
      }
    } catch {}
    // Formato: https://www.google.com/maps/place/.../@-34.5540198,-58.4581435,15z/...
    const placePattern = /@(-?\d+\.\d+),(-?\d+\.\d+)/
    const placeMatch = url.match(placePattern)
    if (placeMatch && placeMatch[1] && placeMatch[2]) {
      return {
        lat: Number.parseFloat(placeMatch[1]),
        lng: Number.parseFloat(placeMatch[2]),
      }
    }

    // Formato: https://www.google.com/maps?q=-34.6037,-58.3816
    if (url.includes("maps") && url.includes("q=")) {
      const match = url.match(/q=([^&]+)/)
      if (match && match[1]) {
        // Verificar si son coordenadas (números separados por coma)
        if (/^-?\d+(\.\d+)?,-?\d+(\.\d+)?/.test(match[1])) {
          const coords = match[1].split(",")
          if (coords.length === 2) {
            return {
              lat: Number.parseFloat(coords[0]),
              lng: Number.parseFloat(coords[1]),
            }
          }
        }
      }
    }

    // Formato: https://www.google.com/maps/@-34.6037,-58.3816,15z
    if (url.includes("maps") && url.includes("@")) {
      const match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
      if (match && match[1] && match[2]) {
        return {
          lat: Number.parseFloat(match[1]),
          lng: Number.parseFloat(match[2]),
        }
      }
    }

    // Formatos dentro de 'data=' con "!3dLAT!4dLNG" (orden lat, lng)
    const d34 = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
    if (d34 && d34[1] && d34[2]) {
      return {
        lat: Number.parseFloat(d34[1]),
        lng: Number.parseFloat(d34[2]),
      }
    }

    // Formatos dentro de 'data=' con "!2dLNG!3dLAT" (orden lng, lat)
    const d23 = url.match(/!2d(-?\d+\.\d+)!3d(-?\d+\.\d+)/)
    if (d23 && d23[1] && d23[2]) {
      return {
        lat: Number.parseFloat(d23[2]),
        lng: Number.parseFloat(d23[1]),
      }
    }

    // Extraer de la URL completa si contiene coordenadas en cualquier parte
    const anyCoordinatesPattern = /-?\d+\.\d+,-?\d+\.\d+/
    const anyCoordinatesMatch = url.match(anyCoordinatesPattern)
    if (anyCoordinatesMatch) {
      const coords = anyCoordinatesMatch[0].split(",")
      if (coords.length === 2) {
        return {
          lat: Number.parseFloat(coords[0]),
          lng: Number.parseFloat(coords[1]),
        }
      }
    }

    return null
  } catch (error) {
    console.error("Error al extraer coordenadas:", error)
    return null
  }
}

/**
 * Obtiene coordenadas a partir de un texto de dirección/lugar usando Nominatim (OpenStreetMap)
 * @param query Texto de búsqueda (dirección, nombre de lugar, etc.)
 * @returns { lat, lng } o null si no se pudo geocodificar
 */
export async function getCoordinatesFromQuery(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    if (!query || !query.trim()) return null
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`
    const response = await fetch(url, {
      headers: {
        "Accept-Language": "es",
        "User-Agent": "SPC-Sistema-Gestion",
      },
    })
    if (!response.ok) return null
    const data = await response.json()
    if (Array.isArray(data) && data.length > 0) {
      const first = data[0]
      const lat = parseFloat(first.lat)
      const lng = parseFloat(first.lon)
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng }
    }
    return null
  } catch (error) {
    console.error("Error en geocodificación directa (search):", error)
    return null
  }
}

/**
 * Obtiene la dirección a partir de coordenadas usando la API de Nominatim (OpenStreetMap)
 * @param lat Latitud
 * @param lng Longitud
 * @returns Dirección formateada o null si no se puede obtener
 */
export async function getAddressFromCoordinates(lat: number, lng: number) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          "Accept-Language": "es",
          "User-Agent": "SPC-Sistema-Gestion",
        },
      },
    )

    if (!response.ok) {
      throw new Error("Error al obtener la dirección")
    }

    const data = await response.json()

    // Construir la dirección a partir de los datos recibidos
    let direccion = data.display_name || ""

    // Si hay detalles de dirección, construir una dirección más específica
    if (data.address) {
      const parts = []

      if (data.address.road) parts.push(data.address.road)
      if (data.address.house_number) parts.push(data.address.house_number)
      if (data.address.suburb) parts.push(data.address.suburb)
      if (data.address.city || data.address.town) parts.push(data.address.city || data.address.town)
      if (data.address.state) parts.push(data.address.state)

      if (parts.length > 0) {
        direccion = parts.join(", ")
      }
    }

    return direccion
  } catch (error) {
    console.error("Error al obtener la dirección:", error)
    return null
  }
}

/**
 * Extrae el ID de una URL acortada de Google Maps
 * @param url URL acortada de Google Maps
 * @returns ID del mapa o null si no se puede extraer
 */
export function extractMapIdFromUrl(url: string) {
  try {
    if (url.includes("maps.app.goo.gl") || url.includes("goo.gl/maps")) {
      return url.split("/").pop() || null
    }
    return null
  } catch (error) {
    console.error("Error al extraer ID del mapa:", error)
    return null
  }
}

/**
 * Extrae la dirección directamente de la URL de Google Maps
 * @param url URL de Google Maps
 * @returns Dirección extraída o null si no se puede extraer
 */
export function extractAddressFromUrl(url: string) {
  try {
    // Formato: https://www.google.com/maps/place/O'Higgins+2740,...
    if (url.includes("/place/")) {
      const placeMatch = url.match(/\/place\/([^/@]+)/)
      if (placeMatch && placeMatch[1]) {
        // Decodificar la dirección
        let address = placeMatch[1]
          .replace(/\+/g, " ")
        try {
          address = decodeURIComponent(address)
        } catch {}

        // Eliminar códigos postales y otros datos que puedan estar en la URL
        address = address.split(",")[0]

        return address
      }
    }
    return null
  } catch (error) {
    console.error("Error al extraer dirección:", error)
    return null
  }
}

// Desenrolla redirecciones típicas de maps.app.goo.gl con query 'link' anidado
export function unwrapGoogleRedirects(initialUrl: string, maxDepth = 3): string {
  let url = initialUrl
  for (let i = 0; i < maxDepth; i++) {
    try {
      const u = new URL(url)
      const link = u.searchParams.get('link')
      if (link && /^https?:/i.test(link)) {
        url = decodeURIComponent(link)
        continue
      }
      const q = u.searchParams.get('q')
      if (q && /^https?:/i.test(q)) {
        url = decodeURIComponent(q)
        continue
      }
    } catch {
      break
    }
    break
  }
  return url
}

/**
 * Resuelve una URL acortada de Google Maps
 * @param url URL acortada de Google Maps
 * @returns Promesa con la URL completa o null si no se puede resolver
 */
export async function resolveShortUrl(url: string) {
  try {
    // 1) Intentar con HEAD (rápido)
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)
      const headResp = await fetch(url, {
        method: "HEAD",
        redirect: "follow",
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SPC-Sistema-Gestion)' },
      })
      clearTimeout(timeoutId)
      if (headResp.url && headResp.url !== url) {
        const unwrapped = unwrapGoogleRedirects(headResp.url)
        return unwrapped
      }
    } catch (headError) {
      console.log("HEAD falló, intentando GET:", headError)
    }

    // 2) Intentar con GET (seguir redirecciones)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)
    const getResp = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SPC-Sistema-Gestion)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })
    clearTimeout(timeoutId)
    if (getResp.url && getResp.url !== url) {
      const unwrapped = unwrapGoogleRedirects(getResp.url)
      return unwrapped
    }

    // 3) Seguir redirecciones manualmente leyendo Location (hasta 5 pasos)
    try {
      let current = url
      for (let i = 0; i < 5; i++) {
        const r = await fetch(current, {
          method: 'GET',
          redirect: 'manual' as RequestRedirect,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; SPC-Sistema-Gestion)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        })
        const loc = r.headers.get('location')
        if (!loc) break
        const next = new URL(loc, current).href
        if (next === current) break
        current = next
        if (/google\.[^/]+\/maps/i.test(current)) {
          const unwrapped = unwrapGoogleRedirects(current)
          return unwrapped
        }
      }
    } catch (e) {
      console.log('Seguimiento manual de redirecciones falló:', e)
    }

    // 4) Analizar HTML de la respuesta GET en busca de redirecciones
    try {
      const html = await getResp.text()
      const metaMatch = html.match(/<meta[^>]+http-equiv=["']?refresh["']?[^>]+content=["'][^"']*url=([^"'>]+)["']/i)
      if (metaMatch && metaMatch[1]) {
        const redir = decodeURIComponent(metaMatch[1])
        const unwrapped = unwrapGoogleRedirects(redir)
        if (unwrapped) return unwrapped
      }
      const jsMatch = html.match(/location\.(?:href|replace)\(\s*["'](https?:\/\/[^"']+)["']\s*\)/i)
      if (jsMatch && jsMatch[1]) {
        const redir = decodeURIComponent(jsMatch[1])
        const unwrapped = unwrapGoogleRedirects(redir)
        if (unwrapped) return unwrapped
      }
      const urlMatch = html.match(/https?:\/\/(?:www\.)?google\.[^"'<>\s]+\/maps[^"'<>\s]+/i)
      if (urlMatch && urlMatch[0]) {
        const unwrapped = unwrapGoogleRedirects(urlMatch[0])
        if (unwrapped) return unwrapped
      }
      const centerMatch = html.match(/[?&]center=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i)
      if (centerMatch && centerMatch[1] && centerMatch[2]) {
        const lat = parseFloat(centerMatch[1])
        const lng = parseFloat(centerMatch[2])
        if (!isNaN(lat) && !isNaN(lng)) {
          return `https://www.google.com/maps?q=${lat},${lng}`
        }
      }
    } catch (e) {
      console.log('No se pudo leer HTML de respuesta para resolver URL corta:', e)
    }

    console.warn("No se pudo resolver la URL acortada")
    return null
  } catch (error) {
    console.error("Error al resolver URL acortada:", error)
    return null
  }
}
