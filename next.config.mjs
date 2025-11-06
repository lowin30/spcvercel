import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    nodeMiddleware: true,
    externalDir: true,
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Configuración para evitar la pre-renderización estática
  // Esto soluciona el problema con Supabase durante el build en Vercel
  output: 'standalone',
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve('./');
    return config;
  },
}

export default nextConfig
