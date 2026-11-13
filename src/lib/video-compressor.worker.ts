import { ALL_FORMATS, BlobSource, BufferTarget, Conversion, Input, Mp4OutputFormat, Output } from 'mediabunny';

const presets = {
  smaller: { width: 854, height: 480, ratio: 0.35, ceiling: 1_000_000 },
  balanced: { width: 1280, height: 720, ratio: 0.55, ceiling: 2_500_000 },
  higher: { width: 1920, height: 1080, ratio: 0.75, ceiling: 5_000_000 },
};

self.onmessage = async ({ data: { file, preset } }: MessageEvent<{ file: File; preset: keyof typeof presets }>) => {
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  try {
    const track = await input.getPrimaryVideoTrack();
    const duration = await input.computeDuration();
    if (!track || !Number.isFinite(duration) || duration <= 0 || duration > 300) {
      self.postMessage({ error: 'Choose a readable video up to five minutes long.' });
      return;
    }
    const { width, height, ratio, ceiling } = presets[preset];
    const sourceWidth = track.displayWidth, sourceHeight = track.displayHeight;
    if (sourceWidth * sourceHeight > 3840 * 2160 || Math.max(sourceWidth, sourceHeight) > 4096) {
      self.postMessage({ error: 'Choose a video up to 4K resolution.' });
      return;
    }
    const landscape = sourceWidth >= sourceHeight;
    const scale = Math.min(1, (landscape ? width : height) / sourceWidth, (landscape ? height : width) / sourceHeight);
    const even = (value: number) => Math.max(2, Math.floor(value / 2) * 2);
    const audio = await input.getPrimaryAudioTrack();
    const audioBudget = audio ? 96_000 : 0;
    const target = new BufferTarget();
    const conversion = await Conversion.init({
      input,
      output: new Output({ format: new Mp4OutputFormat(), target }),
      tracks: 'primary',
      video: {
        codec: 'avc', forceTranscode: true, width: even(sourceWidth * scale), height: even(sourceHeight * scale), fit: 'contain',
        bitrate: Math.max(80_000, Math.min(ceiling, Math.floor(file.size * 8 / duration * ratio) - audioBudget)),
      },
      audio: { codec: 'aac', bitrate: audioBudget || 96_000 },
      showWarnings: false,
    });
    if (!conversion.isValid || conversion.discardedTracks.some(({ track: omitted }) => omitted === track || omitted === audio)) {
      self.postMessage({ error: 'This browser cannot encode the video or audio for MP4. Try desktop Chrome or Edge with a different source file.' });
      return;
    }
    conversion.onProgress = progress => self.postMessage({ progress: Math.round(progress * 100) });
    await conversion.execute();
    if (!target.buffer?.byteLength) throw new Error('Empty output');
    if (target.buffer.byteLength >= file.size) {
      self.postMessage({ error: 'This setting did not make the file smaller. Keep the original or try a smaller preset.' });
      return;
    }
    self.postMessage({ blob: new Blob([target.buffer], { type: 'video/mp4' }) });
  } catch {
    self.postMessage({ error: 'Could not compress this video. Try a supported MP4, WebM or MOV in desktop Chrome or Edge.' });
  } finally { input.dispose(); }
};
