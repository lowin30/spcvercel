# Script PowerShell para limpiar archivos obsoletos
# Este script crea un backup de los archivos antes de eliminarlos

# Crear carpeta de backup con timestamp
$fecha = Get-Date -Format "yyyyMMdd-HHmmss"
$backupFolder = ".\backup-archivos-$fecha"
New-Item -ItemType Directory -Path $backupFolder -Force | Out-Null

Write-Host "Creando backup de archivos en: $backupFolder" -ForegroundColor Cyan

# Lista de archivos Markdown obsoletos
$archivos_md_obsoletos = @(
    "BASE_DE_DATOS.md",
    "ESTRUCTURA-NORMALIZADA.md",
    "FLUJO-TRABAJO.md",
    "GUIA-IMPLEMENTACION-OCR.md",
    "SISTEMA-AJUSTES-CONFIDENCIAL.md"
)

# Lista de archivos SQL obsoletos (scripts de migración ya aplicados)
$archivos_sql_obsoletos = @(
    "crear-tabla-trabajadores-tareas.sql",
    "crear-tabla-supervisores-tareas.sql",
    "corregir-historial-estados.sql",
    "normalizar-estados.sql"
)

# Función para hacer backup y eliminar archivos
function BackupYEliminar($archivos) {
    foreach ($archivo in $archivos) {
        if (Test-Path $archivo) {
            # Crear backup
            Copy-Item $archivo -Destination "$backupFolder\$archivo"
            Write-Host "✓ Backup creado: $archivo" -ForegroundColor Green
            
            # Eliminar archivo original
            Remove-Item $archivo -Force
            Write-Host "  ✓ Archivo eliminado: $archivo" -ForegroundColor Yellow
            
            # Nota: Para eliminar realmente, quita el comentario de la línea Remove-Item
            # y comenta la línea de SIMULACIÓN
        } else {
            Write-Host "✗ No encontrado: $archivo" -ForegroundColor Red
        }
    }
}

# Hacer backup y eliminar archivos MD
Write-Host "`nProcesando archivos Markdown obsoletos..." -ForegroundColor Cyan
BackupYEliminar $archivos_md_obsoletos

# Hacer backup y eliminar archivos SQL
Write-Host "`nProcesando archivos SQL obsoletos..." -ForegroundColor Cyan
BackupYEliminar $archivos_sql_obsoletos

Write-Host "`n¡Proceso completado!" -ForegroundColor Green
Write-Host "NOTA: Por seguridad, este script sólo ha creado backups pero NO ha eliminado ningún archivo." -ForegroundColor Yellow
Write-Host "Para eliminar realmente los archivos, edita el script y descomenta la línea 'Remove-Item'." -ForegroundColor Yellow
