# F5-TTS (magyar finomhangolás) helyi telepítése – telepítő nélkül, ékezet nélküli mappába (%LOCALAPPDATA%\f5tts)
# A "uv" (astral-sh/uv) hordozható Pythont tölt le a mappába; semmi nem kerül a Windows rendszerbe.
$ErrorActionPreference = 'Stop'
$base = Join-Path $env:LOCALAPPDATA 'f5tts'
New-Item -ItemType Directory -Force $base | Out-Null
$env:UV_PYTHON_INSTALL_DIR = Join-Path $base 'python'
$env:UV_CACHE_DIR = Join-Path $base 'cache'
$env:UV_LINK_MODE = 'copy'

$uv = Join-Path $base 'uv.exe'
if (-not (Test-Path $uv)) {
    Write-Output 'uv letöltése (GitHub, astral-sh/uv)...'
    $zip = Join-Path $base 'uv.zip'
    Invoke-WebRequest -Uri 'https://github.com/astral-sh/uv/releases/latest/download/uv-x86_64-pc-windows-msvc.zip' -OutFile $zip -UseBasicParsing
    Expand-Archive $zip -DestinationPath $base -Force
}
& $uv --version

# hordozható Python (ha még nincs), a kötés/regisztráció lépései nélkül
$pyExe = Get-ChildItem (Join-Path $base 'python') -Filter python.exe -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.Directory.Name -like 'cpython-3.11.*' } | Select-Object -First 1
if (-not $pyExe) {
    & $uv python install 3.11 --no-bin --no-registry
    $pyExe = Get-ChildItem (Join-Path $base 'python') -Filter python.exe -Recurse | Where-Object { $_.Directory.Name -like 'cpython-3.11.*' } | Select-Object -First 1
}
Write-Output "Python: $($pyExe.FullName)"

$venv = Join-Path $base 'venv'
if (-not (Test-Path "$venv\Scripts\python.exe")) { & $pyExe.FullName -m venv $venv }
$vpy = "$venv\Scripts\python.exe"
Write-Output 'PyTorch (CPU) telepítése...'
& $uv pip install --python $vpy torch torchaudio --index-url https://download.pytorch.org/whl/cpu
Write-Output 'F5-TTS telepítése...'
& $uv pip install --python $vpy f5-tts
& $vpy -c "import torch, f5_tts; print('torch', torch.__version__, '| f5_tts OK')"
Write-Output 'KÉSZ'
