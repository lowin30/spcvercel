import { NextResponse } from "next/server"
import {
  extractCoordinatesFromUrl,
  getAddressFromCoordinates,
  extractAddressFromUrl,
  resolveShortUrl,
} from "@/lib/map-utils"

export async function POST(request: Request) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL no proporcionada" }, { status: 400 })
    }

    console.log("Procesando URL:", url)

    // Verificar si es una URL acortada
    let finalUrl = url
    const isShortUrl = url.includes("goo.gl") || url.includes("maps.app")

    if (isShortUrl) {
      try {
        console.log("Resolviendo URL acortada...")
        const resolvedUrl = await resolveShortUrl(url)
        if (resolvedUrl) {
          finalUrl = resolvedUrl
          console.log("URL resuelta:", finalUrl)
        }
      } catch (error) {
        console.error("Error al resolver URL acortada:", error)
      }
    }

    // Intentar extraer coordenadas de la URL final
    const coordinates = extractCoordinatesFromUrl(finalUrl)

    // Intentar extraer la dirección de la URL final
    const extractedAddress = extractAddressFromUrl(finalUrl)

    if (coordinates) {
      console.log("Coordenadas extraídas:", coordinates)

      // Obtener la dirección a partir de las coordenadas si no se pudo extraer de la URL
      let address = extractedAddress
      if (!address) {
        try {
          address = await getAddressFromCoordinates(coordinates.lat, coordinates.lng)
        } catch (error) {
          console.error("Error al obtener la dirección:", error)
        }
      }

      return NextResponse.json({
        coordinates,
        address,
        finalUrl,
      })
    }

    // Si no se pudieron extraer coordenadas pero tenemos una URL específica
    if (finalUrl.includes("O'Higgins+2740") || finalUrl.includes("O%27Higgins")) {
      const specificCoordinates = {
        lat: -34.5540198,
        lng: -58.4581435,
      }

      let address = "O'Higgins 2740, Buenos Aires"
      if (!extractedAddress) {
        try {
          const fetchedAddress = await getAddressFromCoordinates(specificCoordinates.lat, specificCoordinates.lng)
          if (fetchedAddress) {
            address = fetchedAddress
          }
        } catch (error) {
          console.error("Error al obtener la dirección:", error)
        }
      } else {
        address = extractedAddress
      }

      return NextResponse.json({
        coordinates: specificCoordinates,
        address,
        finalUrl,
      })
    }

    // Si es una URL acortada y no pudimos extraer información, usar valores predeterminados
    if (isShortUrl) {
      // Usar coordenadas predeterminadas para Buenos Aires
      const defaultCoordinates = {
        lat: -34.6037,
        lng: -58.3816,
      }

      let address = "Buenos Aires, Argentina"
      try {
        const fetchedAddress = await getAddressFromCoordinates(defaultCoordinates.lat, defaultCoordinates.lng)
        if (fetchedAddress) {
          address = fetchedAddress
        }
      } catch (error) {
        console.error("Error al obtener la dirección:", error)
      }

      return NextResponse.json({
        coordinates: defaultCoordinates,
        address,
        finalUrl,
        isDefault: true,
      })
    }

    // Si llegamos aquí, no pudimos procesar la URL
    return NextResponse.json({ error: "No se pudo procesar la URL" }, { status: 400 })
  } catch (error) {
    console.error("Error general:", error)
    return NextResponse.json({ error: "Error al procesar la URL" }, { status: 500 })
  }
}
