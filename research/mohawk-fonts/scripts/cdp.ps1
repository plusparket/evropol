param([string]$Url, [string]$Out = "$env:TEMP\mohawk\out")
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
$ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0'
$mua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
$js = [IO.File]::ReadAllText("$env:TEMP\mohawk\extract.js")
try {
  Send 'Page.enable' | Out-Null

  Send 'Network.setUserAgentOverride' @{ userAgent = $ua; acceptLanguage = 'en-US,en' } | Out-Null
  Send 'Emulation.setDeviceMetricsOverride' @{ width = 1440; height = 1000; deviceScaleFactor = 1; mobile = $false } | Out-Null
  Send 'Page.navigate' @{ url = $Url } | Out-Null
  Start-Sleep 10
  # scroll to trigger lazy content, then back
  Send 'Runtime.evaluate' @{ expression = 'window.scrollTo(0, document.body.scrollHeight)'; } | Out-Null
  Start-Sleep 3
  Send 'Runtime.evaluate' @{ expression = 'window.scrollTo(0, 0)'; } | Out-Null
  Start-Sleep 2
  $res = Send 'Runtime.evaluate' @{ expression = $js; returnByValue = $true; awaitPromise = $true }
  if ($res.result.exceptionDetails) { $res.result.exceptionDetails | ConvertTo-Json -Depth 6 | Set-Content "$Out\desktop-error.json" -Encoding utf8 }
  [IO.File]::WriteAllText("$Out\computed-styles-desktop-1440.json", $res.result.result.value, (New-Object Text.UTF8Encoding $false))
  $dom = Send 'Runtime.evaluate' @{ expression = 'document.documentElement.outerHTML'; returnByValue = $true }
  [IO.File]::WriteAllText("$Out\rendered-dom-desktop.html", $dom.result.result.value, (New-Object Text.UTF8Encoding $false))
  $m = Send 'Page.getLayoutMetrics'
  $h = [int][Math]::Min([double]$m.result.cssContentSize.height, 16000)
  Send 'Emulation.setDeviceMetricsOverride' @{ width = 1440; height = $h; deviceScaleFactor = 1; mobile = $false } | Out-Null
  Start-Sleep 3
  $shot = Send 'Page.captureScreenshot' @{ format = 'png'; captureBeyondViewport = $true }
  [IO.File]::WriteAllBytes("$Out\screenshot-desktop-1440.png", [Convert]::FromBase64String($shot.result.data))

  # mobile
  Send 'Network.setUserAgentOverride' @{ userAgent = $mua; acceptLanguage = 'en-US,en' } | Out-Null
  Send 'Emulation.setDeviceMetricsOverride' @{ width = 390; height = 844; deviceScaleFactor = 2; mobile = $true } | Out-Null
  Send 'Page.navigate' @{ url = $Url } | Out-Null
  Start-Sleep 10
  Send 'Runtime.evaluate' @{ expression = 'window.scrollTo(0, document.body.scrollHeight)'; } | Out-Null
  Start-Sleep 3
  Send 'Runtime.evaluate' @{ expression = 'window.scrollTo(0, 0)'; } | Out-Null
  Start-Sleep 2
  $res = Send 'Runtime.evaluate' @{ expression = $js; returnByValue = $true; awaitPromise = $true }
  [IO.File]::WriteAllText("$Out\computed-styles-mobile-390.json", $res.result.result.value, (New-Object Text.UTF8Encoding $false))
  $m = Send 'Page.getLayoutMetrics'
  $h = [int][Math]::Min([double]$m.result.cssContentSize.height, 12000)
  Send 'Emulation.setDeviceMetricsOverride' @{ width = 390; height = $h; deviceScaleFactor = 2; mobile = $true } | Out-Null
  Start-Sleep 3
  $shot = Send 'Page.captureScreenshot' @{ format = 'png'; captureBeyondViewport = $true }
  [IO.File]::WriteAllBytes("$Out\screenshot-mobile-390.png", [Convert]::FromBase64String($shot.result.data))
  "done"
} finally {
  try { $sock.Dispose() } catch {}
  Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
  Get-CimInstance Win32_Process -Filter "name='msedge.exe'" | ? { $_.CommandLine -like "*mohawk\profile*" } | % { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}



