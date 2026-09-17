import { HLS2MP4 } from './hls2mp4.mjs';

export class SimpleHLS2MP4Converter {
  constructor(options = {}) {
    this.cancelled = false;
    this.progressCallback = options.onProgress;
  }

  cancel() {
    this.cancelled = true;
    if (this.converter) {
      this.converter.cancel();
    }
  }

  async convertSegments(segments, options = {}) {
    if (this.cancelled) {
      throw new Error('Conversion cancelled');
    }

    // Create the HLS2MP4 converter
    this.converter = new HLS2MP4(() => {
      this.cancel();
    });

    // Set up progress tracking
    if (this.progressCallback) {
      this.converter.on('progress', this.progressCallback);
    }

    // Check if this is already formatted zippedFragments or raw segment data
    let zippedFragments;
    
    if (segments.length > 0 && segments[0].track !== undefined) {
      // Already properly formatted fragments with track assignment
      zippedFragments = segments;
    } else {
      // Raw segment data - convert to zippedFragments format
      zippedFragments = segments.map((segmentData, index) => ({
        track: 0, // Default to video track for backwards compatibility
        fragment: {
          sn: index,
          cc: 0
        },
        getEntry: async () => ({
          getDataFromBlob: async () => {
            if (segmentData instanceof ArrayBuffer) {
              return segmentData;
            } else if (segmentData instanceof Uint8Array) {
              return segmentData.buffer;
            } else if (segmentData instanceof Blob) {
              return await segmentData.arrayBuffer();
            } else {
              // Try to convert to ArrayBuffer
              const blob = new Blob([segmentData]);
              return await blob.arrayBuffer();
            }
          }
        })
      }));
    }

    // Check if we have separate audio/video tracks
    const hasVideoTrack = zippedFragments.some(f => f.track === 0);
    const hasAudioTrack = zippedFragments.some(f => f.track === 1);
    
    // Create level and audioLevel objects based on tracks present
    const level = {
      audioCodec: hasAudioTrack ? '' : (options.audioCodec || 'mp4a.40.2'), // No audio in video-only level if separate audio
      videoCodec: options.videoCodec || 'avc1.42E01E',
      details: {
        totalduration: options.duration || (zippedFragments.filter(f => f.track === 0).length * 2) // Based on video segments
      }
    };

    let audioLevel = null;
    if (hasAudioTrack) {
      audioLevel = {
        audioCodec: options.audioCodec || 'mp4a.40.2',
        videoCodec: '', // No video in audio-only level
        details: {
          totalduration: options.duration || (zippedFragments.filter(f => f.track === 1).length * 2) // Based on audio segments
        }
      };
    }

    try {
      // Use the FastStream converter with proper level/audioLevel setup
      const blob = await this.converter.convert(level, null, audioLevel, null, zippedFragments);
      return blob;
    } catch (error) {
      if (error.message === 'Cancelled') {
        throw new Error('Conversion cancelled');
      }
      throw error;
    }
  }

  destroy() {
    if (this.converter) {
      this.converter.destroy();
      this.converter = null;
    }
  }
}