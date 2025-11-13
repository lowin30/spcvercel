# SPC Android (TWA) - Mantenimiento y firma

IMPORTANTE: Este archivo contiene credenciales y rutas sensibles. Guardarlo en un lugar seguro. Si el repositorio es público, moverlo a un repositorio privado o gestor de secretos.

## Dominio (PWA)
- https://spcvercel.vercel.app
- start_url: /login

## Identidad de la app Android (TWA)
- package_name: com.spcvercel.app

## Keystore (firma de release)
- Ruta del keystore: C:\\twa-spc\\spc-release.keystore
- Alias (key alias): spc
- Contraseña del keystore (storepass): SPC2024Seguro!
- Contraseña de la clave (keypass): SPC2024Seguro!
- Emisor/Propietario: CN=SPC, O=SPC, C=AR
- SHA-256 (huella del certificado):
  - 7A:AE:3E:1D:16:51:64:6D:56:7D:BC:88:EB:A8:3B:4B:F6:AE:E3:D7:19:81:45:D9:DE:21:09:82:BE:0A:CC:B3

## Digital Asset Links (para modo Trusted sin barra)
- Archivo en producción: https://spcvercel.vercel.app/.well-known/assetlinks.json
- Archivo en repo: public/.well-known/assetlinks.json
- Contiene:
  - package_name: com.spcvercel.app
  - sha256_cert_fingerprints: 7A:AE:3E:1D:16:51:64:6D:56:7D:BC:88:EB:A8:3B:4B:F6:AE:E3:D7:19:81:45:D9:DE:21:09:82:BE:0A:CC:B3

### Verificación manual
- Abrir en browser: https://spcvercel.vercel.app/.well-known/assetlinks.json
- Reinstalar la APK TWA y abrir 1 vez con Internet para tomar modo Trusted.

## Colores (TWA)
- themeColor: #111827
- navigationColor: #111827
- navigationColorDark: #111827
- navigationDividerColor: #111827
- navigationDividerColorDark: #111827
- backgroundColor: #111827
- splashScreenFadeOutDuration: 300

## Service Worker (PWA)
- Precache: /login, /offline.html, /dashboard/esperando-rol, /dashboard/herramientas/calculadora
- Runtime cache: cache-first para /_next/static/* e imágenes/íconos
- Navegaciones: network-first con fallback a offline.html

## Sesión persistente (Offline)
- El dashboard usa supabase.auth.getSession() para leer sesión local y evitar re-login sin Internet.

## Construir APK TWA (Bubblewrap)
1) Entorno (PowerShell):
```
$env:JAVA_HOME = "C:\\Program Files\\Android\\Android Studio\\jbr"
$env:ANDROID_SDK_ROOT = "C:\\Users\\Central 1\\AppData\\Local\\Android\\Sdk"
$env:PATH = "$env:JAVA_HOME\\bin;$env:ANDROID_SDK_ROOT\\platform-tools;$env:ANDROID_SDK_ROOT\\build-tools\\36.0.0;$env:PATH"
```
2) En la carpeta del proyecto TWA (ej. C:\\twa-spc):
```
npx @bubblewrap/cli@latest update
npx @bubblewrap/cli@latest build
```
3) APK típico: C:\\twa-spc\\android\\app\\build\\outputs\\apk\\release\\app-release.apk

## Firmar/verificar APK (si hace falta por consola)
- Ver huella del keystore:
```
"C:\\Program Files\\Android\\Android Studio\\jbr\\bin\\keytool.exe" -list -v -storetype PKCS12 -keystore "C:\\twa-spc\\spc-release.keystore" -alias spc
```
- Ver huella de un APK firmado:
```
"C:\\Users\\Central 1\\AppData\\Local\\Android\\Sdk\\build-tools\\36.0.0\\apksigner.bat" verify --print-certs "C:\\ruta\\a\\app-release.apk"
```
- zipalign (si tenés un APK unsigned y querés firmarlo manualmente):
```
"C:\\Users\\Central 1\\AppData\\Local\\Android\\Sdk\\build-tools\\36.0.0\\zipalign.exe" -p -f -v 4 "C:\\ruta\\SPC-unsigned.apk" "C:\\ruta\\SPC-aligned.apk"
"C:\\Users\\Central 1\\AppData\\Local\\Android\\Sdk\\build-tools\\36.0.0\\apksigner.bat" sign --ks "C:\\twa-spc\\spc-release.keystore" --ks-key-alias spc --out "C:\\ruta\\SPC-signed.apk" "C:\\ruta\\SPC-aligned.apk"
```

## Flujo recomendado
1) Publicar cambios en Vercel (repo main) → PWA al día.
2) Construir APK TWA y firmar con spc-release.keystore.
3) Verificar SHA-256 del APK.
4) Si cambió la huella, actualizar public/.well-known/assetlinks.json y desplegar.
5) Reinstalar APK, abrir con Internet 1 vez → modo Trusted (sin barra).

---
Si necesitás regenerar el keystore por seguridad, actualizar este documento y el assetlinks.json con la nueva huella.
