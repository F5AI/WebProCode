# SessionStart: (1) archive every transcript of this project that Claude Code still keeps
# (copies only new or grown files), (2) remind Claude of open FIX_LOG entries so takes keep counting.
. (Join-Path $PSScriptRoot "common.ps1")
try {
  $j = F5-Json (F5-ReadStdin)
  $dir = F5-Dir

  # (1) archive old transcripts of this project folder
  if ($j -and $j.transcript_path) {
    $srcDir = Split-Path -Parent ([string]$j.transcript_path)
    if ($srcDir -and (Test-Path $srcDir)) {
      $dst = Join-Path $dir "transcripts"
      if (-not (Test-Path $dst)) { New-Item -ItemType Directory -Force -Path $dst | Out-Null }
      foreach ($f in (Get-ChildItem -LiteralPath $srcDir -Filter "*.jsonl" -File)) {
        $t = Join-Path $dst $f.Name
        $copy = $true
        if (Test-Path $t) { if ((Get-Item $t).Length -ge $f.Length) { $copy = $false } }
        if ($copy) { Copy-Item -Force -LiteralPath $f.FullName -Destination $t }
      }
    }
  }

  # (2) open entries
  $log = Join-Path (F5-Root) "docs\FIX_LOG.md"
  if (Test-Path $log) {
    $lines = [System.IO.File]::ReadAllLines($log, $script:Utf8)
    $open = @(); $cur = ""; $fence = $false
    foreach ($l in $lines) {
      if ($l -match '^\s*```') { $fence = -not $fence; continue }
      if ($fence) { continue }
      if ($l -match '^##\s+([A-Z]{2,4}-\d+)\s*(.*)$') { $cur = ($Matches[1] + " " + $Matches[2]).Trim() }
      elseif ($cur -and $l -match 'status:\s*(open|testing)') { $open += $cur; $cur = "" }
    }
    if ($open.Count -gt 0) {
      Write-Output ("[F5 kit] Open entries in docs/FIX_LOG.md (if Bruce reports one of these again, add a take there): " + (($open | Select-Object -First 8) -join " | "))
    }
  }
  Write-Output "[F5 kit] Fix history is on: log every correction from Bruce in docs/FIX_LOG.md; walk docs/PREFLIGHT.md before building a feature."
} catch {}
exit 0
