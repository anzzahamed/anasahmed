$port = 8080
$root = 'c:\Users\anchu\OneDrive\Documents\portfolio test website'
$reelsFallback = Join-Path $env:TEMP 'portfolio_reels_prep\out'

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Concurrent Server running at http://localhost:$port/" -ForegroundColor Green

$pool = [RunspaceFactory]::CreateRunspacePool(1, 12)
$pool.Open()

$handlerBlock = {
    param($context, $root, $reelsFallback)
    try {
        $request = $context.Request
        $response = $context.Response
        $url = $request.Url.LocalPath
        if ($url -eq '/') { $url = '/index.html' }
        $rel = $url.TrimStart('/')
        $filePath = Join-Path $root $rel

        if (-not (Test-Path $filePath -PathType Leaf) -and $rel.StartsWith('assets/reels/')) {
            $fname = [System.IO.Path]::GetFileName($rel)
            $altPath = Join-Path $reelsFallback $fname
            if (Test-Path $altPath -PathType Leaf) { $filePath = $altPath }
        }

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $ct = switch ($ext) {
                '.css'   { 'text/css' }
                '.js'    { 'application/javascript' }
                '.jpg'   { 'image/jpeg' }
                '.jpeg'  { 'image/jpeg' }
                '.png'   { 'image/png' }
                '.svg'   { 'image/svg+xml' }
                '.webp'  { 'image/webp' }
                '.avif'  { 'image/avif' }
                '.ttf'   { 'font/ttf' }
                '.woff2' { 'font/woff2' }
                '.mp4'   { 'video/mp4' }
                '.webm'  { 'video/webm' }
                default  { 'text/html' }
            }

            if ($ext -in '.html','.css','.js') {
                $response.AddHeader('Cache-Control', 'no-cache')
            } else {
                $response.AddHeader('Cache-Control', 'public, max-age=86400')
            }

            $fileInfo = Get-Item $filePath
            $totalLen = $fileInfo.Length
            $response.ContentType = $ct
            $response.AddHeader('Accept-Ranges', 'bytes')

            $rangeHeader = $request.Headers['Range']
            if ($rangeHeader -and $rangeHeader -match 'bytes=(\d+)-(\d*)') {
                $start = [long]$Matches[1]
                $end = if ($Matches[2]) { [long]$Matches[2] } else { [math]::Min($start + 1048575, $totalLen - 1) }
                if ($end -ge $totalLen) { $end = $totalLen - 1 }
                $len = $end - $start + 1

                $response.StatusCode = 206
                $response.AddHeader('Content-Range', "bytes $start-$end/$totalLen")
                $response.ContentLength64 = $len

                if ($request.HttpMethod -ne 'HEAD') {
                    $fs = New-Object System.IO.FileStream($filePath, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
                    try {
                        $fs.Seek($start, [System.IO.SeekOrigin]::Begin) | Out-Null
                        $buf = New-Object byte[] 65536
                        $rem = $len
                        while ($rem -gt 0) {
                            $readCount = $fs.Read($buf, 0, [math]::Min($buf.Length, $rem))
                            if ($readCount -le 0) { break }
                            $response.OutputStream.Write($buf, 0, $readCount)
                            $rem -= $readCount
                        }
                    } finally {
                        $fs.Dispose()
                    }
                }
            } else {
                $response.StatusCode = 200
                $response.ContentLength64 = $totalLen
                if ($request.HttpMethod -ne 'HEAD') {
                    $fs = New-Object System.IO.FileStream($filePath, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
                    try {
                        $fs.CopyTo($response.OutputStream)
                    } finally {
                        $fs.Dispose()
                    }
                }
            }
        } else {
            $response.StatusCode = 404
            $b = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $url")
            $response.ContentLength64 = $b.Length
            if ($request.HttpMethod -ne 'HEAD') {
                $response.OutputStream.Write($b, 0, $b.Length)
            }
        }
        $response.Close()
    } catch {
        try { $context.Response.Abort() } catch {}
    }
}

$activeJobs = New-Object System.Collections.Generic.List[object]

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()

        for ($idx = $activeJobs.Count - 1; $idx -ge 0; $idx--) {
            if ($activeJobs[$idx].Handle.IsCompleted) {
                try { $activeJobs[$idx].PS.EndInvoke($activeJobs[$idx].Handle) } catch {}
                $activeJobs[$idx].PS.Dispose()
                $activeJobs.RemoveAt($idx)
            }
        }

        $ps = [PowerShell]::Create()
        $ps.RunspacePool = $pool
        [void]$ps.AddScript($handlerBlock).AddArgument($context).AddArgument($root).AddArgument($reelsFallback)
        $handle = $ps.BeginInvoke()
        [void]$activeJobs.Add([PSCustomObject]@{ PS = $ps; Handle = $handle })
    }
} finally {
    foreach ($j in $activeJobs) {
        try { $j.PS.Dispose() } catch {}
    }
    $pool.Close()
    $pool.Dispose()
    $listener.Stop()
}
