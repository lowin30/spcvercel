import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const API_KEY = process.env.CLOUDINARY_API_KEY
const API_SECRET = process.env.CLOUDINARY_API_SECRET

function generateSignature(params: Record<string, string | number>, apiSecret: string): string {
  const sortedKeys = Object.keys(params).sort()
  const toSign = sortedKeys.map((key) => `${key}=${params[key]}`).join("&") + apiSecret
  return crypto.createHash("sha1").update(toSign).digest("hex")
}

async function getCloudinaryStats(): Promise<any> {
  try {
    // Test básico de conexión primero
    const pingUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/ping`
    const pingResponse = await fetch(pingUrl, { 
      signal: AbortSignal.timeout(5000) // 5 segundos timeout
    })
    
    if (!pingResponse.ok) {
      console.warn("Cloudinary ping falló, usando modo demo")
      return null
    }

    // Si el ping funciona, intentar obtener estadísticas
    const timestamp = Math.round(Date.now() / 1000)
    const paramsToSign = { timestamp }
    const signature = generateSignature(paramsToSign, API_SECRET!)
    const statsUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/usage?signature=${signature}&api_key=${API_KEY}&timestamp=${timestamp}`

    const response = await fetch(statsUrl, {
      signal: AbortSignal.timeout(10000) // 10 segundos timeout
    })
    
    if (!response.ok) {
      console.warn("Error obteniendo estadísticas de Cloudinary, usando modo demo:", response.status)
      return null
    }

    const data = await response.json()
    return data
  } catch (error: any) {
    console.warn("Error en API de Cloudinary, usando modo demo:", error.message)
    return null
  }
}

async function getFolderStats(folder: string): Promise<any> {
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
      throw new Error(`Error obteniendo recursos: ${response.statusText}`)
    }

  const data = await response.json()
    return {
      resources: data.resources || [],
      total: data.resources?.length || 0,
    }
  } catch (error: any) {
    console.warn("Error obteniendo estadísticas de carpeta:", error.message)
    return {
      resources: [],
      total: 0,
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
      return NextResponse.json(
        { error: "Cloudinary no está configurado correctamente." },
        { status: 500 }
      )
    }

    const url = new URL(request.url)
    const folder = url.searchParams.get("folder")

    // Estadísticas generales de Cloudinary (con fallback)
    let generalStats = await getCloudinaryStats()
    
    // Si no hay datos reales, usar modo demo
    if (!generalStats) {
      generalStats = {
        storage: { used: 500000000, limit: 5000000000 }, // 500MB / 5GB
        bandwidth: { used: 1000000000, limit: 25000000000 }, // 1GB / 25GB
        transformations: { used: 1000, limit: 5000 },
        objects: { count: { total: 150, images: 120, videos: 30 } },
        derived_resources: { count: 300 }
      }
    }

    // Si se especifica folder, obtener estadísticas específicas
    let folderStats = null
    if (folder) {
      folderStats = await getFolderStats(folder)
    }

    // Calcular métricas clave
    const storageUsed = generalStats.storage?.used || 0
    const storageLimit = generalStats.storage?.limit || 0
    const storagePercentage = storageLimit > 0 ? (storageUsed / storageLimit) * 100 : 0

    const bandwidthUsed = generalStats.bandwidth?.used || 0
    const bandwidthLimit = generalStats.bandwidth?.limit || 0
    const bandwidthPercentage = bandwidthLimit > 0 ? (bandwidthUsed / bandwidthLimit) * 100 : 0

    const transformations = generalStats.transformations?.used || 0
    const transformationsLimit = generalStats.transformations?.limit || 0
    const transformationsPercentage = transformationsLimit > 0 ? (transformations / transformationsLimit) * 100 : 0

    // Detectar alertas
    const alerts = []
    if (storagePercentage > 80) {
      alerts.push({
        type: "storage",
        message: `Almacenamiento al ${storagePercentage.toFixed(1)}% del límite`,
        severity: storagePercentage > 95 ? "critical" : "warning",
      })
    }

    if (bandwidthPercentage > 80) {
      alerts.push({
        type: "bandwidth",
        message: `Ancho de banda al ${bandwidthPercentage.toFixed(1)}% del límite`,
        severity: bandwidthPercentage > 95 ? "critical" : "warning",
      })
    }

    if (transformationsPercentage > 80) {
      alerts.push({
        type: "transformations",
        message: `Transformaciones al ${transformationsPercentage.toFixed(1)}% del límite`,
        severity: transformationsPercentage > 95 ? "critical" : "warning",
      })
    }

    const response = {
      storage: {
        used: storageUsed,
        limit: storageLimit,
        percentage: storagePercentage,
        formatted: {
          used: `${(storageUsed / 1024 / 1024).toFixed(1)} MB`,
          limit: `${(storageLimit / 1024 / 1024).toFixed(1)} MB`,
        },
      },
      bandwidth: {
        used: bandwidthUsed,
        limit: bandwidthLimit,
        percentage: bandwidthPercentage,
        formatted: {
          used: `${(bandwidthUsed / 1024 / 1024).toFixed(1)} MB`,
          limit: `${(bandwidthLimit / 1024 / 1024).toFixed(1)} MB`,
        },
      },
      transformations: {
        used: transformations,
        limit: transformationsLimit,
        percentage: transformationsPercentage,
      },
      objects: generalStats.objects || {},
      derivedResources: generalStats.derived_resources || {},
      alerts,
      folderStats,
      lastUpdated: new Date().toISOString(),
      isDemo: !generalStats || generalStats.storage?.used === 500000000, // Indicador de modo demo
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error("Error obteniendo estadísticas de Cloudinary:", error)
    return NextResponse.json(
      { error: error.message || "Error obteniendo estadísticas" },
      { status: 500 }
    )
  }
}
