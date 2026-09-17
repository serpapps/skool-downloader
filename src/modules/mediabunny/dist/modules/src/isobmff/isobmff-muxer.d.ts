/*!
 * Copyright (c) 2025-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Muxer } from '../muxer';
import { Output, OutputAudioTrack, OutputSubtitleTrack, OutputTrack, OutputVideoTrack } from '../output';
import { IsobmffOutputFormat } from '../output-format';
import { SubtitleConfig, SubtitleCue, SubtitleMetadata } from '../subtitles';
import { EncodedPacket, PacketType } from '../packet';
export declare const GLOBAL_TIMESCALE = 1000;
export type Sample = {
    timestamp: number;
    decodeTimestamp: number;
    duration: number;
    data: Uint8Array | null;
    size: number;
    type: PacketType;
    timescaleUnitsToNextSample: number;
};
type Chunk = {
    /** The lowest presentation timestamp in this chunk */
    startTimestamp: number;
    samples: Sample[];
    offset: number | null;
    moofOffset: number | null;
};
export type IsobmffTrackData = {
    muxer: IsobmffMuxer;
    timescale: number;
    samples: Sample[];
    sampleQueue: Sample[];
    timestampProcessingQueue: Sample[];
    timeToSampleTable: {
        sampleCount: number;
        sampleDelta: number;
    }[];
    compositionTimeOffsetTable: {
        sampleCount: number;
        sampleCompositionTimeOffset: number;
    }[];
    lastTimescaleUnits: number | null;
    lastSample: Sample | null;
    finalizedChunks: Chunk[];
    currentChunk: Chunk | null;
    compactlyCodedChunkTable: {
        firstChunk: number;
        samplesPerChunk: number;
    }[];
} & ({
    track: OutputVideoTrack;
    type: 'video';
    info: {
        width: number;
        height: number;
        decoderConfig: VideoDecoderConfig;
        /**
         * The "Annex B transformation" involves converting the raw packet data from Annex B to
         * "MP4" (length-prefixed) format.
         * https://stackoverflow.com/questions/24884827
         */
        requiresAnnexBTransformation: boolean;
    };
} | {
    track: OutputAudioTrack;
    type: 'audio';
    info: {
        numberOfChannels: number;
        sampleRate: number;
        decoderConfig: AudioDecoderConfig;
        /**
         * The "PCM transformation" is making every sample in the sample table be exactly one PCM audio sample long.
         * Some players expect this for PCM audio.
         */
        requiresPcmTransformation: boolean;
    };
} | {
    track: OutputSubtitleTrack;
    type: 'subtitle';
    info: {
        config: SubtitleConfig;
    };
    lastCueEndTimestamp: number;
    cueQueue: SubtitleCue[];
    nextSourceId: number;
    cueToSourceId: WeakMap<SubtitleCue, number>;
});
export type IsobmffVideoTrackData = IsobmffTrackData & {
    type: 'video';
};
export type IsobmffAudioTrackData = IsobmffTrackData & {
    type: 'audio';
};
export type IsobmffSubtitleTrackData = IsobmffTrackData & {
    type: 'subtitle';
};
export declare const intoTimescale: (timeInSeconds: number, timescale: number, round?: boolean) => number;
export declare class IsobmffMuxer extends Muxer {
    private format;
    private writer;
    private boxWriter;
    private fastStart;
    private isFragmented;
    isQuickTime: boolean;
    private auxTarget;
    private auxWriter;
    private auxBoxWriter;
    private mdat;
    private trackDatas;
    private allTracksKnown;
    private creationTime;
    private finalizedChunks;
    private nextFragmentNumber;
    private maxWrittenTimestamp;
    private minimumFragmentDuration;
    constructor(output: Output, format: IsobmffOutputFormat);
    start(): Promise<void>;
    private allTracksAreKnown;
    getMimeType(): Promise<string>;
    private getVideoTrackData;
    private getAudioTrackData;
    private getSubtitleTrackData;
    addEncodedVideoPacket(track: OutputVideoTrack, packet: EncodedPacket, meta?: EncodedVideoChunkMetadata): Promise<void>;
    addEncodedAudioPacket(track: OutputAudioTrack, packet: EncodedPacket, meta?: EncodedAudioChunkMetadata): Promise<void>;
    private maybePadWithSilence;
    addSubtitleCue(track: OutputSubtitleTrack, cue: SubtitleCue, meta?: SubtitleMetadata): Promise<void>;
    private processWebVTTCues;
    private createSampleForTrack;
    private processTimestamps;
    private registerSample;
    private addSampleToTrack;
    private finalizeCurrentChunk;
    private interleaveSamples;
    private finalizeFragment;
    onTrackClose(track: OutputTrack): Promise<void>;
    /** Finalizes the file, making it ready for use. Must be called after all video and audio chunks have been added. */
    finalize(): Promise<void>;
}
export {};
//# sourceMappingURL=isobmff-muxer.d.ts.map