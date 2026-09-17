/*!
 * Copyright (c) 2025-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { assert, binarySearchLessOrEqual, removeItem } from './misc';
import { Source } from './source';

type ReadSegment = {
	start: number;
	end: number;
	bytes: Uint8Array;
	view: DataView;
	age: number;
};

type LoadingSegment = {
	start: number;
	end: number;
	promise: Promise<Uint8Array>;
};

export class Reader {
	loadedSegments: ReadSegment[] = [];
	loadingSegments: LoadingSegment[] = [];
	sourceSizePromise: Promise<number> | null = null;
	nextAge = 0;
	totalStoredBytes = 0;

	constructor(public source: Source, public maxStorableBytes = Infinity) {}

	async loadRange(start: number, end: number) {
		end = Math.min(end, await this.source.getSize());

		if (start >= end) {
			return;
		}

		const matchingLoadingSegment = this.loadingSegments.find(x => x.start <= start && x.end >= end);
		if (matchingLoadingSegment) {
			// Simply wait for the existing promise to finish to avoid loading the same range twice
			await matchingLoadingSegment.promise;
			return;
		}

		const index = binarySearchLessOrEqual(
			this.loadedSegments,
			start,
			x => x.start,
		);
		if (index !== -1) {
			for (let i = index; i < this.loadedSegments.length; i++) {
				const segment = this.loadedSegments[i]!;
				if (segment.start > start) {
					break;
				}

				const segmentEncasesRequestedRange = segment.end >= end;
				if (segmentEncasesRequestedRange) {
					// Nothing to load
					return;
				}
			}
		}

		this.source.onread?.(start, end);
		const bytesPromise = this.source._read(start, end);
		const loadingSegment: LoadingSegment = { start, end, promise: bytesPromise };
		this.loadingSegments.push(loadingSegment);

		const bytes = await bytesPromise;
		removeItem(this.loadingSegments, loadingSegment);

		this.insertIntoLoadedSegments(start, bytes);
	}

	rangeIsLoaded(start: number, end: number) {
		if (end <= start) {
			return true;
		}

		const index = binarySearchLessOrEqual(this.loadedSegments, start, x => x.start);
		if (index === -1) {
			return false;
		}

		for (let i = index; i < this.loadedSegments.length; i++) {
			const segment = this.loadedSegments[i]!;
			if (segment.start > start) {
				break;
			}

			const segmentEncasesRequestedRange = segment.end >= end;
			if (segmentEncasesRequestedRange) {
				return true;
			}
		}

		return false;
	}

	private insertIntoLoadedSegments(start: number, bytes: Uint8Array) {
		const segment: ReadSegment = {
			start,
			end: start + bytes.byteLength,
			bytes,
			view: new DataView(bytes.buffer),
			age: this.nextAge++,
		};

		let index = binarySearchLessOrEqual(this.loadedSegments, start, x => x.start);
		if (index === -1 || this.loadedSegments[index]!.start < segment.start) {
			index++;
		}

		// Insert the segment at the right place so that the array remains sorted by start offset
		this.loadedSegments.splice(index, 0, segment);
		this.totalStoredBytes += bytes.byteLength;

		// Remove all other segments from the array that are completely covered by the newly-inserted segment
		for (let i = index + 1; i < this.loadedSegments.length; i++) {
			const otherSegment = this.loadedSegments[i]!;
			if (otherSegment.start >= segment.end) {
				break;
			}

			if (segment.start <= otherSegment.start && otherSegment.end <= segment.end) {
				this.loadedSegments.splice(i, 1);
				i--;
			}
		}

		// If we overshoot the max amount of permitted bytes, let's start evicting the oldest segments
		while (this.totalStoredBytes > this.maxStorableBytes && this.loadedSegments.length > 1) {
			let oldestSegment: ReadSegment | null = null;
			let oldestSegmentIndex = -1;

			for (let i = 0; i < this.loadedSegments.length; i++) {
				const candidate = this.loadedSegments[i]!;
				if (!oldestSegment || candidate.age < oldestSegment.age) {
					oldestSegment = candidate;
					oldestSegmentIndex = i;
				}
			}

			assert(oldestSegment);

			this.totalStoredBytes -= oldestSegment.bytes.byteLength;
			this.loadedSegments.splice(oldestSegmentIndex, 1);
		}
	}

	getViewAndOffset(start: number, end: number) {
		const startIndex = binarySearchLessOrEqual(this.loadedSegments, start, x => x.start);
		let segment: ReadSegment | null = null;

		if (startIndex !== -1) {
			for (let i = startIndex; i < this.loadedSegments.length; i++) {
				const candidate = this.loadedSegments[i]!;

				if (candidate.start > start) {
					break;
				}

				if (end <= candidate.end) {
					segment = candidate;
					break;
				}
			}
		}

		if (!segment) {
			throw new Error(`No segment loaded for range [${start}, ${end}).`);
		}

		segment.age = this.nextAge++;

		return {
			view: segment.view,
			offset: segment.bytes.byteOffset + start - segment.start,
		};
	}

	forgetRange(start: number, end: number) {
		if (end <= start) {
			return;
		}

		const startIndex = binarySearchLessOrEqual(this.loadedSegments, start, x => x.start);
		if (startIndex === -1) {
			return;
		}

		const segment = this.loadedSegments[startIndex]!;
		if (segment.start !== start || segment.end !== end) {
			return;
		}

		this.loadedSegments.splice(startIndex, 1);
		this.totalStoredBytes -= segment.bytes.byteLength;
	}
}
