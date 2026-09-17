/*!
 * Copyright (c) 2025-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Muxer } from '../muxer';
import { Output, OutputAudioTrack } from '../output';
import { EncodedPacket } from '../packet';
import { WavOutputFormat } from '../output-format';
export declare class WaveMuxer extends Muxer {
    private format;
    private isRf64;
    private writer;
    private riffWriter;
    private headerWritten;
    private dataSize;
    private sampleRate;
    private sampleCount;
    constructor(output: Output, format: WavOutputFormat);
    start(): Promise<void>;
    getMimeType(): Promise<string>;
    addEncodedVideoPacket(): Promise<void>;
    addEncodedAudioPacket(track: OutputAudioTrack, packet: EncodedPacket, meta?: EncodedAudioChunkMetadata): Promise<void>;
    addSubtitleCue(): Promise<void>;
    private writeHeader;
    finalize(): Promise<void>;
}
//# sourceMappingURL=wave-muxer.d.ts.map