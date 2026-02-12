"use client"

import { Descope } from '@descope/nextjs-sdk'
import { useSession } from '@descope/nextjs-sdk/client'
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"
import { useEffect } from "react"

export default function LoginPage() {
  const router = useRouter()
  const { isAuthenticated, isSessionLoading } = useSession()

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard")
    }
  }, [isAuthenticated, router])

  if (isSessionLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-gray-200 rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-amber-50 via-white to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Card className="w-full max-w-md shadow-2xl border-0 overflow-hidden">
        <div className="flex justify-center pt-8 pb-2 bg-white/50 backdrop-blur-sm">
          <Image
            src="/spc-logo-main.png"
            alt="Servicios Para Consorcio"
            width={180}
            height={180}
            priority
            className="object-contain"
          />
        </div>

        <CardHeader className="text-center space-y-1 pb-2">
          <CardTitle className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            bienvenido
          </CardTitle>
          <CardDescription className="text-gray-500">
            ingresa con tu cuenta segura
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <div className="descope-container min-h-[400px]">
            <Descope
              flowId="sign-up-or-in"
              onSuccess={(e) => {
                console.log('autenticacion exitosa:', e.detail.user)
                router.push("/dashboard")
              }}
              onError={(e) => {
                console.error('error en autenticacion:', e)
              }}
              theme="light"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
