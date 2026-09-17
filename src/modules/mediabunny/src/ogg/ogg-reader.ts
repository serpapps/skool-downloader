/*!
 * Copyright (c) 2025-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Reader } from '../reader';
import { OGGS } from './ogg-misc';

export const MIN_PAGE_HEADER_SIZE = 27;
export const MAX_PAGE_HEADER_SIZE = 27 + 255;
export const MAX_PAGE_SIZE = MAX_PAGE_HEADER_SIZE + 255 * 255;

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

export class OggReader {
	pos = 0;
	constructor(public reader: Reader) {}

	readBytes(length: number) {
		const { view, offset } = this.reader.getViewAndOffset(this.pos, this.pos + length);
		this.pos += length;

		return new Uint8Array(view.buffer, offset, length);
	}

	readU8() {
		const { view, offset } = this.reader.getViewAndOffset(this.pos, this.pos + 1);
		this.pos += 1;

		return view.getUint8(offset);
	}

	readU32() {
		const { view, offset } = this.reader.getViewAndOffset(this.pos, this.pos + 4);
		this.pos += 4;

		return view.getUint32(offset, true);
	}

	readI32() {
		const { view, offset } = this.reader.getViewAndOffset(this.pos, this.pos + 4);
		this.pos += 4;

		return view.getInt32(offset, true);
	}

	readI64() {
		const low = this.readU32();
		const high = this.readI32();
		return high * 0x100000000 + low;
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

	readPageHeader(): Page | null {
		const startPos = this.pos;

		const capturePattern = this.readU32();
		if (capturePattern !== OGGS) {
			return null;
		}

		this.pos += 1; // Version
		const headerType = this.readU8();
		const granulePosition = this.readI64();
		const serialNumber = this.readU32();
		const sequenceNumber = this.readU32();
		const checksum = this.readU32();

		const numberPageSegments = this.readU8();
		const lacingValues = new Uint8Array(numberPageSegments);

		for (let i = 0; i < numberPageSegments; i++) {
			lacingValues[i] = this.readU8();
		}

		const headerSize = 27 + numberPageSegments;
		const dataSize = lacingValues.reduce((a, b) => a + b, 0);
		const totalSize = headerSize + dataSize;

		return {
			headerStartPos: startPos,
			totalSize,
			dataStartPos: startPos + headerSize,
			dataSize,
			headerType,
			granulePosition,
			serialNumber,
			sequenceNumber,
			checksum,
			lacingValues,
		};
	}

	findNextPageHeader(until: number) {
		while (this.pos < until - (4 - 1)) { // Size of word minus 1
			const word = this.readU32();
			const firstByte = word & 0xff;
			const secondByte = (word >>> 8) & 0xff;
			const thirdByte = (word >>> 16) & 0xff;
			const fourthByte = (word >>> 24) & 0xff;

			const O = 0x4f; // 'O'
			if (firstByte !== O && secondByte !== O && thirdByte !== O && fourthByte !== O) {
				continue;
			}

			this.pos -= 4;

			if (word === OGGS) {
				// We have found the capture pattern
				return true;
			}

			this.pos += 1;
		}

		return false;
	}
}
