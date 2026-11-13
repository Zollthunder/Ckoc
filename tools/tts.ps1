# Gépi hangok generálása a Windows beépített hangjaival
#   Zira (angol):    System.Speech
#   Szabolcs (magyar): Windows.Media.SpeechSynthesis (OneCore)
# Használat: powershell -File tools/tts.ps1 video/lines.json video/voice_raw
param([string]$LinesFile, [string]$OutDir)

$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force $OutDir | Out-Null
$lines = [IO.File]::ReadAllText((Resolve-Path $LinesFile), [Text.Encoding]::UTF8) | ConvertFrom-Json

# --- Zira (System.Speech) ---
Add-Type -AssemblyName System.Speech
$zira = New-Object System.Speech.Synthesis.SpeechSynthesizer
$zira.SelectVoice('Microsoft Zira Desktop')
$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(44100, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)

# --- Szabolcs (WinRT) ---
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType = WindowsRuntime]
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
        $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
function Await($op, [Type]$type) {
    $t = $asTask.MakeGenericMethod($type).Invoke($null, @($op)); $t.Wait(-1) | Out-Null; $t.Result
}
$hu = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer
$hu.Voice = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices | Where-Object { $_.DisplayName -like '*Szabolcs*' } | Select-Object -First 1

foreach ($l in $lines) {
    $path = Join-Path (Resolve-Path $OutDir) ($l.id + '.wav')
    if ($l.voice -eq 'zira') {
        $zira.SetOutputToWaveFile($path, $fmt)
        $zira.Speak($l.text)
        $zira.SetOutputToNull()
    } else {
        $stream = Await ($hu.SynthesizeTextToStreamAsync($l.text)) ([Windows.Media.SpeechSynthesis.SpeechSynthesisStream])
        $reader = New-Object Windows.Storage.Streams.DataReader($stream.GetInputStreamAt(0))
        $null = Await ($reader.LoadAsync([uint32]$stream.Size)) ([uint32])
        $bytes = New-Object byte[] ([int]$stream.Size)
        $reader.ReadBytes($bytes)
        [IO.File]::WriteAllBytes($path, $bytes)
    }
    Write-Output ("{0}  {1}" -f $l.id, $l.text)
}
