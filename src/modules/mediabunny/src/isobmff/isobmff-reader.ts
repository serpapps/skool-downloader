/*!
 * Copyright (c) 2025-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Reader } from '../reader';

export const MIN_BOX_HEADER_SIZE = 8;
export const MAX_BOX_HEADER_SIZE = 16;

export class IsobmffReader {
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

	readU16() {
		const { view, offset } = this.reader.getViewAndOffset(this.pos, this.pos + 2);
		this.pos += 2;

		return view.getUint16(offset, false);
	}

	readI16() {
		const { view, offset } = this.reader.getViewAndOffset(this.pos, this.pos + 2);
		this.pos += 2;

		return view.getInt16(offset, false);
	}

	readU24() {
		const { view, offset } = this.reader.getViewAndOffset(this.pos, this.pos + 3);
		this.pos += 3;

		const high = view.getUint16(offset, false);
		const low = view.getUint8(offset + 2);
		return high * 0x100 + low;
	}

	readU32() {
		const { view, offset } = this.reader.getViewAndOffset(this.pos, this.pos + 4);
		this.pos += 4;

		return view.getUint32(offset, false);
	}

	readI32() {
		const { view, offset } = this.reader.getViewAndOffset(this.pos, this.pos + 4);
		this.pos += 4;

		return view.getInt32(offset, false);
	}

	readU64() {
		const high = this.readU32();
		const low = this.readU32();
		return high * 0x100000000 + low;
	}

	readI64() {
		const high = this.readI32();
		const low = this.readU32();
		return high * 0x100000000 + low;
	}

	readF64() {
		const { view, offset } = this.reader.getViewAndOffset(this.pos, this.pos + 8);
		this.pos += 8;

		return view.getFloat64(offset, false);
	}

	readFixed_16_16() {
		return this.readI32() / 0x10000;
	}

	readFixed_2_30() {
		return this.readI32() / 0x40000000;
	}

	readAscii(length: number) {
		const { view, offset } = this.reader.getViewAndOffset(this.pos, this.pos + length);
		this.pos += length;

		let str = '';
		for (let i = 0; i < length; i++) {
			str += String.fromCharCode(view.getUint8(offset + i));
		}
		return str;
	}

	readIsomVariableInteger() {
		let result = 0;

		for (let i = 0; i < 4; i++) {
			result <<= 7;
			const nextByte = this.readU8();
			result |= nextByte & 0x7f;

			if ((nextByte & 0x80) === 0) {
				break;
			}
		}

		return result;
	}

	readBoxHeader() {
		let totalSize = this.readU32();
		const name = this.readAscii(4);
		let headerSize = 8;

		const hasLargeSize = totalSize === 1;
		if (hasLargeSize) {
			totalSize = this.readU64();
			headerSize = 16;
		}

		return { name, totalSize, headerSize, contentSize: totalSize - headerSize };
	}
}
