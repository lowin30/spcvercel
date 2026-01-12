import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

// Credenciales exactas de Cloudinary
const CLOUD_NAME = "dkqtmodyi"
const API_KEY = "315236258796763"
const API_SECRET = "ZbM7EKH8EgF46IFoN3Q1cgWZh9o"

function generateSignature(params: Record<string, string | number>, apiSecret: string): string {
  const sortedKeys = Object.keys(params).sort()
  const toSign = sortedKeys.map((key) => `${key}=${params[key]}`).join("&") + apiSecret
  return crypto.createHash("sha1").update(toSign).digest("hex")
}

export async function GET(request: NextRequest) {
  try {
    console.log("=== DIAGNÓSTICO CLOUDINARY ===")
    console.log("Cloud Name:", CLOUD_NAME)
    console.log("API Key:", API_KEY)
    console.log("API Secret:", API_SECRET.substring(0, 10) + "...")
    
    // Test 1: Ping simple
    console.log("\n1. Probando ping...")
    const pingUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/ping`
    const pingResponse = await fetch(pingUrl)
    console.log("Ping Status:", pingResponse.status)
    
    if (pingResponse.status === 404) {
      return NextResponse.json({
        success: false,
        error: "Cloud Name no existe",
        cloudName: CLOUD_NAME
      })
    }
    
    // Test 2: Usage con firma
    console.log("\n2. Probando usage endpoint...")
    const timestamp = Math.round(Date.now() / 1000)
    const params = { timestamp }
    const signature = generateSignature(params, API_SECRET)
    
    const usageUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/usage?signature=${signature}&api_key=${API_KEY}&timestamp=${timestamp}`
    console.log("Usage URL:", usageUrl.replace(API_SECRET, "***SECRET***"))
    
    const usageResponse = await fetch(usageUrl)
    const usageStatus = usageResponse.status
    const usageData = await usageResponse.json().catch(() => ({}))
    
    console.log("Usage Status:", usageStatus)
    console.log("Usage Response:", usageData)
    
    if (usageStatus === 200) {
      return NextResponse.json({
        success: true,
        message: "✅ Conexión exitosa a Cloudinary",
        data: usageData,
        credentials: {
          cloudName: CLOUD_NAME,
          apiKey: API_KEY,
          keyName: "apikeyspc",
          working: true
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        error: `❌ Error ${usageStatus}: ${usageData.error?.message || usageResponse.statusText}`,
        details: {
          cloudName: CLOUD_NAME,
          apiKey: API_KEY,
          keyName: "apikeyspc",
          usageStatus,
          usageError: usageData.error?.message || usageData,
          timestamp,
          signature: signature.substring(0, 20) + "..."
        },
        suggestions: [
          "Revisa en Cloudinary: Settings → API Keys → apikeyspc",
          "Verifica que el Status sea 'Active'",
          "Verifica que tenga permisos de 'Read' para estadísticas",
          "Confirma que el Environment sea correcto (Production/Development)"
        ]
      })
    }
    
  } catch (error: any) {
    console.error("Error:", error)
    return NextResponse.json({
      success: false,
      error: error.message,
      type: error.constructor.name
    })
  }
}
