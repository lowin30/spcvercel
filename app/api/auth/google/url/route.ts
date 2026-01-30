import { getAuthUrl } from "@/lib/google-auth"
import { NextResponse } from "next/server"

export async function GET() {
    try {
        const url = getAuthUrl()
        return NextResponse.json({ url })
    } catch (error) {
        return NextResponse.json({ error: "Failed to generate URL" }, { status: 500 })
    }
}
