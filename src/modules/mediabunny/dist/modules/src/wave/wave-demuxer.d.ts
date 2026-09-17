/*!
 * Copyright (c) 2025-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { AudioCodec } from '../codec';
import { Demuxer } from '../demuxer';
import { Input } from '../input';
import { InputAudioTrack } from '../input-track';
import { RiffReader } from './riff-reader';
export declare enum WaveFormat {
    PCM = 1,
    IEEE_FLOAT = 3,
    ALAW = 6,
    MULAW = 7,
    EXTENSIBLE = 65534
}
export declare class WaveDemuxer extends Demuxer {
    metadataReader: RiffReader;
    chunkReader: RiffReader;
    metadataPromise: Promise<void> | null;
    dataStart: number;
    dataSize: number;
    audioInfo: {
        format: number;
        numberOfChannels: number;
        sampleRate: number;
        sampleSizeInBytes: number;
        blockSizeInBytes: number;
    } | null;
    tracks: InputAudioTrack[];
    constructor(input: Input);
    readMetadata(): Promise<void>;
    private parseFmtChunk;
    getCodec(): AudioCodec | null;
    getMimeType(): Promise<string>;
    computeDuration(): Promise<number>;
    getTracks(): Promise<InputAudioTrack[]>;
}
//# sourceMappingURL=wave-demuxer.d.ts.map