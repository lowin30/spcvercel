import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import crypto from "crypto";

export const maxDuration = 30; // 30 segundos timeout Vercel

// Credenciales Cloudinary
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

function generateSignature(params: Record<string, string | number>, apiSecret: string): string {
    const sortedKeys = Object.keys(params).sort();
    const toSign = sortedKeys.map((key) => `${key}=${params[key]}`).join("&") + apiSecret;
    return crypto.createHash("sha1").update(toSign).digest("hex");
}

async function uploadToCloudinary(fileInput: string, folder: string): Promise<string> {
    if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
        throw new Error("Credenciales de Cloudinary no configuradas");
    }

    const timestamp = Math.round(Date.now() / 1000);
    const params = {
        folder,
        timestamp,
    };

    const signature = generateSignature(params, API_SECRET);

    const formData = new FormData();
    formData.append("file", fileInput); // Cloudinary acepta Base64 directo
    formData.append("api_key", API_KEY);
    formData.append("timestamp", timestamp.toString());
    formData.append("signature", signature);
    formData.append("folder", folder);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

    console.log("Subiendo a Cloudinary (Fetch)...");
    const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error Cloudinary ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data.secure_url;
}

export async function POST(req: NextRequest) {
    try {
        const groq = new Groq({
            apiKey: process.env.GROQ_API_KEY,
        });

        const { imagen, imagenUrl } = await req.json();

        let finalImageUrl = "";
        let originalCloudinaryUrl = "";
        let processedCloudinaryUrl = "";

        // 1. GESTION DE LA IMAGEN (Subida Server-Side)
        if (imagenUrl) {
            finalImageUrl = imagenUrl;
            originalCloudinaryUrl = imagenUrl;
            processedCloudinaryUrl = imagenUrl;
        } else if (imagen) {
            try {
                // Subir imagen original limpia a cloudinary (sin filtros)
                originalCloudinaryUrl = await uploadToCloudinary(imagen, "spc/gastos_analysis_gold");
                console.log("[ocr] imagen original subida:", originalCloudinaryUrl);

                // Generar url optimizada para el ocr (solo para que la ia la use como lectura)
                // no se guarda esta url como la "procesada" en la base de datos
                finalImageUrl = originalCloudinaryUrl.replace("/upload/", "/upload/e_contrast:40,e_sharpen:80/");

                // La url procesada (modo suave) que se guardara en imagen_procesada_url
                processedCloudinaryUrl = originalCloudinaryUrl.replace("/upload/", "/upload/e_grayscale,e_contrast:40,e_sharpen:80/");
                console.log("[ocr] url para ia:", finalImageUrl);

            } catch (uploadError: any) {
                console.error("[ocr] error subiendo a cloudinary:", uploadError);
                // fallback: enviar base64 directo a groq
                console.warn("[ocr] fallback: usando base64 directo...");
                finalImageUrl = imagen.includes("data:image") ? imagen : `data:image/jpeg;base64,${imagen}`;
            }
        } else {
            return NextResponse.json(
                { error: "Se requiere una imagen (URL o Base64)" },
                { status: 400 }
            );
        }

        // 2. ANALISIS CON GROQ (cadena de pensamiento para maxima precision numerica)
        // Modelo primario: llama-4-scout-17b (modelo multimodal nativo de groq activo en 2026)
        // Fallback automatico: reintento en el mismo modelo en caso de error transitorio
        const MODELO_PRIMARIO = "meta-llama/llama-4-scout-17b-16e-instruct";
        const MODELO_FALLBACK = "meta-llama/llama-4-scout-17b-16e-instruct";

        const prompt = `Eres un sistema OCR de precision industrial especializado en facturas y tickets de obra en Argentina.

PASO 1 - TRANSCRIPCION: Lee y transcribe textualmente TODO el texto visible en la imagen, incluyendo numeros, fechas y montos.
PASO 2 - IDENTIFICACION: Del texto transcripto, identifica:
  - El MONTO TOTAL a pagar (busca palabras como "total", "importe", "$", el numero mas grande y destacado)
  - El PROVEEDOR o descripcion del gasto
  - La FECHA del comprobante (formato YYYY-MM-DD, si no hay año usa el actual)

Devuelve UNICAMENTE este objeto JSON, sin texto adicional:
{
  "transcripcion": "todo el texto visible del ticket...",
  "monto": number,
  "descripcion": "proveedor o descripcion breve en minusculas sin acentos",
  "fecha": "YYYY-MM-DD",
  "tipo_gasto": "material"
}

REGLAS CRITICAS:
- Si el monto tiene punto como separador de miles (ej: 45.100), el monto es 45100.
- Si el monto tiene coma como decimal (ej: 1.500,50), el monto es 1500.
- Nunca inventes montos. Si no puedes leer el monto con certeza, pon 0.
- descripcion siempre en minusculas y sin acentos. preserva la letra n con tilde (ñ).`;

        let chatCompletion;
        let modeloUsado = MODELO_PRIMARIO;

        try {
            console.log(`[ocr] usando modelo primario: ${MODELO_PRIMARIO}`);
            chatCompletion = await groq.chat.completions.create({
                messages: [{
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        { type: "image_url", image_url: { url: finalImageUrl } }
                    ],
                }],
                model: MODELO_PRIMARIO,
                temperature: 0,
                response_format: { type: "json_object" },
                max_tokens: 1024,
            });
        } catch (primaryError: any) {
            console.warn(`[ocr] modelo primario fallo (${primaryError.message}), usando fallback: ${MODELO_FALLBACK}`);
            modeloUsado = MODELO_FALLBACK;
            chatCompletion = await groq.chat.completions.create({
                messages: [{
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        { type: "image_url", image_url: { url: finalImageUrl } }
                    ],
                }],
                model: MODELO_FALLBACK,
                temperature: 0,
                response_format: { type: "json_object" },
                max_tokens: 1024,
            });
        }

        const content = chatCompletion.choices[0]?.message?.content;
        if (!content) throw new Error("respuesta vacia de groq");
        console.log(`[ocr] respuesta de ${modeloUsado}:`, content);

        let datos;
        try {
            datos = JSON.parse(content);
        } catch (e) {
            const cleanJson = content.replace(/```json/g, "").replace(/```/g, "").trim();
            datos = JSON.parse(cleanJson);
        }

        // Normalizacion robusta del monto
        if (datos.monto !== undefined && datos.monto !== null) {
            const montoStr = datos.monto.toString().replace(/[^0-9.,]/g, "");
            // Detectar si el punto es separador de miles (ej: "45.100") o decimal
            const tieneComaDecimal = montoStr.includes(",");
            const puntoPos = montoStr.lastIndexOf(".");
            const comaPos = montoStr.lastIndexOf(",");

            let montoLimpio: string;
            if (tieneComaDecimal) {
                // formato europeo/argentino: 1.500,50 -> 1500.50
                montoLimpio = montoStr.replace(/\./g, "").replace(",", ".");
            } else if (puntoPos !== -1 && montoStr.length - puntoPos - 1 === 3) {
                // punto es separador de miles: 45.100 -> 45100
                montoLimpio = montoStr.replace(/\./g, "");
            } else {
                montoLimpio = montoStr.replace(",", ".");
            }
            datos.monto = parseFloat(montoLimpio) || 0;
        }

        // forzar tipo de gasto (requerimiento spc v3.0)
        datos.tipo_gasto = "material";

        return NextResponse.json({
            success: true,
            datos,
            originalUrl: originalCloudinaryUrl,
            cloudinaryUrl: processedCloudinaryUrl,
            modeloUsado,
        });

    } catch (error: any) {
        console.error("[ocr] error critico:", error);
        return NextResponse.json(
            { error: error.message || "Error procesando con IA" },
            { status: 500 }
        );
    }
}
