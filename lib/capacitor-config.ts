// Configuración para cuando conviertas a APK con Capacitor
import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.spc.gestion",
  appName: "SPC Gestión",
  webDir: "out", // Next.js static export
  server: {
    androidScheme: "https",
  },
  plugins: {
    Camera: {
      permissions: ["camera", "photos"],
    },
    Filesystem: {
      permissions: ["photos"],
    },
  },
}

export default config
