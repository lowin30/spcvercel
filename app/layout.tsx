import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import "react-big-calendar/lib/css/react-big-calendar.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { SupabaseProvider } from "@/lib/supabase-provider"
import SWRegister from "@/components/sw-register"

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
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <SupabaseProvider>
            {children}
            <Toaster />
            <SWRegister />
          </SupabaseProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
