import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const { publicId } = await request.json()

        if (!publicId) {
            return NextResponse.json({ error: 'No publicId provided' }, { status: 400 })
        }

        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dxtmdbqfe'
        const apiKey = process.env.CLOUDINARY_API_KEY
        const apiSecret = process.env.CLOUDINARY_API_SECRET

        if (!apiKey || !apiSecret) {
            return NextResponse.json(
                { error: 'Cloudinary credentials not configured' },
                { status: 500 }
            )
        }

        // Generar firma para eliminación
        const crypto = require('crypto')
        const timestamp = Math.floor(Date.now() / 1000)
        const signatureString = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`
        const signature = crypto.createHash('sha1').update(signatureString).digest('hex')

        // Eliminar de Cloudinary
        const deleteResponse = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    public_id: publicId,
                    api_key: apiKey,
                    timestamp: timestamp.toString(),
                    signature: signature
                })
            }
        )

        const result = await deleteResponse.json()

        return NextResponse.json({
            success: result.result === 'ok',
            result: result
        })

    } catch (error: any) {
        console.error('Delete error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
