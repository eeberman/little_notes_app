param([string]$Version = '1.1.0')
$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path $PSScriptRoot -Parent
$executable = Join-Path $projectRoot "out-$Version\Getting Stuff Done-win32-x64\Getting Stuff Done.exe"
if (-not (Test-Path -LiteralPath $executable -PathType Leaf)) {
  throw "Packaged executable not found: $executable"
}

$shell = New-Object -ComObject WScript.Shell
$desktopPath = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Getting Stuff Done.lnk'
$startMenuDirectory = Join-Path ([Environment]::GetFolderPath('Programs')) 'Getting Stuff Done'
[System.IO.Directory]::CreateDirectory($startMenuDirectory) | Out-Null

$definitions = @(
  @{ Path = $desktopPath; Arguments = ''; Hotkey = ''; Description = "Getting Stuff Done $Version" },
  @{ Path = (Join-Path $startMenuDirectory 'Getting Stuff Done - New Note.lnk'); Arguments = '--new-note'; Hotkey = 'CTRL+ALT+G'; Description = 'Open a new Getting Stuff Done note' },
  @{ Path = (Join-Path $startMenuDirectory 'Getting Stuff Done - Today.lnk'); Arguments = '--today'; Hotkey = 'CTRL+ALT+D'; Description = "Open today's Getting Stuff Done note" }
)

foreach ($definition in $definitions) {
  $shortcut = $shell.CreateShortcut($definition.Path)
  $shortcut.TargetPath = $executable
  $shortcut.Arguments = $definition.Arguments
  $shortcut.WorkingDirectory = Split-Path -Parent $executable
  $shortcut.IconLocation = "$executable,0"
  $shortcut.Description = $definition.Description
  $shortcut.Hotkey = $definition.Hotkey
  $shortcut.Save()
}

$verification = foreach ($definition in $definitions) {
  $shortcut = $shell.CreateShortcut($definition.Path)
  $expectedHotkey = $definition.Hotkey.Replace('CTRL+ALT+', 'ALT+CTRL+')
  if ($shortcut.TargetPath -ne $executable -or
      $shortcut.Arguments -ne $definition.Arguments -or
      $shortcut.WorkingDirectory -ne (Split-Path -Parent $executable) -or
      $shortcut.Hotkey.ToUpperInvariant() -ne $expectedHotkey) {
    throw "Shortcut verification failed: $($definition.Path)"
  }
  [pscustomobject]@{
    Path = $definition.Path
    TargetPath = $shortcut.TargetPath
    Arguments = $shortcut.Arguments
    WorkingDirectory = $shortcut.WorkingDirectory
    Hotkey = $shortcut.Hotkey
  }
}

$verification
