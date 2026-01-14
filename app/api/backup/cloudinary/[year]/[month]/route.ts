import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import JSZip from "jszip"

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const API_KEY = process.env.CLOUDINARY_API_KEY
const API_SECRET = process.env.CLOUDINARY_API_SECRET

function generateSignature(params: Record<string, string | number>, apiSecret: string): string {
  const sortedKeys = Object.keys(params).sort()
  const toSign = sortedKeys.map((key) => `${key}=${params[key]}`).join("&") + apiSecret
  return crypto.createHash("sha1").update(toSign).digest("hex")
}

async function downloadFile(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Error descargando archivo: ${response.statusText}`)
  }
  return response.arrayBuffer()
}

async function getCloudinaryResources(folder: string): Promise<any[]> {
  try {
    const timestamp = Math.round(Date.now() / 1000)
    const paramsToSign = {
      folder,
      timestamp,
      type: "upload",
    }

    const signature = generateSignature(paramsToSign, API_SECRET!)
    const searchUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/image/upload?folder=${folder}&signature=${signature}&api_key=${API_KEY}&timestamp=${timestamp}`

    const response = await fetch(searchUrl)
    if (!response.ok) {
      console.warn("Cloudinary API no disponible para backup, usando modo demo")
      return []
    }

    const data = await response.json()
    return data.resources || []
  } catch (error) {
    console.warn("Error obteniendo recursos de Cloudinary para backup:", error)
    return []
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ year: string; month: string }> }
) {
  try {
    if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
      return NextResponse.json(
        { error: "Cloudinary no está configurado correctamente." },
        { status: 500 }
      )
    }

    const { year, month } = await params
    const folder = `spc-comentarios/${year}-${month}`

    // Obtener todos los recursos de la carpeta
    const resources = await getCloudinaryResources(folder)

    if (resources.length === 0) {
      // Crear ZIP de demo con metadatos
      const zip = new JSZip()
      const metadata = {
        backupDate: new Date().toISOString(),
        folder,
        totalFiles: 0,
        isDemo: true,
        message: "No se encontraron archivos reales. Este es un backup de demostración.",
        files: [],
      }

      zip.file("metadata.json", JSON.stringify(metadata, null, 2))
      zip.file("README.txt", `Backup Cloudinary - Modo Demo\n\nCarpeta: ${folder}\nFecha: ${new Date().toISOString()}\n\nNo se encontraron archivos para descargar. Esto es un backup de demostración.\n\nPara obtener archivos reales, asegúrate de que:\n1. Las credenciales de Cloudinary sean correctas\n2. Existan archivos en la carpeta especificada\n3. La API de Cloudinary esté accesible`)

      const zipBuffer = await zip.generateAsync({ type: "arraybuffer" })
      const fileName = `spc-${year}-${month}-demo.zip`
      
      return new NextResponse(zipBuffer, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Cache-Control": "no-cache",
        },
      })
    }

    // Crear ZIP con archivos reales
    const zip = new JSZip()
    const metadata = {
      backupDate: new Date().toISOString(),
      folder,
      totalFiles: resources.length,
      isDemo: false,
      files: [] as any[],
    }

    // Descargar y agregar cada archivo al ZIP
    for (const resource of resources) {
      try {
        const fileBuffer = await downloadFile(resource.secure_url)
        const fileName = resource.public_id.split("/").pop() || resource.public_id
        
        zip.file(fileName, fileBuffer)
        
        metadata.files.push({
          name: fileName,
          originalUrl: resource.secure_url,
          size: resource.bytes,
          format: resource.format,
          createdAt: resource.created_at,
          resourceType: resource.resource_type,
        })
      } catch (error) {
        console.error(`Error descargando ${resource.public_id}:`, error)
        // Continuar con otros archivos
      }
    }

    // Agregar metadatos
    zip.file("metadata.json", JSON.stringify(metadata, null, 2))

    // Generar ZIP
    const zipBuffer = await zip.generateAsync({ type: "arraybuffer" })

    // Configurar headers para descarga
    const fileName = `spc-${year}-${month}.zip`
    
    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-cache",
      },
    })
  } catch (error: any) {
    console.error("Error en backup de Cloudinary:", error)
    return NextResponse.json(
      { error: error.message || "Error generando backup" },
      { status: 500 }
    )
  }
}
