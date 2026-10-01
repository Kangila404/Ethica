# Render the simple vector source on Windows without an image-generation service.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
[xml]$source = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'star.svg') -Raw
$outputPath = Join-Path $PSScriptRoot '../Ethica/Resources/LoginAssets.xcassets/AppIcon.appiconset/AppIcon.png'
$canvas = New-Object System.Drawing.Bitmap(4096,4096,[System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$graphics = [System.Drawing.Graphics]::FromImage($canvas)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.Clear([System.Drawing.ColorTranslator]::FromHtml($source.svg.rect.fill))
$points = [System.Drawing.PointF[]]@($source.svg.polygon.points.Split(' ') | ForEach-Object {
    $pair = $_.Split(',')
    New-Object System.Drawing.PointF(([single]$pair[0] * 4),([single]$pair[1] * 4))
})
$brush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($source.svg.polygon.fill))
$graphics.FillPolygon($brush, $points)
$icon = New-Object System.Drawing.Bitmap(1024,1024,[System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$scaled = [System.Drawing.Graphics]::FromImage($icon)
$scaled.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$scaled.DrawImage($canvas,0,0,1024,1024)
$icon.Save($outputPath,[System.Drawing.Imaging.ImageFormat]::Png)
$scaled.Dispose(); $icon.Dispose(); $brush.Dispose(); $graphics.Dispose(); $canvas.Dispose()
Write-Output 'Rendered 1024x1024 RGB app icon.'
