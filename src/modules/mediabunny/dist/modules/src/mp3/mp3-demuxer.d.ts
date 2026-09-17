/*!
 * Copyright (c) 2025-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Demuxer } from '../demuxer';
import { Input } from '../input';
import { InputAudioTrack } from '../input-track';
import { AsyncMutex } from '../misc';
import { FrameHeader } from '../../shared/mp3-misc';
import { Mp3Reader } from './mp3-reader';
type Sample = {
    timestamp: number;
    duration: number;
    dataStart: number;
    dataSize: number;
};
export declare class Mp3Demuxer extends Demuxer {
    reader: Mp3Reader;
    metadataPromise: Promise<void> | null;
    firstFrameHeader: FrameHeader | null;
    loadedSamples: Sample[];
    tracks: InputAudioTrack[];
    loadingMutex: AsyncMutex;
    lastLoadedPos: number;
    fileSize: number;
    nextTimestampInSamples: number;
    constructor(input: Input);
    readMetadata(): Promise<void>;
    /** Loads the next 0.5 MiB of frames. */
    loadNextChunk(): Promise<void>;
    private parseFramesFromLoadedData;
    getMimeType(): Promise<string>;
    getTracks(): Promise<InputAudioTrack[]>;
    computeDuration(): Promise<number>;
}
export {};
//# sourceMappingURL=mp3-demuxer.d.ts.map