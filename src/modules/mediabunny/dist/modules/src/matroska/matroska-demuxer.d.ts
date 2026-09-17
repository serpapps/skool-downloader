/*!
 * Copyright (c) 2025-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { AacCodecInfo, AudioCodec, VideoCodec } from '../codec';
import { Demuxer } from '../demuxer';
import { Input } from '../input';
import { InputTrack } from '../input-track';
import { AsyncMutex, Rotation } from '../misc';
import { EBMLReader } from './ebml';
type Segment = {
    seekHeadSeen: boolean;
    infoSeen: boolean;
    tracksSeen: boolean;
    cuesSeen: boolean;
    timestampScale: number;
    timestampFactor: number;
    duration: number;
    seekEntries: SeekEntry[];
    tracks: InternalTrack[];
    cuePoints: CuePoint[];
    dataStartPos: number;
    elementEndPos: number;
    clusterSeekStartPos: number;
    clusters: Cluster[];
    clusterLookupMutex: AsyncMutex;
};
type SeekEntry = {
    id: number;
    segmentPosition: number;
};
type Cluster = {
    elementStartPos: number;
    elementEndPos: number;
    dataStartPos: number;
    timestamp: number;
    trackData: Map<number, ClusterTrackData>;
    nextCluster: Cluster | null;
    isKnownToBeFirstCluster: boolean;
};
type ClusterTrackData = {
    startTimestamp: number;
    endTimestamp: number;
    firstKeyFrameTimestamp: number | null;
    blocks: ClusterBlock[];
    presentationTimestamps: {
        timestamp: number;
        blockIndex: number;
    }[];
};
declare enum BlockLacing {
    None = 0,
    Xiph = 1,
    FixedSize = 2,
    Ebml = 3
}
type ClusterBlock = {
    timestamp: number;
    duration: number;
    isKeyFrame: boolean;
    referencedTimestamps: number[];
    data: Uint8Array;
    lacing: BlockLacing;
};
type CuePoint = {
    time: number;
    trackId: number;
    clusterPosition: number;
};
type InternalTrack = {
    id: number;
    demuxer: MatroskaDemuxer;
    segment: Segment;
    clusters: Cluster[];
    clustersWithKeyFrame: Cluster[];
    cuePoints: CuePoint[];
    isDefault: boolean;
    inputTrack: InputTrack | null;
    codecId: string | null;
    codecPrivate: Uint8Array | null;
    defaultDuration: number | null;
    languageCode: string;
    info: null | {
        type: 'video';
        width: number;
        height: number;
        rotation: Rotation;
        codec: VideoCodec | null;
        codecDescription: Uint8Array | null;
        colorSpace: VideoColorSpaceInit | null;
    } | {
        type: 'audio';
        numberOfChannels: number;
        sampleRate: number;
        bitDepth: number;
        codec: AudioCodec | null;
        codecDescription: Uint8Array | null;
        aacCodecInfo: AacCodecInfo | null;
    };
};
export declare class MatroskaDemuxer extends Demuxer {
    metadataReader: EBMLReader;
    clusterReader: EBMLReader;
    readMetadataPromise: Promise<void> | null;
    segments: Segment[];
    currentSegment: Segment | null;
    currentTrack: InternalTrack | null;
    currentCluster: Cluster | null;
    currentBlock: ClusterBlock | null;
    currentCueTime: number | null;
    isWebM: boolean;
    constructor(input: Input);
    computeDuration(): Promise<number>;
    getTracks(): Promise<InputTrack[]>;
    getMimeType(): Promise<string>;
    readMetadata(): Promise<void>;
    readSegment(dataSize: number | null): Promise<void>;
    readCluster(segment: Segment): Promise<Cluster>;
    getTrackDataInCluster(cluster: Cluster, trackNumber: number): ClusterTrackData;
    expandLacedBlocks(blocks: ClusterBlock[], track: InternalTrack | null): void;
    readContiguousElements(reader: EBMLReader, totalSize: number): void;
    traverseElement(reader: EBMLReader): boolean;
}
export {};
//# sourceMappingURL=matroska-demuxer.d.ts.map