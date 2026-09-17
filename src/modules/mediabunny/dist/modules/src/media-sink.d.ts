/*!
 * Copyright (c) 2025-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { InputAudioTrack, InputTrack, InputVideoTrack } from './input-track';
import { AnyIterable, Rotation } from './misc';
import { EncodedPacket } from './packet';
import { AudioSample, VideoSample } from './sample';
/**
 * Additional options for controlling packet retrieval.
 * @public
 */
export type PacketRetrievalOptions = {
    /**
     * When set to true, only packet metadata (like timestamp) will be retrieved - the actual packet data will not
     * be loaded.
     */
    metadataOnly?: boolean;
    /**
     * When set to true, key packets will be verified upon retrieval by looking into the packet's bitstream.
     * If not enabled, the packet types will be determined solely by what's stored in the containing file and may be
     * incorrect, potentially leading to decoder errors. Since determining a packet's actual type requires looking into
     * its data, this option cannot be enabled together with `metadataOnly`.
     */
    verifyKeyPackets?: boolean;
};
/**
 * Sink for retrieving encoded packets from an input track.
 * @public
 */
export declare class EncodedPacketSink {
    constructor(track: InputTrack);
    /**
     * Retrieves the track's first packet (in decode order), or null if it has no packets. The first packet is very
     * likely to be a key packet.
     */
    getFirstPacket(options?: PacketRetrievalOptions): Promise<EncodedPacket | null>;
    /**
     * Retrieves the packet corresponding to the given timestamp, in seconds. More specifically, returns the last packet
     * (in presentation order) with a start timestamp less than or equal to the given timestamp. This method can be
     * used to retrieve a track's last packet using `getPacket(Infinity)`. The method returns null if the timestamp
     * is before the first packet in the track.
     *
     * @param timestamp - The timestamp used for retrieval, in seconds.
     */
    getPacket(timestamp: number, options?: PacketRetrievalOptions): Promise<EncodedPacket | null>;
    /**
     * Retrieves the packet following the given packet (in decode order), or null if the given packet is the
     * last packet.
     */
    getNextPacket(packet: EncodedPacket, options?: PacketRetrievalOptions): Promise<EncodedPacket | null>;
    /**
     * Retrieves the key packet corresponding to the given timestamp, in seconds. More specifically, returns the last
     * key packet (in presentation order) with a start timestamp less than or equal to the given timestamp. A key packet
     * is a packet that doesn't require previous packets to be decoded. This method can be used to retrieve a track's
     * last key packet using `getKeyPacket(Infinity)`. The method returns null if the timestamp is before the first
     * key packet in the track.
     *
     * To ensure that the returned packet is guaranteed to be a real key frame, enable `options.verifyKeyPackets`.
     *
     * @param timestamp - The timestamp used for retrieval, in seconds.
     */
    getKeyPacket(timestamp: number, options?: PacketRetrievalOptions): Promise<EncodedPacket | null>;
    /**
     * Retrieves the key packet following the given packet (in decode order), or null if the given packet is the last
     * key packet.
     *
     * To ensure that the returned packet is guaranteed to be a real key frame, enable `options.verifyKeyPackets`.
     */
    getNextKeyPacket(packet: EncodedPacket, options?: PacketRetrievalOptions): Promise<EncodedPacket | null>;
    /**
     * Creates an async iterator that yields the packets in this track in decode order. To enable fast iteration, this
     * method will intelligently preload packets based on the speed of the consumer.
     *
     * @param startPacket - (optional) The packet from which iteration should begin. This packet will also be yielded.
     * @param endTimestamp - (optional) The timestamp at which iteration should end. This packet will _not_ be yielded.
     */
    packets(startPacket?: EncodedPacket, endPacket?: EncodedPacket, options?: PacketRetrievalOptions): AsyncGenerator<EncodedPacket, void, unknown>;
}
/**
 * Base class for decoded media sample sinks.
 * @public
 */
export declare abstract class BaseMediaSampleSink<MediaSample extends VideoSample | AudioSample> {
}
/**
 * A sink that retrieves decoded video samples (video frames) from a video track.
 * @public
 */
export declare class VideoSampleSink extends BaseMediaSampleSink<VideoSample> {
    constructor(videoTrack: InputVideoTrack);
    /**
     * Retrieves the video sample (frame) corresponding to the given timestamp, in seconds. More specifically, returns
     * the last video sample (in presentation order) with a start timestamp less than or equal to the given timestamp.
     * Returns null if the timestamp is before the track's first timestamp.
     *
     * @param timestamp - The timestamp used for retrieval, in seconds.
     */
    getSample(timestamp: number): Promise<VideoSample | null>;
    /**
     * Creates an async iterator that yields the video samples (frames) of this track in presentation order. This method
     * will intelligently pre-decode a few frames ahead to enable fast iteration.
     *
     * @param startTimestamp - The timestamp in seconds at which to start yielding samples (inclusive).
     * @param endTimestamp - The timestamp in seconds at which to stop yielding samples (exclusive).
     */
    samples(startTimestamp?: number, endTimestamp?: number): AsyncGenerator<VideoSample, void, unknown>;
    /**
     * Creates an async iterator that yields a video sample (frame) for each timestamp in the argument. This method
     * uses an optimized decoding pipeline if these timestamps are monotonically sorted, decoding each packet at most
     * once, and is therefore more efficient than manually getting the sample for every timestamp. The iterator may
     * yield null if no frame is available for a given timestamp.
     *
     * @param timestamps - An iterable or async iterable of timestamps in seconds.
     */
    samplesAtTimestamps(timestamps: AnyIterable<number>): AsyncGenerator<VideoSample | null, void, unknown>;
}
/**
 * A canvas with additional timing information (timestamp & duration).
 * @public
 */
export type WrappedCanvas = {
    /** A canvas element or offscreen canvas. */
    canvas: HTMLCanvasElement | OffscreenCanvas;
    /** The timestamp of the corresponding video sample, in seconds. */
    timestamp: number;
    /** The duration of the corresponding video sample, in seconds. */
    duration: number;
};
/**
 * Options for constructing a CanvasSink.
 * @public
 */
export type CanvasSinkOptions = {
    /**
     * The width of the output canvas in pixels, defaulting to the display width of the video track. If height is not
     * set, it will be deduced automatically based on aspect ratio.
     */
    width?: number;
    /**
     * The height of the output canvas in pixels, defaulting to the display height of the video track. If width is not
     * set, it will be deduced automatically based on aspect ratio.
     */
    height?: number;
    /**
     * The fitting algorithm in case both width and height are set.
     *
     * - 'fill' will stretch the image to fill the entire box, potentially altering aspect ratio.
     * - 'contain' will contain the entire image within the box while preserving aspect ratio. This may lead to
     * letterboxing.
     * - 'cover' will scale the image until the entire box is filled, while preserving aspect ratio.
     */
    fit?: 'fill' | 'contain' | 'cover';
    /**
     * The clockwise rotation by which to rotate the raw video frame. Defaults to the rotation set in the file metadata.
     * Rotation is applied before resizing.
     */
    rotation?: Rotation;
    /**
     * When set, specifies the number of canvases in the pool. These canvases will be reused in a ring buffer /
     * round-robin type fashion. This keeps the amount of allocated VRAM constant and relieves the browser from
     * constantly allocating/deallocating canvases. A pool size of 0 or `undefined` disables the pool and means a new
     * canvas is created each time.
     */
    poolSize?: number;
};
/**
 * A sink that renders video samples (frames) of the given video track to canvases. This is often more useful than
 * directly retrieving frames, as it comes with common preprocessing steps such as resizing or applying rotation
 * metadata.
 *
 * This sink will yield HTMLCanvasElements when in a DOM context, and OffscreenCanvases otherwise.
 * @public
 */
export declare class CanvasSink {
    constructor(videoTrack: InputVideoTrack, options?: CanvasSinkOptions);
    /**
     * Retrieves a canvas with the video frame corresponding to the given timestamp, in seconds. More specifically,
     * returns the last video frame (in presentation order) with a start timestamp less than or equal to the given
     * timestamp. Returns null if the timestamp is before the track's first timestamp.
     *
     * @param timestamp - The timestamp used for retrieval, in seconds.
     */
    getCanvas(timestamp: number): Promise<WrappedCanvas | null>;
    /**
     * Creates an async iterator that yields canvases with the video frames of this track in presentation order. This
     * method will intelligently pre-decode a few frames ahead to enable fast iteration.
     *
     * @param startTimestamp - The timestamp in seconds at which to start yielding canvases (inclusive).
     * @param endTimestamp - The timestamp in seconds at which to stop yielding canvases (exclusive).
     */
    canvases(startTimestamp?: number, endTimestamp?: number): AsyncGenerator<WrappedCanvas, void, unknown>;
    /**
     * Creates an async iterator that yields a canvas for each timestamp in the argument. This method uses an optimized
     * decoding pipeline if these timestamps are monotonically sorted, decoding each packet at most once, and is
     * therefore more efficient than manually getting the canvas for every timestamp. The iterator may yield null if
     * no frame is available for a given timestamp.
     *
     * @param timestamps - An iterable or async iterable of timestamps in seconds.
     */
    canvasesAtTimestamps(timestamps: AnyIterable<number>): AsyncGenerator<WrappedCanvas | null, void, unknown>;
}
/**
 * Sink for retrieving decoded audio samples from an audio track.
 * @public
 */
export declare class AudioSampleSink extends BaseMediaSampleSink<AudioSample> {
    constructor(audioTrack: InputAudioTrack);
    /**
     * Retrieves the audio sample corresponding to the given timestamp, in seconds. More specifically, returns
     * the last audio sample (in presentation order) with a start timestamp less than or equal to the given timestamp.
     * Returns null if the timestamp is before the track's first timestamp.
     *
     * @param timestamp - The timestamp used for retrieval, in seconds.
     */
    getSample(timestamp: number): Promise<AudioSample | null>;
    /**
     * Creates an async iterator that yields the audio samples of this track in presentation order. This method
     * will intelligently pre-decode a few samples ahead to enable fast iteration.
     *
     * @param startTimestamp - The timestamp in seconds at which to start yielding samples (inclusive).
     * @param endTimestamp - The timestamp in seconds at which to stop yielding samples (exclusive).
     */
    samples(startTimestamp?: number, endTimestamp?: number): AsyncGenerator<AudioSample, void, unknown>;
    /**
     * Creates an async iterator that yields an audio sample for each timestamp in the argument. This method
     * uses an optimized decoding pipeline if these timestamps are monotonically sorted, decoding each packet at most
     * once, and is therefore more efficient than manually getting the sample for every timestamp. The iterator may
     * yield null if no sample is available for a given timestamp.
     *
     * @param timestamps - An iterable or async iterable of timestamps in seconds.
     */
    samplesAtTimestamps(timestamps: AnyIterable<number>): AsyncGenerator<AudioSample | null, void, unknown>;
}
/**
 * An AudioBuffer with additional timing information (timestamp & duration).
 * @public
 */
export type WrappedAudioBuffer = {
    /** An AudioBuffer. */
    buffer: AudioBuffer;
    /** The timestamp of the corresponding audio sample, in seconds. */
    timestamp: number;
    /** The duration of the corresponding audio sample, in seconds. */
    duration: number;
};
/**
 * A sink that retrieves decoded audio samples from an audio track and converts them to AudioBuffers. This is often
 * more useful than directly retrieving audio samples, as AudioBuffers can be directly used with the Web Audio API.
 * @public
 */
export declare class AudioBufferSink {
    constructor(audioTrack: InputAudioTrack);
    /**
     * Retrieves the audio buffer corresponding to the given timestamp, in seconds. More specifically, returns
     * the last audio buffer (in presentation order) with a start timestamp less than or equal to the given timestamp.
     * Returns null if the timestamp is before the track's first timestamp.
     *
     * @param timestamp - The timestamp used for retrieval, in seconds.
     */
    getBuffer(timestamp: number): Promise<WrappedAudioBuffer | null>;
    /**
     * Creates an async iterator that yields audio buffers of this track in presentation order. This method
     * will intelligently pre-decode a few buffers ahead to enable fast iteration.
     *
     * @param startTimestamp - The timestamp in seconds at which to start yielding buffers (inclusive).
     * @param endTimestamp - The timestamp in seconds at which to stop yielding buffers (exclusive).
     */
    buffers(startTimestamp?: number, endTimestamp?: number): AsyncGenerator<WrappedAudioBuffer, void, unknown>;
    /**
     * Creates an async iterator that yields an audio buffer for each timestamp in the argument. This method
     * uses an optimized decoding pipeline if these timestamps are monotonically sorted, decoding each packet at most
     * once, and is therefore more efficient than manually getting the buffer for every timestamp. The iterator may
     * yield null if no buffer is available for a given timestamp.
     *
     * @param timestamps - An iterable or async iterable of timestamps in seconds.
     */
    buffersAtTimestamps(timestamps: AnyIterable<number>): AsyncGenerator<WrappedAudioBuffer | null, void, unknown>;
}
//# sourceMappingURL=media-sink.d.ts.map