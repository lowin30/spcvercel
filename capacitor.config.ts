import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.spc.gestion",
  appName: "SPC Gestión",
  webDir: "out",
  server: {
    androidScheme: "https",
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
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
