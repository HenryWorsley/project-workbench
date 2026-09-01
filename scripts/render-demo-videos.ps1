param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
$ffmpeg = (Get-Command ffmpeg -ErrorAction Stop).Source
$ffprobe = (Get-Command ffprobe -ErrorAction Stop).Source
$assetRoot = Join-Path $ProjectRoot 'outputs\demo-video'
$frameRoot = Join-Path $assetRoot 'frames'
$taskLiveRoot = Join-Path $assetRoot 'task-live'
$workRoot = Join-Path $assetRoot 'work'
New-Item -ItemType Directory -Path $workRoot -Force | Out-Null
Set-Location -LiteralPath $ProjectRoot

function New-StillClip {
  param([string]$InputPath, [double]$Duration, [string]$OutputPath, [int]$Direction = 1)
  $zoomStep = if ($Direction -gt 0) { '0.00022' } else { '0.00016' }
  $filter = "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,zoompan=z='min(max(zoom,pzoom)+$zoomStep,1.045)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps=30,format=yuv420p"
  & $ffmpeg -y -loglevel error -loop 1 -framerate 30 -i $InputPath -t $Duration -vf $filter -an -c:v libx264 -preset medium -crf 17 -pix_fmt yuv420p $OutputPath
  if ($LASTEXITCODE -ne 0) { throw "静态片段生成失败：$InputPath" }
}

function New-SequenceClip {
  param([string]$InputPattern, [double]$Duration, [string]$OutputPath)
  & $ffmpeg -y -loglevel error -framerate 8 -start_number 1 -c:v mjpeg -i $InputPattern -t $Duration -vf 'scale=1920:1080:flags=lanczos,fps=30,format=yuv420p' -an -c:v libx264 -preset medium -crf 17 -pix_fmt yuv420p $OutputPath
  if ($LASTEXITCODE -ne 0) { throw "动态片段生成失败：$InputPattern" }
}

function Join-ClipsWithTransitions {
  param([array]$Clips, [double]$TransitionDuration, [string]$OutputPath)
  $arguments = @('-y', '-loglevel', 'error')
  foreach ($clip in $Clips) { $arguments += @('-i', $clip.Path) }
  $filters = @()
  $offset = [double]$Clips[0].Duration - $TransitionDuration
  $transitions = @('fade', 'smoothleft', 'fade', 'smoothup', 'fade')
  for ($index = 1; $index -lt $Clips.Count; $index += 1) {
    $left = if ($index -eq 1) { '[0:v]' } else { "[v$($index - 1)]" }
    $right = "[$index`:v]"
    $output = "[v$index]"
    $transition = $transitions[($index - 1) % $transitions.Count]
    $offsetText = $offset.ToString('0.000', [System.Globalization.CultureInfo]::InvariantCulture)
    $durationText = $TransitionDuration.ToString('0.000', [System.Globalization.CultureInfo]::InvariantCulture)
    $filters += "$left$right`xfade=transition=$transition`:duration=$durationText`:offset=$offsetText$output"
    $offset += [double]$Clips[$index].Duration - $TransitionDuration
  }
  $lastLabel = "[v$($Clips.Count - 1)]"
  $arguments += @('-filter_complex', ($filters -join ';'), '-map', $lastLabel, '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', $OutputPath)
  & $ffmpeg @arguments
  if ($LASTEXITCODE -ne 0) { throw "视频转场合成失败：$OutputPath" }
}

function New-OriginalMusic {
  param([double]$Duration, [string]$OutputPath, [ValidateSet('calm','pulse')][string]$Mode)
  $durationText = $Duration.ToString('0.000', [System.Globalization.CultureInfo]::InvariantCulture)
  if ($Mode -eq 'calm') {
    $expression = '0.045*sin(2*PI*110*t)+0.028*sin(2*PI*164.81*t)+0.018*sin(2*PI*220*t)*(0.55+0.45*cos(2*PI*0.10*t))+0.012*sin(2*PI*55*t)*(0.55+0.45*cos(2*PI*1.333*t))'
  } else {
    $expression = '0.052*sin(2*PI*123.47*t)+0.030*sin(2*PI*185*t)+0.018*sin(2*PI*246.94*t)*(0.45+0.55*cos(2*PI*0.16*t))+0.018*sin(2*PI*61.74*t)*(0.50+0.50*cos(2*PI*1.667*t))'
  }
  $source = "aevalsrc=$expression`:s=48000:d=$durationText"
  $fadeOutStart = [Math]::Max(0, $Duration - 2.2).ToString('0.000', [System.Globalization.CultureInfo]::InvariantCulture)
  $audioFilter = "highpass=f=48,lowpass=f=3600,aecho=0.8:0.35:120|240:0.13|0.07,volume=0.72,afade=t=in:st=0:d=1.2,afade=t=out:st=$fadeOutStart`:d=2.2,pan=stereo|c0=c0|c1=c0"
  & $ffmpeg -y -loglevel error -f lavfi -i $source -af $audioFilter -c:a aac -b:a 192k $OutputPath
  if ($LASTEXITCODE -ne 0) { throw "原创背景音乐生成失败：$OutputPath" }
}

function Add-MusicAndSubtitles {
  param([string]$VideoPath, [string]$MusicPath, [string]$SubtitleRelativePath, [string]$OutputPath)
  $subtitleFilter = "subtitles='$SubtitleRelativePath':force_style='FontName=Microsoft YaHei,FontSize=14,PrimaryColour=&H00FFFFFF,OutlineColour=&H400A1620,BorderStyle=3,BackColour=&H400A1620,Outline=1,Shadow=0,MarginL=32,MarginR=32,MarginV=22,Alignment=2'"
  & $ffmpeg -y -loglevel error -i $VideoPath -i $MusicPath -vf $subtitleFilter -map '0:v:0' -map '1:a:0' -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart $OutputPath
  if ($LASTEXITCODE -ne 0) { throw "字幕与音乐合成失败：$OutputPath" }
}

function New-DemoVideo {
  param([string]$Name, [array]$Scenes, [double]$TransitionDuration, [string]$SubtitleRelativePath, [ValidateSet('calm','pulse')][string]$MusicMode, [string]$FinalFileName)
  $clips = @()
  for ($index = 0; $index -lt $Scenes.Count; $index += 1) {
    $scene = $Scenes[$index]
    $clipPath = Join-Path $workRoot ("$Name-{0:D2}.mp4" -f ($index + 1))
    if ($scene.Kind -eq 'sequence') {
      New-SequenceClip -InputPattern $scene.Source -Duration $scene.Duration -OutputPath $clipPath
    } else {
      New-StillClip -InputPath $scene.Source -Duration $scene.Duration -OutputPath $clipPath -Direction $(if ($index % 2 -eq 0) { 1 } else { -1 })
    }
    $clips += [pscustomobject]@{ Path = $clipPath; Duration = [double]$scene.Duration }
  }

  $silentPath = Join-Path $workRoot "$Name-silent.mp4"
  Join-ClipsWithTransitions -Clips $clips -TransitionDuration $TransitionDuration -OutputPath $silentPath
  $duration = [double](& $ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $silentPath)
  $musicPath = Join-Path $workRoot "$Name-music.m4a"
  New-OriginalMusic -Duration $duration -OutputPath $musicPath -Mode $MusicMode
  $finalPath = Join-Path $assetRoot $FinalFileName
  Add-MusicAndSubtitles -VideoPath $silentPath -MusicPath $musicPath -SubtitleRelativePath $SubtitleRelativePath -OutputPath $finalPath
  return [pscustomobject]@{ Path = $finalPath; Duration = $duration }
}

$longScenes = @(
  @{ Kind='still'; Source=(Join-Path $frameRoot '01-overview-verdant.png'); Duration=5.0 },
  @{ Kind='still'; Source=(Join-Path $frameRoot '02-theme-tide.png'); Duration=2.3 },
  @{ Kind='still'; Source=(Join-Path $frameRoot '03-theme-solar.png'); Duration=2.3 },
  @{ Kind='still'; Source=(Join-Path $frameRoot '04-theme-iris.png'); Duration=2.3 },
  @{ Kind='still'; Source=(Join-Path $frameRoot '05-theme-signal.png'); Duration=2.3 },
  @{ Kind='still'; Source=(Join-Path $frameRoot '06-theme-tide-final.png'); Duration=3.2 },
  @{ Kind='still'; Source=(Join-Path $frameRoot '07-gantt-day.png'); Duration=3.2 },
  @{ Kind='still'; Source=(Join-Path $frameRoot '08-gantt-month.png'); Duration=3.2 },
  @{ Kind='still'; Source=(Join-Path $frameRoot '10-gantt-dragged.png'); Duration=4.4 },
  @{ Kind='still'; Source=(Join-Path $frameRoot '11-project-task-list.png'); Duration=3.4 },
  @{ Kind='still'; Source=(Join-Path $frameRoot '12-task-field.png'); Duration=4.2 },
  @{ Kind='sequence'; Source=(Join-Path $taskLiveRoot 'task-%03d.png'); Duration=4.5 },
  @{ Kind='still'; Source=(Join-Path $frameRoot '14-task-detail.png'); Duration=5.2 },
  @{ Kind='still'; Source=(Join-Path $frameRoot '15-projects.png'); Duration=3.2 },
  @{ Kind='still'; Source=(Join-Path $frameRoot '16-calendar-today.png'); Duration=3.2 },
  @{ Kind='still'; Source=(Join-Path $frameRoot '17-calendar-week.png'); Duration=3.8 },
  @{ Kind='still'; Source=(Join-Path $frameRoot '18-calendar-month.png'); Duration=3.2 },
  @{ Kind='still'; Source=(Join-Path $frameRoot '19-milestones.png'); Duration=3.2 },
  @{ Kind='still'; Source=(Join-Path $frameRoot '20-reports.png'); Duration=4.5 },
  @{ Kind='still'; Source=(Join-Path $frameRoot '21-settings.png'); Duration=3.5 },
  @{ Kind='still'; Source=(Join-Path $frameRoot '06-theme-tide-final.png'); Duration=4.5 }
)

$shortScenes = @(
  @{ Kind='still'; Source=(Join-Path $frameRoot '01-overview-verdant.png'); Duration=2.8 },
  @{ Kind='still'; Source=(Join-Path $frameRoot '02-theme-tide.png'); Duration=1.2 },
  @{ Kind='still'; Source=(Join-Path $frameRoot '03-theme-solar.png'); Duration=1.2 },
  @{ Kind='still'; Source=(Join-Path $frameRoot '04-theme-iris.png'); Duration=1.2 },
  @{ Kind='still'; Source=(Join-Path $frameRoot '05-theme-signal.png'); Duration=1.2 },
  @{ Kind='still'; Source=(Join-Path $frameRoot '06-theme-tide-final.png'); Duration=1.8 },
  @{ Kind='still'; Source=(Join-Path $frameRoot '07-gantt-day.png'); Duration=2.0 },
  @{ Kind='still'; Source=(Join-Path $frameRoot '08-gantt-month.png'); Duration=2.0 },
  @{ Kind='still'; Source=(Join-Path $frameRoot '10-gantt-dragged.png'); Duration=3.0 },
  @{ Kind='still'; Source=(Join-Path $frameRoot '12-task-field.png'); Duration=2.3 },
  @{ Kind='sequence'; Source=(Join-Path $taskLiveRoot 'task-%03d.png'); Duration=4.5 },
  @{ Kind='still'; Source=(Join-Path $frameRoot '13-task-hover-tooltip.png'); Duration=2.8 },
  @{ Kind='still'; Source=(Join-Path $frameRoot '14-task-detail.png'); Duration=2.7 },
  @{ Kind='still'; Source=(Join-Path $frameRoot '06-theme-tide-final.png'); Duration=2.6 }
)

$longResult = New-DemoVideo -Name 'long' -Scenes $longScenes -TransitionDuration 0.25 -SubtitleRelativePath 'outputs/demo-video/long.zh-CN.srt' -MusicMode calm -FinalFileName '项目工作台-完整演示-长版.mp4'
$shortResult = New-DemoVideo -Name 'short' -Scenes $shortScenes -TransitionDuration 0.20 -SubtitleRelativePath 'outputs/demo-video/short.zh-CN.srt' -MusicMode pulse -FinalFileName '项目工作台-特色功能-短版.mp4'

$longSize = (Get-Item -LiteralPath $longResult.Path).Length
$shortSize = (Get-Item -LiteralPath $shortResult.Path).Length
[pscustomobject]@{
  LongVideo = $longResult.Path
  LongDuration = [Math]::Round($longResult.Duration, 2)
  LongSizeMB = [Math]::Round($longSize / 1MB, 2)
  ShortVideo = $shortResult.Path
  ShortDuration = [Math]::Round($shortResult.Duration, 2)
  ShortSizeMB = [Math]::Round($shortSize / 1MB, 2)
} | Format-List
