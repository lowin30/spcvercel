# Test de conexión a Supabase Postgres

Write-Host "🔍 DIAGNÓSTICO DE CONEXIÓN POSTGRES" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$host_correcto = "db.fodyzgjwoccpsjmfinvm.supabase.co"
$port = 5432

Write-Host "1️⃣ Verificando acceso a Postgres..." -ForegroundColor Yellow
Write-Host "   Host: $host_correcto" -ForegroundColor Gray
Write-Host "   Port: $port" -ForegroundColor Gray
Write-Host ""

try {
    $test = Test-NetConnection -ComputerName $host_correcto -Port $port -WarningAction SilentlyContinue
    
    if ($test.TcpTestSucceeded) {
        Write-Host "   ✅ Puerto accesible" -ForegroundColor Green
        Write-Host "   ✅ Tu máquina SÍ puede conectarse a Supabase Postgres" -ForegroundColor Green
        Write-Host ""
        Write-Host "   📊 Detalles de conexión:" -ForegroundColor Cyan
        Write-Host "   - IP remota:" $test.RemoteAddress -ForegroundColor White
        Write-Host "   - Latencia:" $test.PingReplyDetails.RoundtripTime "ms" -ForegroundColor White
        Write-Host ""
        Write-Host "   ✅ El problema está en la CONFIGURACIÓN de la credencial en n8n" -ForegroundColor Yellow
        Write-Host "   ✅ NO es problema de red" -ForegroundColor Yellow
        
    } else {
        Write-Host "   ❌ Puerto NO accesible" -ForegroundColor Red
        Write-Host "   ❌ Puede haber firewall bloqueando" -ForegroundColor Red
    }
    
} catch {
    Write-Host "   ❌ Error al testear:" $_.Exception.Message -ForegroundColor Red
}

Write-Host ""
Write-Host "2️⃣ Verificando host API de Supabase..." -ForegroundColor Yellow
$api_host = "fodyzgjwoccpsjmfinvm.supabase.co"

try {
    $api_test = Test-NetConnection -ComputerName $api_host -Port 443 -WarningAction SilentlyContinue
    
    if ($api_test.TcpTestSucceeded) {
        Write-Host "   ✅ API de Supabase accesible" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  API no responde" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "   ⚠️  No se pudo verificar API" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 CONFIGURACIÓN PARA N8N:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   Host: $host_correcto" -ForegroundColor White
Write-Host "   Database: postgres" -ForegroundColor White
Write-Host "   User: postgres" -ForegroundColor White
Write-Host "   Password: [Service Role Key de Supabase]" -ForegroundColor White
Write-Host "   Port: $port" -ForegroundColor White
Write-Host "   SSL: require" -ForegroundColor White
Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
