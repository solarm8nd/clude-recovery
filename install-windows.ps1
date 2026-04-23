$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$bin = Join-Path $env:USERPROFILE 'bin'
New-Item -ItemType Directory -Force $bin | Out-Null
$cmd = Join-Path $bin 'clude.cmd'
$ps1 = Join-Path $bin 'clude.ps1'
@"
@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "$root\clude.ps1" %*
"@ | Set-Content $cmd -Encoding ASCII
@"
& "$root\clude.ps1" @args
"@ | Set-Content $ps1 -Encoding UTF8
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if (($userPath -split ';') -notcontains $bin) {
  $newPath = if ([string]::IsNullOrWhiteSpace($userPath)) { $bin } else { ($userPath.TrimEnd(';') + ';' + $bin) }
  [Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
}
Write-Host "Installed clude launcher to $cmd"
Write-Host 'Open a new PowerShell window, then run: clude'
