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
import { OggCodecInfo } from './ogg-misc';
import { OggReader, Page } from './ogg-reader';
type LogicalBitstream = {
    serialNumber: number;
    bosPage: Page;
    description: Uint8Array | null;
    numberOfChannels: number;
    sampleRate: number;
    codecInfo: OggCodecInfo;
    lastMetadataPacket: Packet | null;
};
type Packet = {
    data: Uint8Array;
    endPage: Page;
    endSegmentIndex: number;
};
export declare class OggDemuxer extends Demuxer {
    reader: OggReader;
    /**
     * Lots of reading operations require multiple async reads and thus need to be mutually exclusive to avoid
     * conflicts in reader position.
     */
    readingMutex: AsyncMutex;
    metadataPromise: Promise<void> | null;
    fileSize: number | null;
    bitstreams: LogicalBitstream[];
    tracks: InputAudioTrack[];
    constructor(input: Input);
    readMetadata(): Promise<void>;
    readVorbisMetadata(firstPacket: Packet, bitstream: LogicalBitstream): Promise<void>;
    readOpusMetadata(firstPacket: Packet, bitstream: LogicalBitstream): Promise<void>;
    readPacket(reader: OggReader, startPage: Page, startSegmentIndex: number): Promise<Packet | null>;
    findNextPacketStart(reader: OggReader, lastPacket: Packet): Promise<{
        startPage: Page;
        startSegmentIndex: number;
    } | null>;
    getMimeType(): Promise<string>;
    getTracks(): Promise<InputAudioTrack[]>;
    computeDuration(): Promise<number>;
}
export {};
//# sourceMappingURL=ogg-demuxer.d.ts.map