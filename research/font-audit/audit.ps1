param([string]$Out = "$env:TEMP\mohawk\audit")
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force $Out | Out-Null
$edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
Get-CimInstance Win32_Process -Filter "name='msedge.exe'" | ? { $_.CommandLine -like "*mohawk\profile*" } | % { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }; Start-Sleep 1; $prof = "$env:TEMP\mohawk\profile"; Remove-Item -Recurse -Force $prof -ErrorAction SilentlyContinue; Remove-Item "$Out\log.txt" -ErrorAction SilentlyContinue
$port = 9333
$p = Start-Process $edge -ArgumentList "--headless=new","--remote-debugging-port=$port","--user-data-dir=$prof","--window-size=1440,1000","--disable-gpu","--no-first-run","--hide-scrollbars","about:blank" -PassThru
Start-Sleep 3
$targets = Invoke-RestMethod "http://127.0.0.1:$port/json/list"
$ws = (Invoke-RestMethod -Method Put "http://127.0.0.1:$port/json/new?about:blank").webSocketDebuggerUrl; Add-Content "$Out\log.txt" "ws $ws"
$sock = New-Object System.Net.WebSockets.ClientWebSocket
$sock.Options.KeepAliveInterval = [TimeSpan]::FromSeconds(30)
$sock.ConnectAsync([Uri]$ws, [Threading.CancellationToken]::None).Wait()
$script:id = 0
function Send($method, $params = @{}) {
  $script:id++; Add-Content "$Out\log.txt" ("{0} send {1} {2}" -f (Get-Date -f HH:mm:ss), $script:id, $method)
  $msg = @{ id = $script:id; method = $method; params = $params } | ConvertTo-Json -Depth 10 -Compress
  $bytes = [Text.Encoding]::UTF8.GetBytes($msg)
  $sock.SendAsync([ArraySegment[byte]]$bytes, 'Text', $true, [Threading.CancellationToken]::None).Wait()
  $buf = New-Object byte[] 1048576
  $sw=[Diagnostics.Stopwatch]::StartNew()
  while ($true) { if ($sw.Elapsed.TotalSeconds -gt 150) { throw "deadline $method" }
    $ms = New-Object IO.MemoryStream
    do {
      $t = $sock.ReceiveAsync([ArraySegment[byte]]$buf, [Threading.CancellationToken]::None); if (-not $t.Wait(60000)) { throw "timeout waiting for $method" }; $r = $t.Result
      $ms.Write($buf, 0, $r.Count)
    } while (-not $r.EndOfMessage)
    $txt = [Text.Encoding]::UTF8.GetString($ms.ToArray()); if ($txt.StartsWith('{"id"')) { Add-Content "$Out\log.txt" ("  recv " + $txt.Substring(0,[Math]::Min(150,$txt.Length))) }
    if ($txt -match ('^\{"id":' + $script:id + ',')) {
      Add-Type -AssemblyName System.Web.Extensions
      $ser = New-Object System.Web.Script.Serialization.JavaScriptSerializer
      $ser.MaxJsonLength = [int]::MaxValue
      return $ser.DeserializeObject($txt)
    }
  }
}
$js = [IO.File]::ReadAllText("$env:TEMP\mohawk\audit.js")
$pages = Get-Content "$env:TEMP\mohawk\audit-pages.txt" | ? { $_ }
$results = @()
try {
  Send 'Page.enable' | Out-Null
  foreach ($line in $pages) {
    $w, $path = $line -split ' ', 2; $fn = "$Out\p-" + $w + "-" + ([BitConverter]::ToString([Security.Cryptography.MD5]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes($path))).Replace("-","").Substring(0,10)) + ".json"; if (Test-Path $fn) { $results += [IO.File]::ReadAllText($fn); continue }
    $mob = [int]$w -lt 800
    Send 'Emulation.setDeviceMetricsOverride' @{ width = [int]$w; height = 900; deviceScaleFactor = 1; mobile = $mob } | Out-Null
    $code = curl.exe -s -o NUL -w "%{http_code}" "http://localhost$path"
    Send 'Page.navigate' @{ url = "http://localhost$path" } | Out-Null
    Start-Sleep 4
    $res = Send 'Runtime.evaluate' @{ expression = $js; returnByValue = $true; awaitPromise = $true }
    $v = [string]$res.result.result.value
    if (-not $v) { $v = '{"error":' + (ConvertTo-Json ([string]$res.result.exceptionDetails.text)) + '}' }
    $one = '{"path":' + (ConvertTo-Json $path) + ',"width":' + $w + ',"httpStatus":' + $code + ',"result":' + $v + '}'; [IO.File]::WriteAllText($fn, $one, (New-Object Text.UTF8Encoding $false)); $results += $one
  }
  [IO.File]::WriteAllText("$Out\font-audit.json", "[`n" + ($results -join ",`n") + "`n]", (New-Object Text.UTF8Encoding $false))
  "done"
} finally {
  try { $sock.Dispose() } catch {}
  Get-CimInstance Win32_Process -Filter "name='msedge.exe'" | ? { $_.CommandLine -like "*mohawk\profile*" } | % { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}