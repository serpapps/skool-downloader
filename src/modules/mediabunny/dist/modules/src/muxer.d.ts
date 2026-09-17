/*!
 * Copyright (c) 2025-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { AsyncMutex } from './misc';
import { Output, OutputAudioTrack, OutputSubtitleTrack, OutputTrack, OutputVideoTrack } from './output';
import { EncodedPacket } from './packet';
import { SubtitleCue, SubtitleMetadata } from './subtitles';
export declare abstract class Muxer {
    output: Output;
    mutex: AsyncMutex;
    /**
     * This field is used to synchronize multiple MediaStreamTracks. They use the same time coordinate system across
     * tracks, and to ensure correct audio-video sync, we must use the same offset for all of them. The reason an offset
     * is needed at all is because the timestamps typically don't start at zero.
     */
    firstMediaStreamTimestamp: number | null;
    constructor(output: Output);
    abstract start(): Promise<void>;
    abstract getMimeType(): Promise<string>;
    abstract addEncodedVideoPacket(track: OutputVideoTrack, packet: EncodedPacket, meta?: EncodedVideoChunkMetadata): Promise<void>;
    abstract addEncodedAudioPacket(track: OutputAudioTrack, packet: EncodedPacket, meta?: EncodedAudioChunkMetadata): Promise<void>;
    abstract addSubtitleCue(track: OutputSubtitleTrack, cue: SubtitleCue, meta?: SubtitleMetadata): Promise<void>;
    abstract finalize(): Promise<void>;
    onTrackClose(track: OutputTrack): void;
    private trackTimestampInfo;
    protected validateAndNormalizeTimestamp(track: OutputTrack, timestampInSeconds: number, isKeyFrame: boolean): number;
}
//# sourceMappingURL=muxer.d.ts.map