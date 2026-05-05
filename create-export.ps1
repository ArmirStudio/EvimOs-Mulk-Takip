$source = "c:\Users\user\Downloads\emlak-main-backup\emlak-main"
$dest = "c:\Users\user\Desktop\emlak-full-export.zip"

# Remove old ZIP if exists
if (Test-Path $dest) { Remove-Item $dest -Force }

# Get all files excluding node_modules, .metro-cache, .expo, package-lock.json
$files = Get-ChildItem -Path $source -Recurse -File | Where-Object {
    $_.FullName -notmatch '\\node_modules\\' -and
    $_.FullName -notmatch '\\.metro-cache\\' -and
    $_.FullName -notmatch '\\.expo\\' -and
    $_.Name -ne 'package-lock.json'
}

$files | Compress-Archive -DestinationPath $dest -Force

Write-Host "Export completed: $dest"
Write-Host "Total files: $($files.Count)"
