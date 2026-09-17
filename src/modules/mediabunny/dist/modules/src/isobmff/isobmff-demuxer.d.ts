/*!
 * Copyright (c) 2025-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { AacCodecInfo, AudioCodec, VideoCodec } from '../codec';
import { AvcDecoderConfigurationRecord, HevcDecoderConfigurationRecord, Vp9CodecInfo, Av1CodecInfo } from '../codec-data';
import { Demuxer } from '../demuxer';
import { Input } from '../input';
import { InputTrack } from '../input-track';
import { Rotation, AsyncMutex } from '../misc';
import { IsobmffReader } from './isobmff-reader';
type InternalTrack = {
    id: number;
    demuxer: IsobmffDemuxer;
    inputTrack: InputTrack | null;
    timescale: number;
    durationInMovieTimescale: number;
    durationInMediaTimescale: number;
    rotation: Rotation;
    languageCode: string;
    sampleTableByteOffset: number;
    sampleTable: SampleTable | null;
    fragmentLookupTable: FragmentLookupTableEntry[] | null;
    currentFragmentState: FragmentTrackState | null;
    fragments: Fragment[];
    fragmentsWithKeyFrame: Fragment[];
    /** The segment durations of all edit list entries leading up to the main one (from which the offset is taken.) */
    editListPreviousSegmentDurations: number;
    /** The media time offset of the main edit list entry (with media time !== -1) */
    editListOffset: number;
} & ({
    info: null;
} | {
    info: {
        type: 'video';
        width: number;
        height: number;
        codec: VideoCodec | null;
        codecDescription: Uint8Array | null;
        colorSpace: VideoColorSpaceInit | null;
        avcCodecInfo: AvcDecoderConfigurationRecord | null;
        hevcCodecInfo: HevcDecoderConfigurationRecord | null;
        vp9CodecInfo: Vp9CodecInfo | null;
        av1CodecInfo: Av1CodecInfo | null;
    };
} | {
    info: {
        type: 'audio';
        numberOfChannels: number;
        sampleRate: number;
        codec: AudioCodec | null;
        codecDescription: Uint8Array | null;
        aacCodecInfo: AacCodecInfo | null;
    };
});
type SampleTable = {
    sampleTimingEntries: SampleTimingEntry[];
    sampleCompositionTimeOffsets: SampleCompositionTimeOffsetEntry[];
    sampleSizes: number[];
    keySampleIndices: number[] | null;
    chunkOffsets: number[];
    sampleToChunk: SampleToChunkEntry[];
    presentationTimestamps: {
        presentationTimestamp: number;
        sampleIndex: number;
    }[] | null;
    /**
     * Provides a fast map from sample index to index in the sorted presentation timestamps array - so, a fast map from
     * decode order to presentation order.
     */
    presentationTimestampIndexMap: number[] | null;
};
type SampleTimingEntry = {
    startIndex: number;
    startDecodeTimestamp: number;
    count: number;
    delta: number;
};
type SampleCompositionTimeOffsetEntry = {
    startIndex: number;
    count: number;
    offset: number;
};
type SampleToChunkEntry = {
    startSampleIndex: number;
    startChunkIndex: number;
    samplesPerChunk: number;
    sampleDescriptionIndex: number;
};
type FragmentTrackDefaults = {
    trackId: number;
    defaultSampleDescriptionIndex: number;
    defaultSampleDuration: number;
    defaultSampleSize: number;
    defaultSampleFlags: number;
};
type FragmentLookupTableEntry = {
    timestamp: number;
    moofOffset: number;
};
type FragmentTrackState = {
    baseDataOffset: number;
    sampleDescriptionIndex: number | null;
    defaultSampleDuration: number | null;
    defaultSampleSize: number | null;
    defaultSampleFlags: number | null;
    startTimestamp: number | null;
};
type FragmentTrackData = {
    startTimestamp: number;
    endTimestamp: number;
    firstKeyFrameTimestamp: number | null;
    samples: FragmentTrackSample[];
    presentationTimestamps: {
        presentationTimestamp: number;
        sampleIndex: number;
    }[];
    startTimestampIsFinal: boolean;
};
type FragmentTrackSample = {
    presentationTimestamp: number;
    duration: number;
    byteOffset: number;
    byteSize: number;
    isKeyFrame: boolean;
};
type Fragment = {
    moofOffset: number;
    moofSize: number;
    implicitBaseDataOffset: number;
    trackData: Map<InternalTrack['id'], FragmentTrackData>;
    dataStart: number;
    dataEnd: number;
    nextFragment: Fragment | null;
    isKnownToBeFirstFragment: boolean;
};
export declare class IsobmffDemuxer extends Demuxer {
    metadataReader: IsobmffReader;
    currentTrack: InternalTrack | null;
    tracks: InternalTrack[];
    metadataPromise: Promise<void> | null;
    movieTimescale: number;
    movieDurationInTimescale: number;
    isQuickTime: boolean;
    isFragmented: boolean;
    fragmentTrackDefaults: FragmentTrackDefaults[];
    fragments: Fragment[];
    currentFragment: Fragment | null;
    fragmentLookupMutex: AsyncMutex;
    chunkReader: IsobmffReader;
    constructor(input: Input);
    computeDuration(): Promise<number>;
    getTracks(): Promise<InputTrack[]>;
    getMimeType(): Promise<string>;
    readMetadata(): Promise<void>;
    getSampleTableForTrack(internalTrack: InternalTrack): SampleTable;
    readFragment(): Promise<Fragment>;
    readContiguousBoxes(totalSize: number): void;
    traverseBox(): void;
}
export {};
//# sourceMappingURL=isobmff-demuxer.d.ts.map