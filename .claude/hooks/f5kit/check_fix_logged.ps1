# Stop: two poka-yokes.
# 1) If Bruce flagged a correction this session and Claude has not touched docs\FIX_LOG.md (or .f5kit\not_fix.log)
#    since, block the stop ONCE and ask Claude to log it. Second stop in a row (stop_hook_active) always passes,
#    and the miss is recorded for /fix-review.
# 2) R-11 (fix-review ky 2, 2026-10-10): if docs\FIX_LOG.md was edited in the last 30 minutes and holds a `closed`
#    entry without a `Khoa:` line (lock test, or "khong khoa duoc vi ..."), block ONCE and name the entries.
. (Join-Path $PSScriptRoot "common.ps1")

function F5-ClosedWithoutLock {
  $out = @()
  try {
    $fl = Join-Path (F5-Root) "docs\FIX_LOG.md"
    if (-not (Test-Path $fl)) { return $out }
    $age = ((Get-Date).ToUniversalTime() - (Get-Item $fl).LastWriteTimeUtc).TotalMinutes
    if ($age -gt 30) { return $out }
    $txt = [System.IO.File]::ReadAllText($fl, $script:Utf8)
    foreach ($b in ($txt -split "(?m)^## ")) {
      if ($b -match '^([A-Z]+-\d+) ') {
        $id = $Matches[1]
        # only the 6 error types need a lock test; feature / changed-mind / advice entries do not
        $closed = $b -match '(?m)^- date:.*type: (spec-gap|misread|code-bug|fact|env|process) .*status: closed'
        $lock = $b -match '(?m)^- Kh\S{1,2}a:'
        if ($closed -and -not $lock) { $out += $id }
      }
    }
  } catch {}
  return $out
}

try {
  $j = F5-Json (F5-ReadStdin)
  $sid = ""; if ($j) { $sid = [string]$j.session_id }
  $active = $false; if ($j -and $j.stop_hook_active) { $active = $true }
  $dir = F5-Dir
  $p = Join-Path $dir ("pending_" + (F5-SafeName $sid) + ".json")

  if (Test-Path $p) {
    $pend = F5-Json ([System.IO.File]::ReadAllText($p, $script:Utf8))
    $flagT = [long]0; if ($pend -and $pend.t) { $flagT = [long]$pend.t }
    $logged = $false
    foreach ($f in @((Join-Path (F5-Root) "docs\FIX_LOG.md"), (Join-Path (F5-DataRoot) "docs\FIX_LOG.md"), (Join-Path $dir "not_fix.log"))) {
      if (Test-Path $f) {
        if ((Get-Item $f).LastWriteTimeUtc.ToFileTimeUtc() -gt $flagT) { $logged = $true }
      }
    }
    if ($logged) {
      Remove-Item -Force $p
    } elseif ($active) {
      $miss = [ordered]@{ ts = (Get-Date).ToString("o"); session = $sid; prompt = $(if ($pend) { [string]$pend.prompt } else { "" }) }
      F5-Append (Join-Path $dir "missed.jsonl") (($miss | ConvertTo-Json -Compress -Depth 4) + "`n")
      Remove-Item -Force $p
    } else {
      $reason = "[F5 kit] Bruce reported a problem or asked for a change this turn, but docs/FIX_LOG.md was not updated. Log it now (new entry or new take, his words verbatim, type, what you changed). If it was not a correction, append one line to .f5kit/not_fix.log. Then stop."
      Write-Output ((@{ decision = "block"; reason = $reason }) | ConvertTo-Json -Compress)
      exit 0
    }
  }

  if (-not $active) {
    $ids = @(F5-ClosedWithoutLock)
    if ($ids.Count -gt 0) {
      $list = ($ids | Select-Object -First 8) -join ", "
      $reason = "[F5 kit] R-11: FIX_LOG entries marked closed without a lock-test line: " + $list + ". Add '- Khoa: <test that fails without the fix>' or '- Khoa: khong khoa duoc vi ...' to each, or set status back to testing. Then stop."
      Write-Output ((@{ decision = "block"; reason = $reason }) | ConvertTo-Json -Compress)
    }
  }
} catch {}
exit 0
