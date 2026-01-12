import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const API_KEY = process.env.CLOUDINARY_API_KEY
const API_SECRET = process.env.CLOUDINARY_API_SECRET
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "spc"

const ASSET_TRANSFORMATIONS: Record<"image" | "video", string> = {
  image: "q_auto:eco,w_1200,c_limit,f_auto,fl_progressive,cs_tinysrgb",
  video: "q_auto:eco,w_720,vc_auto,h_720,c_limit,du_5",
}

const THUMBNAIL_TRANSFORMATIONS: Record<"image" | "video", string> = {
  image: "q_1,w_20,h_20,c_fill,e_blur:1000,f_auto",
  video: "q_1,w_20,h_20,c_fill,e_blur:1000",
}

function generateSignature(params: Record<string, string | number>, apiSecret: string): string {
  const sortedKeys = Object.keys(params).sort()
  const toSign = sortedKeys.map((key) => `${key}=${params[key]}`).join("&") + apiSecret
  return crypto.createHash("sha1").update(toSign).digest("hex")
}

export async function POST(request: NextRequest) {
  if (!CLOUD_NAME || !API_KEY || !API_SECRET || !UPLOAD_PRESET) {
    return NextResponse.json(
      { error: "Cloudinary no está configurado correctamente en el servidor." },
      { status: 500 },
    )
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Cuerpo de la petición inválido." },
      { status: 400 },
    )
  }

  const folder = typeof body.folder === "string" && body.folder.trim().length > 0 ? body.folder.trim() : null
  const assetType = body.assetType === "video" ? "video" : "image"

  if (!folder) {
    return NextResponse.json(
      { error: "El parámetro 'folder' es obligatorio." },
      { status: 400 },
    )
  }

  const timestamp = Math.round(Date.now() / 1000)
  const transformation = ASSET_TRANSFORMATIONS[assetType]

  const paramsToSign: Record<string, string | number> = {
    folder,
    timestamp,
    upload_preset: UPLOAD_PRESET,
    transformation,
  }

  const signature = generateSignature(paramsToSign, API_SECRET)

  return NextResponse.json({
    timestamp,
    signature,
    folder,
    apiKey: API_KEY,
    cloudName: CLOUD_NAME,
    uploadPreset: UPLOAD_PRESET,
    transformation,
    thumbnailTransformation: THUMBNAIL_TRANSFORMATIONS[assetType],
    resourceType: assetType,
  })
}
