/*!
 * Copyright (c) 2025-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Av1CodecInfo, AvcDecoderConfigurationRecord, HevcDecoderConfigurationRecord, Vp9CodecInfo } from './codec-data';
import { SubtitleMetadata } from './subtitles';
/**
 * List of known video codecs, ordered by encoding preference.
 * @public
 */
export declare const VIDEO_CODECS: readonly ["avc", "hevc", "vp9", "av1", "vp8"];
/**
 * List of known PCM (uncompressed) audio codecs, ordered by encoding preference.
 * @public
 */
export declare const PCM_AUDIO_CODECS: readonly ["pcm-s16", "pcm-s16be", "pcm-s24", "pcm-s24be", "pcm-s32", "pcm-s32be", "pcm-f32", "pcm-f32be", "pcm-f64", "pcm-f64be", "pcm-u8", "pcm-s8", "ulaw", "alaw"];
/**
 * List of known compressed audio codecs, ordered by encoding preference.
 * @public
 */
export declare const NON_PCM_AUDIO_CODECS: readonly ["aac", "opus", "mp3", "vorbis", "flac"];
/**
 * List of known audio codecs, ordered by encoding preference.
 * @public
 */
export declare const AUDIO_CODECS: readonly ["aac", "opus", "mp3", "vorbis", "flac", "pcm-s16", "pcm-s16be", "pcm-s24", "pcm-s24be", "pcm-s32", "pcm-s32be", "pcm-f32", "pcm-f32be", "pcm-f64", "pcm-f64be", "pcm-u8", "pcm-s8", "ulaw", "alaw"];
/**
 * List of known subtitle codecs, ordered by encoding preference.
 * @public
 */
export declare const SUBTITLE_CODECS: readonly ["webvtt"];
/**
 * Union type of known video codecs.
 * @public
 */
export type VideoCodec = typeof VIDEO_CODECS[number];
/**
 * Union type of known audio codecs.
 * @public
 */
export type AudioCodec = typeof AUDIO_CODECS[number];
export type PcmAudioCodec = typeof PCM_AUDIO_CODECS[number];
/**
 * Union type of known subtitle codecs.
 * @public
 */
export type SubtitleCodec = typeof SUBTITLE_CODECS[number];
/**
 * Union type of known media codecs.
 * @public
 */
export type MediaCodec = VideoCodec | AudioCodec | SubtitleCodec;
export declare const VP9_LEVEL_TABLE: {
    maxPictureSize: number;
    maxBitrate: number;
    level: number;
}[];
export declare const buildVideoCodecString: (codec: VideoCodec, width: number, height: number, bitrate: number) => string;
export declare const generateVp9CodecConfigurationFromCodecString: (codecString: string) => number[];
export declare const generateAv1CodecConfigurationFromCodecString: (codecString: string) => number[];
export declare const extractVideoCodecString: (trackInfo: {
    width: number;
    height: number;
    codec: VideoCodec | null;
    codecDescription: Uint8Array | null;
    colorSpace: VideoColorSpaceInit | null;
    avcCodecInfo: AvcDecoderConfigurationRecord | null;
    hevcCodecInfo: HevcDecoderConfigurationRecord | null;
    vp9CodecInfo: Vp9CodecInfo | null;
    av1CodecInfo: Av1CodecInfo | null;
}) => string;
export declare const buildAudioCodecString: (codec: AudioCodec, numberOfChannels: number, sampleRate: number) => "opus" | "mp3" | "vorbis" | "flac" | "pcm-s16" | "pcm-s16be" | "pcm-s24" | "pcm-s24be" | "pcm-s32" | "pcm-s32be" | "pcm-f32" | "pcm-f32be" | "pcm-f64" | "pcm-f64be" | "pcm-u8" | "pcm-s8" | "ulaw" | "alaw" | "mp4a.40.29" | "mp4a.40.5" | "mp4a.40.2";
export type AacCodecInfo = {
    isMpeg2: boolean;
};
export declare const extractAudioCodecString: (trackInfo: {
    codec: AudioCodec | null;
    codecDescription: Uint8Array | null;
    aacCodecInfo: AacCodecInfo | null;
}) => string;
export declare const parseAacAudioSpecificConfig: (bytes: Uint8Array | null) => {
    objectType: number;
    frequencyIndex: number;
    sampleRate: number | null;
    channelConfiguration: number;
    numberOfChannels: number | null;
};
export declare const OPUS_INTERNAL_SAMPLE_RATE = 48000;
export declare const parsePcmCodec: (codec: PcmAudioCodec) => {
    dataType: "ulaw";
    sampleSize: 1;
    littleEndian: boolean;
    silentValue: number;
} | {
    dataType: "alaw";
    sampleSize: 1;
    littleEndian: boolean;
    silentValue: number;
} | {
    dataType: "unsigned" | "signed" | "float";
    sampleSize: 8 | 1 | 2 | 4 | 3;
    littleEndian: boolean;
    silentValue: number;
};
export declare const inferCodecFromCodecString: (codecString: string) => MediaCodec | null;
export declare const getVideoEncoderConfigExtension: (codec: VideoCodec) => {
    avc: {
        format: "avc";
    };
    hevc?: undefined;
} | {
    hevc: {
        format: "hevc";
    };
    avc?: undefined;
} | {
    avc?: undefined;
    hevc?: undefined;
};
export declare const getAudioEncoderConfigExtension: (codec: AudioCodec) => {
    aac: {
        format: "aac";
    };
    opus?: undefined;
} | {
    opus: {
        format: "opus";
    };
    aac?: undefined;
} | {
    aac?: undefined;
    opus?: undefined;
};
/**
 * Represents a subjective media quality level.
 * @public
 */
export declare class Quality {
}
/**
 * Represents a very low media quality.
 * @public
 */
export declare const QUALITY_VERY_LOW: Quality;
/**
 * Represents a low media quality.
 * @public
 */
export declare const QUALITY_LOW: Quality;
/**
 * Represents a medium media quality.
 * @public
 */
export declare const QUALITY_MEDIUM: Quality;
/**
 * Represents a high media quality.
 * @public
 */
export declare const QUALITY_HIGH: Quality;
/**
 * Represents a very high media quality.
 * @public
 */
export declare const QUALITY_VERY_HIGH: Quality;
export declare const validateVideoChunkMetadata: (metadata: EncodedVideoChunkMetadata | undefined) => void;
export declare const validateAudioChunkMetadata: (metadata: EncodedAudioChunkMetadata | undefined) => void;
export declare const validateSubtitleMetadata: (metadata: SubtitleMetadata | undefined) => void;
/**
 * Checks if the browser is able to encode the given codec.
 * @public
 */
export declare const canEncode: (codec: MediaCodec) => Promise<boolean>;
/**
 * Checks if the browser is able to encode the given video codec with the given parameters.
 * @public
 */
export declare const canEncodeVideo: (codec: VideoCodec, { width, height, bitrate }?: {
    width?: number;
    height?: number;
    bitrate?: number | Quality;
}) => Promise<boolean>;
/**
 * Checks if the browser is able to encode the given audio codec with the given parameters.
 * @public
 */
export declare const canEncodeAudio: (codec: AudioCodec, { numberOfChannels, sampleRate, bitrate }?: {
    numberOfChannels?: number;
    sampleRate?: number;
    bitrate?: number | Quality;
}) => Promise<boolean>;
/**
 * Checks if the browser is able to encode the given subtitle codec.
 * @public
 */
export declare const canEncodeSubtitles: (codec: SubtitleCodec) => Promise<boolean>;
/**
 * Returns the list of all media codecs that can be encoded by the browser.
 * @public
 */
export declare const getEncodableCodecs: () => Promise<MediaCodec[]>;
/**
 * Returns the list of all video codecs that can be encoded by the browser.
 * @public
 */
export declare const getEncodableVideoCodecs: (checkedCodecs?: VideoCodec[], options?: {
    width?: number;
    height?: number;
    bitrate?: number | Quality;
}) => Promise<VideoCodec[]>;
/**
 * Returns the list of all audio codecs that can be encoded by the browser.
 * @public
 */
export declare const getEncodableAudioCodecs: (checkedCodecs?: AudioCodec[], options?: {
    numberOfChannels?: number;
    sampleRate?: number;
    bitrate?: number | Quality;
}) => Promise<AudioCodec[]>;
/**
 * Returns the list of all subtitle codecs that can be encoded by the browser.
 * @public
 */
export declare const getEncodableSubtitleCodecs: (checkedCodecs?: SubtitleCodec[]) => Promise<SubtitleCodec[]>;
/**
 * Returns the first video codec from the given list that can be encoded by the browser.
 * @public
 */
export declare const getFirstEncodableVideoCodec: (checkedCodecs: VideoCodec[], options?: {
    width?: number;
    height?: number;
    bitrate?: number | Quality;
}) => Promise<VideoCodec | null>;
/**
 * Returns the first audio codec from the given list that can be encoded by the browser.
 * @public
 */
export declare const getFirstEncodableAudioCodec: (checkedCodecs: AudioCodec[], options?: {
    numberOfChannels?: number;
    sampleRate?: number;
    bitrate?: number | Quality;
}) => Promise<AudioCodec | null>;
/**
 * Returns the first subtitle codec from the given list that can be encoded by the browser.
 * @public
 */
export declare const getFirstEncodableSubtitleCodec: (checkedCodecs: SubtitleCodec[]) => Promise<SubtitleCodec | null>;
//# sourceMappingURL=codec.d.ts.map