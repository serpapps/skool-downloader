/*!
 * Copyright (c) 2025-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Rotation, SetRequired } from './misc';
/**
 * Metadata used for VideoSample initialization.
 * @public
 */
export type VideoSampleInit = {
    /** The internal pixel format in which the frame is stored. */
    format?: VideoPixelFormat;
    /** The width of the frame in pixels. */
    codedWidth?: number;
    /** The height of the frame in pixels. */
    codedHeight?: number;
    /** The rotation of the frame in degrees, clockwise. */
    rotation?: Rotation;
    /** The presentation timestamp of the frame in seconds. */
    timestamp?: number;
    /** The duration of the frame in seconds. */
    duration?: number;
    /** The color space of the frame. */
    colorSpace?: VideoColorSpaceInit;
};
/**
 * Represents a raw, unencoded video sample (frame). Mainly used as an expressive wrapper around WebCodecs API's
 * VideoFrame, but can also be used standalone.
 * @public
 */
export declare class VideoSample {
    /** The internal pixel format in which the frame is stored. */
    readonly format: VideoPixelFormat | null;
    /** The width of the frame in pixels. */
    readonly codedWidth: number;
    /** The height of the frame in pixels. */
    readonly codedHeight: number;
    /** The rotation of the frame in degrees, clockwise. */
    readonly rotation: Rotation;
    /**
     * The presentation timestamp of the frame in seconds. May be negative. Frames with negative end timestamps should
     * not be presented.
     */
    readonly timestamp: number;
    /** The duration of the frame in seconds. */
    readonly duration: number;
    /** The color space of the frame. */
    readonly colorSpace: VideoColorSpace;
    /** The width of the frame in pixels after rotation. */
    get displayWidth(): number;
    /** The height of the frame in pixels after rotation. */
    get displayHeight(): number;
    /** The presentation timestamp of the frame in microseconds. */
    get microsecondTimestamp(): number;
    /** The duration of the frame in microseconds. */
    get microsecondDuration(): number;
    constructor(data: VideoFrame, init?: VideoSampleInit);
    constructor(data: CanvasImageSource, init: SetRequired<VideoSampleInit, 'timestamp'>);
    constructor(data: BufferSource, init: SetRequired<VideoSampleInit, 'format' | 'codedWidth' | 'codedHeight' | 'timestamp'>);
    /** Clones this video sample. */
    clone(): VideoSample;
    /**
     * Closes this video sample, releasing held resources. Video samples should be closed as soon as they are not
     * needed anymore.
     */
    close(): void;
    /** Returns the number of bytes required to hold this video sample's pixel data. */
    allocationSize(): number;
    /** Copies this video sample's pixel data to an ArrayBuffer or ArrayBufferView. */
    copyTo(destination: AllowSharedBufferSource): Promise<void>;
    /**
     * Converts this video sample to a VideoFrame for use with the WebCodecs API. The VideoFrame returned by this
     * method *must* be closed separately from this video sample.
     */
    toVideoFrame(): VideoFrame;
    /**
     * Draws the video sample to a 2D canvas context. Rotation metadata will be taken into account.
     *
     * @param dx - The x-coordinate in the destination canvas at which to place the top-left corner of the source image.
     * @param dy - The y-coordinate in the destination canvas at which to place the top-left corner of the source image.
     * @param dWidth - The width in pixels with which to draw the image in the destination canvas.
     * @param dHeight - The height in pixels with which to draw the image in the destination canvas.
     */
    draw(context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, dx: number, dy: number, dWidth?: number, dHeight?: number): void;
    /**
     * Draws the video sample to a 2D canvas context. Rotation metadata will be taken into account.
     *
     * @param sx - The x-coordinate of the top left corner of the sub-rectangle of the source image to draw into the
     * destination context.
     * @param sy - The y-coordinate of the top left corner of the sub-rectangle of the source image to draw into the
     * destination context.
     * @param sWidth - The width of the sub-rectangle of the source image to draw into the destination context.
     * @param sHeight - The height of the sub-rectangle of the source image to draw into the destination context.
     * @param dx - The x-coordinate in the destination canvas at which to place the top-left corner of the source image.
     * @param dy - The y-coordinate in the destination canvas at which to place the top-left corner of the source image.
     * @param dWidth - The width in pixels with which to draw the image in the destination canvas.
     * @param dHeight - The height in pixels with which to draw the image in the destination canvas.
     */
    draw(context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, sx: number, sy: number, sWidth: number, sHeight: number, dx: number, dy: number, dWidth?: number, dHeight?: number): void;
    /**
     * Converts this video sample to a CanvasImageSource for drawing to a canvas.
     *
     * You must use the value returned by this method immediately, as any VideoFrame created internally will
     * automatically be closed in the next microtask.
     */
    toCanvasImageSource(): VideoFrame | OffscreenCanvas;
    /** Sets the rotation metadata of this video sample. */
    setRotation(newRotation: Rotation): void;
    /** Sets the presentation timestamp of this video sample, in seconds. */
    setTimestamp(newTimestamp: number): void;
    /** Sets the duration of this video sample, in seconds. */
    setDuration(newDuration: number): void;
}
/**
 * Metadata used for AudioSample initialization.
 * @public
 */
export type AudioSampleInit = {
    /** The audio data for this sample. */
    data: AllowSharedBufferSource;
    /** The audio sample format. */
    format: AudioSampleFormat;
    /** The number of audio channels. */
    numberOfChannels: number;
    /** The audio sample rate in hertz. */
    sampleRate: number;
    /** The presentation timestamp of the sample in seconds. */
    timestamp: number;
};
/**
 * Options used for copying audio sample data.
 * @public
 */
export type AudioSampleCopyToOptions = {
    /**
     * The index identifying the plane to copy from. This must be 0 if using a non-planar (interleaved) output format.
     */
    planeIndex: number;
    /** The output format for the destination data. Defaults to the AudioSample's format. */
    format?: AudioSampleFormat;
    /** An offset into the source plane data indicating which frame to begin copying from. Defaults to 0. */
    frameOffset?: number;
    /**
     * The number of frames to copy. If not provided, the copy will include all frames in the plane beginning
     * with frameOffset.
     */
    frameCount?: number;
};
/**
 * Represents a raw, unencoded audio sample. Mainly used as an expressive wrapper around WebCodecs API's AudioData,
 * but can also be used standalone.
 * @public
 */
export declare class AudioSample {
    /** The audio sample format. */
    readonly format: AudioSampleFormat;
    /** The audio sample rate in hertz. */
    readonly sampleRate: number;
    /**
     * The number of audio frames in the sample, per channel. In other words, the length of this audio sample in frames.
     */
    readonly numberOfFrames: number;
    /** The number of audio channels. */
    readonly numberOfChannels: number;
    /** The timestamp of the sample in seconds. */
    readonly duration: number;
    /**
     * The presentation timestamp of the sample in seconds. May be negative. Samples with negative end timestamps should
     * not be presented.
     */
    readonly timestamp: number;
    /** The presentation timestamp of the sample in microseconds. */
    get microsecondTimestamp(): number;
    /** The duration of the sample in microseconds. */
    get microsecondDuration(): number;
    constructor(init: AudioData | AudioSampleInit);
    /** Returns the number of bytes required to hold the audio sample's data as specified by the given options. */
    allocationSize(options: AudioSampleCopyToOptions): number;
    /** Copies the audio sample's data to an ArrayBuffer or ArrayBufferView as specified by the given options. */
    copyTo(destination: AllowSharedBufferSource, options: AudioSampleCopyToOptions): void;
    /** Clones this audio sample. */
    clone(): AudioSample;
    /**
     * Closes this audio sample, releasing held resources. Audio samples should be closed as soon as they are not
     * needed anymore.
     */
    close(): void;
    /**
     * Converts this audio sample to an AudioData for use with the WebCodecs API. The AudioData returned by this
     * method *must* be closed separately from this audio sample.
     */
    toAudioData(): AudioData;
    /** Convert this audio sample to an AudioBuffer for use with the Web Audio API. */
    toAudioBuffer(): AudioBuffer;
    /** Sets the presentation timestamp of this audio sample, in seconds. */
    setTimestamp(newTimestamp: number): void;
    /**
     * Creates AudioSamples from an AudioBuffer, starting at the given timestamp in seconds. Typically creates exactly
     * one sample, but may create multiple if the AudioBuffer is exceedingly large.
     */
    static fromAudioBuffer(audioBuffer: AudioBuffer, timestamp: number): AudioSample[];
}
//# sourceMappingURL=sample.d.ts.map