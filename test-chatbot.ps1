# Script de prueba del chatbot
$headers = @{'X-N8N-API-KEY' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwYjY1OWQ1OS01NzRjLTQ0NzgtYjE3NC04YjM2NmMzYzRmZjUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY0ODk5NzM2fQ.jDBj_o0xi8f53tka--moUXNkWbbU0hFBD7BbH0XL4j4'}

Write-Host "🔍 DIAGNÓSTICO COMPLETO DEL CHATBOT" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# 1. Listar workflows
Write-Host "1. Workflows activos:" -ForegroundColor Yellow
$wfs = Invoke-RestMethod -Uri 'https://n8n1-ma6y.onrender.com/api/v1/workflows' -Headers $headers
$wfs.data | ForEach-Object {
    $status = if ($_.active) { "[ACTIVO]" } else { "[Inactivo]" }
    Write-Host "   $status $($_.name) - ID: $($_.id)" -ForegroundColor $(if ($_.active) { "Green" } else { "Gray" })
}

# 2. Probar webhook
Write-Host "`n2. Probando webhook spc-chatbot:" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod `
        -Uri "https://n8n1-ma6y.onrender.com/webhook/spc-chatbot" `
        -Method Post `
        -ContentType "application/json" `
        -Body '{"message":"prueba automatica","sessionId":"diagnostic-001"}' `
        -ErrorAction Stop
    
    Write-Host "   ✅ ÉXITO - Webhook responde" -ForegroundColor Green
    Write-Host "   Respuesta:" -ForegroundColor White
    $response | ConvertTo-Json -Depth 3 | Out-File -FilePath "chatbot-response.json"
    Write-Host "   (Guardado en chatbot-response.json)" -ForegroundColor Gray
    
    # Mostrar preview
    Write-Host "`n   Preview respuesta:" -ForegroundColor Cyan
    if ($response.response) {
        Write-Host "   " $response.response.Substring(0, [Math]::Min(200, $response.response.Length)) "..." -ForegroundColor White
    }
    if ($response.tareas_pendientes -ne $null) {
        Write-Host "   Tareas pendientes detectadas:" $response.tareas_pendientes -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "   ❌ ERROR:" -ForegroundColor Red
    Write-Host "   " $_.Exception.Message -ForegroundColor Red
}

Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "Diagnóstico completo" -ForegroundColor Green
