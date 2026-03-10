Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$repoRootPath = $repoRoot.Path

function Get-RelativePath {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FullPath
  )

  $baseUri = New-Object System.Uri(($repoRootPath.TrimEnd('\') + '\'))
  $targetUri = New-Object System.Uri((Resolve-Path -LiteralPath $FullPath).Path)
  $relativeUri = $baseUri.MakeRelativeUri($targetUri)
  return [System.Uri]::UnescapeDataString($relativeUri.ToString()).Replace('\', '/')
}

function Test-PathIgnored {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FullPath
  )

  $relative = Get-RelativePath -FullPath $FullPath
  $ignoredPrefixes = @(
    '.git/',
    'node_modules/',
    '.next/',
    '.turbo/',
    'dist/',
    'build/',
    '.pnpm-store/'
  )

  foreach ($prefix in $ignoredPrefixes) {
    if ($relative.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
      return $true
    }
  }

  return $false
}

function Get-AllAgentFiles {
  $all = Get-ChildItem -Path $repoRootPath -Recurse -Force -File |
    Where-Object {
      ($_.Name -eq 'AGENTS.md' -or $_.Name -eq 'AGENTS.override.md') -and
      -not (Test-PathIgnored -FullPath $_.FullName)
    }

  return $all
}

function Build-PrecedenceChain {
  param(
    [Parameter(Mandatory = $true)]
    [string]$OverrideFile
  )

  $rootAgentPath = Join-Path $repoRootPath 'AGENTS.md'
  $chain = @()
  if (Test-Path $rootAgentPath) {
    $chain += 'AGENTS.md'
  }

  $directory = Split-Path $OverrideFile -Parent
  if (-not $directory) {
    return $chain
  }

  $relativeDir = Get-RelativePath -FullPath $directory
  if ($relativeDir -eq '.') {
    return $chain
  }

  $segments = $relativeDir.Split('/')
  $currentPath = $repoRootPath
  foreach ($segment in $segments) {
    if (-not $segment) {
      continue
    }

    $currentPath = Join-Path $currentPath $segment
    $candidate = Join-Path $currentPath 'AGENTS.override.md'
    if (Test-Path $candidate) {
      $chain += (Get-RelativePath -FullPath $candidate)
    }
  }

  return $chain
}

$agentRoot = Join-Path $repoRootPath 'AGENTS.md'
if (-not (Test-Path $agentRoot)) {
  Write-Error 'Arquivo AGENTS.md da raiz nao encontrado.'
}

$allAgentFiles = Get-AllAgentFiles
$overrideFiles = $allAgentFiles | Where-Object { $_.Name -eq 'AGENTS.override.md' } | Sort-Object FullName

$errors = New-Object System.Collections.Generic.List[string]

foreach ($file in $overrideFiles) {
  $relative = Get-RelativePath -FullPath $file.FullName
  $content = Get-Content $file.FullName -Raw

  if (-not ($content -match '(?m)^# AGENTS\.override\.md')) {
    $errors.Add("$relative -> titulo padrao ausente (# AGENTS.override.md).")
  }

  if (-not ($content -match '(?m)^Escopo:\s+.+$')) {
    $errors.Add("$relative -> linha Escopo: ausente.")
  }

  $sections = [System.Text.RegularExpressions.Regex]::Matches($content, '(?m)^##\s+(.+)$') |
    ForEach-Object { $_.Groups[1].Value.Trim() }
  $hasPolicySection = $false
  foreach ($section in $sections) {
    if ($section -ne 'Objetivo' -and $section -ne 'Regra de maturidade (V1 final de producao)') {
      $hasPolicySection = $true
      break
    }
  }
  if (-not $hasPolicySection) {
    $errors.Add("$relative -> secao de regras/guardrails ausente.")
  }

  if (-not ($content -match '(?m)^##\s+Regra de maturidade \(V1 final de producao\)\s*$')) {
    $errors.Add("$relative -> secao de maturidade ausente.")
  }
}

$mapPath = Join-Path $repoRootPath 'docs/engineering/AGENTS_PRECEDENCE_MAP.md'
$mapDir = Split-Path $mapPath -Parent
if (-not (Test-Path $mapDir)) {
  New-Item -ItemType Directory -Path $mapDir | Out-Null
}

$mapLines = New-Object System.Collections.Generic.List[string]
$mapLines.Add('# AGENTS Precedence Map')
$mapLines.Add('')
$mapLines.Add('Status: active')
$mapLines.Add('Owner: engenharia de plataforma')
$mapLines.Add("Gerado em: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')")
$mapLines.Add('')
$mapLines.Add('## Como ler')
$mapLines.Add('')
$mapLines.Add('1. A cadeia mostra a ordem de heranca de regras para cada override local.')
$mapLines.Add('2. O ultimo item da cadeia e o arquivo de maior prioridade para aquele caminho.')
$mapLines.Add('')
$mapLines.Add('## Overrides locais e cadeia de precedencia')
$mapLines.Add('')

foreach ($file in $overrideFiles) {
  $relative = Get-RelativePath -FullPath $file.FullName
  $chain = Build-PrecedenceChain -OverrideFile $file.FullName
  $tick = [char]96
  $mapLines.Add("### $tick$relative$tick")
  $mapLines.Add('')
  $mapLines.Add('Cadeia:')
  $mapLines.Add('')
  $index = 1
  foreach ($item in $chain) {
    $mapLines.Add("$index. $tick$item$tick")
    $index += 1
  }
  $mapLines.Add('')
}

while ($mapLines.Count -gt 0 -and $mapLines[$mapLines.Count - 1] -eq '') {
  $mapLines.RemoveAt($mapLines.Count - 1)
}

Set-Content -Path $mapPath -Value ($mapLines -join "`r`n")

if ($errors.Count -gt 0) {
  Write-Host "[agents-check] Falhas encontradas: $($errors.Count)" -ForegroundColor Red
  $errors | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
  exit 1
}

Write-Host "[agents-check] OK. Overrides verificados: $($overrideFiles.Count)" -ForegroundColor Green
Write-Host "[agents-check] Mapa atualizado em docs/engineering/AGENTS_PRECEDENCE_MAP.md" -ForegroundColor Green
