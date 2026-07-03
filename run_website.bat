@echo off
title Anas Ahmed Portfolio Local Server
echo ==================================================
echo   ANAS AHMED PORTFOLIO LOCAL SERVER launcher
echo ==================================================
echo.
echo Starting local web server on http://localhost:8080/
echo.
echo NOTE: Please keep this command prompt window open while browsing!
echo       To stop the server, simply close this window.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$port = 8080; $listener = New-Object System.Net.HttpListener; $listener.Prefixes.Add('http://localhost:' + $port + '/'); try { $listener.Start() } catch { $listener.Prefixes.Clear(); $listener.Prefixes.Add('http://127.0.0.1:' + $port + '/'); $listener.Start() }; Write-Host 'Listening on http://localhost:' $port '/...'; try { while ($listener.IsListening) { $context = $listener.GetContext(); $request = $context.Request; $response = $context.Response; $url = $request.Url.LocalPath; if ($url -eq '/') { $url = '/index.html' }; $urlRelative = $url.TrimStart('/'); $filePath = [System.IO.Path]::Combine('%~dp0', $urlRelative); if (-not (Test-Path $filePath -PathType Leaf) -and $urlRelative.StartsWith('assets/scroll-images/')) { $filename = [System.IO.Path]::GetFileName($urlRelative); $filePath = [System.IO.Path]::Combine('c:\Users\anchu\OneDrive\Documents\anzz scroll images', $filename) }; if (Test-Path $filePath -PathType Leaf) { $bytes = [System.IO.File]::ReadAllBytes($filePath); $ext = [System.IO.Path]::GetExtension($filePath).ToLower(); $contentType = 'text/html'; if ($ext -eq '.css') { $contentType = 'text/css' } elseif ($ext -eq '.js') { $contentType = 'application/javascript' } elseif ($ext -eq '.jpg' -or $ext -eq '.jpeg') { $contentType = 'image/jpeg' } elseif ($ext -eq '.png') { $contentType = 'image/png' } elseif ($ext -eq '.svg') { $contentType = 'image/svg+xml' } elseif ($ext -eq '.webp') { $contentType = 'image/webp' }; $response.ContentType = $contentType; $response.ContentLength64 = $bytes.Length; if ($request.HttpMethod -ne 'HEAD') { $response.OutputStream.Write($bytes, 0, $bytes.Length) } } else { $response.StatusCode = 404; $errBytes = [System.Text.Encoding]::UTF8.GetBytes('404 File Not Found: ' + $url); $response.ContentLength64 = $errBytes.Length; if ($request.HttpMethod -ne 'HEAD') { $response.OutputStream.Write($errBytes, 0, $errBytes.Length) } }; $response.Close() } } finally { $listener.Stop() }"
pause
