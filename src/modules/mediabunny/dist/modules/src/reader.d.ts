/*!
 * Copyright (c) 2025-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Source } from './source';
type ReadSegment = {
    start: number;
    end: number;
    bytes: Uint8Array;
    view: DataView;
    age: number;
};
type LoadingSegment = {
    start: number;
    end: number;
    promise: Promise<Uint8Array>;
};
export declare class Reader {
    source: Source;
    maxStorableBytes: number;
    loadedSegments: ReadSegment[];
    loadingSegments: LoadingSegment[];
    sourceSizePromise: Promise<number> | null;
    nextAge: number;
    totalStoredBytes: number;
    constructor(source: Source, maxStorableBytes?: number);
    loadRange(start: number, end: number): Promise<void>;
    rangeIsLoaded(start: number, end: number): boolean;
    private insertIntoLoadedSegments;
    getViewAndOffset(start: number, end: number): {
        view: DataView<ArrayBufferLike>;
        offset: number;
    };
    forgetRange(start: number, end: number): void;
}
export {};
//# sourceMappingURL=reader.d.ts.map