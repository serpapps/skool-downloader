// Simple Mp4Sample class for compatibility with FastStream
export class Mp4Sample {
  constructor(isKeyFrame, duration, size, compositionTimeOffset) {
    this.is_sync = isKeyFrame;
    this.duration = duration;
    this.size = size;
    this.cts = compositionTimeOffset || 0;
    this.dts = 0; // Will be set by the transmuxer
    this.pts = this.dts + this.cts;
  }
}