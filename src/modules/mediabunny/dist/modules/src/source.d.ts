/*!
 * Copyright (c) 2025-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
/**
 * The source base class, representing a resource from which bytes can be read.
 * @public
 */
export declare abstract class Source {
    /**
     * Resolves with the total size of the file in bytes. This function is memoized, meaning only the first call
     * will retrieve the size.
     */
    getSize(): Promise<number>;
    /** Called each time data is requested from the source. */
    onread: ((start: number, end: number) => unknown) | null;
}
/**
 * A source backed by an ArrayBuffer or ArrayBufferView, with the entire file held in memory.
 * @public
 */
export declare class BufferSource extends Source {
    constructor(buffer: ArrayBuffer | Uint8Array);
}
/**
 * Options for defining a StreamSource.
 * @public
 */
export type StreamSourceOptions = {
    /** Called when data is requested. Should return or resolve to the bytes from the specified byte range. */
    read: (start: number, end: number) => Uint8Array | Promise<Uint8Array>;
    /** Called when the size of the entire file is requested. Should return or resolve to the size in bytes. */
    getSize: () => number | Promise<number>;
};
/**
 * A general-purpose, callback-driven source that can get its data from anywhere.
 * @public
 */
export declare class StreamSource extends Source {
    constructor(options: StreamSourceOptions);
}
/**
 * A source backed by a Blob. Since Files are also Blobs, this is the source to use when reading files off the disk.
 * @public
 */
export declare class BlobSource extends Source {
    constructor(blob: Blob);
}
/**
 * Options for UrlSource.
 * @public
 */
export type UrlSourceOptions = {
    /**
     * The RequestInit used by the Fetch API. Can be used to further control the requests, such as setting
     * custom headers.
     */
    requestInit?: RequestInit;
    /**
     * A function that returns the delay (in seconds) before retrying a failed request. The function is called
     * with the number of previous, unsuccessful attempts. If the function returns `null`, no more retries will be made.
     */
    getRetryDelay?: (previousAttempts: number) => number | null;
};
/**
 * A source backed by a URL. This is useful for reading data from the network. Be careful using this source however,
 * as it typically comes with increased latency.
 * @beta
 */
export declare class UrlSource extends Source {
    constructor(url: string | URL, options?: UrlSourceOptions);
}
//# sourceMappingURL=source.d.ts.map