'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { Mail, Chrome } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'
import { useDescope } from '@descope/nextjs-sdk/client'

function LoginContent() {
  const sdk = useDescope()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loadingEmail, setLoadingEmail] = useState(false)
  const [loadingGoogle, setLoadingGoogle] = useState(false)

  // limpieza de parametros de error en la url y deteccion de mensajes
  useEffect(() => {
    if (!searchParams) return
    
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')
    
    if (error || errorDescription) {
      toast.error(errorDescription || 'error de autenticacion')
      const url = new URL(window.location.href)
      url.searchParams.delete('error')
      url.searchParams.delete('error_description')
      url.searchParams.delete('code')
      window.history.replaceState({}, '', url.pathname)
    }
  }, [searchParams])

  // 1. Iniciar con Google Flow (Rollback v95.5)
  const handleGoogleLogin = async () => {
    setLoadingGoogle(true)
    
    try {
      // url limpia sin parametros basura que rompan el parseo del code
      const redirectUrl = `${window.location.origin}/auth/callback`
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      })
      if (error) {
        toast.error(error.message)
        setLoadingGoogle(false)
      }
    } catch (err) {
      setLoadingGoogle(false)
    }
  }

  // 3. Iniciar con Magic Link
  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoadingEmail(true)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('¡Enlace Seguro Enviado! Revisa tu bandeja de entrada en este dispositivo.')
    }
    setLoadingEmail(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-6 selection:bg-[#F26522] selection:text-white pb-20">

      {/* HEADER MINIMALISTA */}
      <div className="w-full max-w-sm text-center mb-10">
        <div className="w-24 h-24 bg-white rounded-3xl shadow-sm border border-gray-100 flex items-center justify-center mx-auto mb-6 overflow-hidden relative p-2">
          <Image
            src="/images/solo-logo-grande-frente.png"
            alt="SPC Logo"
            fill
            className="object-contain p-2"
            priority
          />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900 mb-2">Bienvenido</h1>
        <p className="text-gray-500 font-medium">Acceso seguro al sistema</p>
      </div>

      <div className="w-full max-w-sm space-y-4">

        {/* BOTÓN PRIMARIO: GOOGLE */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loadingGoogle || loadingEmail}
          className="w-full h-16 bg-gray-900 text-white rounded-[2rem] flex items-center justify-center space-x-3 text-lg font-medium shadow-lg hover:bg-gray-800 transition-all active:scale-[0.98] disabled:opacity-70"
        >
          {loadingGoogle ? (
            <>
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>ingresando...</span>
            </>
          ) : (
            <>
              <Chrome className="w-7 h-7" strokeWidth={1.5} />
              <span>Continuar con Google</span>
            </>
          )}
        </button>


        {/* SEPARADOR SUTIL */}
        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 text-gray-400 font-medium bg-gray-50">o usa tu correo corporativo</span>
          </div>
        </div>

        {/* FALLBACK: MAGIC LINK */}
        <form onSubmit={handleMagicLink} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
            disabled={loadingGoogle || loadingEmail}
            className="w-full h-14 bg-white border border-gray-200 rounded-2xl px-5 text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-[#F26522]/20 focus:border-[#F26522] transition-all"
            required
            autoComplete="email"
          />
          <button
            type="submit"
            disabled={loadingGoogle || loadingEmail || !email}
            className="w-full h-14 bg-gray-100 text-gray-600 rounded-2xl flex items-center justify-center space-x-2 font-medium hover:bg-gray-200 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loadingEmail ? (
              <div className="w-5 h-5 border-2 border-gray-400 border-t-gray-700 rounded-full animate-spin" />
            ) : (
              <>
                <Mail className="w-5 h-5" />
                <span>Enviar enlace seguro</span>
              </>
            )}
          </button>
        </form>

      </div>
    </div >
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
