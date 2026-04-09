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
import { AuthProvider } from '@descope/nextjs-sdk'

const inter = Inter({ subsets: ["latin"] })
// ...
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
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>

          <AuthProvider projectId={process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID!}>
            <SupabaseProvider>
              {children}
              <Toaster />
              <SWRegister />
              <AiChatWidget />
            </SupabaseProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
