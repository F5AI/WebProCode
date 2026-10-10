# F5 App Kit - shared helpers for the fix-history hooks ("hop den").
# Windows PowerShell 5.1 compatible. ASCII-only source on purpose (no BOM needed).
# Every hook must never break Claude Code: errors are swallowed, exit code is always 0.
$ErrorActionPreference = "SilentlyContinue"
$script:Utf8 = New-Object System.Text.UTF8Encoding($false)
try { [Console]::OutputEncoding = $script:Utf8 } catch {}

# Project root = folder holding .claude\hooks\f5kit (or CLAUDE_PROJECT_DIR when set).
function F5-Root {
  if ($env:CLAUDE_PROJECT_DIR) { return $env:CLAUDE_PROJECT_DIR }
  return (Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)))
}

# Raw evidence always lands in the MAIN project folder, even when Claude works in a
# worktree under .claude\worktrees\<name> (worktrees get deleted; evidence must not).
function F5-DataRoot {
  $r = F5-Root
  if ($r -match '^(.*?)[\\/]\.claude[\\/]worktrees[\\/][^\\/]+[\\/]?$') { return $Matches[1] }
  return $r
}

function F5-Dir {
  $d = Join-Path (F5-DataRoot) ".f5kit"
  if (-not (Test-Path $d)) { New-Item -ItemType Directory -Force -Path $d | Out-Null }
  return $d
}

function F5-ReadStdin {
  try { [Console]::InputEncoding = $script:Utf8 } catch {}
  try {
    $s = [Console]::In.ReadToEnd()
    if ($s) { $s = $s.TrimStart([char]0xFEFF) }
    return $s
  } catch { return "" }
}

function F5-Json([string]$raw) {
  if (-not $raw) { return $null }
  try { return ($raw | ConvertFrom-Json) } catch { return $null }
}

function F5-Append([string]$path, [string]$text) { [System.IO.File]::AppendAllText($path, $text, $script:Utf8) }
function F5-Write([string]$path, [string]$text) { [System.IO.File]::WriteAllText($path, $text, $script:Utf8) }

function F5-SafeName([string]$s) {
  if (-not $s) { return "unknown" }
  return ($s -replace '[^A-Za-z0-9_-]', '_')
}

# Lowercase + strip Vietnamese diacritics so "s\u1eeda", "sua", "S\u1eeca" all fold to "sua".
function F5-Fold([string]$s) {
  if (-not $s) { return "" }
  $s = $s.Replace([string][char]0x0111, 'd').Replace([string][char]0x0110, 'D')
  $n = $s.Normalize([System.Text.NormalizationForm]::FormD)
  $sb = New-Object System.Text.StringBuilder
  foreach ($c in $n.ToCharArray()) {
    if ([System.Globalization.CharUnicodeInfo]::GetUnicodeCategory($c) -ne [System.Globalization.UnicodeCategory]::NonSpacingMark) { [void]$sb.Append($c) }
  }
  return $sb.ToString().ToLowerInvariant()
}

# A prompt whose first token is a known slash command: a skill folder under ~\.claude\skills or .claude\skills of the
# project, or a Claude Code built-in. A path-like "/videos ..." is not one and stays eligible for the correction check.
$script:F5Builtins = @('clear','compact','help','config','cost','doctor','init','memory','model','permissions','review','status',
  'login','logout','bug','agents','hooks','mcp','plan','resume','export','fast','loop','code-review','ultrareview','simplify',
  'security-review','schedule','run','init','skill-doctor','fix-review','setup-tracking')
function F5-IsSlashCommand([string]$text) {
  if (-not $text) { return $false }
  $t = $text.TrimStart()
  if (-not $t.StartsWith('/')) { return $false }
  $first = ($t -split '\s+')[0].Substring(1).ToLowerInvariant()
  if (-not $first -or $first -match '[^a-z0-9_:.-]') { return $false }
  if ($script:F5Builtins -contains $first) { return $true }
  $name = ($first -split ':')[-1]
  foreach ($dir in @((Join-Path $env:USERPROFILE ".claude\skills"), (Join-Path (F5-Root) ".claude\skills"))) {
    if (Test-Path (Join-Path $dir $name)) { return $true }
  }
  return $false
}

# Does this message look like a correction / change request?
# Tuned for false positives over misses: the Stop hook lets Claude dismiss a false alarm in one line.
function F5-IsCorrection([string]$text) {
  if (F5-IsSlashCommand $text) { return $false }   # "/fix-review", "/clear" are commands, "/videos bi loi 500" is a bug report
  $f = F5-Fold $text
  if (-not $f) { return $false }
  $pat = @(
    '\bsai\b', '\bsua\b', '\bdoi lai\b', '\bchinh lai\b', '\blam lai\b', '\bnham\b',
    '(?<!tra )(?<!cau )\bloi\b(?! (thoai|nhan|khuyen|giai|noi|ich|chao|hua|moi|dan|ke))',
    '\bkhong (dung|chay|hoat dong|thay|hien|duoc|on|load|mo duoc|bam duoc)\b',
    '\bchua (dung|chay|hoat dong|thay|hien|duoc|on|load)\b',
    '\bvan (con|bi|chua|khong|the|vay)\b',
    '\bbi (mat|treo|do|cat|tran|che|lech|vo|hong)\b', '\bhong (roi|het|mat)\b',
    '\bmat (het|roi)\b', '\bkhong nhu (y|mong|toi muon)\b', '\bkhong phai (the|vay|cai)\b',
    '\bwrong\b', '\bbroken\b', '\bbug\b', '\bfix\b', '\berror\b', "\bdoesn'?t work\b", '\bnot working\b'
  ) -join '|'
  return [regex]::IsMatch($f, $pat)
}
