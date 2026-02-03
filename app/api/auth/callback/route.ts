import { createServerClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/dashboard'

    if (code) {
        // 1. Exchange code for session (using normal client)
        const supabase = await createServerClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            // SPC Protocol v19.0: Sync User to 'usuarios' table using Service Role
            // This is CRITICAL to bypass RLS policies that block auto-creation
            try {
                // Initialize Service Role Client
                const serviceClient = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.SUPABASE_SERVICE_ROLE_KEY!,
                    {
                        auth: {
                            persistSession: false,
                            autoRefreshToken: false,
                            detectSessionInUrl: false
                        }
                    }
                )

                const { data: { user } } = await supabase.auth.getUser()

                if (user) {
                    // Check if user exists in 'usuarios' using Service Client (Master Key)
                    const { data: existingUser } = await serviceClient
                        .from('usuarios')
                        .select('id')
                        .eq('id', user.id)
                        .maybeSingle()

                    if (!existingUser) {
                        console.log('Creating new user from Google Auth (Service Role):', user.email)

                        const { error: insertError } = await serviceClient.from('usuarios').insert({
                            id: user.id,
                            email: user.email,
                            nombre: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
                            rol: 'trabajador', // Default role
                            activo: true
                        })

                        if (insertError) {
                            console.error('CRITICAL: Error creating user profile:', insertError)
                        } else {
                            console.log('User profile created successfully via Service Role.')
                        }
                    } else {
                        // Optional: Ensure 'activo' is true if returning user? 
                        // For now we trust manual management, but could force true here if desired.
                    }
                }
            } catch (syncError) {
                console.error('User Sync Failed:', syncError)
                // We don't block login if sync fails, but middleware might kick them out
            }

            return NextResponse.redirect(`${origin}${next}`)
        }
        console.error('Auth Callback Error:', error)
    }

    return NextResponse.redirect(`${origin}/login?error=auth_code_error`)
}
