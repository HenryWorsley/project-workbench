param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
$ffmpeg = (Get-Command ffmpeg -ErrorAction Stop).Source
$ffprobe = (Get-Command ffprobe -ErrorAction Stop).Source
$assetRoot = Join-Path $ProjectRoot 'outputs\demo-video-v3'
$frameRoot = Join-Path $assetRoot 'frames'
$workRoot = Join-Path $assetRoot 'work'
New-Item -ItemType Directory -Path $workRoot -Force | Out-Null
Set-Location -LiteralPath $ProjectRoot

function Format-SrtTime {
  param([double]$Seconds)
  $span = [TimeSpan]::FromSeconds([Math]::Max(0, $Seconds))
  return '{0:00}:{1:00}:{2:00},{3:000}' -f [Math]::Floor($span.TotalHours), $span.Minutes, $span.Seconds, $span.Milliseconds
}

function Write-SceneSubtitles {
  param(
    [array]$Scenes,
    [double]$TransitionDuration,
    [string]$OutputPath
  )

  $lines = [System.Collections.Generic.List[string]]::new()
  $start = 0.0
  for ($index = 0; $index -lt $Scenes.Count; $index += 1) {
    $scene = $Scenes[$index]
    $captionEnd = $start + [double]$scene.Duration - 0.12
    $lines.Add([string]($index + 1))
    $lines.Add("$(Format-SrtTime $start) --> $(Format-SrtTime $captionEnd)")
    $lines.Add([string]$scene.Caption)
    $lines.Add('')
    $start += [double]$scene.Duration - $TransitionDuration
  }
  [System.IO.File]::WriteAllLines($OutputPath, $lines, [System.Text.UTF8Encoding]::new($false))
}

function New-OriginalMusic {
  param(
    [double]$Duration,
    [string]$OutputPath,
    [ValidateSet('calm','pulse')][string]$Mode
  )

  $durationText = $Duration.ToString('0.000', [System.Globalization.CultureInfo]::InvariantCulture)
  if ($Mode -eq 'calm') {
    $expression = '0.038*sin(2*PI*110*t)+0.022*sin(2*PI*164.81*t)+0.014*sin(2*PI*220*t)*(0.55+0.45*cos(2*PI*0.10*t))+0.009*sin(2*PI*55*t)*(0.55+0.45*cos(2*PI*1.333*t))'
  } else {
    $expression = '0.044*sin(2*PI*123.47*t)+0.024*sin(2*PI*185*t)+0.016*sin(2*PI*246.94*t)*(0.45+0.55*cos(2*PI*0.16*t))+0.013*sin(2*PI*61.74*t)*(0.50+0.50*cos(2*PI*1.667*t))'
  }
  $source = "aevalsrc=$expression`:s=48000:d=$durationText"
  $fadeOutStart = [Math]::Max(0, $Duration - 2.0).ToString('0.000', [System.Globalization.CultureInfo]::InvariantCulture)
  $audioFilter = "highpass=f=48,lowpass=f=3600,aecho=0.8:0.35:120|240:0.12|0.06,volume=0.68,afade=t=in:st=0:d=1.0,afade=t=out:st=$fadeOutStart`:d=2.0,pan=stereo|c0=c0|c1=c0"
  & $ffmpeg -y -loglevel error -f lavfi -i $source -af $audioFilter -c:a aac -b:a 192k $OutputPath
  if ($LASTEXITCODE -ne 0) { throw "背景音乐生成失败：$OutputPath" }
}

function New-SlideshowVideo {
  param(
    [string]$Name,
    [array]$Scenes,
    [double]$TransitionDuration,
    [ValidateSet('calm','pulse')][string]$MusicMode,
    [string]$FinalFileName
  )

  $duration = ($Scenes | Measure-Object -Property Duration -Sum).Sum - ($Scenes.Count - 1) * $TransitionDuration
  $subtitlePath = Join-Path $assetRoot "$Name.zh-CN.srt"
  Write-SceneSubtitles -Scenes $Scenes -TransitionDuration $TransitionDuration -OutputPath $subtitlePath

  $musicPath = Join-Path $workRoot "$Name-music.m4a"
  New-OriginalMusic -Duration $duration -OutputPath $musicPath -Mode $MusicMode

  $arguments = [System.Collections.Generic.List[string]]::new()
  $arguments.AddRange([string[]]@('-y', '-loglevel', 'error'))
  foreach ($scene in $Scenes) {
    $durationText = ([double]$scene.Duration).ToString('0.000', [System.Globalization.CultureInfo]::InvariantCulture)
    $arguments.AddRange([string[]]@('-loop', '1', '-framerate', '30', '-t', $durationText, '-i', [string]$scene.Source))
  }
  $arguments.AddRange([string[]]@('-i', $musicPath))

  $filters = [System.Collections.Generic.List[string]]::new()
  for ($index = 0; $index -lt $Scenes.Count; $index += 1) {
    $filters.Add("[$index`:v]fps=30,setsar=1,format=yuv420p[base$index]")
  }

  $offset = [double]$Scenes[0].Duration - $TransitionDuration
  for ($index = 1; $index -lt $Scenes.Count; $index += 1) {
    $left = if ($index -eq 1) { '[base0]' } else { "[mix$($index - 1)]" }
    $right = "[base$index]"
    $offsetText = $offset.ToString('0.000', [System.Globalization.CultureInfo]::InvariantCulture)
    $transitionText = $TransitionDuration.ToString('0.000', [System.Globalization.CultureInfo]::InvariantCulture)
    $filters.Add("$left$right`xfade=transition=fade`:duration=$transitionText`:offset=$offsetText[mix$index]")
    $offset += [double]$Scenes[$index].Duration - $TransitionDuration
  }

  $subtitleRelativePath = "outputs/demo-video-v3/$Name.zh-CN.srt"
  $style = 'FontName=Microsoft YaHei,FontSize=9.5,PrimaryColour=&H00FFFFFF,OutlineColour=&H32081118,BorderStyle=3,BackColour=&H66081118,Outline=1,Shadow=0,MarginL=42,MarginR=42,MarginV=24,Alignment=2'
  $filters.Add("[mix$($Scenes.Count - 1)]subtitles='$subtitleRelativePath':force_style='$style'[video]")

  $finalPath = Join-Path $assetRoot $FinalFileName
  $audioIndex = $Scenes.Count
  $arguments.AddRange([string[]]@(
    '-filter_complex', ($filters -join ';'),
    '-map', '[video]',
    '-map', "$audioIndex`:a:0",
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-tune', 'stillimage',
    '-crf', '9',
    '-pix_fmt', 'yuv420p',
    '-profile:v', 'high',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-shortest',
    '-movflags', '+faststart',
    $finalPath
  ))

  & $ffmpeg @arguments
  if ($LASTEXITCODE -ne 0) { throw "图片动画生成失败：$finalPath" }

  $probe = & $ffprobe -v error -select_streams v:0 -show_entries stream=width,height,codec_name,pix_fmt -show_entries format=duration,size -of json $finalPath | ConvertFrom-Json
  return [pscustomobject]@{
    Path = $finalPath
    Duration = [Math]::Round([double]$probe.format.duration, 1)
    SizeMB = [Math]::Round([double]$probe.format.size / 1MB, 2)
    Resolution = "$($probe.streams[0].width)x$($probe.streams[0].height)"
    Codec = $probe.streams[0].codec_name
    PixelFormat = $probe.streams[0].pix_fmt
  }
}

$longScenes = @(
  @{ Source=(Join-Path $frameRoot '23-overview-final.png'); Duration=3.4; Caption='项目工作台：计划、执行、记录与复盘集中在一处' },
  @{ Source=(Join-Path $frameRoot '02-theme-ink.png'); Duration=2.2; Caption='松墨：沉静克制，适合长时间工作' },
  @{ Source=(Join-Path $frameRoot '03-theme-tide.png'); Duration=2.2; Caption='潮汐：清澈舒展，强调任务节奏' },
  @{ Source=(Join-Path $frameRoot '04-theme-solar.png'); Duration=2.2; Caption='日晷：温暖醒目，强化紧迫状态' },
  @{ Source=(Join-Path $frameRoot '05-theme-iris.png'); Duration=2.2; Caption='鸢尾：精致通透，柔和但有层次' },
  @{ Source=(Join-Path $frameRoot '06-theme-signal.png'); Duration=2.4; Caption='信号：锐利明快，五套主题即时切换' },
  @{ Source=(Join-Path $frameRoot '18-drag-before.png'); Duration=3.0; Caption='拖动前：任务排期清晰落在时间轴上' },
  @{ Source=(Join-Path $frameRoot '19-drag-after.png'); Duration=3.2; Caption='整体拖动后：交互原型打磨自动后移 5 天' },
  @{ Source=(Join-Path $frameRoot '20-gantt-day.png'); Duration=2.4; Caption='按日查看：适合近期精细安排' },
  @{ Source=(Join-Path $frameRoot '21-gantt-week.png'); Duration=2.4; Caption='按周查看：周一浅色分栏，便于周计划' },
  @{ Source=(Join-Path $frameRoot '22-gantt-month.png'); Duration=2.4; Caption='按月查看：快速掌握项目全局' },
  @{ Source=(Join-Path $frameRoot '07-task-field.png'); Duration=3.6; Caption='任务动力场：紧迫任务更大、更靠近视觉中心' },
  @{ Source=(Join-Path $frameRoot '08-task-hover.png'); Duration=4.0; Caption='停留一秒后放大，并显示负责人、截止时间与完成度' },
  @{ Source=(Join-Path $frameRoot '09-task-detail.png'); Duration=3.4; Caption='任务详情同时记录计划时间、进度与本次工作更新' },
  @{ Source=(Join-Path $frameRoot '10-projects.png'); Duration=3.0; Caption='项目可以独立存在，也可以挂在主项目下形成层级' },
  @{ Source=(Join-Path $frameRoot '11-project-task-list.png'); Duration=3.0; Caption='项目任务采用紧凑文本块，减少下拉浏览' },
  @{ Source=(Join-Path $frameRoot '12-calendar-today.png'); Duration=2.7; Caption='日程：清晰查看今日工作' },
  @{ Source=(Join-Path $frameRoot '13-calendar-week.png'); Duration=3.2; Caption='本周视图：按天组织关键事项' },
  @{ Source=(Join-Path $frameRoot '14-calendar-month.png'); Duration=2.7; Caption='本月视图：整体检查时间分布' },
  @{ Source=(Join-Path $frameRoot '15-calendar-milestones.png'); Duration=2.7; Caption='里程碑视图：聚焦重要交付节点' },
  @{ Source=(Join-Path $frameRoot '16-reports.png'); Duration=3.0; Caption='报表：项目进度与执行风险一页汇总' },
  @{ Source=(Join-Path $frameRoot '17-settings.png'); Duration=2.8; Caption='设置：本地数据可导入、导出与备份' },
  @{ Source=(Join-Path $frameRoot '23-overview-final.png'); Duration=3.4; Caption='数据自己掌控，功能可以持续扩展' }
)

$shortScenes = @(
  @{ Source=(Join-Path $frameRoot '23-overview-final.png'); Duration=2.8; Caption='一套由自己掌控的项目工作台' },
  @{ Source=(Join-Path $frameRoot '02-theme-ink.png'); Duration=1.6; Caption='松墨' },
  @{ Source=(Join-Path $frameRoot '03-theme-tide.png'); Duration=1.6; Caption='潮汐' },
  @{ Source=(Join-Path $frameRoot '04-theme-solar.png'); Duration=1.6; Caption='日晷' },
  @{ Source=(Join-Path $frameRoot '05-theme-iris.png'); Duration=1.6; Caption='鸢尾' },
  @{ Source=(Join-Path $frameRoot '06-theme-signal.png'); Duration=1.8; Caption='信号：五套全局主题即时切换' },
  @{ Source=(Join-Path $frameRoot '18-drag-before.png'); Duration=2.6; Caption='拖动前' },
  @{ Source=(Join-Path $frameRoot '19-drag-after.png'); Duration=2.8; Caption='整体后移 5 天，排期同步更新' },
  @{ Source=(Join-Path $frameRoot '07-task-field.png'); Duration=3.0; Caption='任务动力场：紧迫性决定位置与大小' },
  @{ Source=(Join-Path $frameRoot '08-task-hover.png'); Duration=3.8; Caption='悬停放大，任务信息清晰呈现' },
  @{ Source=(Join-Path $frameRoot '13-calendar-week.png'); Duration=3.0; Caption='今日、本周、本月与里程碑日程' },
  @{ Source=(Join-Path $frameRoot '23-overview-final.png'); Duration=2.8; Caption='项目工作台 · 数据自己掌控' }
)

$long = New-SlideshowVideo -Name 'long-slideshow' -Scenes $longScenes -TransitionDuration 0.28 -MusicMode calm -FinalFileName '项目工作台-完整演示-原生截图版.mp4'
$short = New-SlideshowVideo -Name 'short-slideshow' -Scenes $shortScenes -TransitionDuration 0.24 -MusicMode pulse -FinalFileName '项目工作台-特色功能-原生截图版.mp4'

[pscustomobject]@{
  LongVideo = $long.Path
  LongDuration = $long.Duration
  LongSizeMB = $long.SizeMB
  LongResolution = $long.Resolution
  LongCodec = $long.Codec
  LongPixelFormat = $long.PixelFormat
  ShortVideo = $short.Path
  ShortDuration = $short.Duration
  ShortSizeMB = $short.SizeMB
  ShortResolution = $short.Resolution
  ShortCodec = $short.Codec
  ShortPixelFormat = $short.PixelFormat
}
