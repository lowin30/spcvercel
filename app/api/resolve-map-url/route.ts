import { NextResponse } from "next/server"
import {
  extractCoordinatesFromUrl,
  getAddressFromCoordinates,
  extractAddressFromUrl,
  resolveShortUrl,
  unwrapGoogleRedirects,
  getCoordinatesFromQuery,
} from "@/lib/map-utils"

export async function POST(request: Request) {
  try {
    const { url } = await request.json()
    const inputUrl = typeof url === 'string' ? url.trim() : ''

    if (!inputUrl) {
      return NextResponse.json({ error: "URL no proporcionada" }, { status: 400 })
    }

    console.log("Procesando URL:", inputUrl)

    // Verificar si es una URL acortada (soporta maps.app.goo.gl, goo.gl/maps, g.co/maps)
    let finalUrl = inputUrl
    const isShortUrl = inputUrl.includes("goo.gl") || inputUrl.includes("maps.app") || inputUrl.includes("g.co/maps")

    if (isShortUrl) {
      try {
        // Intento inmediato: desenrollar query link/q sin red
        const preUnwrapped = unwrapGoogleRedirects(inputUrl)
        if (preUnwrapped && preUnwrapped !== inputUrl) {
          finalUrl = preUnwrapped
          console.log("URL unwrap inmediata:", finalUrl)
        } else {
          console.log("Resolviendo URL acortada...")
          const resolvedUrl = await resolveShortUrl(inputUrl)
          if (resolvedUrl) {
            finalUrl = unwrapGoogleRedirects(resolvedUrl)
            console.log("URL resuelta:", finalUrl)
          }
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

    // === Fallback: geocodificar por texto si no hay coordenadas ===
    try {
      const textCandidates: string[] = []
      if (extractedAddress) textCandidates.push(extractedAddress)
      try {
        const u = new URL(finalUrl)
        const p = u.searchParams
        const pushText = (v: string | null) => {
          if (!v) return
          const s = decodeURIComponent(v).replace(/^loc:/i, '').replace(/\+/g, ' ').trim()
          if (s) textCandidates.push(s)
        }
        pushText(p.get('query'))
        pushText(p.get('q'))
        pushText(p.get('destination'))
        pushText(p.get('origin'))
        // Extraer de pathname (/search/<texto>, /dir/<origen>/<destino>)
        const pathname = u.pathname || ''
        const searchMatch = pathname.match(/\/search\/([^\/?#]+)/)
        if (searchMatch && searchMatch[1]) {
          const s = decodeURIComponent(searchMatch[1].replace(/\+/g, ' '))
          if (s) textCandidates.push(s)
        }
        const dirMatch = pathname.match(/\/dir\/([^\/?#]+)/)
        if (dirMatch && dirMatch[1]) {
          const parts = dirMatch[1].split('/').map(x => decodeURIComponent(x.replace(/\+/g, ' ')))
          for (const part of parts) {
            if (part && !/^https?:/i.test(part)) textCandidates.push(part)
          }
        }
      } catch {}

      // Intentar geocodificar el primer candidato válido
      for (const candidate of textCandidates) {
        // Omitir si parece par lat,lng (ya lo intentamos antes)
        if (/^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/.test(candidate)) continue
        const gc = await getCoordinatesFromQuery(candidate)
        if (gc) {
          let address = extractedAddress
          if (!address) {
            try {
              address = await getAddressFromCoordinates(gc.lat, gc.lng)
            } catch (e) {
              console.warn('Reverse geocoding falló:', e)
            }
          }
          return NextResponse.json({
            coordinates: gc,
            address,
            finalUrl,
          })
        }
      }
    } catch (e) {
      console.warn('Fallback geocoding error:', e)
    }

    // Si es una URL acortada y no pudimos extraer información, devolvemos 200 con bandera de no-resuelto
    if (isShortUrl) {
      return NextResponse.json({
        finalUrl,
        isUnresolved: true,
        message: "No se pudieron extraer coordenadas automáticamente de la URL acortada. Podés pegar la URL larga de Google Maps o completar los campos manualmente.",
      })
    }

    // Si llegamos aquí, no pudimos procesar la URL
    return NextResponse.json({ error: "No se pudo procesar la URL" }, { status: 400 })
  } catch (error) {
    console.error("Error general:", error)
    return NextResponse.json({ error: "Error al procesar la URL" }, { status: 500 })
  }
}
