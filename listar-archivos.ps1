# Script simple para listar archivos markdown
Write-Host "Archivos Markdown (.md) en el directorio:"
Get-ChildItem -Path . -Filter "*.md" | ForEach-Object {
    Write-Output $_.Name
}

Write-Host "`nArchivos SQL (.sql) en el directorio:"
Get-ChildItem -Path . -Filter "*.sql" | ForEach-Object {
    Write-Output $_.Name
}
