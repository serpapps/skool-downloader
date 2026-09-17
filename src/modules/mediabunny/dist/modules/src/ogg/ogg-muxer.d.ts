/*!
 * Copyright (c) 2025-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Muxer } from '../muxer';
import { Output, OutputAudioTrack } from '../output';
import { OggOutputFormat } from '../output-format';
import { EncodedPacket } from '../packet';
import { OggCodecInfo } from './ogg-misc';
type OggTrackData = {
    track: OutputAudioTrack;
    serialNumber: number;
    internalSampleRate: number;
    codecInfo: OggCodecInfo;
    vorbisLastBlocksize: number | null;
    packetQueue: Packet[];
    currentTimestampInSamples: number;
    pagesWritten: number;
    currentGranulePosition: number;
    currentLacingValues: number[];
    currentPageData: Uint8Array[];
    currentPageSize: number;
    currentPageStartsWithFreshPacket: boolean;
};
type Packet = {
    data: Uint8Array;
    endGranulePosition: number;
    timestamp: number;
    forcePageFlush: boolean;
};
export declare class OggMuxer extends Muxer {
    private format;
    private writer;
    private trackDatas;
    private bosPagesWritten;
    private allTracksKnown;
    private pageBytes;
    private pageView;
    constructor(output: Output, format: OggOutputFormat);
    start(): Promise<void>;
    getMimeType(): Promise<string>;
    addEncodedVideoPacket(): never;
    private getTrackData;
    private queueHeaderPackets;
    addEncodedAudioPacket(track: OutputAudioTrack, packet: EncodedPacket, meta?: EncodedAudioChunkMetadata): Promise<void>;
    addSubtitleCue(): never;
    allTracksAreKnown(): boolean;
    interleavePages(isFinalCall?: boolean): Promise<void>;
    writePacket(trackData: OggTrackData, packet: Packet, isFinalPacket: boolean): void;
    writePage(trackData: OggTrackData, isEos: boolean): void;
    onTrackClose(): Promise<void>;
    finalize(): Promise<void>;
}
export {};
//# sourceMappingURL=ogg-muxer.d.ts.map