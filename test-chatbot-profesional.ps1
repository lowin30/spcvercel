# Test completo del Chatbot Profesional HTTP

Write-Host "🚀 TEST COMPLETO - CHATBOT PROFESIONAL" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$webhook_url = "https://n8n1-ma6y.onrender.com/webhook/spc-chatbot"
$tests_passed = 0
$tests_failed = 0

# Test 1: Saludo como supervisor
Write-Host "📝 TEST 1: Saludo (Supervisor)" -ForegroundColor Yellow
try {
    $test1 = Invoke-RestMethod -Uri $webhook_url `
        -Method Post `
        -ContentType "application/json" `
        -Body '{"message":"hola","sessionId":"test-1","userRole":"supervisor","userName":"Juan Supervisor"}' `
        -ErrorAction Stop
    
    if ($test1.success -and $test1.response) {
        Write-Host "   ✅ ÉXITO" -ForegroundColor Green
        Write-Host "   Respuesta:" $test1.response.Substring(0, [Math]::Min(100, $test1.response.Length)) "..." -ForegroundColor White
        Write-Host "   Tareas detectadas:" $test1.tareas_pendientes -ForegroundColor Cyan
        $tests_passed++
    } else {
        Write-Host "   ❌ FALLO: Respuesta incompleta" -ForegroundColor Red
        $tests_failed++
    }
} catch {
    Write-Host "   ❌ ERROR:" $_.Exception.Message -ForegroundColor Red
    $tests_failed++
}
Write-Host ""

Start-Sleep -Seconds 1

# Test 2: Consultar tareas
Write-Host "📝 TEST 2: Consultar tareas pendientes" -ForegroundColor Yellow
try {
    $test2 = Invoke-RestMethod -Uri $webhook_url `
        -Method Post `
        -ContentType "application/json" `
        -Body '{"message":"cuantas tareas tengo pendientes","sessionId":"test-2","userRole":"supervisor"}' `
        -ErrorAction Stop
    
    if ($test2.success) {
        Write-Host "   ✅ ÉXITO" -ForegroundColor Green
        Write-Host "   Tareas:" $test2.tareas_pendientes -ForegroundColor Cyan
        $tests_passed++
    } else {
        Write-Host "   ❌ FALLO" -ForegroundColor Red
        $tests_failed++
    }
} catch {
    Write-Host "   ❌ ERROR:" $_.Exception.Message -ForegroundColor Red
    $tests_failed++
}
Write-Host ""

Start-Sleep -Seconds 1

# Test 3: Resumen como admin
Write-Host "📝 TEST 3: Resumen (Admin)" -ForegroundColor Yellow
try {
    $test3 = Invoke-RestMethod -Uri $webhook_url `
        -Method Post `
        -ContentType "application/json" `
        -Body '{"message":"dame un resumen","sessionId":"test-3","userRole":"admin","userName":"Admin Principal"}' `
        -ErrorAction Stop
    
    if ($test3.success) {
        Write-Host "   ✅ ÉXITO" -ForegroundColor Green
        Write-Host "   Admin ve:" $test3.tareas_pendientes "tareas" -ForegroundColor Cyan
        $tests_passed++
    } else {
        Write-Host "   ❌ FALLO" -ForegroundColor Red
        $tests_failed++
    }
} catch {
    Write-Host "   ❌ ERROR:" $_.Exception.Message -ForegroundColor Red
    $tests_failed++
}
Write-Host ""

Start-Sleep -Seconds 1

# Test 4: Trabajador
Write-Host "📝 TEST 4: Consulta (Trabajador)" -ForegroundColor Yellow
try {
    $test4 = Invoke-RestMethod -Uri $webhook_url `
        -Method Post `
        -ContentType "application/json" `
        -Body '{"message":"que tareas tengo hoy","sessionId":"test-4","userRole":"trabajador","userName":"Pedro Trabajador"}' `
        -ErrorAction Stop
    
    if ($test4.success) {
        Write-Host "   ✅ ÉXITO" -ForegroundColor Green
        Write-Host "   Trabajador ve:" $test4.tareas_pendientes "tareas" -ForegroundColor Cyan
        $tests_passed++
    } else {
        Write-Host "   ❌ FALLO" -ForegroundColor Red
        $tests_failed++
    }
} catch {
    Write-Host "   ❌ ERROR:" $_.Exception.Message -ForegroundColor Red
    $tests_failed++
}
Write-Host ""

Start-Sleep -Seconds 1

# Test 5: Ayuda
Write-Host "📝 TEST 5: Comando de ayuda" -ForegroundColor Yellow
try {
    $test5 = Invoke-RestMethod -Uri $webhook_url `
        -Method Post `
        -ContentType "application/json" `
        -Body '{"message":"ayuda","sessionId":"test-5","userRole":"supervisor"}' `
        -ErrorAction Stop
    
    if ($test5.success -and $test5.response.Contains("puedo ayudarte")) {
        Write-Host "   ✅ ÉXITO" -ForegroundColor Green
        $tests_passed++
    } else {
        Write-Host "   ❌ FALLO" -ForegroundColor Red
        $tests_failed++
    }
} catch {
    Write-Host "   ❌ ERROR:" $_.Exception.Message -ForegroundColor Red
    $tests_failed++
}
Write-Host ""

# Resumen
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "📊 RESUMEN DE TESTS" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Tests exitosos:" $tests_passed -ForegroundColor Green
Write-Host "❌ Tests fallidos:" $tests_failed -ForegroundColor Red
Write-Host ""

if ($tests_failed -eq 0) {
    Write-Host "🎉 ¡TODOS LOS TESTS PASARON!" -ForegroundColor Green
    Write-Host "✅ El chatbot está funcionando perfectamente" -ForegroundColor Green
} elseif ($tests_passed -gt 0) {
    Write-Host "⚠️  Algunos tests fallaron" -ForegroundColor Yellow
    Write-Host "Verifica que el workflow esté activado en n8n" -ForegroundColor Yellow
} else {
    Write-Host "❌ TODOS LOS TESTS FALLARON" -ForegroundColor Red
    Write-Host "Verifica que el workflow esté importado y activado" -ForegroundColor Red
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
