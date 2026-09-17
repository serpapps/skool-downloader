import {EventEmitter} from '../eventemitter.mjs';
import {MP4Merger} from './mp4merger.mjs';

export class DASH2MP4 extends EventEmitter {
  constructor(registerCancel) {
    super();
    this.converter = null;
    this.registerCancel = registerCancel;
  }


  async convert(videoMimeType, videoDuration, videoInitSegment, audioMimeType, audioDuration, audioInitSegment, zippedFragments) {
    // RESTORED ORIGINAL FASTSTREAM APPROACH: Always try MP4Merger first, then Reencoder fallback
    // This is the proven FastStream path that handles all DASH scenarios correctly
    try {
      console.log('🔧 DASH2MP4: Creating MP4Merger...');
      this.converter = new MP4Merger(this.registerCancel);
      this.converter.on('progress', (progress) => {
        this.emit('progress', progress);
      });
      console.log('🔧 DASH2MP4: Calling MP4Merger.convert()...');
      const result = await this.converter.convert(videoDuration, videoInitSegment, audioDuration, audioInitSegment, zippedFragments);
      console.log('🔧 DASH2MP4: MP4Merger.convert() completed successfully');
      return result;
    } catch (e) {
      const mergerErrors = [
        'Video codec not supported!',
        'Audio codec not supported!',
        'Video is not an mp4!',
        'Audio is not an mp4!',
        'moov not found',
        'Cannot read properties of null (reading \'trackEntries\')',
      ];
      console.log('🔍 DASH2MP4: MP4Merger failed, checking for reencoder fallback. Error:', e.message);
      console.log('🔍 DASH2MP4: Error stack:', e.stack);
      
      if (!mergerErrors.includes(e.message)) {
        console.log('🔍 DASH2MP4: Error not in fallback list, rethrowing');
        throw e;
      }

      console.log('🔍 DASH2MP4: Error triggers reencoder fallback, checking WebCodecs...');
      if (!window.VideoDecoder || !window.VideoEncoder || !window.AudioDecoder || !window.AudioEncoder) {
        console.log('🔍 DASH2MP4: WebCodecs not available, cannot use reencoder');
        throw e;
      }

      console.log('🔍 DASH2MP4: WebCodecs available, importing reencoder...');
      const {Reencoder} = await import('../reencoder/reencoder.mjs');
      console.log('🔍 DASH2MP4: Reencoder imported, creating instance...');
      this.converter = new Reencoder(this.registerCancel);
      this.converter.on('progress', (progress) => {
        this.emit('progress', progress);
      });
      console.log('🔍 DASH2MP4: Calling Reencoder.convert()...');
      const result = await this.converter.convert(videoMimeType, videoDuration, videoInitSegment, audioMimeType, audioDuration, audioInitSegment, zippedFragments);
      console.log('🔍 DASH2MP4: Reencoder.convert() completed successfully');
      return result;
    }
  }
}
