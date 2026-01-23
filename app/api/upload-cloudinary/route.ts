import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        // Cloudinary credentials del .env
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dxtmdbqfe'
        const apiKey = process.env.CLOUDINARY_API_KEY
        const apiSecret = process.env.CLOUDINARY_API_SECRET

        if (!apiKey || !apiSecret) {
            return NextResponse.json(
                { error: 'Cloudinary credentials not configured' },
                { status: 500 }
            )
        }

        // Convertir File a Buffer
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Folder dinámico según tipo de archivo
        const folder = file.type.startsWith('image/') ? 'spc/gastos_analysis' : 'spc-knowledge-base'

        // Crear FormData para Cloudinary con firma
        const cloudinaryFormData = new FormData()
        cloudinaryFormData.append('file', new Blob([buffer]), file.name)
        cloudinaryFormData.append('folder', folder)
        cloudinaryFormData.append('api_key', apiKey)

        // Generar timestamp para firma
        const timestamp = Math.floor(Date.now() / 1000)
        cloudinaryFormData.append('timestamp', timestamp.toString())

        // Generar firma SHA-1
        const crypto = require('crypto')
        const signatureString = `folder=${folder}&timestamp=${timestamp}${apiSecret}`
        const signature = crypto.createHash('sha1').update(signatureString).digest('hex')
        cloudinaryFormData.append('signature', signature)

        // Upload a Cloudinary (image/upload para imágenes, upload para otros)
        const endpoint = file.type.startsWith('image/') ? 'image/upload' : 'upload'
        const uploadResponse = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/${endpoint}`,
            {
                method: 'POST',
                body: cloudinaryFormData
            }
        )

        if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json()
            console.error('Cloudinary error:', errorData)
            return NextResponse.json(
                { error: errorData.error?.message || 'Upload failed' },
                { status: uploadResponse.status }
            )
        }


        const result = await uploadResponse.json()

        // Intentar extraer texto del PDF
        let extractedText = ''
        if (file.type === 'application/pdf') {
            try {
                const pdfParse = require('pdf-parse')
                const pdfData = await pdfParse(buffer)
                extractedText = pdfData.text || ''
                console.log(`PDF parsed: ${extractedText.length} characters`)
            } catch (pdfError) {
                console.log('Could not extract PDF text:', pdfError)
                // No es crítico, continuar sin texto
            }
        }

        return NextResponse.json({
            success: true,
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            size: result.bytes,
            extractedText: extractedText
        })

    } catch (error: any) {
        console.error('Upload error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
