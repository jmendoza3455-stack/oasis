import { clipDuration, REEL, type Clip } from "./spec";

// Argumentos de ffmpeg para cada paso del render (puros: el script solo los ejecuta).

const CROP: Record<Clip["crop"], [string, string]> = {
  center: ["(iw-ow)/2", "(ih-oh)/2"],
  left: ["0", "(ih-oh)/2"],
  right: ["iw-ow", "(ih-oh)/2"],
  top: ["(iw-ow)/2", "0"],
  bottom: ["(iw-ow)/2", "ih-oh"],
};

const AUDIO_OUT = ["-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2"];
const VIDEO_TMP = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "17", "-pix_fmt", "yuv420p"];
const n = (v: number) => String(Math.round(v * 1000) / 1000);

/** Corte de un clip: recorte a vertical, 30 fps y audio estéreo 48 kHz (silencio si no tiene o va muteado). */
export function segmentArgs(clip: Clip, src: string, hasAudio: boolean, out: string): string[] {
  const dur = clipDuration(clip);
  const { width: W, height: H, fps } = REEL;
  const [x, y] = CROP[clip.crop];
  // Zoom lento: se escala por cuadro de 1 a 1.06 (o al revés) y se vuelve a recortar al centro
  const z = clip.motion === "zoom-in" ? `(1+0.06*t/${n(dur)})` : `(1.06-0.06*t/${n(dur)})`;
  const motion =
    clip.motion === "none"
      ? ""
      : `,scale=w='trunc(${W}*${z}/2)*2':h='trunc(${H}*${z}/2)*2':eval=frame,crop=${W}:${H}`;
  const video = `[0:v]setpts=(PTS-STARTPTS)/${clip.speed},scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}:${x}:${y},fps=${fps}${motion},setsar=1,format=yuv420p[v]`;
  const audio =
    hasAudio && !clip.mute
      ? `[0:a]asetpts=PTS-STARTPTS,atempo=${clip.speed},aresample=48000,aformat=channel_layouts=stereo[a]`
      : `[1:a]anull[a]`;
  return [
    "-y",
    "-ss",
    n(clip.in),
    "-t",
    n(clip.out - clip.in),
    "-i",
    src,
    "-f",
    "lavfi",
    "-t",
    n(dur),
    "-i",
    "anullsrc=r=48000:cl=stereo",
    "-filter_complex",
    `${video};${audio}`,
    "-map",
    "[v]",
    "-map",
    "[a]",
    "-t",
    n(dur),
    ...VIDEO_TMP,
    ...AUDIO_OUT,
    out,
  ];
}

/** Cierre: fondo verde de la marca con el isotipo (los textos van en el ASS). */
export function endCardArgs(isotipoPng: string, out: string): string[] {
  const { width: W, height: H, fps, endCardSeconds: d } = REEL;
  return [
    "-y",
    "-f",
    "lavfi",
    "-i",
    `color=c=0x374031:s=${W}x${H}:r=${fps}:d=${d}`,
    "-i",
    isotipoPng,
    "-f",
    "lavfi",
    "-t",
    String(d),
    "-i",
    "anullsrc=r=48000:cl=stereo",
    "-filter_complex",
    `[1:v]scale=300:300[iso];[0:v][iso]overlay=(W-w)/2:600,format=yuv420p[v]`,
    "-map",
    "[v]",
    "-map",
    "2:a",
    "-t",
    String(d),
    ...VIDEO_TMP,
    ...AUDIO_OUT,
    out,
  ];
}

export function concatArgs(listFile: string, out: string): string[] {
  return ["-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", out];
}

/** Paso final: textos de la marca, fundido inicial, volumen a −14 LUFS y H.264 apto para redes. */
export function finalArgs(input: string, assFile: string, fontsDir: string, out: string): string[] {
  return [
    "-y",
    "-i",
    input,
    "-vf",
    `subtitles=filename=${assFile}:fontsdir=${fontsDir},fade=t=in:st=0:d=0.25`,
    "-af",
    "loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000",
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "20",
    "-profile:v",
    "high",
    "-pix_fmt",
    "yuv420p",
    "-r",
    String(REEL.fps),
    "-c:a",
    "aac",
    "-b:a",
    "160k",
    "-ar",
    "48000",
    "-ac",
    "2",
    "-movflags",
    "+faststart",
    out,
  ];
}

export function coverArgs(video: string, at: number, out: string): string[] {
  return ["-y", "-ss", n(at), "-i", video, "-frames:v", "1", "-q:v", "2", out];
}
