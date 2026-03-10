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
  "BOOKING_LOOKUP_CAPTCHA_SECRET",
  "SPOTIFY_CLIENT_ID",
  "SPOTIFY_CLIENT_SECRET",
  "SPOTIFY_REDIRECT_URI",
  "MERCADOPAGO_ACCESS_TOKEN",
  "MERCADOPAGO_PUBLIC_KEY",
  "MERCADOPAGO_WEBHOOK_SECRET",
  "WHATSAPP_PROFILE",
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
  "WHATSAPP_AUTOMATION_RECIPIENT_MODE",
  "WHATSAPP_AUTOMATION_META_API_VERSION",
  "WHATSAPP_AUTOMATION_META_WEBHOOK_VERIFY_TOKEN",
  "WHATSAPP_AUTOMATION_META_APP_SECRET",
  "WHATSAPP_AUTOMATION_FLORA_HISTORY_SINCE"
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

function Get-EnvFileMap {
  param([string]$Path)
  $map = @{}
  foreach ($line in (Get-Content $Path)) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith("#")) { continue }
    if ($trimmed -notmatch "^[A-Z0-9_]+=") { continue }
    $parts = $trimmed -split "=", 2
    $key = $parts[0]
    $value = if ($parts.Length -gt 1) { $parts[1].Trim() } else { "" }
    if ($value.Length -ge 2) {
      if (($value.StartsWith('"') -and $value.EndsWith('"')) -or
          ($value.StartsWith("'") -and $value.EndsWith("'"))) {
        $value = $value.Substring(1, $value.Length - 2)
      }
    }
    $map[$key] = $value
  }
  return $map
}

function Get-NormalizedEnvValue {
  param(
    [hashtable]$EnvMap,
    [string]$Key
  )

  if (-not $EnvMap.ContainsKey($Key)) {
    return ""
  }

  $value = $EnvMap[$Key]
  if ($null -eq $value) {
    return ""
  }

  return $value.ToString().Trim().ToLowerInvariant()
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
  $vars = Get-EnvFileMap -Path $path

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
    $profile = Get-NormalizedEnvValue -EnvMap $vars -Key "WHATSAPP_PROFILE"
    if ($profile -eq "") {
      $profile = Get-NormalizedEnvValue -EnvMap $vars -Key "WHATSAPP_AUTOMATION_PROFILE"
    }
    $recipientMode = Get-NormalizedEnvValue -EnvMap $vars -Key "WHATSAPP_AUTOMATION_RECIPIENT_MODE"
    $legacyGlobalEnabled = Get-NormalizedEnvValue -EnvMap $vars -Key "WHATSAPP_AUTOMATION_GLOBAL_ENABLED"
    $legacyForceDryRun = Get-NormalizedEnvValue -EnvMap $vars -Key "WHATSAPP_AUTOMATION_FORCE_DRY_RUN"
    $legacyForceTestRecipient = Get-NormalizedEnvValue -EnvMap $vars -Key "WHATSAPP_AUTOMATION_META_FORCE_TEST_RECIPIENT"

    if ($profile -eq "") {
      if ($legacyGlobalEnabled -eq "" -and $legacyForceDryRun -eq "") {
        Add-Result $file "prod-profile-default" "OK" "Profile ausente: runtime usará padrão de VERCEL_ENV=production (prod_real)."
      } elseif ($legacyGlobalEnabled -ne "true" -or $legacyForceDryRun -ne "false") {
        Add-Result $file "prod-profile-legacy" "FAIL" "Pacote legado em produção exige GLOBAL_ENABLED=true e FORCE_DRY_RUN=false."
      } else {
        Add-Result $file "prod-profile-legacy" "OK" "Pacote legado aceito (migração recomendada para profile-first)."
      }
    } elseif ($profile -ne "prod_real") {
      Add-Result $file "prod-profile" "FAIL" "Production deve usar WHATSAPP_PROFILE=prod_real."
    }

    if ($recipientMode -eq "") {
      if ($legacyForceTestRecipient -eq "true") {
        Add-Result $file "prod-recipient-legacy" "FAIL" "Produção não deve manter destino fixo de teste no legado."
      } elseif ($legacyForceTestRecipient -eq "false") {
        Add-Result $file "prod-recipient-legacy" "OK" "Pacote legado aceita envio real em produção."
      } else {
        Add-Result $file "prod-recipient-default" "OK" "Recipient mode ausente: runtime padrão em produção é envio para cliente real."
      }
    } elseif ($recipientMode -ne "customer") {
      Add-Result $file "prod-recipient-mode" "FAIL" "Production deve usar WHATSAPP_AUTOMATION_RECIPIENT_MODE=customer."
    }
  }

  if ($file -eq "vercel-preview-required.env") {
    $profile = Get-NormalizedEnvValue -EnvMap $vars -Key "WHATSAPP_PROFILE"
    if ($profile -eq "") {
      $profile = Get-NormalizedEnvValue -EnvMap $vars -Key "WHATSAPP_AUTOMATION_PROFILE"
    }
    $recipientMode = Get-NormalizedEnvValue -EnvMap $vars -Key "WHATSAPP_AUTOMATION_RECIPIENT_MODE"
    $legacyGlobalEnabled = Get-NormalizedEnvValue -EnvMap $vars -Key "WHATSAPP_AUTOMATION_GLOBAL_ENABLED"
    $legacyForceDryRun = Get-NormalizedEnvValue -EnvMap $vars -Key "WHATSAPP_AUTOMATION_FORCE_DRY_RUN"
    $legacyForceTestRecipient = Get-NormalizedEnvValue -EnvMap $vars -Key "WHATSAPP_AUTOMATION_META_FORCE_TEST_RECIPIENT"

    if ($profile -eq "") {
      if ($legacyGlobalEnabled -eq "" -and $legacyForceDryRun -eq "") {
        Add-Result $file "preview-profile-default" "OK" "Profile ausente: runtime usará padrão de VERCEL_ENV=preview (preview_real_test)."
      } else {
        Add-Result $file "preview-profile-legacy" "OK" "Pacote legado aceito (migração recomendada para profile-first)."
      }
    } elseif ($profile -ne "preview_real_test") {
      Add-Result $file "preview-profile" "FAIL" "Preview deve usar WHATSAPP_PROFILE=preview_real_test."
    }

    if ($recipientMode -eq "") {
      if ($legacyForceTestRecipient -eq "true") {
        Add-Result $file "preview-recipient-legacy" "OK" "Pacote legado mantém destinatário fixo em preview."
      } elseif ($legacyForceTestRecipient -eq "false") {
        Add-Result $file "preview-recipient-legacy" "FAIL" "Preview legado deve manter FORCE_TEST_RECIPIENT=true."
      } else {
        Add-Result $file "preview-recipient-default" "OK" "Recipient mode ausente: preview usa destino fixo no profile padrão."
      }
    } elseif ($recipientMode -ne "test_recipient") {
      Add-Result $file "preview-recipient-mode" "FAIL" "Preview deve usar WHATSAPP_AUTOMATION_RECIPIENT_MODE=test_recipient."
    }
  }

  if ($file -eq "vercel-development-required.env") {
    $profile = Get-NormalizedEnvValue -EnvMap $vars -Key "WHATSAPP_PROFILE"
    if ($profile -eq "") {
      $profile = Get-NormalizedEnvValue -EnvMap $vars -Key "WHATSAPP_AUTOMATION_PROFILE"
    }
    $recipientMode = Get-NormalizedEnvValue -EnvMap $vars -Key "WHATSAPP_AUTOMATION_RECIPIENT_MODE"
    $legacyGlobalEnabled = Get-NormalizedEnvValue -EnvMap $vars -Key "WHATSAPP_AUTOMATION_GLOBAL_ENABLED"
    $legacyForceDryRun = Get-NormalizedEnvValue -EnvMap $vars -Key "WHATSAPP_AUTOMATION_FORCE_DRY_RUN"
    $legacyForceTestRecipient = Get-NormalizedEnvValue -EnvMap $vars -Key "WHATSAPP_AUTOMATION_META_FORCE_TEST_RECIPIENT"

    if ($profile -eq "") {
      if ($legacyGlobalEnabled -eq "" -and $legacyForceDryRun -eq "") {
        Add-Result $file "dev-profile-default" "OK" "Profile ausente: runtime local padrão usa dev_sandbox."
      } else {
        Add-Result $file "dev-profile-legacy" "OK" "Pacote legado aceito (migração recomendada para profile-first)."
      }
    } elseif ($profile -ne "dev_sandbox") {
      Add-Result $file "dev-profile" "FAIL" "Development deve usar WHATSAPP_PROFILE=dev_sandbox."
    }

    if ($recipientMode -eq "") {
      if ($legacyForceTestRecipient -eq "true") {
        Add-Result $file "dev-recipient-legacy" "OK" "Pacote legado mantém destinatário fixo em development."
      } elseif ($legacyForceTestRecipient -eq "false") {
        Add-Result $file "dev-recipient-legacy" "FAIL" "Development legado deve manter FORCE_TEST_RECIPIENT=true."
      } else {
        Add-Result $file "dev-recipient-default" "OK" "Recipient mode ausente: development usa destino fixo no profile padrão."
      }
    } elseif ($recipientMode -ne "test_recipient") {
      Add-Result $file "dev-recipient-mode" "FAIL" "Development deve usar WHATSAPP_AUTOMATION_RECIPIENT_MODE=test_recipient."
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
