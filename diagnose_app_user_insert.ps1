$envMap = @{}
Get-Content .env | Where-Object { $_ -match '=' } | ForEach-Object {
    $parts = $_ -split '=', 2
    $envMap[$parts[0]] = $parts[1]
}

$url = $envMap['VITE_SUPABASE_URL']
$key = $envMap['VITE_SUPABASE_ANON_KEY']
$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$email = "codex-appuser-$stamp@agrocentro.com.bo"
$sellerCode = "D$stamp"
$password = "Demo1234"

$sha = [System.Security.Cryptography.SHA256]::Create()
$bytes = [System.Text.Encoding]::UTF8.GetBytes($password)
$hashBytes = $sha.ComputeHash($bytes)
$passwordHash = -join ($hashBytes | ForEach-Object { $_.ToString("x2") })

$headers = @{
    apikey = $key
    Authorization = "Bearer $key"
    'Content-Type' = 'application/json'
    Prefer = 'return=representation'
}

$body = @{
    id = $sellerCode
    name = 'Codex App User'
    email = $email
    role = 'Vendedor'
    sellerCode = $sellerCode
    active = $true
    createdAt = [DateTimeOffset]::UtcNow.ToString('o')
    passwordHash = $passwordHash
} | ConvertTo-Json -Depth 5

try {
    $inserted = Invoke-RestMethod -Method Post -Uri "$url/rest/v1/app_users" -Headers $headers -Body $body
    Write-Host "APP_USER_INSERT_OK"
    $inserted | ConvertTo-Json -Depth 8
} catch {
    Write-Host "APP_USER_INSERT_ERROR"
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message
    } else {
        Write-Host $_.Exception.Message
    }
    exit 1
}

try {
    $selectHeaders = @{
        apikey = $key
        Authorization = "Bearer $key"
        'Content-Type' = 'application/json'
    }
    $encodedEmail = [System.Uri]::EscapeDataString($email)
    $encodedHash = [System.Uri]::EscapeDataString($passwordHash)
    $found = Invoke-RestMethod -Method Get -Uri "$url/rest/v1/app_users?select=*&email=eq.$encodedEmail&passwordHash=eq.$encodedHash&active=eq.true" -Headers $selectHeaders
    Write-Host "APP_USER_LOGIN_LOOKUP_OK"
    $found | ConvertTo-Json -Depth 8
} catch {
    Write-Host "APP_USER_LOGIN_LOOKUP_ERROR"
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message
    } else {
        Write-Host $_.Exception.Message
    }
    exit 1
}
