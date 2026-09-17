/*!
 * Copyright (c) 2025-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { assert } from '../misc';
import { Reader } from '../reader';
import { FRAME_HEADER_SIZE, FrameHeader, readFrameHeader } from '../../shared/mp3-misc';

export class Mp3Reader {
	pos = 0;
	fileSize: number | null = null;

	constructor(public reader: Reader) {}

	readBytes(length: number) {
		const { view, offset } = this.reader.getViewAndOffset(this.pos, this.pos + length);
		this.pos += length;

		return new Uint8Array(view.buffer, offset, length);
	}

	readU16() {
		const { view, offset } = this.reader.getViewAndOffset(this.pos, this.pos + 2);
		this.pos += 2;

		return view.getUint16(offset, false);
	}

	readU32() {
		const { view, offset } = this.reader.getViewAndOffset(this.pos, this.pos + 4);
		this.pos += 4;

		return view.getUint32(offset, false);
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

	readId3() {
		const tag = this.readAscii(3);
		if (tag !== 'ID3') {
			this.pos -= 3;
			return null;
		}

		this.pos += 3;

		const size = decodeSynchsafe(this.readU32());
		return { size };
	}

	readNextFrameHeader(until?: number): FrameHeader | null {
		assert(this.fileSize);
		until ??= this.fileSize;

		while (this.pos <= until - FRAME_HEADER_SIZE) {
			const word = this.readU32();
			this.pos -= 4;

			const header = readFrameHeader(word, this);
			if (header) {
				return header;
			}
		}

		return null;
	}
}

export const decodeSynchsafe = (synchsafed: number) => {
	let mask = 0x7f000000;
	let unsynchsafed = 0;

	while (mask !== 0) {
		unsynchsafed >>= 1;
		unsynchsafed |= synchsafed & mask;
		mask >>= 8;
	}

	return unsynchsafed;
};
