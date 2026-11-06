param([ValidateRange(0,65535)][int]$Port = 0)
$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path -LiteralPath (Split-Path -Parent $PSScriptRoot)).Path
$recordsRoot = Join-Path $repoRoot '.vite\dev-services'
function Command-Hash([string]$value) {
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try { return ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($value)))).Replace('-','').ToLowerInvariant() }
    finally { $sha.Dispose() }
}
try {
    $listeners = @(Get-NetTCPConnection -State Listen -ErrorAction Stop)
    $nodes = @(Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction Stop)
    $targets = if ($Port) { @($listeners | Where-Object LocalPort -eq $Port | Select-Object -ExpandProperty OwningProcess -Unique) }
    else {
        $registeredIds = @(Get-ChildItem -LiteralPath $recordsRoot -Filter '*.json' -ErrorAction SilentlyContinue | ForEach-Object { [int]$_.BaseName })
        @($nodes | Where-Object { $_.ProcessId -in $registeredIds -or ($_.CommandLine -and $_.CommandLine.IndexOf($repoRoot, [StringComparison]::OrdinalIgnoreCase) -ge 0 -and $_.CommandLine -match '[\\/]vite[\\/]bin[\\/]vite\.js') } | Select-Object -ExpandProperty ProcessId)
    }
    if (!$targets.Count) { Write-Output 'No matching listening Vite service. Nothing to stop.'; exit 0 }
    $refused = $false
    foreach ($targetId in $targets) {
        $ports = @($listeners | Where-Object OwningProcess -eq $targetId | Select-Object -ExpandProperty LocalPort -Unique)
        $label = "PID $targetId / ports $($ports -join ',')"
        $process = $null
        try {
            $recordPath = Join-Path $recordsRoot "$targetId.json"
            if (!(Test-Path -LiteralPath $recordPath)) { throw 'No ownership record from this checkout. Restart the service with the updated Vite config to register it.' }
            $record = Get-Content -LiteralPath $recordPath -Raw -Encoding UTF8 | ConvertFrom-Json
            if ($record.root -cne $repoRoot -or $record.pid -ne $targetId -or $record.mode -notin @('dev','preview')) { throw 'Repository or process identity mismatch.' }
            if ($ports -notcontains [int]$record.port -or ($Port -and $record.port -ne $Port)) { throw 'Recorded listener does not match the selected port.' }
            $current = Get-CimInstance Win32_Process -Filter "ProcessId = $targetId"
            $process = Get-Process -Id $targetId
            # Explicitly retain the handle before checking identity. Kill uses it,
            # rather than a later blind lookup of a potentially reused PID.
            $null = $process.Handle
            if ($process.ProcessName -ne 'node' -or $process.StartTime.ToUniversalTime().Ticks.ToString() -ne $record.ticks) { throw 'Process start time changed or is not Node.' }
            if ((Command-Hash $current.CommandLine) -cne $record.commandHash) { throw 'Command identity changed.' }
            $process.Kill()
            if (!$process.WaitForExit(5000)) { throw 'Process did not exit within five seconds.' }
            Remove-Item -LiteralPath $recordPath
            Write-Output "Stopped verified $($record.mode) service: $label"
        } catch {
            $refused = $true
            Write-Output "REFUSED $label : $($_.Exception.Message)"
        } finally { if ($process) { $process.Dispose() } }
    }
    if ($refused) { exit 1 }
} catch { Write-Error "Unable to verify service ownership: $($_.Exception.Message). No unverified process was stopped."; exit 1 }
