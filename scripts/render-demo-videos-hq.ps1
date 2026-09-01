param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
$ffmpeg = (Get-Command ffmpeg -ErrorAction Stop).Source
$ffprobe = (Get-Command ffprobe -ErrorAction Stop).Source
$assetRoot = Join-Path $ProjectRoot 'outputs\demo-video-v2'
$frameRoot = Join-Path $assetRoot 'frames'
$themeRoot = Join-Path $assetRoot 'theme-seq'
$dragRoot = Join-Path $assetRoot 'drag-seq'
$taskRoot = Join-Path $assetRoot 'task-seq'
$workRoot = Join-Path $assetRoot 'work'
New-Item -ItemType Directory -Path $workRoot -Force | Out-Null
Set-Location -LiteralPath $ProjectRoot

$fullFilter = 'scale=2560:1440:flags=lanczos,setsar=1,unsharp=5:5:0.30:5:5:0,fps=30,format=yuv420p'
$contentFilter = 'crop=2370:1333:190:55,scale=2560:1440:flags=lanczos,setsar=1,unsharp=5:5:0.32:5:5:0,fps=30,format=yuv420p'
$ganttFilter = 'crop=1400:788:300:250,scale=2560:1440:flags=lanczos,setsar=1,unsharp=5:5:0.38:5:5:0,fps=30,format=yuv420p'
$taskFilter = 'crop=1200:675:650:190,scale=2560:1440:flags=lanczos,setsar=1,unsharp=5:5:0.44:5:5:0,fps=30,format=yuv420p'
$themeFilter = 'split=2[base][detail];[detail]crop=700:76:1800:0,scale=1400:152:flags=lanczos,pad=1424:176:12:12:color=white,drawbox=x=0:y=0:w=iw:h=ih:color=0x164D62@0.38:t=4[pip];[base][pip]overlay=1080:60,unsharp=5:5:0.32:5:5:0,fps=30,format=yuv420p'

function New-StillClip {
  param([string]$InputPath, [double]$Duration, [string]$Filter, [string]$OutputPath)
  & $ffmpeg -y -loglevel error -loop 1 -framerate 30 -i $InputPath -t $Duration -vf $Filter -an -c:v libx264 -preset medium -crf 11 -pix_fmt yuv420p $OutputPath
  if ($LASTEXITCODE -ne 0) { throw "静态片段生成失败：$InputPath" }
}

function New-SequenceClip {
  param([string]$InputPattern, [double]$Duration, [string]$Filter, [string]$OutputPath)
  & $ffmpeg -y -loglevel error -framerate 8 -start_number 1 -c:v mjpeg -i $InputPattern -t $Duration -vf $Filter -an -c:v libx264 -preset medium -crf 11 -pix_fmt yuv420p $OutputPath
  if ($LASTEXITCODE -ne 0) { throw "动态片段生成失败：$InputPattern" }
}

function Join-Clips {
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
  $arguments += @('-filter_complex', ($filters -join ';'), '-map', $lastLabel, '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '11', '-pix_fmt', 'yuv420p', $OutputPath)
  & $ffmpeg @arguments
  if ($LASTEXITCODE -ne 0) { throw "视频转场合成失败：$OutputPath" }
}

function New-OriginalMusic {
  param([double]$Duration, [string]$OutputPath, [ValidateSet('calm','pulse')][string]$Mode)
  $durationText = $Duration.ToString('0.000', [System.Globalization.CultureInfo]::InvariantCulture)
  if ($Mode -eq 'calm') {
    $expression = '0.040*sin(2*PI*110*t)+0.024*sin(2*PI*164.81*t)+0.016*sin(2*PI*220*t)*(0.55+0.45*cos(2*PI*0.10*t))+0.010*sin(2*PI*55*t)*(0.55+0.45*cos(2*PI*1.333*t))'
  } else {
    $expression = '0.048*sin(2*PI*123.47*t)+0.026*sin(2*PI*185*t)+0.017*sin(2*PI*246.94*t)*(0.45+0.55*cos(2*PI*0.16*t))+0.015*sin(2*PI*61.74*t)*(0.50+0.50*cos(2*PI*1.667*t))'
  }
  $source = "aevalsrc=$expression`:s=48000:d=$durationText"
  $fadeOutStart = [Math]::Max(0, $Duration - 2.2).ToString('0.000', [System.Globalization.CultureInfo]::InvariantCulture)
  $audioFilter = "highpass=f=48,lowpass=f=3600,aecho=0.8:0.35:120|240:0.13|0.07,volume=0.72,afade=t=in:st=0:d=1.2,afade=t=out:st=$fadeOutStart`:d=2.2,pan=stereo|c0=c0|c1=c0"
  & $ffmpeg -y -loglevel error -f lavfi -i $source -af $audioFilter -c:a aac -b:a 192k $OutputPath
  if ($LASTEXITCODE -ne 0) { throw "背景音乐生成失败：$OutputPath" }
}

function Add-MusicAndSubtitles {
  param([string]$VideoPath, [string]$MusicPath, [string]$SubtitleRelativePath, [string]$OutputPath)
  $style = 'FontName=Microsoft YaHei,FontSize=11,PrimaryColour=&H00FFFFFF,OutlineColour=&H380A1620,BorderStyle=3,BackColour=&H380A1620,Outline=1,Shadow=0,MarginL=34,MarginR=34,MarginV=20,Alignment=2'
  $subtitleFilter = "subtitles='$SubtitleRelativePath':force_style='$style'"
  & $ffmpeg -y -loglevel error -i $VideoPath -i $MusicPath -vf $subtitleFilter -map '0:v:0' -map '1:a:0' -c:v libx264 -preset medium -crf 15 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart $OutputPath
  if ($LASTEXITCODE -ne 0) { throw "字幕与音乐合成失败：$OutputPath" }
}

function New-DemoVideo {
  param([string]$Name, [array]$Scenes, [double]$TransitionDuration, [string]$SubtitleRelativePath, [ValidateSet('calm','pulse')][string]$MusicMode, [string]$FinalFileName)
  $clips = @()
  for ($index = 0; $index -lt $Scenes.Count; $index += 1) {
    $scene = $Scenes[$index]
    $clipPath = Join-Path $workRoot ("$Name-{0:D2}.mp4" -f ($index + 1))
    if ($scene.Kind -eq 'sequence') {
      New-SequenceClip -InputPattern $scene.Source -Duration $scene.Duration -Filter $scene.Filter -OutputPath $clipPath
    } else {
      New-StillClip -InputPath $scene.Source -Duration $scene.Duration -Filter $scene.Filter -OutputPath $clipPath
    }
    $clips += [pscustomobject]@{ Path = $clipPath; Duration = [double]$scene.Duration }
  }
  $silentPath = Join-Path $workRoot "$Name-silent.mp4"
  Join-Clips -Clips $clips -TransitionDuration $TransitionDuration -OutputPath $silentPath
  $duration = [double](& $ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $silentPath)
  $musicPath = Join-Path $workRoot "$Name-music.m4a"
  New-OriginalMusic -Duration $duration -OutputPath $musicPath -Mode $MusicMode
  $finalPath = Join-Path $assetRoot $FinalFileName
  Add-MusicAndSubtitles -VideoPath $silentPath -MusicPath $musicPath -SubtitleRelativePath $SubtitleRelativePath -OutputPath $finalPath
  return [pscustomobject]@{ Path = $finalPath; Duration = $duration }
}

$longScenes = @(
  @{ Kind='still'; Source=(Join-Path $frameRoot 'overview.jpg'); Duration=4.0; Filter=$fullFilter },
  @{ Kind='sequence'; Source=(Join-Path $themeRoot 'theme-%03d.jpg'); Duration=10.0; Filter=$themeFilter },
  @{ Kind='sequence'; Source=(Join-Path $dragRoot 'drag-%03d.jpg'); Duration=5.75; Filter=$ganttFilter },
  @{ Kind='still'; Source=(Join-Path $frameRoot 'gantt-after-move.jpg'); Duration=3.0; Filter=$ganttFilter },
  @{ Kind='sequence'; Source=(Join-Path $taskRoot 'task-%03d.jpg'); Duration=8.0; Filter=$taskFilter },
  @{ Kind='still'; Source=(Join-Path $frameRoot 'task-detail.jpg'); Duration=4.5; Filter=$contentFilter },
  @{ Kind='still'; Source=(Join-Path $frameRoot 'project-task-list.jpg'); Duration=3.4; Filter=$contentFilter },
  @{ Kind='still'; Source=(Join-Path $frameRoot 'projects.jpg'); Duration=3.4; Filter=$contentFilter },
  @{ Kind='still'; Source=(Join-Path $frameRoot 'calendar-today.jpg'); Duration=3.3; Filter=$contentFilter },
  @{ Kind='still'; Source=(Join-Path $frameRoot 'calendar-week.jpg'); Duration=4.2; Filter=$contentFilter },
  @{ Kind='still'; Source=(Join-Path $frameRoot 'calendar-month.jpg'); Duration=3.4; Filter=$contentFilter },
  @{ Kind='still'; Source=(Join-Path $frameRoot 'calendar-milestones.jpg'); Duration=3.4; Filter=$contentFilter },
  @{ Kind='still'; Source=(Join-Path $frameRoot 'reports.jpg'); Duration=4.0; Filter=$contentFilter },
  @{ Kind='still'; Source=(Join-Path $frameRoot 'settings.jpg'); Duration=3.4; Filter=$contentFilter },
  @{ Kind='still'; Source=(Join-Path $frameRoot 'overview-final.jpg'); Duration=4.0; Filter=$fullFilter }
)

$shortScenes = @(
  @{ Kind='still'; Source=(Join-Path $frameRoot 'overview.jpg'); Duration=2.8; Filter=$fullFilter },
  @{ Kind='sequence'; Source=(Join-Path $themeRoot 'theme-%03d.jpg'); Duration=10.0; Filter=$themeFilter },
  @{ Kind='sequence'; Source=(Join-Path $dragRoot 'drag-%03d.jpg'); Duration=5.75; Filter=$ganttFilter },
  @{ Kind='sequence'; Source=(Join-Path $taskRoot 'task-%03d.jpg'); Duration=8.0; Filter=$taskFilter },
  @{ Kind='still'; Source=(Join-Path $frameRoot 'calendar-week.jpg'); Duration=4.2; Filter=$contentFilter },
  @{ Kind='still'; Source=(Join-Path $frameRoot 'overview-final.jpg'); Duration=3.0; Filter=$fullFilter }
)

$long = New-DemoVideo -Name 'long-hq' -Scenes $longScenes -TransitionDuration 0.35 -SubtitleRelativePath 'outputs/demo-video-v2/long-hq.zh-CN.srt' -MusicMode calm -FinalFileName '项目工作台-完整演示-2K高清重制版.mp4'
$short = New-DemoVideo -Name 'short-hq' -Scenes $shortScenes -TransitionDuration 0.30 -SubtitleRelativePath 'outputs/demo-video-v2/short-hq.zh-CN.srt' -MusicMode pulse -FinalFileName '项目工作台-特色功能-2K高清重制版.mp4'

[pscustomobject]@{
  LongVideo = $long.Path
  LongDuration = [Math]::Round($long.Duration, 1)
  LongSizeMB = [Math]::Round((Get-Item -LiteralPath $long.Path).Length / 1MB, 2)
  ShortVideo = $short.Path
  ShortDuration = [Math]::Round($short.Duration, 1)
  ShortSizeMB = [Math]::Round((Get-Item -LiteralPath $short.Path).Length / 1MB, 2)
}
