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
        // Inicialización Lazy de Groq
        const groq = new Groq({
            apiKey: process.env.GROQ_API_KEY,
        });

        const { imagen, imagenUrl } = await req.json();

        let finalImageUrl = "";
        let processedCloudinaryUrl = "";

        // 1. GESTIÓN DE LA IMAGEN (Subida Server-Side)
        if (imagenUrl) {
            finalImageUrl = imagenUrl;
            processedCloudinaryUrl = imagenUrl;
        } else if (imagen) {
            // CASO PRINCIPAL: Recibimos Base64 del frontend
            try {
                // a) Subir a Cloudinary con Fetch (Sin SDK)
                // Usamos una carpeta temporal o directa
                const originalUrl = await uploadToCloudinary(imagen, "spc/gastos_analysis_temp");

                console.log("Subida exitosa:", originalUrl);

                // b) Aplicar filtros de mejora AI de Cloudinary para el OCR
                // Inyectamos las transformaciones en la URL
                // Cloudinary URL format: .../image/upload/v123456/folder/image.jpg
                // Queremos: .../image/upload/e_improve,e_sharpen:100/v123456/folder/image.jpg

                // Manera segura de inyectar transformaciones despues de /upload/
                processedCloudinaryUrl = originalUrl.replace("/upload/", "/upload/e_improve,e_sharpen:100/");
                finalImageUrl = processedCloudinaryUrl;
                console.log("URL Optimizada para IA:", finalImageUrl);

            } catch (uploadError: any) {
                console.error("Error subiendo a Cloudinary:", uploadError);
                // Fallback: Si falla Cloudinary, intentamos enviar el Base64 directo a Groq
                console.warn("Usando fallback Base64 directo a Groq...");
                finalImageUrl = imagen.includes("data:image") ? imagen : `data:image/jpeg;base64,${imagen}`;
            }
        } else {
            return NextResponse.json(
                { error: "Se requiere una imagen (URL o Base64)" },
                { status: 400 }
            );
        }

        // 2. ANÁLISIS CON GROQ (Llama 4 Maverick)
        const modelId = "meta-llama/llama-4-maverick-17b-128e-instruct";

        const prompt = `
      Actúa como un experto contable y sistema OCR avanzado.
      Analiza esta imagen de un comprobante de gasto.
      
      Extrae los siguientes datos en formato JSON puro:
      {
        "monto": number,       // El total final a pagar. Prioridad al número destacado.
        "descripcion": string, // Nombre del proveedor o resumen breve.
        "fecha": string,       // Formato YYYY-MM-DD. Si no hay año, asume actual.
        "tipo_gasto": string   // "material", "mano_de_obra" u "otro".
      }

      Reglas:
      1. Responde SOLO con el objeto JSON válido.
      2. Usa tu mejor juicio en textos borrosos.
      3. Si falta fecha, usa hoy.
    `;

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        {
                            type: "image_url",
                            image_url: {
                                url: finalImageUrl
                            }
                        }
                    ],
                },
            ],
            model: modelId,
            temperature: 0.1,
            response_format: { type: "json_object" },
        });

        const content = chatCompletion.choices[0]?.message?.content;

        if (!content) throw new Error("Respuesta vacía de Groq");

        let datos;
        try {
            datos = JSON.parse(content);
        } catch (e) {
            console.warn("Limpiando JSON sucio...");
            const cleanJson = content.replace(/```json/g, "").replace(/```/g, "").trim();
            datos = JSON.parse(cleanJson);
        }

        // Normalización
        if (datos.monto) {
            const montoStr = datos.monto.toString().replace(/[^0-9.,]/g, "").replace(",", ".");
            datos.monto = parseFloat(montoStr);
        }

        return NextResponse.json({
            success: true,
            datos,
            cloudinaryUrl: processedCloudinaryUrl
        });

    } catch (error: any) {
        console.error("Error en análisis (Groq):", error);
        return NextResponse.json(
            { error: error.message || "Error procesando con IA" },
            { status: 500 }
        );
    }
}
