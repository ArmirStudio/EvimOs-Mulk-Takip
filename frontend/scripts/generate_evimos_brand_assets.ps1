using namespace System.Drawing
using namespace System.Drawing.Drawing2D
using namespace System.Drawing.Imaging

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$script:Palette = @{
  Canvas       = [ColorTranslator]::FromHtml('#FDF9F3')
  CanvasStrong = [ColorTranslator]::FromHtml('#F4EBDD')
  CopperDark   = [ColorTranslator]::FromHtml('#8B4F2E')
  Copper       = [ColorTranslator]::FromHtml('#C1834F')
  CopperLight  = [ColorTranslator]::FromHtml('#E5B77A')
  GreenDark    = [ColorTranslator]::FromHtml('#063F2A')
  Green        = [ColorTranslator]::FromHtml('#087044')
  GreenLight   = [ColorTranslator]::FromHtml('#19A66B')
  Ink          = [ColorTranslator]::FromHtml('#171A16')
  SoftShadow   = [Color]::FromArgb(38, 64, 45, 24)
}

$script:WordmarkTitle = 'EvimOs'
$script:WordmarkSubtitle = 'M' + [char]0x00FC + 'lk Y' + [char]0x00F6 + 'netim'

function New-Bitmap {
  param([int]$Width, [int]$Height)

  $bitmap = [Bitmap]::new($Width, $Height, [PixelFormat]::Format32bppArgb)
  $bitmap.SetResolution(300, 300)
  return $bitmap
}

function New-Graphics {
  param([Bitmap]$Bitmap)

  $graphics = [Graphics]::FromImage($Bitmap)
  $graphics.SmoothingMode = [SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [PixelOffsetMode]::HighQuality
  $graphics.CompositingQuality = [CompositingQuality]::HighQuality
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  return $graphics
}

function New-RoundedPath {
  param(
    [single]$X,
    [single]$Y,
    [single]$Width,
    [single]$Height,
    [single]$Radius
  )

  $path = [GraphicsPath]::new()
  $diameter = $Radius * 2

  $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
  $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
  $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()

  return $path
}

function New-ArrowHeadPath {
  param(
    [PointF]$Tip,
    [single]$Size,
    [single]$AngleRadians
  )

  $backX = [single]($Tip.X - [Math]::Cos($AngleRadians) * $Size)
  $backY = [single]($Tip.Y - [Math]::Sin($AngleRadians) * $Size)
  $normalX = [single](-[Math]::Sin($AngleRadians))
  $normalY = [single]([Math]::Cos($AngleRadians))

  $path = [GraphicsPath]::new()
  $path.AddPolygon([PointF[]]@(
      $Tip,
      [PointF]::new($backX + ($normalX * $Size * 0.46), $backY + ($normalY * $Size * 0.46)),
      [PointF]::new($backX - ($normalX * $Size * 0.46), $backY - ($normalY * $Size * 0.46))
    ))
  return $path
}

function Add-Window {
  param(
    [Graphics]$Graphics,
    [RectangleF]$Rect,
    [Brush]$Brush
  )

  $radius = [Math]::Min($Rect.Width, $Rect.Height) * 0.16
  $cellW = $Rect.Width * 0.43
  $cellH = $Rect.Height * 0.43
  $gapX = $Rect.Width * 0.14
  $gapY = $Rect.Height * 0.14

  $cells = @(
    [RectangleF]::new($Rect.X, $Rect.Y, $cellW, $cellH),
    [RectangleF]::new($Rect.X + $cellW + $gapX, $Rect.Y, $cellW, $cellH),
    [RectangleF]::new($Rect.X, $Rect.Y + $cellH + $gapY, $cellW, $cellH),
    [RectangleF]::new($Rect.X + $cellW + $gapX, $Rect.Y + $cellH + $gapY, $cellW, $cellH)
  )

  foreach ($cell in $cells) {
    $path = New-RoundedPath $cell.X $cell.Y $cell.Width $cell.Height $radius
    $Graphics.FillPath($Brush, $path)
    $path.Dispose()
  }
}

function Draw-EvimosMark {
  param(
    [Graphics]$Graphics,
    [RectangleF]$Bounds,
    [bool]$IncludeOuterRing = $true
  )

  $shadowPen = [Pen]::new([Color]::FromArgb(32, 0, 0, 0), $Bounds.Width * 0.024)
  $shadowPen.StartCap = [LineCap]::Round
  $shadowPen.EndCap = [LineCap]::Round
  $shadowPen.LineJoin = [LineJoin]::Round

  $copperPen = [Pen]::new($script:Palette.Copper, $Bounds.Width * 0.045)
  $copperPen.StartCap = [LineCap]::Square
  $copperPen.EndCap = [LineCap]::Square
  $copperPen.LineJoin = [LineJoin]::Miter

  $copperThinPen = [Pen]::new($script:Palette.CopperLight, $Bounds.Width * 0.018)
  $greenPen = [Pen]::new($script:Palette.Green, $Bounds.Width * 0.060)
  $greenPen.StartCap = [LineCap]::Round
  $greenPen.EndCap = [LineCap]::Round
  $greenPen.LineJoin = [LineJoin]::Round

  $greenBrush = [SolidBrush]::new($script:Palette.Green)
  $greenDarkBrush = [SolidBrush]::new($script:Palette.GreenDark)
  $copperBrush = [SolidBrush]::new($script:Palette.Copper)
  $copperLightBrush = [SolidBrush]::new($script:Palette.CopperLight)

  $x = $Bounds.X
  $y = $Bounds.Y
  $w = $Bounds.Width
  $h = $Bounds.Height

  if ($IncludeOuterRing) {
    $ringRect = [RectangleF]::new($x + ($w * 0.045), $y + ($h * 0.045), $w * 0.91, $h * 0.91)
    $ringPen = [Pen]::new($script:Palette.Copper, $w * 0.033)
    $ringHighlightPen = [Pen]::new($script:Palette.CopperLight, $w * 0.010)
    $Graphics.DrawEllipse($ringPen, $ringRect)
    $Graphics.DrawArc($ringHighlightPen, $ringRect, 215, 155)
    $ringHighlightPen.Dispose()
    $ringPen.Dispose()
  }

  $mainHouse = [GraphicsPath]::new()
  $mainHouse.StartFigure()
  $mainHouse.AddLines([PointF[]]@(
      [PointF]::new($x + ($w * 0.20), $y + ($h * 0.43)),
      [PointF]::new($x + ($w * 0.50), $y + ($h * 0.18)),
      [PointF]::new($x + ($w * 0.64), $y + ($h * 0.32))
    ))
  $mainHouse.StartFigure()
  $mainHouse.AddLines([PointF[]]@(
      [PointF]::new($x + ($w * 0.28), $y + ($h * 0.40)),
      [PointF]::new($x + ($w * 0.28), $y + ($h * 0.70)),
      [PointF]::new($x + ($w * 0.73), $y + ($h * 0.70)),
      [PointF]::new($x + ($w * 0.73), $y + ($h * 0.48)),
      [PointF]::new($x + ($w * 0.82), $y + ($h * 0.57))
    ))

  $Graphics.TranslateTransform($w * 0.009, $h * 0.012)
  $Graphics.DrawPath($shadowPen, $mainHouse)
  $Graphics.ResetTransform()
  $Graphics.DrawPath($copperPen, $mainHouse)

  Add-Window `
    -Graphics $Graphics `
    -Rect ([RectangleF]::new($x + ($w * 0.46), $y + ($h * 0.31), $w * 0.075, $h * 0.075)) `
    -Brush $copperLightBrush

  $smallRoof = [GraphicsPath]::new()
  $smallRoof.AddLines([PointF[]]@(
      [PointF]::new($x + ($w * 0.42), $y + ($h * 0.64)),
      [PointF]::new($x + ($w * 0.50), $y + ($h * 0.58)),
      [PointF]::new($x + ($w * 0.58), $y + ($h * 0.64))
    ))
  $Graphics.DrawPath($copperThinPen, $smallRoof)

  Add-Window `
    -Graphics $Graphics `
    -Rect ([RectangleF]::new($x + ($w * 0.47), $y + ($h * 0.66), $w * 0.072, $h * 0.072)) `
    -Brush $greenBrush

  $barOne = [GraphicsPath]::new()
  $barOne.AddPolygon([PointF[]]@(
      [PointF]::new($x + ($w * 0.60), $y + ($h * 0.61)),
      [PointF]::new($x + ($w * 0.70), $y + ($h * 0.66)),
      [PointF]::new($x + ($w * 0.70), $y + ($h * 0.70)),
      [PointF]::new($x + ($w * 0.60), $y + ($h * 0.70))
    ))
  $barTwo = [GraphicsPath]::new()
  $barTwo.AddPolygon([PointF[]]@(
      [PointF]::new($x + ($w * 0.60), $y + ($h * 0.53)),
      [PointF]::new($x + ($w * 0.70), $y + ($h * 0.58)),
      [PointF]::new($x + ($w * 0.70), $y + ($h * 0.63)),
      [PointF]::new($x + ($w * 0.60), $y + ($h * 0.58))
    ))
  $Graphics.FillPath($greenBrush, $barOne)
  $Graphics.FillPath($greenBrush, $barTwo)

  $arrowPath = [GraphicsPath]::new()
  $arrowPath.AddBezier(
    [PointF]::new($x + ($w * 0.20), $y + ($h * 0.55)),
    [PointF]::new($x + ($w * 0.42), $y + ($h * 0.56)),
    [PointF]::new($x + ($w * 0.63), $y + ($h * 0.33)),
    [PointF]::new($x + ($w * 0.74), $y + ($h * 0.22))
  )
  $Graphics.TranslateTransform($w * 0.010, $h * 0.013)
  $Graphics.DrawPath($shadowPen, $arrowPath)
  $Graphics.ResetTransform()
  $Graphics.DrawPath($greenPen, $arrowPath)

  $head = New-ArrowHeadPath `
    -Tip ([PointF]::new($x + ($w * 0.78), $y + ($h * 0.18))) `
    -Size ($w * 0.14) `
    -AngleRadians (-0.78)
  $Graphics.TranslateTransform($w * 0.010, $h * 0.013)
  $Graphics.FillPath([SolidBrush]::new([Color]::FromArgb(24, 0, 0, 0)), $head)
  $Graphics.ResetTransform()
  $Graphics.FillPath($greenBrush, $head)

  $barOne.Dispose()
  $barTwo.Dispose()
  $head.Dispose()
  $arrowPath.Dispose()
  $smallRoof.Dispose()
  $mainHouse.Dispose()
  $copperLightBrush.Dispose()
  $copperBrush.Dispose()
  $greenDarkBrush.Dispose()
  $greenBrush.Dispose()
  $greenPen.Dispose()
  $copperThinPen.Dispose()
  $copperPen.Dispose()
  $shadowPen.Dispose()
}

function Save-Png {
  param(
    [Bitmap]$Bitmap,
    [string]$Path
  )

  $directory = Split-Path -Parent $Path
  if (-not (Test-Path $directory)) {
    New-Item -ItemType Directory -Path $directory | Out-Null
  }

  $Bitmap.Save($Path, [ImageFormat]::Png)
}

function New-IconAsset {
  param(
    [int]$Size,
    [string]$Path
  )

  $bitmap = New-Bitmap -Width $Size -Height $Size
  $graphics = New-Graphics -Bitmap $bitmap
  $graphics.Clear($script:Palette.Canvas)

  $platePath = New-RoundedPath ($Size * 0.07) ($Size * 0.07) ($Size * 0.86) ($Size * 0.86) ($Size * 0.18)
  $plateBrush = [SolidBrush]::new($script:Palette.CanvasStrong)
  $graphics.FillPath($plateBrush, $platePath)

  Draw-EvimosMark `
    -Graphics $graphics `
    -Bounds ([RectangleF]::new($Size * 0.09, $Size * 0.09, $Size * 0.82, $Size * 0.82)) `
    -IncludeOuterRing $true

  Save-Png -Bitmap $bitmap -Path $Path

  $plateBrush.Dispose()
  $platePath.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

function New-AdaptiveForeground {
  param(
    [int]$Size,
    [string]$Path
  )

  $bitmap = New-Bitmap -Width $Size -Height $Size
  $graphics = New-Graphics -Bitmap $bitmap
  $graphics.Clear([Color]::Transparent)

  Draw-EvimosMark `
    -Graphics $graphics `
    -Bounds ([RectangleF]::new($Size * 0.16, $Size * 0.16, $Size * 0.68, $Size * 0.68)) `
    -IncludeOuterRing $true

  Save-Png -Bitmap $bitmap -Path $Path

  $graphics.Dispose()
  $bitmap.Dispose()
}

function New-SplashAsset {
  param(
    [int]$Size,
    [string]$Path
  )

  $bitmap = New-Bitmap -Width $Size -Height $Size
  $graphics = New-Graphics -Bitmap $bitmap
  $graphics.Clear([Color]::Transparent)

  Draw-EvimosMark `
    -Graphics $graphics `
    -Bounds ([RectangleF]::new($Size * 0.18, $Size * 0.08, $Size * 0.64, $Size * 0.64)) `
    -IncludeOuterRing $true

  $titleFont = [Font]::new('Segoe UI Semibold', $Size * 0.105, [FontStyle]::Bold, [GraphicsUnit]::Pixel)
  $subFont = [Font]::new('Segoe UI Semibold', $Size * 0.046, [FontStyle]::Regular, [GraphicsUnit]::Pixel)
  $titleFormat = [StringFormat]::new()
  $titleFormat.Alignment = [StringAlignment]::Center
  $titleFormat.LineAlignment = [StringAlignment]::Center

  $greenBrush = [SolidBrush]::new($script:Palette.Green)
  $copperBrush = [SolidBrush]::new($script:Palette.Copper)

  $Graphics.DrawString(
    $script:WordmarkTitle,
    $titleFont,
    $greenBrush,
    [RectangleF]::new(0, $Size * 0.70, $Size, $Size * 0.12),
    $titleFormat
  )

  $linePen = [Pen]::new($script:Palette.Copper, $Size * 0.010)
  $Graphics.DrawLine($linePen, $Size * 0.26, $Size * 0.84, $Size * 0.74, $Size * 0.84)

  $Graphics.DrawString(
    $script:WordmarkSubtitle,
    $subFont,
    $copperBrush,
    [RectangleF]::new(0, $Size * 0.86, $Size, $Size * 0.07),
    $titleFormat
  )

  Save-Png -Bitmap $bitmap -Path $Path

  $linePen.Dispose()
  $copperBrush.Dispose()
  $greenBrush.Dispose()
  $titleFormat.Dispose()
  $subFont.Dispose()
  $titleFont.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

function New-MarkAsset {
  param(
    [int]$Size,
    [string]$Path
  )

  $bitmap = New-Bitmap -Width $Size -Height $Size
  $graphics = New-Graphics -Bitmap $bitmap
  $graphics.Clear([Color]::Transparent)

  Draw-EvimosMark `
    -Graphics $graphics `
    -Bounds ([RectangleF]::new($Size * 0.05, $Size * 0.05, $Size * 0.90, $Size * 0.90)) `
    -IncludeOuterRing $true

  Save-Png -Bitmap $bitmap -Path $Path

  $graphics.Dispose()
  $bitmap.Dispose()
}

function New-WordmarkAsset {
  param(
    [int]$Width,
    [int]$Height,
    [string]$Path
  )

  $bitmap = New-Bitmap -Width $Width -Height $Height
  $graphics = New-Graphics -Bitmap $bitmap
  $graphics.Clear([Color]::Transparent)

  $markSize = $Height * 0.92
  Draw-EvimosMark `
    -Graphics $graphics `
    -Bounds ([RectangleF]::new($Height * 0.02, $Height * 0.03, $markSize, $markSize)) `
    -IncludeOuterRing $true

  $nameFont = [Font]::new('Segoe UI Semibold', $Height * 0.33, [FontStyle]::Bold, [GraphicsUnit]::Pixel)
  $subFont = [Font]::new('Segoe UI Semibold', $Height * 0.105, [FontStyle]::Regular, [GraphicsUnit]::Pixel)
  $greenBrush = [SolidBrush]::new($script:Palette.Green)
  $copperBrush = [SolidBrush]::new($script:Palette.Copper)
  $copperPen = [Pen]::new($script:Palette.Copper, $Height * 0.012)

  $textX = $Height * 1.02
  $graphics.DrawString($script:WordmarkTitle, $nameFont, $greenBrush, [PointF]::new($textX, $Height * 0.13))
  $graphics.DrawLine($copperPen, $textX + ($Height * 0.03), $Height * 0.61, $Width * 0.86, $Height * 0.61)
  $graphics.DrawString($script:WordmarkSubtitle, $subFont, $copperBrush, [PointF]::new($textX + ($Height * 0.07), $Height * 0.68))

  Save-Png -Bitmap $bitmap -Path $Path

  $copperPen.Dispose()
  $copperBrush.Dispose()
  $greenBrush.Dispose()
  $nameFont.Dispose()
  $subFont.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

function New-AppImage {
  param(
    [int]$Width,
    [int]$Height,
    [string]$Path
  )

  $bitmap = New-Bitmap -Width $Width -Height $Height
  $graphics = New-Graphics -Bitmap $bitmap
  $graphics.Clear($script:Palette.Canvas)

  $panelPath = New-RoundedPath ($Width * 0.07) ($Height * 0.12) ($Width * 0.86) ($Height * 0.76) ($Height * 0.09)
  $panelBrush = [SolidBrush]::new($script:Palette.CanvasStrong)
  $graphics.FillPath($panelBrush, $panelPath)

  Draw-EvimosMark `
    -Graphics $graphics `
    -Bounds ([RectangleF]::new($Width * 0.10, $Height * 0.16, $Height * 0.58, $Height * 0.58)) `
    -IncludeOuterRing $true

  $eyebrowFont = [Font]::new('Segoe UI Semibold', $Height * 0.048, [FontStyle]::Regular, [GraphicsUnit]::Pixel)
  $titleFont = [Font]::new('Segoe UI Semibold', $Height * 0.082, [FontStyle]::Bold, [GraphicsUnit]::Pixel)
  $bodyFont = [Font]::new('Segoe UI', $Height * 0.042, [FontStyle]::Regular, [GraphicsUnit]::Pixel)
  $eyebrowBrush = [SolidBrush]::new($script:Palette.Copper)
  $titleBrush = [SolidBrush]::new($script:Palette.Green)
  $bodyBrush = [SolidBrush]::new($script:Palette.Ink)

  $heroLineOne = 'EvimOs - M' + [char]0x00FC + 'lk Y' + [char]0x00F6 + 'netim'
  $heroLineTwo = 'Kira, bak' + [char]0x0131 + 'm ve belge ak' + [char]0x0131 + 's' + [char]0x0131 + ' tek merkezde.'
  $heroLineThree = 'Ofis ekibi, ev sahibi ve kirac' + [char]0x0131 + ' i' + [char]0x00E7 + 'in sakin bir operasyon y' + [char]0x00FC + 'zeyi.'

  $textX = $Width * 0.46
  $graphics.DrawString($heroLineOne, $eyebrowFont, $eyebrowBrush, [PointF]::new($textX, $Height * 0.23))
  $graphics.DrawString($heroLineTwo, $titleFont, $titleBrush, [RectangleF]::new($textX, $Height * 0.32, $Width * 0.40, $Height * 0.24))
  $graphics.DrawString($heroLineThree, $bodyFont, $bodyBrush, [RectangleF]::new($textX, $Height * 0.60, $Width * 0.40, $Height * 0.20))

  Save-Png -Bitmap $bitmap -Path $Path

  $bodyBrush.Dispose()
  $titleBrush.Dispose()
  $eyebrowBrush.Dispose()
  $bodyFont.Dispose()
  $titleFont.Dispose()
  $eyebrowFont.Dispose()
  $panelBrush.Dispose()
  $panelPath.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

$root = Split-Path -Parent $PSScriptRoot
$imageDir = Join-Path $root 'assets\images'

New-IconAsset -Size 1024 -Path (Join-Path $imageDir 'icon.png')
New-AdaptiveForeground -Size 1024 -Path (Join-Path $imageDir 'adaptive-icon.png')
New-IconAsset -Size 256 -Path (Join-Path $imageDir 'favicon.png')
New-SplashAsset -Size 768 -Path (Join-Path $imageDir 'splash-image.png')
New-SplashAsset -Size 768 -Path (Join-Path $imageDir 'evimos-splash.png')
New-MarkAsset -Size 1024 -Path (Join-Path $imageDir 'evimos-mark.png')
New-WordmarkAsset -Width 1400 -Height 420 -Path (Join-Path $imageDir 'logo.png')
New-AppImage -Width 1200 -Height 630 -Path (Join-Path $imageDir 'app-image.png')

Write-Output "Generated EvimOs brand assets in $imageDir"
