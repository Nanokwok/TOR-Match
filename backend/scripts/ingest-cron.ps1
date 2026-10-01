# Runs the e-GP RSS ingest on a schedule and keeps a dated log.
#
# The feed only answers between 17:01 and 08:29 ICT, so the schedule below runs
# at 18:00 with a 07:00 retry — the retry catches announcements published after
# the evening run, and covers a night where the machine was asleep.
#
# Register both runs (once, from an elevated PowerShell):
#
#   $script = "$PWD\scripts\ingest-cron.ps1"
#   schtasks /create /tn "TORMatch ingest (evening)" /tr "powershell -NoProfile -ExecutionPolicy Bypass -File `"$script`"" /sc daily /st 18:00
#   schtasks /create /tn "TORMatch ingest (morning)" /tr "powershell -NoProfile -ExecutionPolicy Bypass -File `"$script`"" /sc daily /st 07:00
#
# Check them with `schtasks /query /tn "TORMatch ingest (evening)"`,
# remove with `schtasks /delete /tn "TORMatch ingest (evening)" /f`.

# Deliberately NOT "Stop": with 2>&1 below, PowerShell wraps each stderr line
# from a native command in a NativeCommandError, which under "Stop" aborts the
# script the moment the ingest logs its first warning — silently skipping every
# remaining announcement. The exit code is checked explicitly instead.
$ErrorActionPreference = "Continue"

# Resolve the backend directory from this script's own location, so the task
# works regardless of the working directory the scheduler starts it in.
$backend = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $backend "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$stamp = Get-Date -Format "yyyy-MM-dd"
$log = Join-Path $logDir "ingest-$stamp.log"
$startedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

Set-Location $backend
"=== ingest started $startedAt ===" | Tee-Object -FilePath $log -Append

# 2>&1 merges stderr so warnings and failures land in the same log.
& npx tsx src/scraper/run-rss-ingest.ts 2>&1 |
    ForEach-Object { "$_" } |
    Tee-Object -FilePath $log -Append
$exitCode = $LASTEXITCODE

$finishedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
"=== ingest finished $finishedAt (exit $exitCode) ===" | Tee-Object -FilePath $log -Append

# Keep a fortnight of logs; the scheduler would otherwise fill the disk slowly.
Get-ChildItem $logDir -Filter "ingest-*.log" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -Skip 14 |
    Remove-Item -Force -ErrorAction SilentlyContinue

exit $exitCode
