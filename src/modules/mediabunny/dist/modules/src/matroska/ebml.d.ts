/*!
 * Copyright (c) 2025-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { MediaCodec } from '../codec';
import { Reader } from '../reader';
import { Writer } from '../writer';
export interface EBMLElement {
    id: number;
    size?: number;
    data: number | string | Uint8Array | EBMLFloat32 | EBMLFloat64 | EBMLSignedInt | (EBML | null)[];
}
export type EBML = EBMLElement | Uint8Array | (EBML | null)[];
/** Wrapper around a number to be able to differentiate it in the writer. */
export declare class EBMLFloat32 {
    value: number;
    constructor(value: number);
}
/** Wrapper around a number to be able to differentiate it in the writer. */
export declare class EBMLFloat64 {
    value: number;
    constructor(value: number);
}
/** Wrapper around a number to be able to differentiate it in the writer. */
export declare class EBMLSignedInt {
    value: number;
    constructor(value: number);
}
/** Defines some of the EBML IDs used by Matroska files. */
export declare enum EBMLId {
    EBML = 440786851,
    EBMLVersion = 17030,
    EBMLReadVersion = 17143,
    EBMLMaxIDLength = 17138,
    EBMLMaxSizeLength = 17139,
    DocType = 17026,
    DocTypeVersion = 17031,
    DocTypeReadVersion = 17029,
    SeekHead = 290298740,
    Seek = 19899,
    SeekID = 21419,
    SeekPosition = 21420,
    Duration = 17545,
    Info = 357149030,
    TimestampScale = 2807729,
    MuxingApp = 19840,
    WritingApp = 22337,
    Tracks = 374648427,
    TrackEntry = 174,
    TrackNumber = 215,
    TrackUID = 29637,
    TrackType = 131,
    FlagEnabled = 185,
    FlagDefault = 136,
    FlagForced = 21930,
    FlagLacing = 156,
    Language = 2274716,
    CodecID = 134,
    CodecPrivate = 25506,
    CodecDelay = 22186,
    SeekPreRoll = 22203,
    DefaultDuration = 2352003,
    Video = 224,
    PixelWidth = 176,
    PixelHeight = 186,
    Audio = 225,
    SamplingFrequency = 181,
    Channels = 159,
    BitDepth = 25188,
    Segment = 408125543,
    SimpleBlock = 163,
    BlockGroup = 160,
    Block = 161,
    BlockAdditions = 30113,
    BlockMore = 166,
    BlockAdditional = 165,
    BlockAddID = 238,
    BlockDuration = 155,
    ReferenceBlock = 251,
    Cluster = 524531317,
    Timestamp = 231,
    Cues = 475249515,
    CuePoint = 187,
    CueTime = 179,
    CueTrackPositions = 183,
    CueTrack = 247,
    CueClusterPosition = 241,
    Colour = 21936,
    MatrixCoefficients = 21937,
    TransferCharacteristics = 21946,
    Primaries = 21947,
    Range = 21945,
    Projection = 30320,
    ProjectionType = 30321,
    ProjectionPoseRoll = 30325,
    Attachments = 423732329,
    Chapters = 272869232,
    Tags = 307544935
}
export declare const LEVEL_0_EBML_IDS: EBMLId[];
export declare const LEVEL_1_EBML_IDS: EBMLId[];
export declare const LEVEL_0_AND_1_EBML_IDS: EBMLId[];
export declare const measureUnsignedInt: (value: number) => 1 | 5 | 6 | 2 | 4 | 3;
export declare const measureSignedInt: (value: number) => 1 | 5 | 6 | 2 | 4 | 3;
export declare const measureVarInt: (value: number) => 1 | 5 | 6 | 2 | 4 | 3;
export declare class EBMLWriter {
    private writer;
    helper: Uint8Array<ArrayBuffer>;
    helperView: DataView<ArrayBuffer>;
    /**
     * Stores the position from the start of the file to where EBML elements have been written. This is used to
     * rewrite/edit elements that were already added before, and to measure sizes of things.
     */
    offsets: WeakMap<EBML, number>;
    /** Same as offsets, but stores position where the element's data starts (after ID and size fields). */
    dataOffsets: WeakMap<EBML, number>;
    constructor(writer: Writer);
    writeByte(value: number): void;
    writeFloat32(value: number): void;
    writeFloat64(value: number): void;
    writeUnsignedInt(value: number, width?: number): void;
    writeSignedInt(value: number, width?: number): void;
    writeVarInt(value: number, width?: number): void;
    writeAsciiString(str: string): void;
    writeEBML(data: EBML | null): void;
}
export declare const MIN_HEADER_SIZE = 2;
export declare const MAX_HEADER_SIZE: number;
export declare class EBMLReader {
    reader: Reader;
    pos: number;
    constructor(reader: Reader);
    readBytes(length: number): Uint8Array<ArrayBufferLike>;
    readU8(): number;
    readS16(): number;
    readVarIntSize(): number | null;
    readVarInt(): number | null;
    readUnsignedInt(width: number): number;
    readSignedInt(width: number): number;
    readFloat(width: number): number;
    readAsciiString(length: number): string;
    readElementId(): number | null;
    readElementSize(): number | null;
    readElementHeader(): {
        id: number;
        size: number | null;
    } | null;
    /** Returns the byte offset in the file of the next element with a matching ID. */
    searchForNextElementId(ids: EBMLId[], until: number): Promise<number | null>;
}
export declare const CODEC_STRING_MAP: Partial<Record<MediaCodec, string>>;
export declare const readVarInt: (data: Uint8Array, offset: number) => {
    value: number;
    width: number;
};
export declare function assertDefinedSize(size: number | null): asserts size is number;
//# sourceMappingURL=ebml.d.ts.map