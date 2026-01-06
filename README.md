# Sistema de Gestión SPC

## Descripción General

Sistema completo para la gestión de presupuestos, liquidaciones y administración financiera de proyectos de construcción. Desarrollado con Next.js y Supabase, proporciona una plataforma robusta para administradores y supervisores en el manejo de tareas, presupuestos y liquidaciones.

## Gestor de paquetes y CI/CD (estandarizado)

- **Gestor estándar:** pnpm (fijado vía `packageManager: pnpm@10.11.0` en `package.json`).
- **Lockfile único:** `pnpm-lock.yaml`. Evitar `package-lock.json` para prevenir ambigüedades.
- **Comandos recomendados:**
  - Instalar dependencias: `pnpm install`
  - Desarrollo: `pnpm dev`
  - Build: `pnpm build`
  - Producción local: `pnpm start`
  - Lint: `pnpm lint`
  - Typecheck: `pnpm typecheck`
- **CI/Vercel:** Vercel detecta `pnpm-lock.yaml` y la versión fijada en `package.json`. No se requiere configuración adicional.
- **Notas:** Si tu entorno no tiene pnpm, instálalo con Corepack (`corepack enable && corepack prepare pnpm@10.11.0 --activate`) o via `npm i -g pnpm`.

## Estructura de la Documentación

Toda la documentación del sistema se encuentra consolidada en los siguientes archivos:

- **DOCUMENTACION-COMPLETA-SPC.md** - Documentación principal con toda la estructura, funciones y flujos de trabajo
- **RESUMEN-ESTRUCTURA-SPC.md** - Versión compacta para referencia rápida
- **CONSULTAS-ACTUALIZACION-SPC.sql** - Scripts para verificar estructura actual en Supabase
- **CONSULTAS-DEBUG-SPC.sql** - Consultas para diagnóstico y auditoría
- **guia-errores.md** - Guía para resolución de problemas comunes

## Scripts SQL Importantes

- **verificar-estructura-actual.sql** - Verifica la integridad de la base de datos
- **triggers-presupuestos.sql** - Definiciones de triggers para presupuestos
- **validaciones-presupuestos.sql** - Validaciones para los presupuestos
- **vistas-reportes.sql** - Vistas SQL para generación de reportes
- **indices-optimizacion.sql** - Definiciones de índices para optimización

## Limpieza de Archivos Obsoletos (Julio 2025)

Como parte de la actualización y consolidación de la documentación, se han eliminado o se recomienda eliminar los siguientes archivos obsoletos:

### Archivos Markdown (.md) obsoletos:
1. ✅ **DOCUMENTACION-ACTUALIZACIONES.md** - Integrado en DOCUMENTACION-COMPLETA-SPC.md
2. ✅ **ESTADO_SISTEMA.md** - Reemplazado por verificación automática
3. ✅ **CHANGELOG-GASTOS-REFACTOR.md** - Integrado en documentación principal
4. ✅ **liquidaciones-supervisor-trabajador.md** - Flujo actualizado en doc principal
5. ✅ **MEJORAS-PROCESAMIENTO-IMAGENES.md** - Implementado e integrado
6. ✅ **BASE_DE_DATOS.md** - Estructura actualizada en doc principal
7. ✅ **ESTRUCTURA-NORMALIZADA.md** - Consolidado en doc principal
8. ✅ **FLUJO-TRABAJO.md** - Flujo actualizado en doc principal
9. ✅ **GUIA-IMPLEMENTACION-OCR.md** - Implementado e integrado
10. ✅ **SISTEMA-AJUSTES-CONFIDENCIAL.md** - Información consolidada

### Archivos SQL (.sql) obsoletos:
1. ✅ **actualizar-tabla-gastos-ocr.sql** - Migración aplicada
2. ✅ **add_gastos_pdf_column.sql** - Cambio ya implementado
3. ✅ **mejorar-tabla-gastos-ocr.sql** - Mejoras implementadas
4. ✅ **crear-datos-prueba-completos.sql** - No necesario en producción
5. ✅ **crear-indices-gastos-ocr.sql** - Índices ya creados
6. ✅ **crear-tabla-trabajadores-tareas.sql** - Migración aplicada
7. ✅ **crear-tabla-supervisores-tareas.sql** - Migración aplicada
8. ✅ **corregir-historial-estados.sql** - Corrección aplicada
9. ✅ **normalizar-estados.sql** - Normalización completada

_Nota: Se ha creado una carpeta `archivos-obsoletos` como backup de los archivos eliminados._

**[https://v0.dev/chat/projects/5HZkG8Fafmq](https://v0.dev/chat/projects/5HZkG8Fafmq)**

## How It Works

1. Create and modify your project using [v0.dev](https://v0.dev)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository

# Test de despliegue automatico
