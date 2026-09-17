/*!
 * Copyright (c) 2025-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { AudioCodec } from '../codec';
import { Demuxer } from '../demuxer';
import { Input } from '../input';
import { InputAudioTrack, InputAudioTrackBacking } from '../input-track';
import { PacketRetrievalOptions } from '../media-sink';
import { assert, UNDETERMINED_LANGUAGE } from '../misc';
import { EncodedPacket, PLACEHOLDER_DATA } from '../packet';
import { Reader } from '../reader';
import { RiffReader } from './riff-reader';

export enum WaveFormat {
	PCM = 0x0001,
	IEEE_FLOAT = 0x0003,
	ALAW = 0x0006,
	MULAW = 0x0007,
	EXTENSIBLE = 0xFFFE,
}

export class WaveDemuxer extends Demuxer {
	metadataReader: RiffReader;
	chunkReader: RiffReader;

	metadataPromise: Promise<void> | null = null;
	dataStart = -1;
	dataSize = -1;
	audioInfo: {
		format: number;
		numberOfChannels: number;
		sampleRate: number;
		sampleSizeInBytes: number;
		blockSizeInBytes: number;
	} | null = null;

	tracks: InputAudioTrack[] = [];

	constructor(input: Input) {
		super(input);

		this.metadataReader = new RiffReader(input._mainReader);
		this.chunkReader = new RiffReader(new Reader(input.source, 64 * 2 ** 20));
	}

	async readMetadata() {
		return this.metadataPromise ??= (async () => {
			const actualFileSize = await this.metadataReader.reader.source.getSize();

			const riffType = this.metadataReader.readAscii(4);
			this.metadataReader.littleEndian = riffType !== 'RIFX';

			const isRf64 = riffType === 'RF64';

			const outerChunkSize = this.metadataReader.readU32();

			let totalFileSize = isRf64 ? actualFileSize : Math.min(outerChunkSize + 8, actualFileSize);
			const format = this.metadataReader.readAscii(4);

			if (format !== 'WAVE') {
				throw new Error('Invalid WAVE file - wrong format');
			}

			this.metadataReader.pos = 12;
			let chunksRead = 0;
			let dataChunkSize: number | null = null;

			while (this.metadataReader.pos < totalFileSize) {
				await this.metadataReader.reader.loadRange(this.metadataReader.pos, this.metadataReader.pos + 8);

				const chunkId = this.metadataReader.readAscii(4);
				const chunkSize = this.metadataReader.readU32();
				const startPos = this.metadataReader.pos;

				if (isRf64 && chunksRead === 0 && chunkId !== 'ds64') {
					throw new Error('Invalid RF64 file: First chunk must be "ds64".');
				}

				if (chunkId === 'fmt ') {
					await this.parseFmtChunk(chunkSize);
				} else if (chunkId === 'data') {
					dataChunkSize ??= chunkSize;

					this.dataStart = this.metadataReader.pos;
					this.dataSize = Math.min(dataChunkSize, totalFileSize - this.dataStart);
				} else if (chunkId === 'ds64') {
					// File and data chunk sizes are defined in here instead

					const riffChunkSize = this.metadataReader.readU64();
					dataChunkSize = this.metadataReader.readU64();

					totalFileSize = Math.min(riffChunkSize + 8, actualFileSize);
				}

				this.metadataReader.pos = startPos + chunkSize + (chunkSize & 1); // Handle padding
				chunksRead++;
			}

			if (!this.audioInfo) {
				throw new Error('Invalid WAVE file - missing "fmt " chunk');
			}
			if (this.dataStart === -1) {
				throw new Error('Invalid WAVE file - missing "data" chunk');
			}

			const blockSize = this.audioInfo.blockSizeInBytes;
			this.dataSize = Math.floor(this.dataSize / blockSize) * blockSize;

			this.tracks.push(new InputAudioTrack(new WaveAudioTrackBacking(this)));
		})();
	}

	private async parseFmtChunk(size: number) {
		await this.metadataReader.reader.loadRange(this.metadataReader.pos, this.metadataReader.pos + size);

		let formatTag = this.metadataReader.readU16();
		const numChannels = this.metadataReader.readU16();
		const sampleRate = this.metadataReader.readU32();
		this.metadataReader.pos += 4; // Bytes per second
		const blockAlign = this.metadataReader.readU16();

		let bitsPerSample: number;

		if (size === 14) { // Plain WAVEFORMAT
			bitsPerSample = 8;
		} else {
			bitsPerSample = this.metadataReader.readU16();
		}

		// Handle WAVEFORMATEXTENSIBLE
		if (size >= 18 && formatTag !== 0x0165) {
			const cbSize = this.metadataReader.readU16();
			const remainingSize = size - 18;
			const extensionSize = Math.min(remainingSize, cbSize);

			if (extensionSize >= 22 && formatTag === WaveFormat.EXTENSIBLE) {
				// Parse WAVEFORMATEXTENSIBLE
				this.metadataReader.pos += 2 + 4;
				const subFormat = this.metadataReader.readBytes(16);

				// Get actual format from subFormat GUID
				formatTag = subFormat[0]! | (subFormat[1]! << 8);
			}
		}

		if (formatTag === WaveFormat.MULAW || formatTag === WaveFormat.ALAW) {
			bitsPerSample = 8;
		}

		this.audioInfo = {
			format: formatTag,
			numberOfChannels: numChannels,
			sampleRate,
			sampleSizeInBytes: Math.ceil(bitsPerSample / 8),
			blockSizeInBytes: blockAlign,
		};
	}

	getCodec(): AudioCodec | null {
		assert(this.audioInfo);

		if (this.audioInfo.format === WaveFormat.MULAW) {
			return 'ulaw';
		}
		if (this.audioInfo.format === WaveFormat.ALAW) {
			return 'alaw';
		}
		if (this.audioInfo.format === WaveFormat.PCM) {
			// All formats are little-endian
			if (this.audioInfo.sampleSizeInBytes === 1) {
				return 'pcm-u8';
			} else if (this.audioInfo.sampleSizeInBytes === 2) {
				return 'pcm-s16';
			} else if (this.audioInfo.sampleSizeInBytes === 3) {
				return 'pcm-s24';
			} else if (this.audioInfo.sampleSizeInBytes === 4) {
				return 'pcm-s32';
			}
		}
		if (this.audioInfo.format === WaveFormat.IEEE_FLOAT) {
			if (this.audioInfo.sampleSizeInBytes === 4) {
				return 'pcm-f32';
			}
		}

		return null;
	}

	async getMimeType() {
		return 'audio/wav';
	}

	async computeDuration() {
		await this.readMetadata();
		assert(this.audioInfo);

		const numberOfBlocks = this.dataSize / this.audioInfo.blockSizeInBytes;
		return numberOfBlocks / this.audioInfo.sampleRate;
	}

	async getTracks() {
		await this.readMetadata();
		return this.tracks;
	}
}

const PACKET_SIZE_IN_FRAMES = 2048;

class WaveAudioTrackBacking implements InputAudioTrackBacking {
	constructor(public demuxer: WaveDemuxer) {}

	getId() {
		return 1;
	}

	getCodec() {
		return this.demuxer.getCodec();
	}

	async getDecoderConfig(): Promise<AudioDecoderConfig | null> {
		const codec = this.demuxer.getCodec();
		if (!codec) {
			return null;
		}

		assert(this.demuxer.audioInfo);
		return {
			codec,
			numberOfChannels: this.demuxer.audioInfo.numberOfChannels,
			sampleRate: this.demuxer.audioInfo.sampleRate,
		};
	}

	computeDuration() {
		return this.demuxer.computeDuration();
	}

	getNumberOfChannels() {
		assert(this.demuxer.audioInfo);
		return this.demuxer.audioInfo.numberOfChannels;
	}

	getSampleRate() {
		assert(this.demuxer.audioInfo);
		return this.demuxer.audioInfo.sampleRate;
	}

	getTimeResolution() {
		assert(this.demuxer.audioInfo);
		return this.demuxer.audioInfo.sampleRate;
	}

	getLanguageCode() {
		return UNDETERMINED_LANGUAGE;
	}

	async getFirstTimestamp() {
		return 0;
	}

	private async getPacketAtIndex(
		packetIndex: number,
		options: PacketRetrievalOptions,
	): Promise<EncodedPacket | null> {
		assert(this.demuxer.audioInfo);
		const startOffset = packetIndex * PACKET_SIZE_IN_FRAMES * this.demuxer.audioInfo.blockSizeInBytes;
		if (startOffset >= this.demuxer.dataSize) {
			return null;
		}

		const sizeInBytes = Math.min(
			PACKET_SIZE_IN_FRAMES * this.demuxer.audioInfo.blockSizeInBytes,
			this.demuxer.dataSize - startOffset,
		);

		let data: Uint8Array;
		if (options.metadataOnly) {
			data = PLACEHOLDER_DATA;
		} else {
			const sizeOfOnePacket = PACKET_SIZE_IN_FRAMES * this.demuxer.audioInfo.blockSizeInBytes;
			const chunkSize = Math.ceil(2 ** 19 / sizeOfOnePacket) * sizeOfOnePacket;
			const chunkStart = Math.floor(startOffset / chunkSize) * chunkSize;
			const chunkEnd = chunkStart + chunkSize;

			// Always load large 0.5 MiB chunks instead of just the required packet
			await this.demuxer.chunkReader.reader.loadRange(
				this.demuxer.dataStart + chunkStart,
				this.demuxer.dataStart + chunkEnd,
			);

			this.demuxer.chunkReader.pos = this.demuxer.dataStart + startOffset;
			data = this.demuxer.chunkReader.readBytes(sizeInBytes);
		}

		const timestamp = packetIndex * PACKET_SIZE_IN_FRAMES / this.demuxer.audioInfo.sampleRate;
		const duration = sizeInBytes / this.demuxer.audioInfo.blockSizeInBytes / this.demuxer.audioInfo.sampleRate;

		return new EncodedPacket(
			data,
			'key',
			timestamp,
			duration,
			packetIndex,
			sizeInBytes,
		);
	}

	getFirstPacket(options: PacketRetrievalOptions) {
		return this.getPacketAtIndex(0, options);
	}

	getPacket(timestamp: number, options: PacketRetrievalOptions) {
		assert(this.demuxer.audioInfo);
		const packetIndex = Math.floor(timestamp * this.demuxer.audioInfo.sampleRate / PACKET_SIZE_IN_FRAMES);

		return this.getPacketAtIndex(packetIndex, options);
	}

	getNextPacket(packet: EncodedPacket, options: PacketRetrievalOptions) {
		assert(this.demuxer.audioInfo);
		const packetIndex = Math.round(packet.timestamp * this.demuxer.audioInfo.sampleRate / PACKET_SIZE_IN_FRAMES);

		return this.getPacketAtIndex(packetIndex + 1, options);
	}

	getKeyPacket(timestamp: number, options: PacketRetrievalOptions) {
		return this.getPacket(timestamp, options);
	}

	getNextKeyPacket(packet: EncodedPacket, options: PacketRetrievalOptions) {
		return this.getNextPacket(packet, options);
	}
}
