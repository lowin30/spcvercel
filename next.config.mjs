import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    externalDir: true,
    serverActions: {
      allowedOrigins: ["localhost:3000", "spcvercel.vercel.app"],
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
    config.resolve.alias['clsx/dist/clsx.m.js'] = 'clsx';
    config.resolve.alias['react-big-calendar/node_modules/clsx'] = 'clsx';
    return config;
  },
}

export default nextConfig
