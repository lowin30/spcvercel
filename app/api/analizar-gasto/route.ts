import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { v2 as cloudinary } from 'cloudinary';

export const maxDuration = 30; // 30 segundos timeout Vercel

export async function POST(req: NextRequest) {
    try {
        // Configuración Lazy de Cloudinary (dentro del request para evitar fallos de build)
        cloudinary.config({
            cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET
        });

        // Inicialización Lazy de Groq
        const groq = new Groq({
            apiKey: process.env.GROQ_API_KEY,
        });

        const { imagen, imagenUrl } = await req.json();

        let finalImageUrl = "";
        let processedCloudinaryUrl = "";

        // 1. GESTIÓN DE LA IMAGEN (Subida Server-Side)
        if (imagenUrl) {
            // Caso raro: Si el frontend ya manda URL (quizás en futuro), la usamos.
            finalImageUrl = imagenUrl;
            processedCloudinaryUrl = imagenUrl;
        } else if (imagen) {
            // CASO PRINCIPAL: Recibimos Base64 del frontend

            // a) Subir a Cloudinary (Server-Side Upload)
            // Esto ignora los presets "unsigned" y usa credenciales de admin, evitando el error 400.
            // Usamos una carpeta temporal o directa
            try {
                console.log("Subiendo imagen a Cloudinary (Server-Side)...");
                const uploadResult = await cloudinary.uploader.upload(imagen, {
                    folder: "spc/gastos_analysis_temp",
                    resource_type: "image"
                });

                const originalUrl = uploadResult.secure_url;
                console.log("Subida exitosa:", originalUrl);

                // b) Aplicar filtros de mejora AI de Cloudinary para el OCR
                // Inyectamos las transformaciones en la URL
                processedCloudinaryUrl = originalUrl.replace("/upload/", "/upload/e_improve,e_sharpen:100/");
                finalImageUrl = processedCloudinaryUrl;
                console.log("URL Optimizada para IA:", finalImageUrl);

            } catch (uploadError: any) {
                console.error("Error subiendo a Cloudinary:", uploadError);
                // Fallback: Si falla Cloudinary, intentamos enviar el Base64 directo a Groq como último recurso
                // Aunque Groq prefiere URLs para mejor performance.
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

        // Devolvemos los datos y TAMBIÉN la URL de Cloudinary (para que el frontend no tenga que subirla de nuevo si quiere guardarla)
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
