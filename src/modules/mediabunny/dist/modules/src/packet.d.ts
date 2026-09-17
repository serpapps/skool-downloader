/*!
 * Copyright (c) 2025-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
export declare const PLACEHOLDER_DATA: Uint8Array<ArrayBuffer>;
/**
 * The type of a packet. Key packets can be decoded without previous packets, while delta packets depend on previous
 * packets.
 * @public
 */
export type PacketType = 'key' | 'delta';
/**
 * Represents an encoded chunk of media. Mainly used as an expressive wrapper around WebCodecs API's EncodedVideoChunk
 * and EncodedAudioChunk, but can also be used standalone.
 * @public
 */
export declare class EncodedPacket {
    /** The encoded data of this packet. */
    readonly data: Uint8Array;
    /** The type of this packet. */
    readonly type: PacketType;
    /**
     * The presentation timestamp of this packet in seconds. May be negative. Samples with negative end timestamps
     * should not be presented.
     */
    readonly timestamp: number;
    /** The duration of this packet in seconds. */
    readonly duration: number;
    /**
     * The sequence number indicates the decode order of the packets. Packet A  must be decoded before packet B if A
     * has a lower sequence number than B. If two packets have the same sequence number, they are the same packet.
     * Otherwise, sequence numbers are arbitrary and are not guaranteed to have any meaning besides their relative
     * ordering. Negative sequence numbers mean the sequence number is undefined.
     */
    readonly sequenceNumber: number;
    /**
     * The actual byte length of the data in this packet. This field is useful for metadata-only packets where the
     * `data` field contains no bytes.
     */
    readonly byteLength: number;
    constructor(
    /** The encoded data of this packet. */
    data: Uint8Array, 
    /** The type of this packet. */
    type: PacketType, 
    /**
     * The presentation timestamp of this packet in seconds. May be negative. Samples with negative end timestamps
     * should not be presented.
     */
    timestamp: number, 
    /** The duration of this packet in seconds. */
    duration: number, 
    /**
     * The sequence number indicates the decode order of the packets. Packet A  must be decoded before packet B if A
     * has a lower sequence number than B. If two packets have the same sequence number, they are the same packet.
     * Otherwise, sequence numbers are arbitrary and are not guaranteed to have any meaning besides their relative
     * ordering. Negative sequence numbers mean the sequence number is undefined.
     */
    sequenceNumber?: number, byteLength?: number);
    /** If this packet is a metadata-only packet. Metadata-only packets don't contain their packet data. */
    get isMetadataOnly(): boolean;
    /** The timestamp of this packet in microseconds. */
    get microsecondTimestamp(): number;
    /** The duration of this packet in microseconds. */
    get microsecondDuration(): number;
    /** Converts this packet to an EncodedVideoChunk for use with the WebCodecs API. */
    toEncodedVideoChunk(): EncodedVideoChunk;
    /** Converts this packet to an EncodedAudioChunk for use with the WebCodecs API. */
    toEncodedAudioChunk(): EncodedAudioChunk;
    /**
     * Creates an EncodedPacket from an EncodedVideoChunk or EncodedAudioChunk. This method is useful for converting
     * chunks from the WebCodecs API to EncodedPackets.
     */
    static fromEncodedChunk(chunk: EncodedVideoChunk | EncodedAudioChunk): EncodedPacket;
    /** Clones this packet while optionally updating timing information. */
    clone(options?: {
        /** The timestamp of the cloned packet in seconds. */
        timestamp?: number;
        /** The duration of the cloned packet in seconds. */
        duration?: number;
    }): EncodedPacket;
}
//# sourceMappingURL=packet.d.ts.map