/*!
 * Copyright (c) 2025-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Muxer } from '../muxer';
import { Output, OutputAudioTrack } from '../output';
import { parsePcmCodec, PcmAudioCodec, validateAudioChunkMetadata } from '../codec';
import { WaveFormat } from './wave-demuxer';
import { RiffWriter } from './riff-writer';
import { Writer } from '../writer';
import { EncodedPacket } from '../packet';
import { WavOutputFormat } from '../output-format';
import { assert } from '../misc';

export class WaveMuxer extends Muxer {
	private format: WavOutputFormat;
	private isRf64: boolean;
	private writer: Writer;
	private riffWriter: RiffWriter;
	private headerWritten = false;
	private dataSize = 0;
	private sampleRate: number | null = null;
	private sampleCount = 0;

	constructor(output: Output, format: WavOutputFormat) {
		super(output);

		this.format = format;
		this.writer = output._writer;
		this.riffWriter = new RiffWriter(output._writer);
		this.isRf64 = !!format._options.large;
	}

	async start() {
		// Nothing needed here - we'll write the header with the first sample
	}

	async getMimeType() {
		return 'audio/wav';
	}

	async addEncodedVideoPacket() {
		throw new Error('WAVE does not support video.');
	}

	async addEncodedAudioPacket(
		track: OutputAudioTrack,
		packet: EncodedPacket,
		meta?: EncodedAudioChunkMetadata,
	) {
		const release = await this.mutex.acquire();

		try {
			if (!this.headerWritten) {
				validateAudioChunkMetadata(meta);

				assert(meta);
				assert(meta.decoderConfig);

				this.writeHeader(track, meta.decoderConfig);
				this.sampleRate = meta.decoderConfig.sampleRate;
				this.headerWritten = true;
			}

			this.validateAndNormalizeTimestamp(track, packet.timestamp, packet.type === 'key');

			if (!this.isRf64 && this.writer.getPos() + packet.data.byteLength >= 2 ** 32) {
				throw new Error(
					'Adding more audio data would exceed the maximum RIFF size of 4 GiB. To write larger files, use'
					+ ' RF64 by setting `large: true` in the WavOutputFormatOptions.',
				);
			}

			this.writer.write(packet.data);
			this.dataSize += packet.data.byteLength;
			this.sampleCount += Math.round(packet.duration * this.sampleRate!);

			await this.writer.flush();
		} finally {
			release();
		}
	}

	async addSubtitleCue() {
		throw new Error('WAVE does not support subtitles.');
	}

	private writeHeader(track: OutputAudioTrack, config: AudioDecoderConfig) {
		if (this.format._options.onHeader) {
			this.writer.startTrackingWrites();
		}

		let format: WaveFormat;

		const codec = track.source._codec;
		const pcmInfo = parsePcmCodec(codec as PcmAudioCodec);

		if (pcmInfo.dataType === 'ulaw') {
			format = WaveFormat.MULAW;
		} else if (pcmInfo.dataType === 'alaw') {
			format = WaveFormat.ALAW;
		} else if (pcmInfo.dataType === 'float') {
			format = WaveFormat.IEEE_FLOAT;
		} else {
			format = WaveFormat.PCM;
		}

		const channels = config.numberOfChannels;
		const sampleRate = config.sampleRate;
		const blockSize = pcmInfo.sampleSize * channels;

		// RIFF header
		this.riffWriter.writeAscii(this.isRf64 ? 'RF64' : 'RIFF');

		if (this.isRf64) {
			this.riffWriter.writeU32(0xffffffff); // Not used in RF64
		} else {
			this.riffWriter.writeU32(0); // File size placeholder
		}

		this.riffWriter.writeAscii('WAVE');

		if (this.isRf64) {
			this.riffWriter.writeAscii('ds64');
			this.riffWriter.writeU32(28); // Chunk size
			this.riffWriter.writeU64(0); // RIFF size placeholder
			this.riffWriter.writeU64(0); // Data size placeholder
			this.riffWriter.writeU64(0); // Sample count placeholder
			this.riffWriter.writeU32(0); // Table length
			// Empty table
		}

		// fmt chunk
		this.riffWriter.writeAscii('fmt ');
		this.riffWriter.writeU32(16); // Chunk size
		this.riffWriter.writeU16(format);
		this.riffWriter.writeU16(channels);
		this.riffWriter.writeU32(sampleRate);
		this.riffWriter.writeU32(sampleRate * blockSize); // Bytes per second
		this.riffWriter.writeU16(blockSize);
		this.riffWriter.writeU16(8 * pcmInfo.sampleSize);

		// data chunk
		this.riffWriter.writeAscii('data');

		if (this.isRf64) {
			this.riffWriter.writeU32(0xffffffff); // Not used in RF64
		} else {
			this.riffWriter.writeU32(0); // Data size placeholder
		}

		if (this.format._options.onHeader) {
			const { data, start } = this.writer.stopTrackingWrites();
			this.format._options.onHeader(data, start);
		}
	}

	async finalize() {
		const release = await this.mutex.acquire();

		const endPos = this.writer.getPos();

		if (this.isRf64) {
			// Write riff size
			this.writer.seek(20);
			this.riffWriter.writeU64(endPos - 8);

			// Write data size
			this.writer.seek(28);
			this.riffWriter.writeU64(this.dataSize);

			// Write sample count
			this.writer.seek(36);
			this.riffWriter.writeU64(this.sampleCount);
		} else {
			// Write file size
			this.writer.seek(4);
			this.riffWriter.writeU32(endPos - 8);

			// Write data chunk size
			this.writer.seek(40);
			this.riffWriter.writeU32(this.dataSize);
		}

		this.writer.seek(endPos);

		release();
	}
}
