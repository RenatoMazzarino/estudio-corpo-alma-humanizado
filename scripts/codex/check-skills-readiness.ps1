Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$codexHome = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME ".codex" }
$skillsRoot = Join-Path $codexHome "skills"
$repoSkillsRoot = Join-Path $projectRoot ".agents\skills"
$codexConfig = Join-Path $codexHome "config.toml"
$loadGhTokenScript = Join-Path $PSScriptRoot "load-gh-token.ps1"
$quickValidateScript = Join-Path $skillsRoot ".system\skill-creator\scripts\quick_validate.py"

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

$results = New-Object System.Collections.Generic.List[object]

function Add-Result {
  param(
    [string]$Name,
    [string]$Status,
    [string]$Details
  )

  $results.Add([pscustomobject]@{
      Check   = $Name
      Status  = $Status
      Details = $Details
    })
}

function Test-CommandAvailable {
  param([string]$Name)
  $cmd = Get-Command $Name -ErrorAction SilentlyContinue
  return $null -ne $cmd
}

function Convert-ToWslPath {
  param([string]$WindowsPath)
  $normalized = $WindowsPath -replace "\\", "/"
  if ($normalized -match "^([A-Za-z]):/(.*)$") {
    $drive = $matches[1].ToLower()
    $rest = $matches[2]
    return "/mnt/$drive/$rest"
  }
  return $normalized
}

Add-Result "Node.js" ($(if (Test-CommandAvailable node) { "OK" } else { "FAIL" })) ($(if (Test-CommandAvailable node) { (node --version) } else { "node nao encontrado" }))
Add-Result "pnpm" ($(if (Test-CommandAvailable pnpm) { "OK" } else { "FAIL" })) ($(if (Test-CommandAvailable pnpm) { (pnpm --version) } else { "pnpm nao encontrado" }))
Add-Result "Python" ($(if (Test-CommandAvailable python) { "OK" } else { "FAIL" })) ($(if (Test-CommandAvailable python) { (python --version) } else { "python nao encontrado no PATH" }))
Add-Result "GitHub CLI (gh)" ($(if (Test-CommandAvailable gh) { "OK" } else { "FAIL" })) ($(if (Test-CommandAvailable gh) { ((gh --version | Select-Object -First 1) -join "") } else { "gh nao encontrado no PATH" }))
Add-Result "Bash" ($(if (Test-CommandAvailable bash) { "OK" } else { "FAIL" })) ($(if (Test-CommandAvailable bash) { ((bash --version | Select-Object -First 1) -join "") } else { "bash nao encontrado no PATH" }))

$expectedSkills = @(
  @{ Name = "GitHub Address Comments"; Path = "gh-address-comments\SKILL.md" },
  @{ Name = "GitHub Fix CI"; Path = "gh-fix-ci\SKILL.md" },
  @{ Name = "Playwright CLI Skill"; Path = "playwright\SKILL.md" },
  @{ Name = "Playwright Interactive"; Path = "playwright-interactive\SKILL.md" },
  @{ Name = "Screenshot Capture"; Path = "screenshot\SKILL.md" },
  @{ Name = "Security Best Practices"; Path = "security-best-practices\SKILL.md" },
  @{ Name = "Security Threat Model"; Path = "security-threat-model\SKILL.md" },
  @{ Name = "Skill Creator"; Path = ".system\skill-creator\SKILL.md" },
  @{ Name = "Skill Installer"; Path = ".system\skill-installer\SKILL.md" },
  @{ Name = "Vercel Deploy"; Path = "vercel-deploy\SKILL.md" },
  @{ Name = "Yeet"; Path = "yeet\SKILL.md" }
)

foreach ($skill in $expectedSkills) {
  $fullPath = Join-Path $skillsRoot $skill.Path
  Add-Result "Skill: $($skill.Name)" ($(if (Test-Path $fullPath) { "OK" } else { "FAIL" })) $fullPath
}

if (Test-Path $repoSkillsRoot) {
  Add-Result "Repo skills root (.agents/skills)" "OK" $repoSkillsRoot
  $repoSkillDirs = @(Get-ChildItem $repoSkillsRoot -Directory)
  if ($repoSkillDirs.Count -eq 0) {
    Add-Result "Repo skill folders" "FAIL" "Nenhuma skill encontrada em .agents/skills"
  }
  foreach ($repoSkill in $repoSkillDirs) {
    $repoSkillMd = Join-Path $repoSkill.FullName "SKILL.md"
    $repoOpenAIYaml = Join-Path $repoSkill.FullName "agents\openai.yaml"

    Add-Result "Repo skill: $($repoSkill.Name) SKILL.md" ($(if (Test-Path $repoSkillMd) { "OK" } else { "FAIL" })) $repoSkillMd
    Add-Result "Repo skill: $($repoSkill.Name) agents/openai.yaml" ($(if (Test-Path $repoOpenAIYaml) { "OK" } else { "OK" })) ($(if (Test-Path $repoOpenAIYaml) { $repoOpenAIYaml } else { "Ausente (opcional, recomendado)" }))

    if (Test-Path $repoSkillMd) {
      if ((Test-Path $quickValidateScript) -and (Test-CommandAvailable python)) {
        try {
          & python $quickValidateScript $repoSkill.FullName | Out-Null
          Add-Result "Repo skill: $($repoSkill.Name) validated" "OK" "quick_validate.py"
        }
        catch {
          Add-Result "Repo skill: $($repoSkill.Name) validated" "FAIL" "quick_validate.py retornou erro"
        }
      }
      else {
        Add-Result "Repo skill: $($repoSkill.Name) validated" "FAIL" "quick_validate.py ou python indisponivel"
      }
    }
  }
}
else {
  Add-Result "Repo skills root (.agents/skills)" "FAIL" "Diretorio nao encontrado em $repoSkillsRoot"
}

try {
  Push-Location $projectRoot
  $vercelVersion = pnpm exec vercel --version
  Add-Result "Vercel CLI (workspace)" "OK" (($vercelVersion | Select-Object -First 1) -join "")
}
catch {
  Add-Result "Vercel CLI (workspace)" "FAIL" "pnpm exec vercel --version falhou"
}
finally {
  Pop-Location
}

if (Test-Path $loadGhTokenScript) {
  try {
    & $loadGhTokenScript | Out-Null
    $ghStatusLines = gh auth status 2>&1
    $statusText = ($ghStatusLines -join "`n")
    if ($statusText -match "Logged in to github.com") {
      if ($statusText -match "Missing required token scopes: 'read:org'") {
        Add-Result "GitHub auth para skills" "OK" "Autenticado por GH_TOKEN (faltando read:org, pode limitar cenarios de org)"
      }
      else {
        Add-Result "GitHub auth para skills" "OK" "Autenticado no github.com"
      }
    }
    else {
      Add-Result "GitHub auth para skills" "FAIL" "gh auth status nao confirmou autenticacao"
    }
  }
  catch {
    Add-Result "GitHub auth para skills" "FAIL" "Nao foi possivel carregar GH_TOKEN do credential manager"
  }
}
else {
  Add-Result "GitHub auth para skills" "FAIL" "Script load-gh-token.ps1 nao encontrado"
}

if (Test-Path $codexConfig) {
  $configText = Get-Content -Raw $codexConfig
  if ($configText -match "(?ms)\[features\].*?js_repl\s*=\s*true") {
    Add-Result "Playwright Interactive (js_repl)" "OK" "js_repl = true no config.toml"
  }
  else {
    Add-Result "Playwright Interactive (js_repl)" "FAIL" "js_repl = true ausente no config.toml"
  }

  Add-Result "MCP Vercel configurado" ($(if ($configText -match "(?m)^\[mcp_servers\.vercel\]") { "OK" } else { "FAIL" })) "config.toml"
  Add-Result "MCP Playwright configurado" ($(if ($configText -match "(?m)^\[mcp_servers\.playwright\]") { "OK" } else { "FAIL" })) "config.toml"
}
else {
  Add-Result "Config Codex" "FAIL" "config.toml nao encontrado em $codexConfig"
}

$playwrightCliScript = Join-Path $skillsRoot "playwright\scripts\playwright_cli.sh"
if ((Test-Path $playwrightCliScript) -and (Test-CommandAvailable bash)) {
  $playwrightCliWsl = Convert-ToWslPath -WindowsPath $playwrightCliScript
  try {
    bash -lc "bash '$playwrightCliWsl' --help >/dev/null"
    Add-Result "Playwright CLI wrapper" "OK" "playwright_cli.sh responde --help"
  }
  catch {
    Add-Result "Playwright CLI wrapper" "FAIL" "playwright_cli.sh falhou em --help"
  }
}
else {
  Add-Result "Playwright CLI wrapper" "FAIL" "playwright_cli.sh ou bash ausente"
}

try {
  Push-Location $projectRoot
  $pwVersion = pnpm --filter web exec playwright --version
  Add-Result "Playwright package (apps/web)" "OK" (($pwVersion | Select-Object -First 1) -join "")
}
catch {
  Add-Result "Playwright package (apps/web)" "FAIL" "pnpm --filter web exec playwright --version falhou"
}
finally {
  Pop-Location
}

$installedSkills = @()
if (Test-Path $skillsRoot) {
  $installedSkills = @(Get-ChildItem -Name $skillsRoot)
}
$repoInstalledSkills = @()
if (Test-Path $repoSkillsRoot) {
  $repoInstalledSkills = @(Get-ChildItem -Name $repoSkillsRoot)
}

Write-Output ""
Write-Output "Installed skills in ${skillsRoot}:"
if ($installedSkills.Count -gt 0) {
  $installedSkills | Sort-Object | ForEach-Object { Write-Output " - $_" }
}
else {
  Write-Output " - (nenhum encontrado)"
}

Write-Output ""
Write-Output "Repo skills in ${repoSkillsRoot}:"
if ($repoInstalledSkills.Count -gt 0) {
  $repoInstalledSkills | Sort-Object | ForEach-Object { Write-Output " - $_" }
}
else {
  Write-Output " - (nenhum encontrado)"
}

Write-Output ""
Write-Output "Skill readiness checks:"
$results | Format-Table -AutoSize

$hasFail = $results | Where-Object { $_.Status -eq "FAIL" }
if ($hasFail) {
  exit 1
}

exit 0
