param(
  [string]$WebRepoPath = "C:\Users\renat\Projetos_Dev\estudio-corpo-alma-humanizado",
  [string]$AppRepoPath = "C:\Users\renat\Projetos_Dev\estudio-platform"
)

$ErrorActionPreference = "Stop"

function Sync-HardlinkFile {
  param(
    [string]$SourcePath,
    [string]$TargetPath
  )

  if (-not (Test-Path $SourcePath)) {
    throw "Arquivo fonte nao encontrado: $SourcePath"
  }

  $targetDir = Split-Path -Path $TargetPath -Parent
  if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
  }

  New-Item -ItemType HardLink -Force -Path $TargetPath -Target $SourcePath | Out-Null
}

$files = @(
  "docs\plans\PLANO_REESCRITA_REPO_ANDROID_NATIVO_2026-03-20.md",
  "docs\plans\ANEXO_PADRONIZACAO_HIGIENE_ERROS_LOADING_REESCRITA_2026-03-20.md"
)

foreach ($relativeFile in $files) {
  $source = Join-Path $WebRepoPath $relativeFile
  $target = Join-Path $AppRepoPath $relativeFile
  Sync-HardlinkFile -SourcePath $source -TargetPath $target
}

Write-Host "Hardlinks web->app atualizados com sucesso."
