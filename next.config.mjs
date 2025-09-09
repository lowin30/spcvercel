import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
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
  // Configuración para evitar la pre-renderización estática de las rutas del dashboard
  // Esto soluciona el problema con Supabase durante el build en Vercel
  output: 'standalone',
  publicRuntimeConfig: {
    // Ayuda a diferenciar entre build time y runtime para variables de entorno
    isProd: process.env.NODE_ENV === 'production',
  },
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve('./');
    return config;
  },
}

export default nextConfig
