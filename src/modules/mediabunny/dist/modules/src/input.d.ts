/*!
 * Copyright (c) 2025-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { InputFormat } from './input-format';
import { Source } from './source';
/**
 * The options for creating an Input object.
 * @public
 */
export type InputOptions<S extends Source = Source> = {
    /** A list of supported formats. If the source file is not of one of these formats, then it cannot be read. */
    formats: InputFormat[];
    /** The source from which data will be read. */
    source: S;
};
/**
 * Represents an input media file. This is the root object from which all media read operations start.
 * @public
 */
export declare class Input<S extends Source = Source> {
    constructor(options: InputOptions<S>);
    /**
     * Returns the source from which this input file reads its data. This is the same source that was passed to the
     * constructor.
     */
    get source(): S;
    /**
     * Returns the format of the input file. You can compare this result directly to the InputFormat singletons or use
     * `instanceof` checks for subset-aware logic (for example, `format instanceof MatroskaInputFormat` is true for
     * both MKV and WebM).
     */
    getFormat(): Promise<InputFormat>;
    /**
     * Computes the duration of the input file, in seconds. More precisely, returns the largest end timestamp among
     * all tracks.
     */
    computeDuration(): Promise<number>;
    /** Returns the list of all tracks of this input file. */
    getTracks(): Promise<import("./input-track").InputTrack[]>;
    /** Returns the list of all video tracks of this input file. */
    getVideoTracks(): Promise<import("./input-track").InputVideoTrack[]>;
    /** Returns the primary video track of this input file, or null if there are no video tracks. */
    getPrimaryVideoTrack(): Promise<import("./input-track").InputVideoTrack | null>;
    /** Returns the list of all audio tracks of this input file. */
    getAudioTracks(): Promise<import("./input-track").InputAudioTrack[]>;
    /** Returns the primary audio track of this input file, or null if there are no audio tracks. */
    getPrimaryAudioTrack(): Promise<import("./input-track").InputAudioTrack | null>;
    /** Returns the full MIME type of this input file, including track codecs. */
    getMimeType(): Promise<string>;
}
//# sourceMappingURL=input.d.ts.map