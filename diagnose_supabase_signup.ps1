$envMap = @{}
Get-Content .env | Where-Object { $_ -match '=' } | ForEach-Object {
    $parts = $_ -split '=', 2
    $envMap[$parts[0]] = $parts[1]
}

$url = $envMap['VITE_SUPABASE_URL']
$key = $envMap['VITE_SUPABASE_ANON_KEY']
$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()

$headers = @{
    apikey = $key
    Authorization = "Bearer $key"
    'Content-Type' = 'application/json'
}

$email = "codex-test-$stamp@agrocentro.com.bo"
$sellerCode = "T$stamp"

$body = @{
    email = $email
    password = 'Demo1234'
    data = @{
        full_name = 'Codex Test'
        role = 'Vendedor'
        seller_code = $sellerCode
    }
} | ConvertTo-Json -Depth 5

try {
    $signup = Invoke-RestMethod -Method Post -Uri "$url/auth/v1/signup" -Headers $headers -Body $body
    Write-Host "SIGNUP_OK"
    $signup | ConvertTo-Json -Depth 8

    $userId = $signup.user.id
    if (-not $userId) {
        $userId = "pending-$stamp"
    }

    $appUserBody = @{
        id = $userId
        name = 'Codex Test'
        email = $email
        role = 'Vendedor'
        sellerCode = $sellerCode
        active = $true
        createdAt = [DateTimeOffset]::UtcNow.ToString('o')
    } | ConvertTo-Json -Depth 5

    try {
        $appUser = Invoke-RestMethod -Method Post -Uri "$url/rest/v1/app_users" -Headers ($headers + @{ Prefer = 'return=representation' }) -Body $appUserBody
        Write-Host "APP_USER_INSERT_OK"
        $appUser | ConvertTo-Json -Depth 8
    } catch {
        Write-Host "APP_USER_INSERT_ERROR"
        if ($_.ErrorDetails.Message) {
            Write-Host $_.ErrorDetails.Message
        } else {
            Write-Host $_.Exception.Message
        }
    }
} catch {
    Write-Host "SIGNUP_ERROR"
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message
    } else {
        Write-Host $_.Exception.Message
    }
}
