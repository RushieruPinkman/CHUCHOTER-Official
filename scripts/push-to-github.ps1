# GitHub に初回 push する手順（PowerShell）

$ErrorActionPreference = "Stop"
$git = "C:\Program Files\Git\bin\git.exe"
$gh = "C:\Program Files\GitHub CLI\gh.exe"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Set-Location $root

Write-Host "=== 1. GitHub ログイン ===" -ForegroundColor Cyan
& $gh auth login

Write-Host "`n=== 2. リポジトリ作成 & push ===" -ForegroundColor Cyan
$repoName = Read-Host "GitHub リポジトリ名 (例: chuchoter-site)"
$visibility = Read-Host "公開設定 [private/public] (Enter=private)"
if ([string]::IsNullOrWhiteSpace($visibility)) { $visibility = "private" }

& $gh repo create $repoName --$visibility --source=. --remote=origin --push

Write-Host "`n完了。ブラウザでリポジトリを開きます..." -ForegroundColor Green
& $gh repo view --web
