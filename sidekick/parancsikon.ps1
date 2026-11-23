# Parancsikont tesz az Asztalra: "Matka" – dupla kattintással indul a kis macska.
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$exe = Join-Path $dir 'node_modules\electron\dist\electron.exe'
if (-not (Test-Path $exe)) { Write-Host 'Előbb futtasd: npm install'; exit 1 }
$lnk = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Matka.lnk'
$s = (New-Object -ComObject WScript.Shell).CreateShortcut($lnk)
$s.TargetPath = $exe
$s.Arguments = '"' + $dir + '"'
$s.WorkingDirectory = $dir
$s.Description = 'Matka – a C-kocka cicája, kis asztali segéd'
$s.Save()
Write-Host "Kész: $lnk"
