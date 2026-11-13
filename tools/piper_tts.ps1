# Piper (offline neurális TTS) hangok generálása
# A Piper és a hangmodellek ékezet nélküli mappában vannak (%LOCALAPPDATA%\piper-ckocka),
# mert a Piper beszédmotorja nem bírja az ékezetes útvonalat (klódakszing).
# Használat:
#   powershell -File tools/piper_tts.ps1 samples            -> video/samples/*.wav
#   powershell -File tools/piper_tts.ps1 all                -> video/voice_raw_piper/<id>.wav (a video/voice_cast_piper.json szerint)
param([string]$Mode = 'samples')
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$pd = Join-Path $env:LOCALAPPDATA 'piper-ckocka'
$exe = Join-Path $pd 'piper.exe'
$tmp = Join-Path $pd 'out'; New-Item -ItemType Directory -Force $tmp | Out-Null
$utf8 = New-Object Text.UTF8Encoding $false

function Say([string]$text, [string]$voice, [string]$outFile, [double]$len = 1.0) {
    [IO.File]::WriteAllText("$tmp\in.txt", $text, $utf8)
    $args = @('--model', "$pd\$voice.onnx", '--output_file', "$tmp\o.wav", '--length_scale', $len.ToString([Globalization.CultureInfo]::InvariantCulture), '--sentence_silence', '0.25')
    $p = Start-Process -FilePath $exe -ArgumentList $args -RedirectStandardInput "$tmp\in.txt" -RedirectStandardError "$tmp\err.txt" -NoNewWindow -Wait -PassThru
    if ($p.ExitCode -ne 0) { throw "Piper hiba ($voice): $(Get-Content "$tmp\err.txt" -Tail 2)" }
    [IO.File]::Copy("$tmp\o.wav", $outFile, $true)
}

if ($Mode -eq 'samples') {
    $dir = Join-Path $root 'video\samples'; New-Item -ItemType Directory -Force $dir | Out-Null
    $hu = 'Ez a C-kocka. Egy tenyérnyi asztali AI-asszisztens. Beszélhetsz hozzá, és mindig jókedvű.'
    $en = "Welcome back, Captain! I haven't seen you for 14 hours, 3 minutes and 12 seconds. Not that I was counting."
    $joke = 'Mi az? Feldobod, repülve piros, ha leesik, fáj... Tégla!'
    Say $hu 'hu_HU-imre-medium' "$dir\1_narrator_Imre.wav"
    Say $hu 'hu_HU-anna-medium' "$dir\2_narrator_Anna.wav"
    Say $en 'en_US-amy-medium' "$dir\3_kocka_Amy.wav"
    Say $joke 'hu_HU-anna-medium' "$dir\4_kocka_favicc_Anna.wav"
    Get-ChildItem $dir *.wav | ForEach-Object { $_.Name }
} else {
    $cast = [IO.File]::ReadAllText((Join-Path $root 'video\voice_cast_piper.json'), [Text.Encoding]::UTF8) | ConvertFrom-Json
    $lines = [IO.File]::ReadAllText((Join-Path $root 'video\lines.json'), [Text.Encoding]::UTF8) | ConvertFrom-Json
    $dir = Join-Path $root 'video\voice_raw_piper'; New-Item -ItemType Directory -Force $dir | Out-Null
    foreach ($l in $lines) {
        $role = if ($l.style -eq 'narrator') { 'narrator' } elseif ($l.voice -eq 'szabolcs') { 'cube_hu' } else { 'cube_en' }
        Say $l.text $cast.$role.voice (Join-Path $dir "$($l.id).wav") ([double]$cast.$role.length)
        Write-Output "$($l.id)  $($cast.$role.voice)"
    }
}
