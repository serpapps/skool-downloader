/*!
 * Copyright (c) 2025-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { AudioCodec, VideoCodec } from './codec';
import { Input } from './input';
import { InputAudioTrack, InputTrack, InputVideoTrack } from './input-track';
import { AudioEncodingConfig, VideoEncodingConfig } from './media-source';
import { MaybePromise, Rotation } from './misc';
import { Output } from './output';
import { AudioSample } from './sample';
/**
 * Video-specific options.
 * @public
 */
export type ConversionVideoOptions = {
    /** If true, all video tracks will be discarded and will not be present in the output. */
    discard?: boolean;
    /**
     * The desired width of the output video in pixels, defaulting to the video's natural display width. If height
     * is not set, it will be deduced automatically based on aspect ratio.
     */
    width?: number;
    /**
     * The desired height of the output video in pixels, defaulting to the video's natural display height. If width
     * is not set, it will be deduced automatically based on aspect ratio.
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
     * The angle in degrees to rotate the input video by, clockwise. Rotation is applied before resizing. This
     * rotation is _in addition to_ the natural rotation of the input video as specified in input file's metadata.
     */
    rotate?: Rotation;
    /**
     * The desired frame rate of the output video, in hertz. If not specified, the original input frame rate will
     * be used (which may be variable).
     */
    frameRate?: number;
    /** The desired output video codec. */
    codec?: VideoCodec;
    /** The desired bitrate of the output video. */
    bitrate?: VideoEncodingConfig['bitrate'];
    /** When true, video will always be re-encoded instead of directly copying over the encoded samples. */
    forceTranscode?: boolean;
};
/**
 * Audio-specific options.
 * @public
 */
export type ConversionAudioOptions = {
    /** If true, all audio tracks will be discarded and will not be present in the output. */
    discard?: boolean;
    /** The desired channel count of the output audio. */
    numberOfChannels?: number;
    /** The desired sample rate of the output audio, in hertz. */
    sampleRate?: number;
    /** The desired output audio codec. */
    codec?: AudioCodec;
    /** The desired bitrate of the output audio. */
    bitrate?: AudioEncodingConfig['bitrate'];
    /** When true, audio will always be re-encoded instead of directly copying over the encoded samples. */
    forceTranscode?: boolean;
};
/**
 * The options for media file conversion.
 * @public
 */
export type ConversionOptions = {
    /** The input file. */
    input: Input;
    /** The output file. */
    output: Output;
    /**
     * Video-specific options. When passing an object, the same options are applied to all video tracks. When passing a
     * function, it will be invoked for each video track and is expected to return or resolve to the options
     * for that specific track. The function is passed an instance of `InputVideoTrack` as well as a number `n`, which
     * is the 1-based index of the track in the list of all video tracks.
     */
    video?: ConversionVideoOptions | ((track: InputVideoTrack, n: number) => MaybePromise<ConversionVideoOptions | undefined>);
    /**
     * Audio-specific options. When passing an object, the same options are applied to all audio tracks. When passing a
     * function, it will be invoked for each audio track and is expected to return or resolve to the options
     * for that specific track. The function is passed an instance of `InputAudioTrack` as well as a number `n`, which
     * is the 1-based index of the track in the list of all audio tracks.
     */
    audio?: ConversionAudioOptions | ((track: InputAudioTrack, n: number) => MaybePromise<ConversionAudioOptions | undefined>);
    /** Options to trim the input file. */
    trim?: {
        /** The time in the input file in seconds at which the output file should start. Must be less than `end`.  */
        start: number;
        /** The time in the input file in seconds at which the output file should end. Must be greater than `start`. */
        end: number;
    };
};
/**
 * Represents a media file conversion process, used to convert one media file into another. In addition to conversion,
 * this class can be used to resize and rotate video, resample audio, drop tracks, or trim to a specific time range.
 * @public
 */
export declare class Conversion {
    /** The input file. */
    readonly input: Input;
    /** The output file. */
    readonly output: Output;
    /**
     * A callback that is fired whenever the conversion progresses. Returns a number between 0 and 1, indicating the
     * completion of the conversion. Note that a progress of 1 doesn't necessarily mean the conversion is complete;
     * the conversion is complete once `execute` resolves.
     *
     * In order for progress to be computed, this property must be set before `execute` is called.
     */
    onProgress?: (progress: number) => unknown;
    /** The list of tracks that are included in the output file. */
    readonly utilizedTracks: InputTrack[];
    /** The list of tracks from the input file that have been discarded, alongside the discard reason. */
    readonly discardedTracks: {
        /** The track that was discarded. */
        track: InputTrack;
        /** The reason for discarding the track. */
        reason: 'discarded_by_user' | 'max_track_count_reached' | 'max_track_count_of_type_reached' | 'unknown_source_codec' | 'undecodable_source_codec' | 'no_encodable_target_codec';
    }[];
    /** Initializes a new conversion process without starting the conversion. */
    static init(options: ConversionOptions): Promise<Conversion>;
    private constructor();
    /** Executes the conversion process. Resolves once conversion is complete. */
    execute(): Promise<void>;
    /** Cancels the conversion process. Does nothing if the conversion is already complete. */
    cancel(): Promise<void>;
}
/**
 * Utility class to handle audio resampling, handling both sample rate resampling as well as channel up/downmixing.
 * The advantage over doing this manually rather than using OfflineAudioContext to do it for us is the artifact-free
 * handling of putting multiple resampled audio samples back to back, which produces flaky results using
 * OfflineAudioContext.
 */
export declare class AudioResampler {
    sourceSampleRate: number;
    targetSampleRate: number;
    sourceNumberOfChannels: number;
    targetNumberOfChannels: number;
    startTime: number;
    endTime: number;
    onSample: (sample: AudioSample) => Promise<void>;
    bufferSizeInFrames: number;
    bufferSizeInSamples: number;
    outputBuffer: Float32Array;
    /** Start frame of current buffer */
    bufferStartFrame: number;
    /** The highest index written to in the current buffer */
    maxWrittenFrame: number;
    channelMixer: (sourceData: Float32Array, sourceFrameIndex: number, targetChannelIndex: number) => number;
    tempSourceBuffer: Float32Array;
    constructor(options: {
        sourceSampleRate: number;
        targetSampleRate: number;
        sourceNumberOfChannels: number;
        targetNumberOfChannels: number;
        startTime: number;
        endTime: number;
        onSample: (sample: AudioSample) => Promise<void>;
    });
    /**
     * Sets up the channel mixer to handle up/downmixing in the case where input and output channel counts don't match.
     */
    setupChannelMixer(): void;
    ensureTempBufferSize(requiredSamples: number): void;
    add(audioSample: AudioSample): Promise<void>;
    finalizeCurrentBuffer(): Promise<void>;
    finalize(): Promise<void>;
}
//# sourceMappingURL=conversion.d.ts.map