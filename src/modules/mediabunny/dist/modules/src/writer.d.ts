/*!
 * Copyright (c) 2025-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { BufferTarget, StreamTarget } from './target';
export declare abstract class Writer {
    /** Setting this to true will cause the writer to ensure data is written in a strictly monotonic, streamable way. */
    ensureMonotonicity: boolean;
    start(): void;
    /** Writes the given data to the target, at the current position. */
    abstract write(data: Uint8Array): void;
    /** Sets the current position for future writes to a new one. */
    abstract seek(newPos: number): void;
    /** Returns the current position. */
    abstract getPos(): number;
    /** Signals to the writer that it may be time to flush. */
    abstract flush(): Promise<void>;
    /** Called after muxing has finished. */
    abstract finalize(): Promise<void>;
    /** Closes the writer. */
    abstract close(): Promise<void>;
    private trackedWrites;
    private trackedStart;
    private trackedEnd;
    protected maybeTrackWrites(data: Uint8Array): void;
    startTrackingWrites(): void;
    stopTrackingWrites(): {
        data: Uint8Array<ArrayBufferLike>;
        start: number;
        end: number;
    };
}
export declare class BufferTargetWriter extends Writer {
    private pos;
    private target;
    private buffer;
    private bytes;
    private maxPos;
    private supportsResize;
    constructor(target: BufferTarget);
    private ensureSize;
    write(data: Uint8Array): void;
    seek(newPos: number): void;
    getPos(): number;
    flush(): Promise<void>;
    finalize(): Promise<void>;
    close(): Promise<void>;
    getSlice(start: number, end: number): Uint8Array<ArrayBuffer>;
}
/**
 * Writes to a StreamTarget every time it is flushed, sending out all of the new data written since the
 * last flush. This is useful for streaming applications, like piping the output to disk. When using the chunked mode,
 * data will first be accumulated in larger chunks, and then the entire chunk will be flushed out at once when ready.
 */
export declare class StreamTargetWriter extends Writer {
    private pos;
    private target;
    private sections;
    private lastWriteEnd;
    private lastFlushEnd;
    private writer;
    private chunked;
    private chunkSize;
    /**
     * The data is divided up into fixed-size chunks, whose contents are first filled in RAM and then flushed out.
     * A chunk is flushed if all of its contents have been written.
     */
    private chunks;
    constructor(target: StreamTarget);
    start(): void;
    write(data: Uint8Array): void;
    seek(newPos: number): void;
    getPos(): number;
    flush(): Promise<void>;
    private writeDataIntoChunks;
    private insertSectionIntoChunk;
    private createChunk;
    private tryToFlushChunks;
    finalize(): Promise<void>;
    close(): Promise<void | undefined>;
}
//# sourceMappingURL=writer.d.ts.map