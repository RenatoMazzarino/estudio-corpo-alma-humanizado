Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$preferredPathEntries = @(
  "C:\Program Files\GitHub CLI",
  (Join-Path $env:LOCALAPPDATA "Programs\Python\Python312"),
  (Join-Path $env:LOCALAPPDATA "Programs\Python\Python312\Scripts"),
  (Join-Path $env:APPDATA "npm")
)
foreach ($entry in $preferredPathEntries) {
  if ((Test-Path $entry) -and (($env:Path -split ";") -notcontains $entry)) {
    $env:Path = "$entry;$env:Path"
  }
}

$credentialQuery = @"
protocol=https
host=github.com

"@

$credentialRaw = $credentialQuery | git credential-manager get 2>$null
if (-not $credentialRaw) {
  throw "Nao foi possivel ler credenciais do Git Credential Manager para github.com."
}

$tokenLine = ($credentialRaw -split "`r?`n" | Where-Object { $_ -like "password=*" } | Select-Object -First 1)
if (-not $tokenLine) {
  throw "Token do GitHub nao encontrado no Git Credential Manager."
}

$token = $tokenLine.Substring(9).Trim()
if (-not $token) {
  throw "Token do GitHub vazio no Git Credential Manager."
}

$env:GH_TOKEN = $token
Write-Output "GH_TOKEN carregado para esta sessao PowerShell."
