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
  // Configuración para evitar la pre-renderización estática
  // Esto soluciona el problema con Supabase durante el build en Vercel
  output: 'standalone',
  // Solución definitiva: deshabilitar completamente la generación estática
  generateStaticParams: false,
  experimental: {
    // Deshabilitar completamente la generación estática
    externalDir: true,
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
    // Tratar todas las rutas como dinámicas en producción
    isrMemoryCacheSize: 0,
  },
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve('./');
    return config;
  },
}

export default nextConfig
