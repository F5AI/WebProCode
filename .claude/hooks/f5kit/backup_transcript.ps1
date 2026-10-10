# PreCompact / SessionEnd: copy the full session transcript into .f5kit\transcripts\ BEFORE
# Claude compresses it (compaction loses the detail) and before Claude Code's 30-day cleanup.
. (Join-Path $PSScriptRoot "common.ps1")
try {
  $j = F5-Json (F5-ReadStdin)
  if (-not $j) { exit 0 }
  $src = [string]$j.transcript_path
  if (-not $src -or -not (Test-Path $src)) { exit 0 }
  $dst = Join-Path (F5-Dir) "transcripts"
  if (-not (Test-Path $dst)) { New-Item -ItemType Directory -Force -Path $dst | Out-Null }
  Copy-Item -Force -LiteralPath $src -Destination (Join-Path $dst (Split-Path -Leaf $src))
  $ev = "" ; if ($j.hook_event_name) { $ev = [string]$j.hook_event_name }
  $rec = [ordered]@{ ts = (Get-Date).ToString("o"); event = $ev; session = [string]$j.session_id; file = (Split-Path -Leaf $src) }
  F5-Append (Join-Path (F5-Dir) "backups.jsonl") (($rec | ConvertTo-Json -Compress) + "`n")
} catch {}
exit 0
