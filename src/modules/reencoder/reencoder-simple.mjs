import {EventEmitter} from '../eventemitter.mjs';

// Simplified reencoder for testing - just throws an error to see if import works
export class Reencoder extends EventEmitter {
  constructor(registerCancel) {
    super();
    if (registerCancel) {
      registerCancel(() => {
        this.cancel();
      });
    }
  }

  cancel() {
    this.cancelled = true;
  }

  async convert(videoMimeType, videoDuration, videoInitSegment, audioMimeType, audioDuration, audioInitSegment, zippedFragments) {
    // Simple test - just throw an error to verify the import works
    throw new Error('Simplified reencoder - import test successful but conversion not implemented');
  }
}