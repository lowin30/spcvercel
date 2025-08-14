#!/bin/bash

echo "🚀 Construyendo APK de SPC Gestión..."

# 1. Instalar dependencias si no existen
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install
fi

# 2. Build de Next.js para exportación estática
echo "🔨 Construyendo aplicación Next.js..."
npm run build

# 3. Inicializar Capacitor si no existe
if [ ! -d "android" ]; then
    echo "⚡ Inicializando Capacitor..."
    npx cap add android
fi

# 4. Sincronizar archivos con Capacitor
echo "🔄 Sincronizando con Capacitor..."
npx cap sync android

# 5. Abrir Android Studio para build final
echo "📱 Abriendo Android Studio..."
echo "En Android Studio:"
echo "1. Build > Generate Signed Bundle/APK"
echo "2. Selecciona APK"
echo "3. Crea o usa un keystore"
echo "4. Build Release APK"

npx cap open android

echo "✅ Proceso completado!"
echo "El APK se generará en: android/app/build/outputs/apk/release/"
