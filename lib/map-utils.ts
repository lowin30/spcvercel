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
          .replace(/%20/g, " ")
          .replace(/%2C/g, ",")
          .replace(/%C3%B3/g, "ó")
          .replace(/%C3%AD/g, "í")
          .replace(/%C3%A9/g, "é")
          .replace(/%C3%BA/g, "ú")
          .replace(/%C3%A1/g, "á")
          .replace(/%C3%B1/g, "ñ")

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

/**
 * Resuelve una URL acortada de Google Maps
 * @param url URL acortada de Google Maps
 * @returns Promesa con la URL completa o null si no se puede resolver
 */
export async function resolveShortUrl(url: string) {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
    })

    return response.url
  } catch (error) {
    console.error("Error al resolver URL acortada:", error)
    return null
  }
}
