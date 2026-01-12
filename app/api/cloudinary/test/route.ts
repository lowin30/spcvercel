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

async function testCloudinaryAuth(): Promise<{ success: boolean; error?: string; details?: any }> {
  try {
    // Probar con diferentes endpoints para encontrar el problema exacto
    const timestamp = Math.round(Date.now() / 1000)
    
    // Test 1: Usage endpoint
    const usageParams = { timestamp }
    const usageSignature = generateSignature(usageParams, API_SECRET!)
    const usageUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/usage?signature=${usageSignature}&api_key=${API_KEY}&timestamp=${timestamp}`
    
    console.log("Testing usage URL:", usageUrl.replace(API_SECRET!, "***"))
    
    const usageResponse = await fetch(usageUrl)
    const usageStatus = usageResponse.status
    const usageData = await usageResponse.json().catch(() => ({}))
    
    // Test 2: Ping simple
    const pingUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/ping`
    const pingResponse = await fetch(pingUrl)
    const pingStatus = pingResponse.status
    
    return {
      success: usageStatus === 200,
      error: usageStatus !== 200 ? `HTTP ${usageStatus}: ${usageData.error?.message || usageResponse.statusText}` : undefined,
      details: {
        usageStatus,
        usageError: usageData.error?.message || usageData,
        pingStatus,
        cloudName: CLOUD_NAME,
        apiKeyLength: API_KEY?.length || 0,
        secretLength: API_SECRET?.length || 0,
        timestamp,
        signature: usageSignature.substring(0, 20) + "..."
      }
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      details: { errorType: error.constructor.name }
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
      return NextResponse.json(
        { 
          success: false,
          error: "Cloudinary no está configurado correctamente.",
          config: {
            hasCloudName: !!CLOUD_NAME,
            hasApiKey: !!API_KEY,
            hasApiSecret: !!API_SECRET
          }
        },
        { status: 500 }
      )
    }

    // Probar autenticación detallada
    const testResult = await testCloudinaryAuth()
    
    return NextResponse.json({
      success: testResult.success,
      error: testResult.error,
      details: testResult.details,
      config: {
        cloudName: CLOUD_NAME,
        apiKeyPrefix: API_KEY ? API_KEY.substring(0, 8) + "..." : null,
        secretSet: !!API_SECRET,
        secretLength: API_SECRET?.length || 0
      },
      suggestions: testResult.success ? [] : [
        "Verifica que la cuenta Cloudinary esté activa y no suspendida",
        "Confirma que el API Key tenga permisos de lectura",
        "Verifica que el API Secret sea el correcto (no el de otro entorno)",
        "Revisa que el Cloud Name corresponda a tu cuenta",
        "Asegúrate de no estar en modo sandbox o trial vencido"
      ]
    })
  } catch (error: any) {
    console.error("Error probando conexión Cloudinary:", error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || "Error en la prueba de conexión"
      },
      { status: 500 }
    )
  }
}
