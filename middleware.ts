import { authMiddleware } from '@descope/nextjs-sdk/server'

export default authMiddleware({
  projectId: process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID || 'P39Y887u1otOQcg8nI38s878J2nT',
  publicRoutes: ['/login', '/api/auth/webauthn(.*)', '/api/auth/callback', '/manifest.json', '/icons(.*)', '/_next(.*)', '/static(.*)'],
  redirectTo: '/login'
})

export const config = {
  matcher: ['/dashboard/:path*', '/api/admin/:path*']
}
