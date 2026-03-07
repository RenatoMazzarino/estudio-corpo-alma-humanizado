Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$envDir = Join-Path $projectRoot ".vercel\env-import"

$expectedFiles = @(
  "vercel-development-required.env",
  "vercel-preview-required.env",
  "vercel-production-required.env"
)

$requiredKeys = @(
  "APP_TIMEZONE",
  "CRON_SECRET",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_PUBLIC_BASE_URL",
  "GOOGLE_MAPS_API_KEY",
  "DISPLACEMENT_ORIGIN_ADDRESS",
  "GEMINI_API_KEY",
  "FLORA_MODEL",
  "DASHBOARD_ALLOWED_GOOGLE_EMAILS",
  "PUBLIC_BOOKING_LOOKUP_CAPTCHA_SECRET",
  "SPOTIFY_CLIENT_ID",
  "SPOTIFY_CLIENT_SECRET",
  "SPOTIFY_REDIRECT_URI",
  "MERCADOPAGO_ACCESS_TOKEN",
  "MERCADOPAGO_PUBLIC_KEY",
  "MERCADOPAGO_WEBHOOK_SECRET",
  "WHATSAPP_AUTOMATION_GLOBAL_ENABLED",
  "WHATSAPP_AUTOMATION_FORCE_DRY_RUN",
  "WHATSAPP_AUTOMATION_PROVIDER",
  "WHATSAPP_AUTOMATION_PROCESSOR_SECRET",
  "WHATSAPP_AUTOMATION_BATCH_LIMIT",
  "WHATSAPP_AUTOMATION_AUTO_DISPATCH_ON_QUEUE",
  "WHATSAPP_AUTOMATION_MAX_RETRIES",
  "WHATSAPP_AUTOMATION_RETRY_BASE_DELAY_SECONDS",
  "WHATSAPP_AUTOMATION_META_ACCESS_TOKEN",
  "WHATSAPP_AUTOMATION_META_PHONE_NUMBER_ID",
  "WHATSAPP_AUTOMATION_META_BUSINESS_ACCOUNT_ID",
  "WHATSAPP_AUTOMATION_META_TEST_RECIPIENT",
  "WHATSAPP_AUTOMATION_META_API_VERSION",
  "WHATSAPP_AUTOMATION_META_WEBHOOK_VERIFY_TOKEN",
  "WHATSAPP_AUTOMATION_META_APP_SECRET"
)

$results = New-Object System.Collections.Generic.List[object]

function Add-Result {
  param(
    [string]$Scope,
    [string]$Check,
    [string]$Status,
    [string]$Details
  )
  $results.Add([pscustomobject]@{
      Scope = $Scope
      Check = $Check
      Status = $Status
      Details = $Details
    })
}

function Parse-EnvFile {
  param([string]$Path)
  $map = @{}
  foreach ($line in (Get-Content $Path)) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith("#")) { continue }
    if ($trimmed -notmatch "^[A-Z0-9_]+=") { continue }
    $parts = $trimmed -split "=", 2
    $key = $parts[0]
    $value = if ($parts.Length -gt 1) { $parts[1].Trim() } else { "" }
    $map[$key] = $value
  }
  return $map
}

if (-not (Test-Path $envDir)) {
  Add-Result "global" "env-dir" "FAIL" ".vercel/env-import nao encontrado."
}
else {
  Add-Result "global" "env-dir" "OK" $envDir
}

foreach ($file in $expectedFiles) {
  $path = Join-Path $envDir $file
  if (-not (Test-Path $path)) {
    Add-Result $file "exists" "FAIL" "Arquivo ausente."
    continue
  }

  Add-Result $file "exists" "OK" $path
  $vars = Parse-EnvFile -Path $path

  foreach ($key in $requiredKeys) {
    if (-not $vars.ContainsKey($key)) {
      Add-Result $file "key:$key" "FAIL" "Variavel ausente."
      continue
    }
    if (-not $vars[$key]) {
      Add-Result $file "key:$key" "FAIL" "Variavel vazia."
      continue
    }
    Add-Result $file "key:$key" "OK" "Definida"
  }

  if ($vars.ContainsKey("WHATSAPP_AUTOMATION_META_ACCESS_TOKEN") -and
      $vars.ContainsKey("WHATSAPP_AUTOMATION_META_PHONE_NUMBER_ID")) {
    $token = $vars["WHATSAPP_AUTOMATION_META_ACCESS_TOKEN"]
    $phoneId = $vars["WHATSAPP_AUTOMATION_META_PHONE_NUMBER_ID"]
    $apiVersion = if ($vars.ContainsKey("WHATSAPP_AUTOMATION_META_API_VERSION")) { $vars["WHATSAPP_AUTOMATION_META_API_VERSION"] } else { "v22.0" }
    $uri = "https://graph.facebook.com/$apiVersion/${phoneId}`?fields=id"
    try {
      $null = Invoke-RestMethod -Method Get -Uri $uri -Headers @{ Authorization = "Bearer $token" }
      Add-Result $file "meta-token-validation" "OK" "Token acessa o phone_number_id informado."
    }
    catch {
      $details = if ($_.ErrorDetails -and $_.ErrorDetails.Message) { $_.ErrorDetails.Message } else { $_.Exception.Message }
      Add-Result $file "meta-token-validation" "FAIL" $details
    }
  }

  if ($file -eq "vercel-production-required.env") {
    if ($vars.ContainsKey("WHATSAPP_AUTOMATION_FORCE_DRY_RUN") -and $vars["WHATSAPP_AUTOMATION_FORCE_DRY_RUN"].ToLower() -ne "false") {
      Add-Result $file "prod-dry-run" "FAIL" "Production deve usar WHATSAPP_AUTOMATION_FORCE_DRY_RUN=false."
    }
  }

  if ($file -eq "vercel-preview-required.env") {
    if ($vars.ContainsKey("WHATSAPP_AUTOMATION_FORCE_DRY_RUN") -and $vars["WHATSAPP_AUTOMATION_FORCE_DRY_RUN"].ToLower() -ne "true") {
      Add-Result $file "preview-dry-run" "FAIL" "Preview recomendado com WHATSAPP_AUTOMATION_FORCE_DRY_RUN=true."
    }
  }
}

Write-Output ""
Write-Output "Vercel env audit results:"
$results | Format-Table -AutoSize

$hasFail = $results | Where-Object { $_.Status -eq "FAIL" }
if ($hasFail) {
  exit 1
}

exit 0

