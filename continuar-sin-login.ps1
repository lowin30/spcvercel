# 🚀 SCRIPT PARA CONTINUAR SIN LOGIN WEB
# Puedes trabajar con n8n usando solo la API

Write-Host "🔧 CONTINUANDO EL TRABAJO DE AYER" -ForegroundColor Cyan
Write-Host ""

# API Key que ya tienes
$headers = @{
    'X-N8N-API-KEY' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwYjY1OWQ1OS01NzRjLTQ0NzgtYjE3NC04YjM2NmMzYzRmZjUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY0ODk5NzM2fQ.jDBj_o0xi8f53tka--moUXNkWbbU0hFBD7BbH0XL4j4'
}

# 1. Ver workflows actuales
Write-Host "📋 PASO 1: Verificando workflows actuales..." -ForegroundColor Yellow
try {
    $wfs = Invoke-RestMethod -Uri 'https://n8n1-ma6y.onrender.com/api/v1/workflows' -Headers $headers
    
    Write-Host "✅ Workflows encontrados:" -ForegroundColor Green
    $wfs.data | ForEach-Object {
        $status = if ($_.active) { "🟢 ACTIVO" } else { "⭕ Inactivo" }
        Write-Host "  $status - $($_.name) (ID: $($_.id))" -ForegroundColor $(if ($_.active) { "Green" } else { "Gray" })
    }
    
    # Contar cuántos hay activos
    $activos = ($wfs.data | Where-Object { $_.active }).Count
    Write-Host "`n📊 Total workflows activos: $activos" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Error al consultar workflows" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Gray
    exit
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

# 2. Preguntar si quiere limpiar e importar nuevo
Write-Host "🔄 PASO 2: ¿Quieres limpiar e importar workflow limpio?" -ForegroundColor Yellow
Write-Host ""
Write-Host "Opciones:" -ForegroundColor Cyan
Write-Host "  [1] Limpiar todo e importar workflow actualizado" -ForegroundColor White
Write-Host "  [2] Mantener workflows actuales y solo probar" -ForegroundColor White
Write-Host "  [3] Salir" -ForegroundColor Gray
Write-Host ""

$opcion = Read-Host "Selecciona opción (1, 2 o 3)"

switch ($opcion) {
    "1" {
        Write-Host "`n🧹 Limpiando workflows antiguos..." -ForegroundColor Yellow
        
        # Eliminar workflows inactivos
        $wfs.data | Where-Object { -not $_.active } | ForEach-Object {
            try {
                Invoke-RestMethod -Uri "https://n8n1-ma6y.onrender.com/api/v1/workflows/$($_.id)" `
                    -Method Delete `
                    -Headers $headers | Out-Null
                Write-Host "  ✅ Eliminado: $($_.name)" -ForegroundColor Green
            } catch {
                Write-Host "  ⚠️  No se pudo eliminar: $($_.name)" -ForegroundColor Yellow
            }
        }
        
        Write-Host "`n📥 Importando workflow actualizado..." -ForegroundColor Yellow
        
        $workflow = Get-Content 'WORKFLOW-CHATBOT-HTTP-PROFESIONAL.json' -Raw
        
        try {
            $newWf = Invoke-RestMethod -Uri 'https://n8n1-ma6y.onrender.com/api/v1/workflows' `
                -Method Post `
                -Headers $headers `
                -ContentType 'application/json' `
                -Body $workflow
            
            Write-Host "✅ Workflow importado con ID: $($newWf.id)" -ForegroundColor Green
            
            # Activar
            Write-Host "`n🔄 Activando workflow..." -ForegroundColor Yellow
            Invoke-RestMethod -Uri "https://n8n1-ma6y.onrender.com/api/v1/workflows/$($newWf.id)/activate" `
                -Method Post `
                -Headers $headers | Out-Null
            
            Write-Host "✅ Workflow activado!" -ForegroundColor Green
            
        } catch {
            Write-Host "❌ Error al importar workflow" -ForegroundColor Red
            Write-Host $_.Exception.Message -ForegroundColor Gray
            exit
        }
    }
    
    "2" {
        Write-Host "`n✅ Manteniendo workflows actuales" -ForegroundColor Green
    }
    
    "3" {
        Write-Host "`n👋 Saliendo..." -ForegroundColor Gray
        exit
    }
    
    default {
        Write-Host "`n⚠️  Opción inválida. Saliendo..." -ForegroundColor Yellow
        exit
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

# 3. Probar el webhook
Write-Host "🧪 PASO 3: Probando el chatbot..." -ForegroundColor Yellow
Write-Host ""

try {
    $testResponse = Invoke-WebRequest `
        -Uri "https://n8n1-ma6y.onrender.com/webhook/spc-chatbot" `
        -Method Post `
        -ContentType "application/json" `
        -Body '{"message":"hola","sessionId":"test-recuperacion"}' `
        -UseBasicParsing
    
    Write-Host "Status Code:" $testResponse.StatusCode -ForegroundColor $(if ($testResponse.StatusCode -eq 200) { "Green" } else { "Yellow" })
    Write-Host "Content Length:" $testResponse.Content.Length -ForegroundColor Yellow
    
    if ($testResponse.Content.Length -gt 0) {
        Write-Host "`n✅ ¡EL CHATBOT RESPONDE!" -ForegroundColor Green
        Write-Host "`nRespuesta:" -ForegroundColor Cyan
        $testResponse.Content | ConvertFrom-Json | ConvertTo-Json -Depth 3 | Write-Host -ForegroundColor White
        
        Write-Host "`n🎉 TODO FUNCIONA CORRECTAMENTE" -ForegroundColor Green
        
    } else {
        Write-Host "`n⚠️  El webhook responde pero sin contenido" -ForegroundColor Yellow
        Write-Host "Esto significa que el workflow se ejecuta pero falla en algún nodo" -ForegroundColor Gray
        Write-Host "`nPróximo paso: Debuggear en n8n web (necesitas login)" -ForegroundColor Cyan
    }
    
} catch {
    Write-Host "❌ Error al probar webhook:" $_.Exception.Message -ForegroundColor Red
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ Script completado" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Siguiente paso:" -ForegroundColor Cyan
Write-Host "  - Si el chatbot NO responde con contenido:" -ForegroundColor White
Write-Host "    1. Recupera credenciales de Render (ver RECUPERAR-CREDENCIALES-N8N.md)" -ForegroundColor Gray
Write-Host "    2. Login en https://n8n1-ma6y.onrender.com" -ForegroundColor Gray
Write-Host "    3. Ver Executions para debuggear" -ForegroundColor Gray
Write-Host ""
Write-Host "  - Si el chatbot SÍ responde:" -ForegroundColor White
Write-Host "    ¡Listo! Puedes continuar trabajando" -ForegroundColor Gray
Write-Host ""
