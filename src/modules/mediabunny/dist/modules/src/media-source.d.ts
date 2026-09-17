/*!
 * Copyright (c) 2025-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { AudioCodec, Quality, SubtitleCodec, VideoCodec } from './codec';
import { EncodedPacket } from './packet';
import { AudioSample, VideoSample } from './sample';
/**
 * Base class for media sources. Media sources are used to add media samples to an output file.
 * @public
 */
export declare abstract class MediaSource {
    /**
     * Closes this source. This prevents future samples from being added and signals to the output file that no further
     * samples will come in for this track. Calling `.close()` is optional but recommended after adding the
     * last sample - for improved performance and reduced memory usage.
     */
    close(): void;
}
/**
 * Base class for video sources - sources for video tracks.
 * @public
 */
export declare abstract class VideoSource extends MediaSource {
    constructor(codec: VideoCodec);
}
/**
 * The most basic video source; can be used to directly pipe encoded packets into the output file.
 * @public
 */
export declare class EncodedVideoPacketSource extends VideoSource {
    constructor(codec: VideoCodec);
    /**
     * Adds an encoded packet to the output video track. Packets must be added in *decode order*, while a packet's
     * timestamp must be its *presentation timestamp*. B-frames are handled automatically.
     *
     * @param meta - Additional metadata from the encoder. You should pass this for the first call, including a valid
     * decoder config.
     *
     * @returns A Promise that resolves once the output is ready to receive more samples. You should await this Promise
     * to respect writer and encoder backpressure.
     */
    add(packet: EncodedPacket, meta?: EncodedVideoChunkMetadata): Promise<void>;
}
/**
 * Configuration object that controls video encoding. Can be used to set codec, quality, and more.
 * @public
 */
export type VideoEncodingConfig = {
    /** The video codec that should be used for encoding the video samples (frames). */
    codec: VideoCodec;
    /**
     * The target bitrate for the encoded video, in bits per second. Alternatively, a subjective Quality can
     * be provided.
     */
    bitrate: number | Quality;
    /** The latency mode used by the encoder; controls the performance-quality tradeoff. */
    latencyMode?: VideoEncoderConfig['latencyMode'];
    /**
     * The interval, in seconds, of how often frames are encoded as a key frame. The default is 5 seconds. Frequent key
     * frames improve seeking behavior but increase file size. When using multiple video tracks, you should give them
     * all the same key frame interval.
     */
    keyFrameInterval?: number;
    /**
     * The full codec string as specified in the WebCodecs Codec Registry. This string must match the codec
     * specified in `codec`. When not set, a fitting codec string will be constructed automatically by the library.
     */
    fullCodecString?: string;
    /** Called for each successfully encoded packet. Both the packet and the encoding metadata are passed. */
    onEncodedPacket?: (packet: EncodedPacket, meta: EncodedVideoChunkMetadata | undefined) => unknown;
    /** Called when the internal encoder config, as used by the WebCodecs API, is created. */
    onEncoderConfig?: (config: VideoEncoderConfig) => unknown;
};
/**
 * This source can be used to add raw, unencoded video samples (frames) to an output video track. These frames will
 * automatically be encoded and then piped into the output.
 * @public
 */
export declare class VideoSampleSource extends VideoSource {
    constructor(encodingConfig: VideoEncodingConfig);
    /**
     * Encodes a video sample (frame) and then adds it to the output.
     *
     * @returns A Promise that resolves once the output is ready to receive more samples. You should await this Promise
     * to respect writer and encoder backpressure.
     */
    add(videoSample: VideoSample, encodeOptions?: VideoEncoderEncodeOptions): Promise<void>;
}
/**
 * This source can be used to add video frames to the output track from a fixed canvas element. Since canvases are often
 * used for rendering, this source provides a convenient wrapper around VideoSampleSource.
 * @public
 */
export declare class CanvasSource extends VideoSource {
    constructor(canvas: HTMLCanvasElement | OffscreenCanvas, encodingConfig: VideoEncodingConfig);
    /**
     * Captures the current canvas state as a video sample (frame), encodes it and adds it to the output.
     *
     * @param timestamp - The timestamp of the sample, in seconds.
     * @param duration - The duration of the sample, in seconds.
     *
     * @returns A Promise that resolves once the output is ready to receive more samples. You should await this Promise
     * to respect writer and encoder backpressure.
     */
    add(timestamp: number, duration?: number, encodeOptions?: VideoEncoderEncodeOptions): Promise<void>;
}
/**
 * Video source that encodes the frames of a MediaStreamVideoTrack and pipes them into the output. This is useful for
 * capturing live or real-time data such as webcams or screen captures. Frames will automatically start being captured
 * once the connected Output is started, and will keep being captured until the Output is finalized or this source
 * is closed.
 * @public
 */
export declare class MediaStreamVideoTrackSource extends VideoSource {
    /** A promise that rejects upon any error within this source. This promise never resolves. */
    get errorPromise(): Promise<void>;
    constructor(track: MediaStreamVideoTrack, encodingConfig: VideoEncodingConfig);
}
/**
 * Base class for audio sources - sources for audio tracks.
 * @public
 */
export declare abstract class AudioSource extends MediaSource {
    constructor(codec: AudioCodec);
}
/**
 * The most basic audio source; can be used to directly pipe encoded packets into the output file.
 * @public
 */
export declare class EncodedAudioPacketSource extends AudioSource {
    constructor(codec: AudioCodec);
    /**
     * Adds an encoded packet to the output audio track. Packets must be added in *decode order*.
     *
     * @param meta - Additional metadata from the encoder. You should pass this for the first call, including a valid
     * decoder config.
     *
     * @returns A Promise that resolves once the output is ready to receive more samples. You should await this Promise
     * to respect writer and encoder backpressure.
     */
    add(packet: EncodedPacket, meta?: EncodedAudioChunkMetadata): Promise<void>;
}
/**
 * Configuration object that controls audio encoding. Can be used to set codec, quality, and more.
 * @public
 */
export type AudioEncodingConfig = {
    /** The audio codec that should be used for encoding the audio samples. */
    codec: AudioCodec;
    /**
     * The target bitrate for the encoded audio, in bits per second. Alternatively, a subjective Quality can
     * be provided. Required for compressed audio codecs, unused for PCM codecs.
     */
    bitrate?: number | Quality;
    /**
     * The full codec string as specified in the WebCodecs Codec Registry. This string must match the codec
     * specified in `codec`. When not set, a fitting codec string will be constructed automatically by the library.
     */
    fullCodecString?: string;
    /** Called for each successfully encoded packet. Both the packet and the encoding metadata are passed. */
    onEncodedPacket?: (packet: EncodedPacket, meta: EncodedAudioChunkMetadata | undefined) => unknown;
    /** Called when the internal encoder config, as used by the WebCodecs API, is created. */
    onEncoderConfig?: (config: AudioEncoderConfig) => unknown;
};
/**
 * This source can be used to add raw, unencoded audio samples to an output audio track. These samples will
 * automatically be encoded and then piped into the output.
 * @public
 */
export declare class AudioSampleSource extends AudioSource {
    constructor(encodingConfig: AudioEncodingConfig);
    /**
     * Encodes an audio sample and then adds it to the output.
     *
     * @returns A Promise that resolves once the output is ready to receive more samples. You should await this Promise
     * to respect writer and encoder backpressure.
     */
    add(audioSample: AudioSample): Promise<void>;
}
/**
 * This source can be used to add audio data from an AudioBuffer to the output track. This is useful when working with
 * the Web Audio API.
 * @public
 */
export declare class AudioBufferSource extends AudioSource {
    constructor(encodingConfig: AudioEncodingConfig);
    /**
     * Converts an AudioBuffer to audio samples, encodes them and adds them to the output. The first AudioBuffer will
     * be played at timestamp 0, and any subsequent AudioBuffer will have a timestamp equal to the total duration of
     * all previous AudioBuffers.
     *
     * @returns A Promise that resolves once the output is ready to receive more samples. You should await this Promise
     * to respect writer and encoder backpressure.
     */
    add(audioBuffer: AudioBuffer): Promise<void>;
}
/**
 * Audio source that encodes the data of a MediaStreamAudioTrack and pipes it into the output. This is useful for
 * capturing live or real-time audio such as microphones or audio from other media elements. Audio will automatically
 * start being captured once the connected Output is started, and will keep being captured until the Output is
 * finalized or this source is closed.
 * @public
 */
export declare class MediaStreamAudioTrackSource extends AudioSource {
    /** A promise that rejects upon any error within this source. This promise never resolves. */
    get errorPromise(): Promise<void>;
    constructor(track: MediaStreamAudioTrack, encodingConfig: AudioEncodingConfig);
}
/**
 * Base class for subtitle sources - sources for subtitle tracks.
 * @public
 */
export declare abstract class SubtitleSource extends MediaSource {
    constructor(codec: SubtitleCodec);
}
/**
 * This source can be used to add subtitles from a subtitle text file.
 * @public
 */
export declare class TextSubtitleSource extends SubtitleSource {
    constructor(codec: SubtitleCodec);
    /**
     * Parses the subtitle text according to the specified codec and adds it to the output track. You don't have to
     * add the entire subtitle file at once here; you can provide it in chunks.
     *
     * @returns A Promise that resolves once the output is ready to receive more samples. You should await this Promise
     * to respect writer and encoder backpressure.
     */
    add(text: string): Promise<void>;
}
//# sourceMappingURL=media-source.d.ts.map