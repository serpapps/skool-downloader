/*!
 * Copyright (c) 2025-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Reader } from '../reader';
export declare class RiffReader {
    reader: Reader;
    pos: number;
    littleEndian: boolean;
    constructor(reader: Reader);
    readBytes(length: number): Uint8Array<ArrayBufferLike>;
    readU16(): number;
    readU32(): number;
    readU64(): number;
    readAscii(length: number): string;
}
//# sourceMappingURL=riff-reader.d.ts.map