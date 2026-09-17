/*!
 * Copyright (c) 2025-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
/**
 * Base class representing an input media file format.
 * @public
 */
export declare abstract class InputFormat {
    /** Returns the name of the input format. */
    abstract get name(): string;
    /** Returns the typical base MIME type of the input format. */
    abstract get mimeType(): string;
}
/**
 * Format representing files compatible with the ISO base media file format (ISOBMFF), like MP4 or MOV files.
 * @public
 */
export declare abstract class IsobmffInputFormat extends InputFormat {
}
/**
 * MPEG-4 Part 14 (MP4) file format.
 * @public
 */
export declare class Mp4InputFormat extends IsobmffInputFormat {
    get name(): string;
    get mimeType(): string;
}
/**
 * QuickTime File Format (QTFF), often called MOV.
 * @public
 */
export declare class QuickTimeInputFormat extends IsobmffInputFormat {
    get name(): string;
    get mimeType(): string;
}
/**
 * Matroska file format.
 * @public
 */
export declare class MatroskaInputFormat extends InputFormat {
    get name(): string;
    get mimeType(): string;
}
/**
 * WebM file format, based on Matroska.
 * @public
 */
export declare class WebMInputFormat extends MatroskaInputFormat {
    get name(): string;
    get mimeType(): string;
}
/**
 * MP3 file format.
 * @public
 */
export declare class Mp3InputFormat extends InputFormat {
    get name(): string;
    get mimeType(): string;
}
/**
 * WAVE file format, based on RIFF.
 * @public
 */
export declare class WaveInputFormat extends InputFormat {
    get name(): string;
    get mimeType(): string;
}
/**
 * Ogg file format.
 * @public
 */
export declare class OggInputFormat extends InputFormat {
    get name(): string;
    get mimeType(): string;
}
/**
 * MP4 input format singleton.
 * @public
 */
export declare const MP4: Mp4InputFormat;
/**
 * QuickTime File Format input format singleton.
 * @public
 */
export declare const QTFF: QuickTimeInputFormat;
/**
 * Matroska input format singleton.
 * @public
 */
export declare const MATROSKA: MatroskaInputFormat;
/**
 * WebM input format singleton.
 * @public
 */
export declare const WEBM: WebMInputFormat;
/**
 * MP3 input format singleton.
 * @public
 */
export declare const MP3: Mp3InputFormat;
/**
 * WAVE input format singleton.
 * @public
 */
export declare const WAVE: WaveInputFormat;
/**
 * Ogg input format singleton.
 * @public
 */
export declare const OGG: OggInputFormat;
/**
 * List of all input format singletons. If you don't need to support all input formats, you should specify the
 * formats individually for better tree shaking.
 * @public
 */
export declare const ALL_FORMATS: InputFormat[];
//# sourceMappingURL=input-format.d.ts.map