$projectId = "P39Y887u1otOQcg8nI38s878J2nT"
$flowId = "sign-up-or-in"
$origin = "http://localhost:3000"

Write-Host "Testing Descope Flow Start for Project: $projectId"
Write-Host "Origin: $origin"

$body = @{
    flowId = $flowId
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://api.descope.com/v1/flow/start" `
        -Method Post `
        -Headers @{
            "Authorization" = "Bearer $projectId"
            "Content-Type" = "application/json"
            "Origin" = $origin
        } `
        -Body $body `
        -ErrorAction Stop

    Write-Host "SUCCESS! Flow started."
    Write-Host $response
} catch {
    Write-Host "ERROR: Request failed."
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody"
    }
}
