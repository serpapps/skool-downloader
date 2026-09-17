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
export class EBMLFloat32 {
	value: number;

	constructor(value: number) {
		this.value = value;
	}
}

/** Wrapper around a number to be able to differentiate it in the writer. */
export class EBMLFloat64 {
	value: number;

	constructor(value: number) {
		this.value = value;
	}
}

/** Wrapper around a number to be able to differentiate it in the writer. */
export class EBMLSignedInt {
	value: number;

	constructor(value: number) {
		this.value = value;
	}
}

/** Defines some of the EBML IDs used by Matroska files. */
export enum EBMLId {
	EBML = 0x1a45dfa3,
	EBMLVersion = 0x4286,
	EBMLReadVersion = 0x42f7,
	EBMLMaxIDLength = 0x42f2,
	EBMLMaxSizeLength = 0x42f3,
	DocType = 0x4282,
	DocTypeVersion = 0x4287,
	DocTypeReadVersion = 0x4285,
	SeekHead = 0x114d9b74,
	Seek = 0x4dbb,
	SeekID = 0x53ab,
	SeekPosition = 0x53ac,
	Duration = 0x4489,
	Info = 0x1549a966,
	TimestampScale = 0x2ad7b1,
	MuxingApp = 0x4d80,
	WritingApp = 0x5741,
	Tracks = 0x1654ae6b,
	TrackEntry = 0xae,
	TrackNumber = 0xd7,
	TrackUID = 0x73c5,
	TrackType = 0x83,
	FlagEnabled = 0xb9,
	FlagDefault = 0x88,
	FlagForced = 0x55aa,
	FlagLacing = 0x9c,
	Language = 0x22b59c,
	CodecID = 0x86,
	CodecPrivate = 0x63a2,
	CodecDelay = 0x56aa,
	SeekPreRoll = 0x56bb,
	DefaultDuration = 0x23e383,
	Video = 0xe0,
	PixelWidth = 0xb0,
	PixelHeight = 0xba,
	Audio = 0xe1,
	SamplingFrequency = 0xb5,
	Channels = 0x9f,
	BitDepth = 0x6264,
	Segment = 0x18538067,
	SimpleBlock = 0xa3,
	BlockGroup = 0xa0,
	Block = 0xa1,
	BlockAdditions = 0x75a1,
	BlockMore = 0xa6,
	BlockAdditional = 0xa5,
	BlockAddID = 0xee,
	BlockDuration = 0x9b,
	ReferenceBlock = 0xfb,
	Cluster = 0x1f43b675,
	Timestamp = 0xe7,
	Cues = 0x1c53bb6b,
	CuePoint = 0xbb,
	CueTime = 0xb3,
	CueTrackPositions = 0xb7,
	CueTrack = 0xf7,
	CueClusterPosition = 0xf1,
	Colour = 0x55b0,
	MatrixCoefficients = 0x55b1,
	TransferCharacteristics = 0x55ba,
	Primaries = 0x55bb,
	Range = 0x55b9,
	Projection = 0x7670,
	ProjectionType = 0x7671,
	ProjectionPoseRoll = 0x7675,
	Attachments = 0x1941a469,
	Chapters = 0x1043a770,
	Tags = 0x1254c367,
}

export const LEVEL_0_EBML_IDS: EBMLId[] = [
	EBMLId.EBML,
	EBMLId.Segment,
];

export const LEVEL_1_EBML_IDS: EBMLId[] = [
	EBMLId.EBMLMaxIDLength,
	EBMLId.EBMLMaxSizeLength,
	EBMLId.SeekHead,
	EBMLId.Info,
	EBMLId.Cluster,
	EBMLId.Tracks,
	EBMLId.Cues,
	EBMLId.Attachments,
	EBMLId.Chapters,
	EBMLId.Tags,
];

export const LEVEL_0_AND_1_EBML_IDS = [
	...LEVEL_0_EBML_IDS,
	...LEVEL_1_EBML_IDS,
];

export const measureUnsignedInt = (value: number) => {
	if (value < (1 << 8)) {
		return 1;
	} else if (value < (1 << 16)) {
		return 2;
	} else if (value < (1 << 24)) {
		return 3;
	} else if (value < 2 ** 32) {
		return 4;
	} else if (value < 2 ** 40) {
		return 5;
	} else {
		return 6;
	}
};

export const measureSignedInt = (value: number) => {
	if (value >= -(1 << 6) && value < (1 << 6)) {
		return 1;
	} else if (value >= -(1 << 13) && value < (1 << 13)) {
		return 2;
	} else if (value >= -(1 << 20) && value < (1 << 20)) {
		return 3;
	} else if (value >= -(1 << 27) && value < (1 << 27)) {
		return 4;
	} else if (value >= -(2 ** 34) && value < 2 ** 34) {
		return 5;
	} else {
		return 6;
	}
};

export const measureVarInt = (value: number) => {
	if (value < (1 << 7) - 1) {
		/** Top bit is set, leaving 7 bits to hold the integer, but we can't store
		 * 127 because "all bits set to one" is a reserved value. Same thing for the
		 * other cases below:
		 */
		return 1;
	} else if (value < (1 << 14) - 1) {
		return 2;
	} else if (value < (1 << 21) - 1) {
		return 3;
	} else if (value < (1 << 28) - 1) {
		return 4;
	} else if (value < 2 ** 35 - 1) {
		return 5;
	} else if (value < 2 ** 42 - 1) {
		return 6;
	} else {
		throw new Error('EBML varint size not supported ' + value);
	}
};

export class EBMLWriter {
	helper = new Uint8Array(8);
	helperView = new DataView(this.helper.buffer);

	/**
	 * Stores the position from the start of the file to where EBML elements have been written. This is used to
	 * rewrite/edit elements that were already added before, and to measure sizes of things.
	 */
	offsets = new WeakMap<EBML, number>();
	/** Same as offsets, but stores position where the element's data starts (after ID and size fields). */
	dataOffsets = new WeakMap<EBML, number>();

	constructor(private writer: Writer) {}

	writeByte(value: number) {
		this.helperView.setUint8(0, value);
		this.writer.write(this.helper.subarray(0, 1));
	}

	writeFloat32(value: number) {
		this.helperView.setFloat32(0, value, false);
		this.writer.write(this.helper.subarray(0, 4));
	}

	writeFloat64(value: number) {
		this.helperView.setFloat64(0, value, false);
		this.writer.write(this.helper);
	}

	writeUnsignedInt(value: number, width = measureUnsignedInt(value)) {
		let pos = 0;

		// Each case falls through:
		switch (width) {
			case 6:
				// Need to use division to access >32 bits of floating point var
				this.helperView.setUint8(pos++, (value / 2 ** 40) | 0);
			// eslint-disable-next-line no-fallthrough
			case 5:
				this.helperView.setUint8(pos++, (value / 2 ** 32) | 0);
				// eslint-disable-next-line no-fallthrough
			case 4:
				this.helperView.setUint8(pos++, value >> 24);
				// eslint-disable-next-line no-fallthrough
			case 3:
				this.helperView.setUint8(pos++, value >> 16);
				// eslint-disable-next-line no-fallthrough
			case 2:
				this.helperView.setUint8(pos++, value >> 8);
				// eslint-disable-next-line no-fallthrough
			case 1:
				this.helperView.setUint8(pos++, value);
				break;
			default:
				throw new Error('Bad unsigned int size ' + width);
		}

		this.writer.write(this.helper.subarray(0, pos));
	}

	writeSignedInt(value: number, width = measureSignedInt(value)) {
		if (value < 0) {
			// Two's complement stuff
			value += 2 ** (width * 8);
		}

		this.writeUnsignedInt(value, width);
	}

	writeVarInt(value: number, width = measureVarInt(value)) {
		let pos = 0;

		switch (width) {
			case 1:
				this.helperView.setUint8(pos++, (1 << 7) | value);
				break;
			case 2:
				this.helperView.setUint8(pos++, (1 << 6) | (value >> 8));
				this.helperView.setUint8(pos++, value);
				break;
			case 3:
				this.helperView.setUint8(pos++, (1 << 5) | (value >> 16));
				this.helperView.setUint8(pos++, value >> 8);
				this.helperView.setUint8(pos++, value);
				break;
			case 4:
				this.helperView.setUint8(pos++, (1 << 4) | (value >> 24));
				this.helperView.setUint8(pos++, value >> 16);
				this.helperView.setUint8(pos++, value >> 8);
				this.helperView.setUint8(pos++, value);
				break;
			case 5:
				/**
				 * JavaScript converts its doubles to 32-bit integers for bitwise
				 * operations, so we need to do a division by 2^32 instead of a
				 * right-shift of 32 to retain those top 3 bits
				 */
				this.helperView.setUint8(pos++, (1 << 3) | ((value / 2 ** 32) & 0x7));
				this.helperView.setUint8(pos++, value >> 24);
				this.helperView.setUint8(pos++, value >> 16);
				this.helperView.setUint8(pos++, value >> 8);
				this.helperView.setUint8(pos++, value);
				break;
			case 6:
				this.helperView.setUint8(pos++, (1 << 2) | ((value / 2 ** 40) & 0x3));
				this.helperView.setUint8(pos++, (value / 2 ** 32) | 0);
				this.helperView.setUint8(pos++, value >> 24);
				this.helperView.setUint8(pos++, value >> 16);
				this.helperView.setUint8(pos++, value >> 8);
				this.helperView.setUint8(pos++, value);
				break;
			default:
				throw new Error('Bad EBML varint size ' + width);
		}

		this.writer.write(this.helper.subarray(0, pos));
	}

	writeAsciiString(str: string) {
		this.writer.write(new Uint8Array(str.split('').map(x => x.charCodeAt(0))));
	}

	writeEBML(data: EBML | null) {
		if (data === null) return;

		if (data instanceof Uint8Array) {
			this.writer.write(data);
		} else if (Array.isArray(data)) {
			for (const elem of data) {
				this.writeEBML(elem);
			}
		} else {
			this.offsets.set(data, this.writer.getPos());

			this.writeUnsignedInt(data.id); // ID field

			if (Array.isArray(data.data)) {
				const sizePos = this.writer.getPos();
				const sizeSize = data.size === -1 ? 1 : (data.size ?? 4);

				if (data.size === -1) {
					// Write the reserved all-one-bits marker for unknown/unbounded size.
					this.writeByte(0xff);
				} else {
					this.writer.seek(this.writer.getPos() + sizeSize);
				}

				const startPos = this.writer.getPos();
				this.dataOffsets.set(data, startPos);
				this.writeEBML(data.data);

				if (data.size !== -1) {
					const size = this.writer.getPos() - startPos;
					const endPos = this.writer.getPos();
					this.writer.seek(sizePos);
					this.writeVarInt(size, sizeSize);
					this.writer.seek(endPos);
				}
			} else if (typeof data.data === 'number') {
				const size = data.size ?? measureUnsignedInt(data.data);
				this.writeVarInt(size);
				this.writeUnsignedInt(data.data, size);
			} else if (typeof data.data === 'string') {
				this.writeVarInt(data.data.length);
				this.writeAsciiString(data.data);
			} else if (data.data instanceof Uint8Array) {
				this.writeVarInt(data.data.byteLength, data.size);
				this.writer.write(data.data);
			} else if (data.data instanceof EBMLFloat32) {
				this.writeVarInt(4);
				this.writeFloat32(data.data.value);
			} else if (data.data instanceof EBMLFloat64) {
				this.writeVarInt(8);
				this.writeFloat64(data.data.value);
			} else if (data.data instanceof EBMLSignedInt) {
				const size = data.size ?? measureSignedInt(data.data.value);
				this.writeVarInt(size);
				this.writeSignedInt(data.data.value, size);
			}
		}
	}
}

const MAX_VAR_INT_SIZE = 8;
export const MIN_HEADER_SIZE = 2; // 1-byte ID and 1-byte size
export const MAX_HEADER_SIZE = 2 * MAX_VAR_INT_SIZE; // 8-byte ID and 8-byte size

export class EBMLReader {
	pos = 0;

	constructor(public reader: Reader) {}

	readBytes(length: number) {
		const { view, offset } = this.reader.getViewAndOffset(this.pos, this.pos + length);
		this.pos += length;

		return new Uint8Array(view.buffer, offset, length);
	}

	readU8() {
		const { view, offset } = this.reader.getViewAndOffset(this.pos, this.pos + 1);
		this.pos++;

		return view.getUint8(offset);
	}

	readS16() {
		const { view, offset } = this.reader.getViewAndOffset(this.pos, this.pos + 2);
		this.pos += 2;

		return view.getInt16(offset, false);
	}

	readVarIntSize() {
		const { view, offset } = this.reader.getViewAndOffset(this.pos, this.pos + 1);
		const firstByte = view.getUint8(offset);

		if (firstByte === 0) {
			return null; // Invalid VINT
		}

		let width = 1;
		let mask = 0x80;
		while ((firstByte & mask) === 0) {
			width++;
			mask >>= 1;
		}

		return width;
	}

	readVarInt() {
		// Read the first byte to determine the width of the variable-length integer
		const { view, offset } = this.reader.getViewAndOffset(this.pos, this.pos + 1);
		const firstByte = view.getUint8(offset);

		if (firstByte === 0) {
			return null; // Invalid VINT
		}

		// Find the position of VINT_MARKER, which determines the width
		let width = 1;
		let mask = 1 << 7;
		while ((firstByte & mask) === 0) {
			width++;
			mask >>= 1;
		}

		const { view: fullView, offset: fullOffset } = this.reader.getViewAndOffset(this.pos, this.pos + width);

		// First byte's value needs the marker bit cleared
		let value = firstByte & (mask - 1);

		// Read remaining bytes
		for (let i = 1; i < width; i++) {
			value *= 1 << 8;
			value += fullView.getUint8(fullOffset + i);
		}

		this.pos += width;
		return value;
	}

	readUnsignedInt(width: number) {
		if (width < 1 || width > 8) {
			throw new Error('Bad unsigned int size ' + width);
		}

		const { view, offset } = this.reader.getViewAndOffset(this.pos, this.pos + width);
		let value = 0;

		// Read bytes from most significant to least significant
		for (let i = 0; i < width; i++) {
			value *= 1 << 8;
			value += view.getUint8(offset + i);
		}

		this.pos += width;
		return value;
	}

	readSignedInt(width: number) {
		let value = this.readUnsignedInt(width);

		// If the highest bit is set, convert from two's complement
		if (value & (1 << (width * 8 - 1))) {
			value -= 2 ** (width * 8);
		}

		return value;
	}

	readFloat(width: number) {
		if (width === 0) {
			return 0;
		}

		if (width !== 4 && width !== 8) {
			throw new Error('Bad float size ' + width);
		}

		const { view, offset } = this.reader.getViewAndOffset(this.pos, this.pos + width);
		const value = width === 4 ? view.getFloat32(offset, false) : view.getFloat64(offset, false);

		this.pos += width;
		return value;
	}

	readAsciiString(length: number) {
		const { view, offset } = this.reader.getViewAndOffset(this.pos, this.pos + length);
		this.pos += length;

		// Actual string length might be shorter due to null terminators
		let strLength = 0;
		while (strLength < length && view.getUint8(offset + strLength) !== 0) {
			strLength += 1;
		}

		return String.fromCharCode(...new Uint8Array(view.buffer, offset, strLength));
	}

	readElementId() {
		const size = this.readVarIntSize();
		if (size === null) {
			return null;
		}

		const id = this.readUnsignedInt(size);
		return id;
	}

	readElementSize() {
		let size: number | null = this.readU8();

		if (size === 0xff) {
			size = null;
		} else {
			this.pos--;
			size = this.readVarInt();

			// In some (livestreamed) files, this is the value of the size field. While this technically is just a very
			// large number, it is intended to behave like the reserved size 0xFF, meaning the size is undefined. We
			// catch the number here. Note that it cannot be perfectly represented as a double, but the comparison works
			// nonetheless.
			// eslint-disable-next-line no-loss-of-precision
			if (size === 0x00ffffffffffffff) {
				size = null;
			}
		}

		return size;
	}

	readElementHeader() {
		const id = this.readElementId();
		if (id === null) {
			return null;
		}

		const size = this.readElementSize();

		return { id, size };
	}

	/** Returns the byte offset in the file of the next element with a matching ID. */
	async searchForNextElementId(ids: EBMLId[], until: number) {
		const loadChunkSize = 2 ** 20; // 1 MiB
		const idsSet = new Set(ids);

		while (this.pos <= until - MIN_HEADER_SIZE) {
			if (!this.reader.rangeIsLoaded(this.pos, Math.min(this.pos + MAX_HEADER_SIZE, until))) {
				await this.reader.loadRange(this.pos, Math.min(this.pos + loadChunkSize, until));
			}

			const elementStartPos = this.pos;
			const elementHeader = this.readElementHeader();
			if (!elementHeader) {
				break;
			}

			if (idsSet.has(elementHeader.id)) {
				return elementStartPos;
			}

			assertDefinedSize(elementHeader.size);

			this.pos += elementHeader.size;
		}

		return null;
	}
}

export const CODEC_STRING_MAP: Partial<Record<MediaCodec, string>> = {
	'avc': 'V_MPEG4/ISO/AVC',
	'hevc': 'V_MPEGH/ISO/HEVC',
	'vp8': 'V_VP8',
	'vp9': 'V_VP9',
	'av1': 'V_AV1',

	'aac': 'A_AAC',
	'mp3': 'A_MPEG/L3',
	'opus': 'A_OPUS',
	'vorbis': 'A_VORBIS',
	'flac': 'A_FLAC',
	'pcm-u8': 'A_PCM/INT/LIT',
	'pcm-s16': 'A_PCM/INT/LIT',
	'pcm-s16be': 'A_PCM/INT/BIG',
	'pcm-s24': 'A_PCM/INT/LIT',
	'pcm-s24be': 'A_PCM/INT/BIG',
	'pcm-s32': 'A_PCM/INT/LIT',
	'pcm-s32be': 'A_PCM/INT/BIG',
	'pcm-f32': 'A_PCM/FLOAT/IEEE',
	'pcm-f64': 'A_PCM/FLOAT/IEEE',

	'webvtt': 'S_TEXT/WEBVTT',
};

export const readVarInt = (data: Uint8Array, offset: number) => {
	if (offset >= data.length) {
		throw new Error('Offset out of bounds.');
	}

	// Read the first byte to determine the width of the variable-length integer
	const firstByte = data[offset]!;

	// Find the position of VINT_MARKER, which determines the width
	let width = 1;
	let mask = 1 << 7;
	while ((firstByte & mask) === 0 && width < 8) {
		width++;
		mask >>= 1;
	}

	if (offset + width > data.length) {
		throw new Error('VarInt extends beyond data bounds.');
	}

	// First byte's value needs the marker bit cleared
	let value = firstByte & (mask - 1);

	// Read remaining bytes
	for (let i = 1; i < width; i++) {
		value *= 1 << 8;
		value += data[offset + i]!;
	}

	return { value, width };
};

export function assertDefinedSize(size: number | null): asserts size is number {
	if (size === null) {
		throw new Error('Undefined element size is used in a place where it is not supported.');
	}
};
