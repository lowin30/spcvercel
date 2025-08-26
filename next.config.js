/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ignorar errores de TypeScript durante la compilación
  typescript: {
    ignoreBuildErrors: true,
  },
  // Configuración para manejar todas las páginas como dinámicas
  output: 'standalone',
  trailingSlash: true,
  // Configuración específica para evitar prerenderizar páginas estáticas
  // que dependen de variables de entorno de Supabase
  env: {
    // Proveer valores de placeholder durante la construcción
    NEXT_PUBLIC_SUPABASE_URL: 'https://placeholder-value-for-build.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'placeholder-value-for-build',
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
  },
  // Configuración para ignorar las advertencias de JSX transform desactualizado
  reactStrictMode: true,
  webpack: (config, { dev }) => {
    // Silenciar específicamente la advertencia de JSX transform desactualizado
    if (!dev) {
      config.infrastructureLogging = {
        level: 'error',
      }
    } else {
      // Filtrar advertencias específicas en desarrollo
      const originalConsoleWarn = console.warn
      console.warn = function filterWarnings(msg, ...args) {
        if (typeof msg === 'string' && msg.includes('outdated JSX transform')) {
          return
        }
        originalConsoleWarn.apply(console, [msg, ...args])
      }
    }
    
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    
    // Silenciar advertencias específicas para bibliotecas como react-big-calendar
    if (!config.ignoreWarnings) {
      config.ignoreWarnings = [];
    }
    config.ignoreWarnings.push({
      module: /node_modules\/react-big-calendar/,
      message: /using an outdated JSX transform/,
    });
    
    return config;
  },
}

module.exports = nextConfig
