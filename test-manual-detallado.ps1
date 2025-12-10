# Test manual detallado del chatbot

Write-Host "🧪 TEST MANUAL DEL CHATBOT" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📡 Enviando request al webhook..." -ForegroundColor Yellow
Write-Host "URL: https://n8n1-ma6y.onrender.com/webhook/spc-chatbot" -ForegroundColor Gray
Write-Host ""

$body = @{
    message = "hola, soy una prueba manual"
    sessionId = "test-manual-$(Get-Date -Format 'HHmmss')"
    userRole = "supervisor"
    userName = "Usuario de Prueba"
} | ConvertTo-Json

Write-Host "Body enviado:" -ForegroundColor Gray
Write-Host $body -ForegroundColor DarkGray
Write-Host ""

try {
    $response = Invoke-WebRequest `
        -Uri "https://n8n1-ma6y.onrender.com/webhook/spc-chatbot" `
        -Method Post `
        -ContentType "application/json" `
        -Body $body `
        -UseBasicParsing `
        -ErrorAction Stop
    
    Write-Host "✅ ÉXITO - Código de respuesta:" $response.StatusCode -ForegroundColor Green
    Write-Host ""
    
    Write-Host "📄 Respuesta completa:" -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    
    # Intentar parsear como JSON
    try {
        $jsonResponse = $response.Content | ConvertFrom-Json
        
        Write-Host "✅ Respuesta en formato JSON:" -ForegroundColor Green
        $jsonResponse | Format-List
        
        if ($jsonResponse.response) {
            Write-Host ""
            Write-Host "💬 Mensaje del chatbot:" -ForegroundColor Cyan
            Write-Host $jsonResponse.response -ForegroundColor White
        }
        
        if ($null -ne $jsonResponse.tareas_pendientes) {
            Write-Host ""
            Write-Host "📊 Tareas pendientes:" $jsonResponse.tareas_pendientes -ForegroundColor Yellow
        }
        
    } catch {
        Write-Host "⚠️  Respuesta no es JSON válido:" -ForegroundColor Yellow
        Write-Host $response.Content -ForegroundColor White
    }
    
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    
} catch {
    Write-Host "❌ ERROR AL LLAMAR AL WEBHOOK" -ForegroundColor Red
    Write-Host ""
    Write-Host "Detalles del error:" -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Código de error HTTP:" $statusCode -ForegroundColor Red
        
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "Mensaje de error:" -ForegroundColor Red
        Write-Host $errorBody -ForegroundColor White
    } else {
        Write-Host $_.Exception.Message -ForegroundColor Red
    }
    
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 INSTRUCCIONES:" -ForegroundColor Yellow
Write-Host "1. Si ves error, copia el mensaje completo" -ForegroundColor White
Write-Host "2. En n8n, click 'Webhook Chatbot' → 'Listen for test event'" -ForegroundColor White
Write-Host "3. Ejecuta este script otra vez" -ForegroundColor White
Write-Host "4. Verás la ejecución en tiempo real en n8n" -ForegroundColor White
Write-Host ""
