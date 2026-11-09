param([string]$Out = "$env:TEMP\mohawk\after")
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
$js = [IO.File]::ReadAllText("$env:TEMP\mohawk\check.js")
$jobs = @(
  @{ url='http://localhost/'; w=1440; name='home-1440' },
  @{ url='http://localhost/vinyl'; w=1440; name='vinyl-1440' },
  @{ url=$env:PRODUCT_URL; w=1440; name='product-1440' },
  @{ url='http://localhost/vinyl'; w=390; name='vinyl-390' }
)
try {
  Send 'Page.enable' | Out-Null
  foreach ($j in $jobs) {
    $mob = $j.w -lt 800
    Send 'Emulation.setDeviceMetricsOverride' @{ width = $j.w; height = 900; deviceScaleFactor = $(if ($mob) {2} else {1}); mobile = $mob } | Out-Null
    Send 'Page.navigate' @{ url = $j.url } | Out-Null
    Start-Sleep 6
    $res = Send 'Runtime.evaluate' @{ expression = $js; returnByValue = $true; awaitPromise = $true }
    [IO.File]::WriteAllText("$Out\$($j.name)-check.json", [string]$res.result.result.value, (New-Object Text.UTF8Encoding $false))
    $vp = Send 'Page.captureScreenshot' @{ format = 'png' }
    [IO.File]::WriteAllBytes("$Out\$($j.name)-viewport.png", [Convert]::FromBase64String($vp.result.data))
    $m = Send 'Page.getLayoutMetrics'
    $h = [int][Math]::Min([double]$m.result.cssContentSize.height, 12000)
    Send 'Emulation.setDeviceMetricsOverride' @{ width = $j.w; height = $h; deviceScaleFactor = $(if ($mob) {2} else {1}); mobile = $mob } | Out-Null
    Start-Sleep 2
    $shot = Send 'Page.captureScreenshot' @{ format = 'png'; captureBeyondViewport = $true }
    [IO.File]::WriteAllBytes("$Out\$($j.name)-full.png", [Convert]::FromBase64String($shot.result.data))
  }
  "done"
} finally {
  try { $sock.Dispose() } catch {}
  Get-CimInstance Win32_Process -Filter "name='msedge.exe'" | ? { $_.CommandLine -like "*mohawk\profile*" } | % { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}