# UserPromptSubmit: save Bruce's message verbatim to .f5kit\prompts.jsonl (the "take sheet").
# If it looks like a correction, flag it so the Stop hook can make sure Claude logs it in docs\FIX_LOG.md.
. (Join-Path $PSScriptRoot "common.ps1")
try {
  $j = F5-Json (F5-ReadStdin)
  if (-not $j) { exit 0 }
  $prompt = [string]$j.prompt
  $sid = [string]$j.session_id
  $dir = F5-Dir
  $flag = F5-IsCorrection $prompt
  $rec = [ordered]@{
    ts = (Get-Date).ToString("o")
    session = $sid
    project = (F5-Root)
    correction = $flag
    prompt = $prompt
  }
  F5-Append (Join-Path $dir "prompts.jsonl") (($rec | ConvertTo-Json -Compress -Depth 4) + "`n")

  if ($flag) {
    $pend = [ordered]@{ t = (Get-Date).ToFileTimeUtc(); ts = (Get-Date).ToString("o"); session = $sid; prompt = $prompt }
    F5-Write (Join-Path $dir ("pending_" + (F5-SafeName $sid) + ".json")) ($pend | ConvertTo-Json -Compress -Depth 4)
    Write-Output "[F5 kit] Bruce's message looks like a correction or change request. Before you end this turn, record it in docs/FIX_LOG.md following the format at the top of that file: open a new entry, or add a take to the open entry it belongs to (same problem reported again = new take, not new entry). Quote his words verbatim. If it is NOT a correction or change request, append one line to .f5kit/not_fix.log instead (time + why)."
  }
} catch {}
exit 0
