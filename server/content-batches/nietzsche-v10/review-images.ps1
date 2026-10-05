$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$mediaRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../content-media'))
$reviewRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../../.local/nietzsche-v10-review'))
[IO.Directory]::CreateDirectory($reviewRoot) | Out-Null
$assets = (Get-Content (Join-Path $PSScriptRoot 'image-provenance.json') -Raw -Encoding UTF8 | ConvertFrom-Json).PSObject.Properties | Sort-Object Name
$font = New-Object Drawing.Font('Arial', 10)
try {
  for ($page = 0; $page -lt [Math]::Ceiling($assets.Count / 24); $page++) {
    $canvas = New-Object Drawing.Bitmap(1200, 1000)
    $graphics = [Drawing.Graphics]::FromImage($canvas)
    try {
      $graphics.Clear([Drawing.Color]::White)
      $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      for ($slot = 0; $slot -lt 24; $slot++) {
        $index = $page * 24 + $slot
        if ($index -ge $assets.Count) { break }
        $asset = $assets[$index]
        $picture = [Drawing.Image]::FromFile((Join-Path $mediaRoot $asset.Value.imageKey))
        try {
          $scale = [Math]::Min(190 / $picture.Width, 210 / $picture.Height)
          $width = [int]($picture.Width * $scale)
          $height = [int]($picture.Height * $scale)
          $left = [int](($slot % 6) * 200 + (200 - $width) / 2)
          $top = [int]([Math]::Floor($slot / 6) * 250)
          $graphics.DrawImage($picture, $left, $top, $width, $height)
          $graphics.DrawString($asset.Name, $font, [Drawing.Brushes]::Black, [single](($slot % 6) * 200 + 5), [single]($top + 218))
        } finally { $picture.Dispose() }
      }
      $destination = Join-Path $reviewRoot ('images-' + ($page + 1) + '.jpg')
      $canvas.Save($destination, [Drawing.Imaging.ImageFormat]::Jpeg)
      Write-Output $destination
    } finally { $graphics.Dispose(); $canvas.Dispose() }
  }
} finally { $font.Dispose() }

