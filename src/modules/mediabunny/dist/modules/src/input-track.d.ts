/*!
 * Copyright (c) 2025-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { AudioCodec, MediaCodec, VideoCodec } from './codec';
import { PacketRetrievalOptions } from './media-sink';
import { Rotation } from './misc';
import { TrackType } from './output';
import { EncodedPacket, PacketType } from './packet';
/**
 * Contains aggregate statistics about the encoded packets of a track.
 * @public
 */
export type PacketStats = {
    /** The total number of packets. */
    packetCount: number;
    /** The average number of packets per second. For video tracks, this will equal the average frame rate (FPS). */
    averagePacketRate: number;
    /** The average number of bits per second. */
    averageBitrate: number;
};
export interface InputTrackBacking {
    getId(): number;
    getCodec(): MediaCodec | null;
    getLanguageCode(): string;
    getTimeResolution(): number;
    getFirstTimestamp(): Promise<number>;
    computeDuration(): Promise<number>;
    getFirstPacket(options: PacketRetrievalOptions): Promise<EncodedPacket | null>;
    getPacket(timestamp: number, options: PacketRetrievalOptions): Promise<EncodedPacket | null>;
    getNextPacket(packet: EncodedPacket, options: PacketRetrievalOptions): Promise<EncodedPacket | null>;
    getKeyPacket(timestamp: number, options: PacketRetrievalOptions): Promise<EncodedPacket | null>;
    getNextKeyPacket(packet: EncodedPacket, options: PacketRetrievalOptions): Promise<EncodedPacket | null>;
}
/**
 * Represents a media track in an input file.
 * @public
 */
export declare abstract class InputTrack {
    /** The type of the track. */
    abstract get type(): TrackType;
    /** The codec of the track's packets. */
    abstract get codec(): MediaCodec | null;
    /** Returns the full codec parameter string for this track. */
    abstract getCodecParameterString(): Promise<string | null>;
    /** Checks if this track's packets can be decoded by the browser. */
    abstract canDecode(): Promise<boolean>;
    /**
     * For a given packet of this track, this method determines the actual type of this packet (key/delta) by looking
     * into its bitstream. Returns null if the type couldn't be determined.
     */
    abstract determinePacketType(packet: EncodedPacket): Promise<PacketType | null>;
    /** Returns true iff this track is a video track. */
    isVideoTrack(): this is InputVideoTrack;
    /** Returns true iff this track is an audio track. */
    isAudioTrack(): this is InputAudioTrack;
    /** The unique ID of this track in the input file. */
    get id(): number;
    /** The ISO 639-2/T language code for this track. If the language is unknown, this field is 'und' (undetermined). */
    get languageCode(): string;
    /**
     * A positive number x such that all timestamps and durations of all packets of this track are
     * integer multiples of 1/x.
     */
    get timeResolution(): number;
    /**
     * Returns the start timestamp of the first packet of this track, in seconds. While often near zero, this value
     * may be positive or even negative. A negative starting timestamp means the track's timing has been offset. Samples
     * with a negative timestamp should not be presented.
     */
    getFirstTimestamp(): Promise<number>;
    /** Returns the end timestamp of the last packet of this track, in seconds. */
    computeDuration(): Promise<number>;
    /**
     * Computes aggregate packet statistics for this track, such as average packet rate or bitrate.
     *
     * @param targetPacketCount - This optional parameter sets a target for how many packets this method must have
     * looked at before it can return early; this means, you can use it to aggregate only a subset (prefix) of all
     * packets. This is very useful for getting a great estimate of video frame rate without having to scan through the
     * entire file.
     */
    computePacketStats(targetPacketCount?: number): Promise<PacketStats>;
}
export interface InputVideoTrackBacking extends InputTrackBacking {
    getCodec(): VideoCodec | null;
    getCodedWidth(): number;
    getCodedHeight(): number;
    getRotation(): Rotation;
    getColorSpace(): Promise<VideoColorSpaceInit>;
    getDecoderConfig(): Promise<VideoDecoderConfig | null>;
}
/**
 * Represents a video track in an input file.
 * @public
 */
export declare class InputVideoTrack extends InputTrack {
    get type(): TrackType;
    get codec(): "avc" | "hevc" | "vp9" | "av1" | "vp8" | null;
    /** The width in pixels of the track's coded samples, before any transformations or rotations. */
    get codedWidth(): number;
    /** The height in pixels of the track's coded samples, before any transformations or rotations. */
    get codedHeight(): number;
    /** The angle in degrees by which the track's frames should be rotated (clockwise). */
    get rotation(): Rotation;
    /** The width in pixels of the track's frames after rotation. */
    get displayWidth(): number;
    /** The height in pixels of the track's frames after rotation. */
    get displayHeight(): number;
    /** Returns the color space of the track's samples. */
    getColorSpace(): Promise<VideoColorSpaceInit>;
    /** If this method returns true, the track's samples use a high dynamic range (HDR). */
    hasHighDynamicRange(): Promise<boolean>;
    /**
     * Returns the decoder configuration for decoding the track's packets using a VideoDecoder. Returns null if the
     * track's codec is unknown.
     */
    getDecoderConfig(): Promise<VideoDecoderConfig | null>;
    getCodecParameterString(): Promise<string | null>;
    canDecode(): Promise<boolean>;
    determinePacketType(packet: EncodedPacket): Promise<PacketType | null>;
}
export interface InputAudioTrackBacking extends InputTrackBacking {
    getCodec(): AudioCodec | null;
    getNumberOfChannels(): number;
    getSampleRate(): number;
    getDecoderConfig(): Promise<AudioDecoderConfig | null>;
}
/**
 * Represents an audio track in an input file.
 * @public
 */
export declare class InputAudioTrack extends InputTrack {
    get type(): TrackType;
    get codec(): AudioCodec | null;
    /** The number of audio channels in the track. */
    get numberOfChannels(): number;
    /** The track's audio sample rate in hertz. */
    get sampleRate(): number;
    /**
     * Returns the decoder configuration for decoding the track's packets using an AudioDecoder. Returns null if the
     * track's codec is unknown.
     */
    getDecoderConfig(): Promise<AudioDecoderConfig | null>;
    getCodecParameterString(): Promise<string | null>;
    canDecode(): Promise<boolean>;
    determinePacketType(packet: EncodedPacket): Promise<PacketType | null>;
}
//# sourceMappingURL=input-track.d.ts.map