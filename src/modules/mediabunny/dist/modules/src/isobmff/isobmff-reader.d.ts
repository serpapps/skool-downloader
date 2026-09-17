/*!
 * Copyright (c) 2025-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Reader } from '../reader';
export declare const MIN_BOX_HEADER_SIZE = 8;
export declare const MAX_BOX_HEADER_SIZE = 16;
export declare class IsobmffReader {
    reader: Reader;
    pos: number;
    constructor(reader: Reader);
    readBytes(length: number): Uint8Array<ArrayBufferLike>;
    readU8(): number;
    readU16(): number;
    readI16(): number;
    readU24(): number;
    readU32(): number;
    readI32(): number;
    readU64(): number;
    readI64(): number;
    readF64(): number;
    readFixed_16_16(): number;
    readFixed_2_30(): number;
    readAscii(length: number): string;
    readIsomVariableInteger(): number;
    readBoxHeader(): {
        name: string;
        totalSize: number;
        headerSize: number;
        contentSize: number;
    };
}
//# sourceMappingURL=isobmff-reader.d.ts.map