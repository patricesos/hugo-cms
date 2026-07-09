$ErrorActionPreference = 'Stop'

$root = Resolve-Path "$PSScriptRoot/.."
$hugoDir = "$root/dist/bin"
$hugoExe = 'hugo.exe'

function Resolve-RealPath
{
    param([string]$Path)

    # Si c'est un shim Scoop, le vrai chemin est dans le fichier .shim
    $shimFile = $Path -replace '\.exe$', '.shim'
    if (Test-Path $shimFile)
    {
        $content = Get-Content $shimFile -Raw
        if ($content -match 'path\s*=\s*"([^"]+)"')
        {
            $real = $matches[1]
            Write-Host "  (shim Scoop) -> $real" -ForegroundColor DarkGray
            return $real
        }
    }

    return $Path
}

# On résout hugo.exe dans le PATH (Get-Command suit la variable d'environnement)
$resolved = Get-Command $hugoExe -ErrorAction SilentlyContinue
if (-not $resolved)
{
    Write-Warning "hugo.exe introuvable dans le PATH. Installez Hugo ou verifiez votre PATH."
    exit 1
}

$source = $resolved.Source
$real = Resolve-RealPath -Path $source

New-Item -ItemType Directory -Path $hugoDir -Force | Out-Null
Copy-Item $real "$hugoDir/$hugoExe" -Force

Write-Host "Hugo copie depuis : $real" -ForegroundColor Green
Write-Host "         vers      : $hugoDir" -ForegroundColor Green

$version = & "$hugoDir/$hugoExe" version 2>&1
$firstLine = ($version -split "`n")[0]
Write-Host "Version : $firstLine" -ForegroundColor Green
