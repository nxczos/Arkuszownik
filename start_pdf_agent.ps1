$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

Get-NetTCPConnection -LocalPort 8765 -ErrorAction SilentlyContinue |
  Where-Object { $_.State -eq "Listen" } |
  ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
  }

Get-ChildItem -Path $root -Recurse -Directory -Filter "__pycache__" -ErrorAction SilentlyContinue |
  ForEach-Object {
    Remove-Item -LiteralPath $_.FullName -Recurse -Force
  }

$env:PYTHONDONTWRITEBYTECODE = "1"
python -B pdf_agent\server.py
