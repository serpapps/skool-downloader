/*!
 * Copyright (c) 2025-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
/**
 * Base class for targets, specifying where output files are written.
 * @public
 */
export declare abstract class Target {
}
/**
 * A target that writes data directly into an ArrayBuffer in memory. Great for performance, but not suitable for very
 * large files. The buffer will be available once the output has been finalized.
 * @public
 */
export declare class BufferTarget extends Target {
    /** Stores the final output buffer. Until the output is finalized, this will be null. */
    buffer: ArrayBuffer | null;
}
/**
 * A data chunk for StreamTarget.
 * @public
 */
export type StreamTargetChunk = {
    /** The operation type. */
    type: 'write';
    /** The data to write. */
    data: Uint8Array;
    /** The byte offset in the output file at which to write the data. */
    position: number;
};
/**
 * Options for StreamTarget.
 * @public
 */
export type StreamTargetOptions = {
    /**
     * When setting this to true, data created by the output will first be accumulated and only written out
     * once it has reached sufficient size, using a default chunk size of 16 MiB. This is useful for reducing the total
     * amount of writes, at the cost of latency.
     */
    chunked?: boolean;
    /** When using `chunked: true`, this specifies the maximum size of each chunk. Defaults to 16 MiB. */
    chunkSize?: number;
};
/**
 * This target writes data to a WritableStream, making it a general-purpose target for writing data anywhere. It is
 * also compatible with FileSystemWritableFileStream for use with the File System Access API. The WritableStream can
 * also apply backpressure, which will propagate to the output and throttle the encoders.
 * @public
 */
export declare class StreamTarget extends Target {
    constructor(writable: WritableStream<StreamTargetChunk>, options?: StreamTargetOptions);
}
//# sourceMappingURL=target.d.ts.map