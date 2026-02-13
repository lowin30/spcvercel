import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import "react-big-calendar/lib/css/react-big-calendar.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { SupabaseProvider } from "@/lib/supabase-provider"
import SWRegister from "@/components/sw-register"
import { AiChatWidget } from "@/components/ai-chat-widget"
import { AuthProvider } from "@descope/nextjs-sdk"

const inter = Inter({ subsets: ["latin"] })

export const viewport: Viewport = {
  themeColor: "#111827",
}

export const metadata: Metadata = {
  title: "SPC - Sistema de Gestión de Consorcios",
  description: "Sistema Integral para Gestión de Consorcios",
  generator: 'v0.dev',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/apple-touch-icon.png'
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta charSet="UTF-8" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <AuthProvider
          projectId={process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID || "P39Y887u1otOQcg8nI38s878J2nT"}
          baseUrl="https://api.descope.com"
          sessionTokenViaCookie
        >
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
            <SupabaseProvider>
              {children}
              <Toaster />
              <SWRegister />
              <AiChatWidget />
            </SupabaseProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
