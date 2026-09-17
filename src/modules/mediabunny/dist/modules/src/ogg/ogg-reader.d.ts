/*!
 * Copyright (c) 2025-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Reader } from '../reader';
export declare const MIN_PAGE_HEADER_SIZE = 27;
export declare const MAX_PAGE_HEADER_SIZE: number;
export declare const MAX_PAGE_SIZE: number;
export type Page = {
    headerStartPos: number;
    totalSize: number;
    dataStartPos: number;
    dataSize: number;
    headerType: number;
    granulePosition: number;
    serialNumber: number;
    sequenceNumber: number;
    checksum: number;
    lacingValues: Uint8Array;
};
export declare class OggReader {
    reader: Reader;
    pos: number;
    constructor(reader: Reader);
    readBytes(length: number): Uint8Array<ArrayBufferLike>;
    readU8(): number;
    readU32(): number;
    readI32(): number;
    readI64(): number;
    readAscii(length: number): string;
    readPageHeader(): Page | null;
    findNextPageHeader(until: number): boolean;
}
//# sourceMappingURL=ogg-reader.d.ts.map