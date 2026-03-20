param(
  [string]$TunnelScriptPath = "C:\Users\renat\Projetos_Dev\estudio-platform\scripts\db\start-aurora-ssm-tunnel.ps1",
  [int]$RetryDelaySeconds = 2,
  [int]$HealthcheckDelaySeconds = 5,
  [int]$LocalPort = 15432
)

$ErrorActionPreference = "Continue"

if (-not (Test-Path $TunnelScriptPath)) {
  throw "Script de tunel nao encontrado: $TunnelScriptPath"
}

function Test-LocalPortOpen {
  param([int]$Port)

  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $iar = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
    $ok = $iar.AsyncWaitHandle.WaitOne(1000, $false)
    return ($ok -and $client.Connected)
  } catch {
    return $false
  } finally {
    try { $client.Close() } catch {}
  }
}

Write-Host "Aurora keepalive iniciado."
Write-Host "Script base: $TunnelScriptPath"
Write-Host "Retry delay: ${RetryDelaySeconds}s"
Write-Host "Healthcheck delay: ${HealthcheckDelaySeconds}s"
Write-Host "Porta local: $LocalPort"

while ($true) {
  if (Test-LocalPortOpen -Port $LocalPort) {
    Start-Sleep -Seconds $HealthcheckDelaySeconds
    continue
  }

  try {
    & $TunnelScriptPath
  } catch {
    Write-Host "Falha no tunel: $($_.Exception.Message)"
  }

  Start-Sleep -Seconds $RetryDelaySeconds
}
