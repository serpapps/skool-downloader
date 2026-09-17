/*!
 * Copyright (c) 2025-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
export declare function assert(x: unknown): asserts x;
/**
 * Represents a clockwise rotation in degrees.
 * @public
 */
export type Rotation = 0 | 90 | 180 | 270;
export declare const normalizeRotation: (rotation: number) => Rotation;
export type TransformationMatrix = [number, number, number, number, number, number, number, number, number];
export declare const last: <T>(arr: T[]) => T | undefined;
export declare const isU32: (value: number) => boolean;
export declare class Bitstream {
    bytes: Uint8Array;
    /** Current offset in bits. */
    pos: number;
    constructor(bytes: Uint8Array);
    seekToByte(byteOffset: number): void;
    private readBit;
    readBits(n: number): number;
    readAlignedByte(): number;
    skipBits(n: number): void;
    getBitsLeft(): number;
    clone(): Bitstream;
}
/** Reads an exponential-Golomb universal code from a Bitstream.  */
export declare const readExpGolomb: (bitstream: Bitstream) => number;
/** Reads a signed exponential-Golomb universal code from a Bitstream. */
export declare const readSignedExpGolomb: (bitstream: Bitstream) => number;
export declare const writeBits: (bytes: Uint8Array, start: number, end: number, value: number) => void;
export declare const toUint8Array: (source: AllowSharedBufferSource) => Uint8Array;
export declare const toDataView: (source: AllowSharedBufferSource) => DataView<ArrayBufferLike>;
export declare const textEncoder: TextEncoder;
export declare const COLOR_PRIMARIES_MAP: {
    bt709: number;
    bt470bg: number;
    smpte170m: number;
    bt2020: number;
    smpte432: number;
};
export declare const COLOR_PRIMARIES_MAP_INVERSE: Record<number, "bt709" | "bt470bg" | "smpte170m" | "bt2020" | "smpte432">;
export declare const TRANSFER_CHARACTERISTICS_MAP: {
    bt709: number;
    smpte170m: number;
    linear: number;
    'iec61966-2-1': number;
    pg: number;
    hlg: number;
};
export declare const TRANSFER_CHARACTERISTICS_MAP_INVERSE: Record<number, "bt709" | "smpte170m" | "linear" | "iec61966-2-1" | "pg" | "hlg">;
export declare const MATRIX_COEFFICIENTS_MAP: {
    rgb: number;
    bt709: number;
    bt470bg: number;
    smpte170m: number;
    'bt2020-ncl': number;
};
export declare const MATRIX_COEFFICIENTS_MAP_INVERSE: Record<number, "bt709" | "bt470bg" | "smpte170m" | "rgb" | "bt2020-ncl">;
export type RequiredNonNull<T> = {
    [K in keyof T]-?: NonNullable<T[K]>;
};
export declare const colorSpaceIsComplete: (colorSpace: VideoColorSpaceInit | undefined) => colorSpace is RequiredNonNull<VideoColorSpaceInit>;
export declare const isAllowSharedBufferSource: (x: unknown) => boolean;
export declare class AsyncMutex {
    currentPromise: Promise<void>;
    acquire(): Promise<() => void>;
}
export declare const bytesToHexString: (bytes: Uint8Array) => string;
export declare const reverseBitsU32: (x: number) => number;
/** Returns the smallest index i such that val[i] === key, or -1 if no such index exists. */
export declare const binarySearchExact: <T>(arr: T[], key: number, valueGetter: (x: T) => number) => number;
/** Returns the largest index i such that val[i] <= key, or -1 if no such index exists. */
export declare const binarySearchLessOrEqual: <T>(arr: T[], key: number, valueGetter: (x: T) => number) => number;
/** Assumes the array is already sorted. */
export declare const insertSorted: <T>(arr: T[], item: T, valueGetter: (x: T) => number) => void;
export declare const promiseWithResolvers: <T = void>() => {
    promise: Promise<T>;
    resolve: (value: T) => void;
    reject: (reason: unknown) => void;
};
export declare const removeItem: <T>(arr: T[], item: T) => void;
export declare const findLast: <T>(arr: T[], predicate: (x: T) => boolean) => T | undefined;
export declare const findLastIndex: <T>(arr: T[], predicate: (x: T) => boolean) => number;
/**
 * Sync or async iterable.
 * @public
 */
export type AnyIterable<T> = Iterable<T> | AsyncIterable<T>;
export declare const toAsyncIterator: <T>(source: AnyIterable<T>) => AsyncGenerator<T, void, unknown>;
export declare const validateAnyIterable: (iterable: AnyIterable<unknown>) => void;
export declare const assertNever: (x: never) => never;
export declare const getUint24: (view: DataView, byteOffset: number, littleEndian: boolean) => number;
export declare const getInt24: (view: DataView, byteOffset: number, littleEndian: boolean) => number;
export declare const setUint24: (view: DataView, byteOffset: number, value: number, littleEndian: boolean) => void;
export declare const setInt24: (view: DataView, byteOffset: number, value: number, littleEndian: boolean) => void;
export declare const setInt64: (view: DataView, byteOffset: number, value: number, littleEndian: boolean) => void;
/**
 * Calls a function on each value spat out by an async generator. The reason for writing this manually instead of
 * using a generator function is that the generator function queues return() calls - here, we forward them immediately.
 */
export declare const mapAsyncGenerator: <T, U>(generator: AsyncGenerator<T, void, unknown>, map: (t: T) => U) => AsyncGenerator<U, void, unknown>;
export declare const clamp: (value: number, min: number, max: number) => number;
export declare const UNDETERMINED_LANGUAGE = "und";
export declare const roundToPrecision: (value: number, digits: number) => number;
export declare const roundToMultiple: (value: number, multiple: number) => number;
export declare const ilog: (x: number) => number;
export declare const isIso639Dash2LanguageCode: (x: string) => boolean;
export declare const SECOND_TO_MICROSECOND_FACTOR: number;
/**
 * Sets all keys K of T to be required.
 * @public
 */
export type SetRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;
export declare const mergeObjectsDeeply: <T extends object, S extends object>(a: T, b: S) => T & S;
export declare const retriedFetch: (url: string | URL, requestInit: RequestInit, getRetryDelay: (previousAttempts: number) => number | null) => Promise<Response>;
export declare const computeRationalApproximation: (x: number, maxDenominator: number) => {
    numerator: number;
    denominator: number;
};
export declare class CallSerializer {
    currentPromise: Promise<void>;
    call(fn: () => Promise<void> | void): Promise<void>;
}
export declare const isSafari: () => boolean;
/**
 * T or a promise that resolves to T.
 * @public
 */
export type MaybePromise<T> = T | Promise<T>;
//# sourceMappingURL=misc.d.ts.map