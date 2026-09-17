/*!
 * Copyright (c) 2025-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { mergeObjectsDeeply, retriedFetch } from './misc';

/**
 * The source base class, representing a resource from which bytes can be read.
 * @public
 */
export abstract class Source {
	/** @internal */
	abstract _read(start: number, end: number): Promise<Uint8Array>;
	/** @internal */
	abstract _retrieveSize(): Promise<number>;

	/** @internal */
	_sizePromise: Promise<number> | null = null;

	/**
	 * Resolves with the total size of the file in bytes. This function is memoized, meaning only the first call
	 * will retrieve the size.
	 */
	getSize() {
		return this._sizePromise ??= this._retrieveSize();
	}

	/** Called each time data is requested from the source. */
	onread: ((start: number, end: number) => unknown) | null = null;
}

/**
 * A source backed by an ArrayBuffer or ArrayBufferView, with the entire file held in memory.
 * @public
 */
export class BufferSource extends Source {
	/** @internal */
	_bytes: Uint8Array;

	constructor(buffer: ArrayBuffer | Uint8Array) {
		if (!(buffer instanceof ArrayBuffer) && !(buffer instanceof Uint8Array)) {
			throw new TypeError('buffer must be an ArrayBuffer or Uint8Array.');
		}

		super();

		this._bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
	}

	/** @internal */
	async _read(start: number, end: number) {
		return this._bytes.subarray(start, end);
	}

	/** @internal */
	async _retrieveSize() {
		return this._bytes.byteLength;
	}
}

/**
 * Options for defining a StreamSource.
 * @public
 */
export type StreamSourceOptions = {
	/** Called when data is requested. Should return or resolve to the bytes from the specified byte range. */
	read: (start: number, end: number) => Uint8Array | Promise<Uint8Array>;
	/** Called when the size of the entire file is requested. Should return or resolve to the size in bytes. */
	getSize: () => number | Promise<number>;
};

/**
 * A general-purpose, callback-driven source that can get its data from anywhere.
 * @public
 */
export class StreamSource extends Source {
	/** @internal */
	_options: StreamSourceOptions;

	constructor(options: StreamSourceOptions) {
		if (!options || typeof options !== 'object') {
			throw new TypeError('options must be an object.');
		}
		if (typeof options.read !== 'function') {
			throw new TypeError('options.read must be a function.');
		}
		if (typeof options.getSize !== 'function') {
			throw new TypeError('options.getSize must be a function.');
		}

		super();

		this._options = options;
	}

	/** @internal */
	async _read(start: number, end: number) {
		return this._options.read(start, end);
	}

	/** @internal */
	async _retrieveSize() {
		return this._options.getSize();
	}
}

/**
 * A source backed by a Blob. Since Files are also Blobs, this is the source to use when reading files off the disk.
 * @public
 */
export class BlobSource extends Source {
	/** @internal */
	_blob: Blob;

	constructor(blob: Blob) {
		if (!(blob instanceof Blob)) {
			throw new TypeError('blob must be a Blob.');
		}

		super();

		this._blob = blob;
	}

	/** @internal */
	async _read(start: number, end: number) {
		const slice = this._blob.slice(start, end);
		const buffer = await slice.arrayBuffer();
		return new Uint8Array(buffer);
	}

	/** @internal */
	async _retrieveSize() {
		return this._blob.size;
	}
}

/**
 * Options for UrlSource.
 * @public
 */
export type UrlSourceOptions = {
	/**
	 * The RequestInit used by the Fetch API. Can be used to further control the requests, such as setting
	 * custom headers.
	 */
	requestInit?: RequestInit;

	/**
	 * A function that returns the delay (in seconds) before retrying a failed request. The function is called
	 * with the number of previous, unsuccessful attempts. If the function returns `null`, no more retries will be made.
	 */
	getRetryDelay?: (previousAttempts: number) => number | null;
};

/**
 * A source backed by a URL. This is useful for reading data from the network. Be careful using this source however,
 * as it typically comes with increased latency.
 * @beta
 */
export class UrlSource extends Source {
	/** @internal */
	private _url: URL;
	/** @internal */
	private _options: UrlSourceOptions;
	/** @internal */
	private _fullData: ArrayBuffer | null = null;
	/** @internal */
	private _nextUrlVersion: number | null = null;

	constructor(
		url: string | URL,
		options: UrlSourceOptions = {},
	) {
		if (typeof url !== 'string' && !(url instanceof URL)) {
			throw new TypeError('url must be a string or URL.');
		}
		if (!options || typeof options !== 'object') {
			throw new TypeError('options must be an object.');
		}
		if (options.requestInit !== undefined && (!options.requestInit || typeof options.requestInit !== 'object')) {
			throw new TypeError('options.requestInit, when provided, must be an object.');
		}
		if (options.getRetryDelay !== undefined && typeof options.getRetryDelay !== 'function') {
			throw new TypeError('options.getRetryDelay, when provided, must be a function.');
		}

		super();

		this._url = url instanceof URL ? url : new URL(url);
		this._options = options;
	}

	/** @internal */
	private async _makeRequest(
		range?: { start: number; end: number },
	): Promise<{ response: ArrayBuffer; statusCode: number }> {
		const headers: HeadersInit = {};

		if (range) {
			headers['Range'] = `bytes=${range.start}-${range.end - 1}`;
		}

		if (this._nextUrlVersion !== null) {
			this._url.searchParams.set('mediabunny_version', this._nextUrlVersion.toString());
			this._nextUrlVersion++;
		}

		const response = await retriedFetch(
			this._url,
			mergeObjectsDeeply(this._options.requestInit ?? {}, {
				method: 'GET',
				headers,
			}),
			this._options.getRetryDelay ?? (() => null),
		);

		if (!response.ok) {
			throw new Error(`Error fetching ${this._url}: ${response.status} ${response.statusText}`);
		}

		const buffer = await response.arrayBuffer();

		if (
			response.status === 206
			&& range
			&& buffer.byteLength !== range.end - range.start
			&& this._nextUrlVersion === null
		) {
			// We did a range request but it resolved with the wrong range; in Chromium, this can be due to a caching
			// bug (https://issues.chromium.org/issues/436025873). Let's circumvent the cache for the rest of the
			// session by appending a version to the URL.
			this._nextUrlVersion = 1;
			return this._makeRequest(range);
		}

		if (response.status === 200) {
			// The server didn't return 206 Partial Content, so it's not a range response
			this._fullData = buffer;
		}

		return {
			response: buffer,
			statusCode: response.status,
		};
	}

	/** @internal */
	async _read(start: number, end: number): Promise<Uint8Array> {
		if (this._fullData) {
			return new Uint8Array(this._fullData, start, end - start);
		}

		const { response, statusCode } = await this._makeRequest({ start, end });

		// If server doesn't support range requests, it will return 200 instead of 206. In that case, let's manually
		// slice the response.
		if (statusCode === 200) {
			const fullData = new Uint8Array(response);
			return fullData.subarray(start, end);
		}

		return new Uint8Array(response);
	}

	/** @internal */
	async _retrieveSize(): Promise<number> {
		if (this._fullData) {
			return this._fullData.byteLength;
		}

		// First, try a HEAD request to get the size
		try {
			const headResponse = await retriedFetch(
				this._url,
				mergeObjectsDeeply(this._options.requestInit ?? {}, {
					method: 'HEAD',
				}),
				this._options.getRetryDelay ?? (() => null),
			);

			if (headResponse.ok) {
				const contentLength = headResponse.headers.get('Content-Length');
				if (contentLength) {
					return parseInt(contentLength);
				}
			}
		} catch {
			// We tried
		}

		// Try a range request to get the Content-Range header
		const rangeResponse = await retriedFetch(
			this._url,
			mergeObjectsDeeply(this._options.requestInit ?? {}, {
				method: 'GET',
				headers: { Range: 'bytes=0-0' },
			}),
			this._options.getRetryDelay ?? (() => null),
		);

		if (rangeResponse.status === 206) {
			const contentRange = rangeResponse.headers.get('Content-Range');
			if (contentRange) {
				const match = contentRange.match(/bytes \d+-\d+\/(\d+)/);
				if (match && match[1]) {
					return parseInt(match[1]);
				}
			}
		} else if (rangeResponse.status === 200) {
			// The server just returned the whole thing
			this._fullData = await rangeResponse.arrayBuffer();
			if (this._fullData.byteLength !== 1) {
				return this._fullData.byteLength;
			} else {
				// The server responded with 200, but returned only the requested range, so skip the response
			}
		}

		// If the range request didn't provide the size, make a full GET request
		const { response } = await this._makeRequest();
		return response.byteLength;
	}
}
