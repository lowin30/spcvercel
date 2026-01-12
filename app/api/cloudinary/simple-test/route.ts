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

export async function GET(request: NextRequest) {
  try {
    if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
      return NextResponse.json({
        success: false,
        error: "Faltan variables de entorno",
        config: {
          hasCloudName: !!CLOUD_NAME,
          hasApiKey: !!API_KEY,
          hasApiSecret: !!API_SECRET
        }
      })
    }

    // Test simple sin firma para verificar si el cloud name existe
    const pingUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/ping`
    
    try {
      const pingResponse = await fetch(pingUrl)
      const pingStatus = pingResponse.status
      const pingData = await pingResponse.json().catch(() => ({}))
      
      // Si el ping falla con 404, el cloud name no existe
      if (pingStatus === 404) {
        return NextResponse.json({
          success: false,
          error: "Cloud Name no existe",
          details: {
            cloudName: CLOUD_NAME,
            pingStatus: 404,
            pingError: "Cloud not found"
          },
          suggestions: [
            "Verifica que NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME sea correcto",
            "Revisa en tu dashboard de Cloudinary el nombre correcto",
            "Ejemplo: si tu URL es https://cloudinary.com/console/mi-empresa, el cloud name es 'mi-empresa'"
          ]
        })
      }
      
      // Si el ping funciona, probar con firma
      const timestamp = Math.round(Date.now() / 1000)
      const params = { timestamp }
      const signature = generateSignature(params, API_SECRET!)
      const usageUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/usage?signature=${signature}&api_key=${API_KEY}&timestamp=${timestamp}`
      
      const usageResponse = await fetch(usageUrl)
      const usageStatus = usageResponse.status
      const usageData = await usageResponse.json().catch(() => ({}))
      
      if (usageStatus === 200) {
        return NextResponse.json({
          success: true,
          message: "Conexión exitosa a Cloudinary",
          data: usageData,
          config: {
            cloudName: CLOUD_NAME,
            working: true
          }
        })
      } else {
        return NextResponse.json({
          success: false,
          error: `Error de autenticación: ${usageData.error?.message || usageResponse.statusText}`,
          details: {
            cloudName: CLOUD_NAME,
            pingStatus,
            usageStatus,
            apiKeyLength: API_KEY?.length || 0,
            secretLength: API_SECRET?.length || 0
          },
          suggestions: [
            "Cloud Name es correcto pero las credenciales API no",
            "Verifica CLOUDINARY_API_KEY en tu dashboard Cloudinary",
            "Verifica CLOUDINARY_API_SECRET en tu dashboard Cloudinary",
            "Asegúrate de copiarlas exactamente sin espacios extra"
          ]
        })
      }
      
    } catch (error: any) {
      return NextResponse.json({
        success: false,
        error: `Error de red: ${error.message}`,
        suggestions: [
          "Verifica tu conexión a internet",
          "Intenta acceder directamente a https://cloudinary.com",
          "Revisa si hay firewall bloqueando la API"
        ]
      })
    }
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    })
  }
}
