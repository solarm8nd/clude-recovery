$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
node .\agent.js @args
