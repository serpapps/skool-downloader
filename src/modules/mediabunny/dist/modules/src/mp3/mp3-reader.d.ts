/*!
 * Copyright (c) 2025-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Reader } from '../reader';
import { FrameHeader } from '../../shared/mp3-misc';
export declare class Mp3Reader {
    reader: Reader;
    pos: number;
    fileSize: number | null;
    constructor(reader: Reader);
    readBytes(length: number): Uint8Array<ArrayBufferLike>;
    readU16(): number;
    readU32(): number;
    readAscii(length: number): string;
    readId3(): {
        size: number;
    } | null;
    readNextFrameHeader(until?: number): FrameHeader | null;
}
export declare const decodeSynchsafe: (synchsafed: number) => number;
//# sourceMappingURL=mp3-reader.d.ts.map