/*!
 * Copyright (c) 2025-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
	extractAv1CodecInfoFromPacket,
	extractAvcDecoderConfigurationRecord,
	extractHevcDecoderConfigurationRecord,
	extractVp9CodecInfoFromPacket,
} from '../codec-data';
import {
	AacCodecInfo,
	AudioCodec,
	extractAudioCodecString,
	extractVideoCodecString,
	MediaCodec,
	VideoCodec,
} from '../codec';
import { Demuxer } from '../demuxer';
import { Input } from '../input';
import {
	InputAudioTrack,
	InputAudioTrackBacking,
	InputTrack,
	InputTrackBacking,
	InputVideoTrack,
	InputVideoTrackBacking,
} from '../input-track';
import { PacketRetrievalOptions } from '../media-sink';
import {
	assert,
	AsyncMutex,
	binarySearchExact,
	binarySearchLessOrEqual,
	COLOR_PRIMARIES_MAP_INVERSE,
	findLastIndex,
	insertSorted,
	isIso639Dash2LanguageCode,
	last,
	MATRIX_COEFFICIENTS_MAP_INVERSE,
	normalizeRotation,
	Rotation,
	roundToPrecision,
	TRANSFER_CHARACTERISTICS_MAP_INVERSE,
	UNDETERMINED_LANGUAGE,
} from '../misc';
import { EncodedPacket, PLACEHOLDER_DATA } from '../packet';
import { Reader } from '../reader';
import {
	assertDefinedSize,
	CODEC_STRING_MAP,
	EBMLId,
	EBMLReader,
	LEVEL_0_AND_1_EBML_IDS,
	MAX_HEADER_SIZE,
	MIN_HEADER_SIZE,
	readVarInt,
} from './ebml';
import { buildMatroskaMimeType } from './matroska-misc';

type Segment = {
	seekHeadSeen: boolean;
	infoSeen: boolean;
	tracksSeen: boolean;
	cuesSeen: boolean;

	timestampScale: number;
	timestampFactor: number;
	duration: number;
	seekEntries: SeekEntry[];
	tracks: InternalTrack[];
	cuePoints: CuePoint[];

	dataStartPos: number;
	elementEndPos: number;
	clusterSeekStartPos: number;

	clusters: Cluster[];
	clusterLookupMutex: AsyncMutex;
};

type SeekEntry = {
	id: number;
	segmentPosition: number;
};

type Cluster = {
	elementStartPos: number;
	elementEndPos: number;
	dataStartPos: number;
	timestamp: number;
	trackData: Map<number, ClusterTrackData>;
	nextCluster: Cluster | null;
	isKnownToBeFirstCluster: boolean;
};

type ClusterTrackData = {
	startTimestamp: number;
	endTimestamp: number;
	firstKeyFrameTimestamp: number | null;
	blocks: ClusterBlock[];
	presentationTimestamps: {
		timestamp: number;
		blockIndex: number;
	}[];
};

enum BlockLacing {
	None,
	Xiph,
	FixedSize,
	Ebml,
}

type ClusterBlock = {
	timestamp: number;
	duration: number;
	isKeyFrame: boolean;
	referencedTimestamps: number[];
	data: Uint8Array;
	lacing: BlockLacing;
};

type CuePoint = {
	time: number;
	trackId: number;
	clusterPosition: number;
};

type InternalTrack = {
	id: number;
	demuxer: MatroskaDemuxer;
	segment: Segment;
	clusters: Cluster[];
	clustersWithKeyFrame: Cluster[];
	cuePoints: CuePoint[];

	isDefault: boolean;
	inputTrack: InputTrack | null;
	codecId: string | null;
	codecPrivate: Uint8Array | null;
	defaultDuration: number | null;
	languageCode: string;
	info:
		| null
		| {
			type: 'video';
			width: number;
			height: number;
			rotation: Rotation;
			codec: VideoCodec | null;
			codecDescription: Uint8Array | null;
			colorSpace: VideoColorSpaceInit | null;
		}
		| {
			type: 'audio';
			numberOfChannels: number;
			sampleRate: number;
			bitDepth: number;
			codec: AudioCodec | null;
			codecDescription: Uint8Array | null;
			aacCodecInfo: AacCodecInfo | null;
		};
};
type InternalVideoTrack = InternalTrack & { info: { type: 'video' } };
type InternalAudioTrack = InternalTrack & { info: { type: 'audio' } };

const METADATA_ELEMENTS = [
	{ id: EBMLId.SeekHead, flag: 'seekHeadSeen' },
	{ id: EBMLId.Info, flag: 'infoSeen' },
	{ id: EBMLId.Tracks, flag: 'tracksSeen' },
	{ id: EBMLId.Cues, flag: 'cuesSeen' },
] as const;

export class MatroskaDemuxer extends Demuxer {
	metadataReader: EBMLReader;
	clusterReader: EBMLReader;

	readMetadataPromise: Promise<void> | null = null;

	segments: Segment[] = [];
	currentSegment: Segment | null = null;
	currentTrack: InternalTrack | null = null;
	currentCluster: Cluster | null = null;
	currentBlock: ClusterBlock | null = null;
	currentCueTime: number | null = null;

	isWebM = false;

	constructor(input: Input) {
		super(input);

		this.metadataReader = new EBMLReader(input._mainReader);

		// Max 64 MiB of stored clusters
		this.clusterReader = new EBMLReader(new Reader(input.source, 64 * 2 ** 20));
	}

	override async computeDuration() {
		const tracks = await this.getTracks();
		const trackDurations = await Promise.all(tracks.map(x => x.computeDuration()));
		return Math.max(0, ...trackDurations);
	}

	async getTracks() {
		await this.readMetadata();
		return this.segments.flatMap(segment => segment.tracks.map(track => track.inputTrack!));
	}

	override async getMimeType() {
		await this.readMetadata();

		const tracks = await this.getTracks();
		const codecStrings = await Promise.all(tracks.map(x => x.getCodecParameterString()));

		return buildMatroskaMimeType({
			isWebM: this.isWebM,
			hasVideo: this.segments.some(segment => segment.tracks.some(x => x.info?.type === 'video')),
			hasAudio: this.segments.some(segment => segment.tracks.some(x => x.info?.type === 'audio')),
			codecStrings: codecStrings.filter(Boolean) as string[],
		});
	}

	readMetadata() {
		return this.readMetadataPromise ??= (async () => {
			this.metadataReader.pos = 0;

			const fileSize = await this.input.source.getSize();

			// Loop over all top-level elements in the file
			while (this.metadataReader.pos <= fileSize - MIN_HEADER_SIZE) {
				await this.metadataReader.reader.loadRange(
					this.metadataReader.pos,
					this.metadataReader.pos + MAX_HEADER_SIZE,
				);

				const header = this.metadataReader.readElementHeader();
				if (!header) {
					break; // Zero padding at the end of the file triggers this, for example
				}

				const id = header.id;
				let size = header.size;
				const startPos = this.metadataReader.pos;

				if (id === EBMLId.EBML) {
					assertDefinedSize(size);

					await this.metadataReader.reader.loadRange(this.metadataReader.pos, this.metadataReader.pos + size);
					this.readContiguousElements(this.metadataReader, size);
				} else if (id === EBMLId.Segment) { // Segment found!
					await this.readSegment(size);

					if (size === null) {
						// Segment sizes can be undefined (common in livestreamed files), so assume this is the last
						// and only segment
						break;
					}
				} else if (id === EBMLId.Cluster) {
					// Clusters are not a top-level element in Matroska, but some files contain a Segment whose size
					// doesn't contain any of the clusters that follow it. In the case, we apply the following logic: if
					// we find a top-level cluster, attribute it to the previous segment.

					if (size === null) {
						// Just in case this is one of those weird sizeless clusters, let's do our best and still try to
						// determine its size.
						const nextElementPos = await this.clusterReader.searchForNextElementId(
							LEVEL_0_AND_1_EBML_IDS,
							fileSize,
						);
						size = (nextElementPos ?? fileSize) - startPos;
					}

					const lastSegment = last(this.segments);
					if (lastSegment) {
						// Extend the previous segment's size
						lastSegment.elementEndPos = startPos + size;
					}
				}

				assertDefinedSize(size);
				this.metadataReader.pos = startPos + size;
			}
		})();
	}

	async readSegment(dataSize: number | null) {
		const segmentDataStart = this.metadataReader.pos;

		this.currentSegment = {
			seekHeadSeen: false,
			infoSeen: false,
			tracksSeen: false,
			cuesSeen: false,

			timestampScale: -1,
			timestampFactor: -1,
			duration: -1,
			seekEntries: [],
			tracks: [],
			cuePoints: [],

			dataStartPos: segmentDataStart,
			elementEndPos: dataSize === null
				? await this.input.source.getSize() // Assume it goes until the end of the file
				: segmentDataStart + dataSize,
			clusterSeekStartPos: segmentDataStart,

			clusters: [],
			clusterLookupMutex: new AsyncMutex(),
		};
		this.segments.push(this.currentSegment);

		// Let's load a good amount of data, enough for all segment metadata to likely fit into (minus cues)
		await this.metadataReader.reader.loadRange(
			this.metadataReader.pos,
			this.metadataReader.pos + 2 ** 14,
		);

		let clusterEncountered = false;
		while (this.metadataReader.pos <= this.currentSegment.elementEndPos - MIN_HEADER_SIZE) {
			await this.metadataReader.reader.loadRange(
				this.metadataReader.pos,
				this.metadataReader.pos + MAX_HEADER_SIZE,
			);

			const elementStartPos = this.metadataReader.pos;
			const header = this.metadataReader.readElementHeader();
			if (!header) {
				break;
			}

			const { id, size } = header;
			const dataStartPos = this.metadataReader.pos;

			const metadataElementIndex = METADATA_ELEMENTS.findIndex(x => x.id === id);
			if (metadataElementIndex !== -1) {
				const field = METADATA_ELEMENTS[metadataElementIndex]!.flag;
				this.currentSegment[field] = true;

				assertDefinedSize(size);
				await this.metadataReader.reader.loadRange(this.metadataReader.pos, this.metadataReader.pos + size);
				this.readContiguousElements(this.metadataReader, size);
			} else if (id === EBMLId.Cluster) {
				if (!clusterEncountered) {
					clusterEncountered = true;
					this.currentSegment.clusterSeekStartPos = elementStartPos;
				}
			}

			if (this.currentSegment.infoSeen && this.currentSegment.tracksSeen && this.currentSegment.cuesSeen) {
				// No need to search anymore, we have everything
				break;
			}

			if (this.currentSegment.seekHeadSeen) {
				let hasInfo = this.currentSegment.infoSeen;
				let hasTracks = this.currentSegment.tracksSeen;
				let hasCues = this.currentSegment.cuesSeen;

				for (const entry of this.currentSegment.seekEntries) {
					if (entry.id === EBMLId.Info) {
						hasInfo = true;
					} else if (entry.id === EBMLId.Tracks) {
						hasTracks = true;
					} else if (entry.id === EBMLId.Cues) {
						hasCues = true;
					}
				}

				if (hasInfo && hasTracks && hasCues) {
					// No need to search sequentially anymore, we can use the seek head
					break;
				}
			}

			if (size === null) {
				break;
			}

			this.metadataReader.pos = dataStartPos + size;

			if (!clusterEncountered) {
				this.currentSegment.clusterSeekStartPos = this.metadataReader.pos;
			}
		}

		// Use the seek head to read missing metadata elements
		for (const target of METADATA_ELEMENTS) {
			if (this.currentSegment[target.flag]) continue;

			const seekEntry = this.currentSegment.seekEntries.find(entry => entry.id === target.id);
			if (!seekEntry) continue;

			this.metadataReader.pos = segmentDataStart + seekEntry.segmentPosition;
			await this.metadataReader.reader.loadRange(
				this.metadataReader.pos,
				this.metadataReader.pos + 2 ** 12, // Load a larger range, assuming the correct element will be there
			);
			const header = this.metadataReader.readElementHeader();
			if (!header) continue;

			const { id, size } = header;
			if (id !== target.id) continue;

			assertDefinedSize(size);

			this.currentSegment[target.flag] = true;
			await this.metadataReader.reader.loadRange(this.metadataReader.pos, this.metadataReader.pos + size);
			this.readContiguousElements(this.metadataReader, size);
		}

		if (this.currentSegment.timestampScale === -1) {
			// TimestampScale element is missing. Technically an invalid file, but let's default to the typical value,
			// which is 1e6.
			this.currentSegment.timestampScale = 1e6;
			this.currentSegment.timestampFactor = 1e9 / 1e6;
		}

		// Put default tracks first
		this.currentSegment.tracks.sort((a, b) => Number(b.isDefault) - Number(a.isDefault));

		// Sort cue points by cluster position (required for the next algorithm)
		this.currentSegment.cuePoints.sort((a, b) => a.clusterPosition - b.clusterPosition);

		// Now, let's distribute the cue points to each track. Ideally, each track has their own cue point, but some
		// Matroska files may only specify cue points for a single track. In this case, we still wanna use those cue
		// points for all tracks.
		const allTrackIds = this.currentSegment.tracks.map(x => x.id);
		const remainingTrackIds = new Set<number>();
		let lastClusterPosition: number | null = null;
		let lastCuePoint: CuePoint | null = null;

		for (const cuePoint of this.currentSegment.cuePoints) {
			if (cuePoint.clusterPosition !== lastClusterPosition) {
				for (const id of remainingTrackIds) {
					// These tracks didn't receive a cue point for the last cluster, so let's give them one
					assert(lastCuePoint);
					const track = this.currentSegment.tracks.find(x => x.id === id)!;
					track.cuePoints.push(lastCuePoint);
				}

				for (const id of allTrackIds) {
					remainingTrackIds.add(id);
				}
			}

			lastCuePoint = cuePoint;

			if (!remainingTrackIds.has(cuePoint.trackId)) {
				continue;
			}

			const track = this.currentSegment.tracks.find(x => x.id === cuePoint.trackId)!;
			track.cuePoints.push(cuePoint);

			remainingTrackIds.delete(cuePoint.trackId);
			lastClusterPosition = cuePoint.clusterPosition;
		}

		for (const id of remainingTrackIds) {
			assert(lastCuePoint);
			const track = this.currentSegment.tracks.find(x => x.id === id)!;
			track.cuePoints.push(lastCuePoint);
		}

		for (const track of this.currentSegment.tracks) {
			// Sort cue points by time
			track.cuePoints.sort((a, b) => a.time - b.time);
		}

		this.currentSegment = null;
	}

	async readCluster(segment: Segment) {
		await this.metadataReader.reader.loadRange(this.metadataReader.pos, this.metadataReader.pos + MAX_HEADER_SIZE);

		const elementStartPos = this.metadataReader.pos;
		const elementHeader = this.metadataReader.readElementHeader();
		assert(elementHeader);

		const id = elementHeader.id;
		let size = elementHeader.size;
		const dataStartPos = this.metadataReader.pos;

		if (size === null) {
			// The cluster's size is undefined (can happen in livestreamed files). We'd still like to know the size of
			// it, so we have no other choice but to iterate over the EBML structure until we find an element at level
			// 0 or 1, indicating the end of the cluster (all elements inside the cluster are at level 2).
			this.clusterReader.pos = dataStartPos;
			const nextElementPos = await this.clusterReader.searchForNextElementId(
				LEVEL_0_AND_1_EBML_IDS,
				segment.elementEndPos,
			);

			size = (nextElementPos ?? segment.elementEndPos) - dataStartPos;
		}

		assert(id === EBMLId.Cluster);

		// Load the entire cluster
		this.clusterReader.pos = dataStartPos;
		await this.clusterReader.reader.loadRange(this.clusterReader.pos, this.clusterReader.pos + size);

		const cluster: Cluster = {
			elementStartPos,
			elementEndPos: dataStartPos + size,
			dataStartPos,
			timestamp: -1,
			trackData: new Map(),
			nextCluster: null,
			isKnownToBeFirstCluster: false,
		};
		this.currentCluster = cluster;
		this.readContiguousElements(this.clusterReader, size);

		for (const [trackId, trackData] of cluster.trackData) {
			const track = segment.tracks.find(x => x.id === trackId) ?? null;

			// This must hold, as track datas only get created if a block for that track is encountered
			assert(trackData.blocks.length > 0);

			let blockReferencesExist = false;
			let hasLacedBlocks = false;

			for (let i = 0; i < trackData.blocks.length; i++) {
				const block = trackData.blocks[i]!;
				block.timestamp += cluster.timestamp;

				blockReferencesExist ||= block.referencedTimestamps.length > 0;
				hasLacedBlocks ||= block.lacing !== BlockLacing.None;
			}

			if (blockReferencesExist) {
				trackData.blocks = sortBlocksByReferences(trackData.blocks);
			}

			trackData.presentationTimestamps = trackData.blocks
				.map((block, i) => ({ timestamp: block.timestamp, blockIndex: i }))
				.sort((a, b) => a.timestamp - b.timestamp);

			for (let i = 0; i < trackData.presentationTimestamps.length; i++) {
				const currentEntry = trackData.presentationTimestamps[i]!;
				const currentBlock = trackData.blocks[currentEntry.blockIndex]!;

				if (trackData.firstKeyFrameTimestamp === null && currentBlock.isKeyFrame) {
					trackData.firstKeyFrameTimestamp = currentBlock.timestamp;
				}

				if (i < trackData.presentationTimestamps.length - 1) {
					// Update block durations based on presentation order
					const nextEntry = trackData.presentationTimestamps[i + 1]!;
					currentBlock.duration = nextEntry.timestamp - currentBlock.timestamp;
				} else if (currentBlock.duration === 0) {
					if (track?.defaultDuration != null) {
						if (currentBlock.lacing === BlockLacing.None) {
							currentBlock.duration = track.defaultDuration;
						} else {
							// Handled by the lace resolution code
						}
					}
				}
			}

			if (hasLacedBlocks) {
				// Perform lace resolution. Here, we expand each laced block into multiple blocks where each contains
				// one frame of the lace. We do this after determining block timestamps so we can properly distribute
				// the block's duration across the laced frames.
				this.expandLacedBlocks(trackData.blocks, track);

				// Recompute since blocks have changed
				trackData.presentationTimestamps = trackData.blocks
					.map((block, i) => ({ timestamp: block.timestamp, blockIndex: i }))
					.sort((a, b) => a.timestamp - b.timestamp);
			}

			const firstBlock = trackData.blocks[trackData.presentationTimestamps[0]!.blockIndex]!;
			const lastBlock = trackData.blocks[last(trackData.presentationTimestamps)!.blockIndex]!;

			trackData.startTimestamp = firstBlock.timestamp;
			trackData.endTimestamp = lastBlock.timestamp + lastBlock.duration;

			if (track) {
				insertSorted(track.clusters, cluster, x => x.elementStartPos);

				const hasKeyFrame = trackData.firstKeyFrameTimestamp !== null;
				if (hasKeyFrame) {
					insertSorted(track.clustersWithKeyFrame, cluster, x => x.elementStartPos);
				}
			}
		}

		insertSorted(segment.clusters, cluster, x => x.elementStartPos);
		this.currentCluster = null;

		return cluster;
	}

	getTrackDataInCluster(cluster: Cluster, trackNumber: number) {
		let trackData = cluster.trackData.get(trackNumber);
		if (!trackData) {
			trackData = {
				startTimestamp: 0,
				endTimestamp: 0,
				firstKeyFrameTimestamp: null,
				blocks: [],
				presentationTimestamps: [],
			};
			cluster.trackData.set(trackNumber, trackData);
		}

		return trackData;
	}

	expandLacedBlocks(blocks: ClusterBlock[], track: InternalTrack | null) {
		// https://www.matroska.org/technical/notes.html#block-lacing

		for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
			const originalBlock = blocks[blockIndex]!;
			if (originalBlock.lacing === BlockLacing.None) {
				continue;
			}

			const data = originalBlock.data;
			let pos = 0;

			const frameSizes: number[] = [];
			const frameCount = data[pos]! + 1;
			pos++;

			switch (originalBlock.lacing) {
				case BlockLacing.Xiph: {
					let totalUsedSize = 0;

					// Xiph lacing, just like in Ogg
					for (let i = 0; i < frameCount - 1; i++) {
						let frameSize = 0;

						while (pos < data.length) {
							const value = data[pos]!;
							frameSize += value;
							pos++;

							if (value < 255) {
								frameSizes.push(frameSize);
								totalUsedSize += frameSize;

								break;
							}
						}
					}

					// Compute the last frame's size from whatever's left
					frameSizes.push(data.length - (pos + totalUsedSize));
				}; break;

				case BlockLacing.FixedSize: {
					// Fixed size lacing: all frames have same size
					const totalDataSize = data.length - 1; // Minus the frame count byte
					const frameSize = Math.floor(totalDataSize / frameCount);

					for (let i = 0; i < frameCount; i++) {
						frameSizes.push(frameSize);
					}
				}; break;

				case BlockLacing.Ebml: {
					// EBML lacing: first size absolute, subsequent ones are coded as signed differences from the last
					const firstResult = readVarInt(data, pos);
					let currentSize = firstResult.value;
					frameSizes.push(currentSize);
					pos += firstResult.width;

					let totalUsedSize = currentSize;

					for (let i = 1; i < frameCount - 1; i++) {
						const diffResult = readVarInt(data, pos);
						const unsignedDiff = diffResult.value;
						const bias = (1 << (diffResult.width * 7 - 1)) - 1; // Typo-corrected version of 2^((7*n)-1)^-1
						const diff = unsignedDiff - bias;

						currentSize += diff;
						frameSizes.push(currentSize);
						pos += diffResult.width;

						totalUsedSize += currentSize;
					}

					// Compute the last frame's size from whatever's left
					frameSizes.push(data.length - (pos + totalUsedSize));
				}; break;

				default: assert(false);
			}

			assert(frameSizes.length === frameCount);

			blocks.splice(blockIndex, 1); // Remove the original block
			let dataOffset = pos;

			// Now, let's insert each frame as its own block
			for (let i = 0; i < frameCount; i++) {
				const frameSize = frameSizes[i]!;
				const frameData = data.subarray(dataOffset, dataOffset + frameSize);

				const blockDuration = originalBlock.duration || (frameCount * (track?.defaultDuration ?? 0));

				// Distribute timestamps evenly across the block duration
				const frameTimestamp = originalBlock.timestamp + (blockDuration * i / frameCount);
				const frameDuration = blockDuration / frameCount;

				blocks.splice(blockIndex + i, 0, {
					timestamp: frameTimestamp,
					duration: frameDuration,
					isKeyFrame: originalBlock.isKeyFrame,
					referencedTimestamps: originalBlock.referencedTimestamps,
					data: frameData,
					lacing: BlockLacing.None,
				});

				dataOffset += frameSize;
			}

			blockIndex += frameCount; // Skip the blocks we just added
			blockIndex--;
		}
	}

	readContiguousElements(reader: EBMLReader, totalSize: number) {
		const startIndex = reader.pos;

		while (reader.pos - startIndex <= totalSize - MIN_HEADER_SIZE) {
			const foundElement = this.traverseElement(reader);
			if (!foundElement) {
				break;
			}
		}
	}

	traverseElement(reader: EBMLReader): boolean {
		const header = reader.readElementHeader();
		if (!header) {
			return false;
		}

		const { id, size } = header;
		const dataStartPos = reader.pos;
		assertDefinedSize(size);

		switch (id) {
			case EBMLId.DocType: {
				this.isWebM = reader.readAsciiString(size) === 'webm';
			}; break;

			case EBMLId.Seek: {
				if (!this.currentSegment) break;
				const seekEntry: SeekEntry = { id: -1, segmentPosition: -1 };
				this.currentSegment.seekEntries.push(seekEntry);
				this.readContiguousElements(reader, size);

				if (seekEntry.id === -1 || seekEntry.segmentPosition === -1) {
					this.currentSegment.seekEntries.pop();
				}
			}; break;

			case EBMLId.SeekID: {
				const lastSeekEntry = this.currentSegment?.seekEntries[this.currentSegment.seekEntries.length - 1];
				if (!lastSeekEntry) break;

				lastSeekEntry.id = reader.readUnsignedInt(size);
			}; break;

			case EBMLId.SeekPosition: {
				const lastSeekEntry = this.currentSegment?.seekEntries[this.currentSegment.seekEntries.length - 1];
				if (!lastSeekEntry) break;

				lastSeekEntry.segmentPosition = reader.readUnsignedInt(size);
			}; break;

			case EBMLId.TimestampScale: {
				if (!this.currentSegment) break;

				this.currentSegment.timestampScale = reader.readUnsignedInt(size);
				this.currentSegment.timestampFactor = 1e9 / this.currentSegment.timestampScale;
			}; break;

			case EBMLId.Duration: {
				if (!this.currentSegment) break;

				this.currentSegment.duration = reader.readFloat(size);
			}; break;

			case EBMLId.TrackEntry: {
				if (!this.currentSegment) break;

				this.currentTrack = {
					id: -1,
					segment: this.currentSegment,
					demuxer: this,
					clusters: [],
					clustersWithKeyFrame: [],
					cuePoints: [],

					isDefault: false,
					inputTrack: null,
					codecId: null,
					codecPrivate: null,
					defaultDuration: null,
					languageCode: UNDETERMINED_LANGUAGE,
					info: null,
				};

				this.readContiguousElements(reader, size);

				if (
					this.currentTrack
					&& this.currentTrack.id !== -1
					&& this.currentTrack.codecId
					&& this.currentTrack.info
				) {
					const slashIndex = this.currentTrack.codecId.indexOf('/');
					const codecIdWithoutSuffix = slashIndex === -1
						? this.currentTrack.codecId
						: this.currentTrack.codecId.slice(0, slashIndex);

					if (
						this.currentTrack.info.type === 'video'
						&& this.currentTrack.info.width !== -1
						&& this.currentTrack.info.height !== -1
					) {
						if (this.currentTrack.codecId === CODEC_STRING_MAP.avc) {
							this.currentTrack.info.codec = 'avc';
							this.currentTrack.info.codecDescription = this.currentTrack.codecPrivate;
						} else if (this.currentTrack.codecId === CODEC_STRING_MAP.hevc) {
							this.currentTrack.info.codec = 'hevc';
							this.currentTrack.info.codecDescription = this.currentTrack.codecPrivate;
						} else if (codecIdWithoutSuffix === CODEC_STRING_MAP.vp8) {
							this.currentTrack.info.codec = 'vp8';
						} else if (codecIdWithoutSuffix === CODEC_STRING_MAP.vp9) {
							this.currentTrack.info.codec = 'vp9';
						} else if (codecIdWithoutSuffix === CODEC_STRING_MAP.av1) {
							this.currentTrack.info.codec = 'av1';
						}

						const videoTrack = this.currentTrack as InternalVideoTrack;
						const inputTrack = new InputVideoTrack(new MatroskaVideoTrackBacking(videoTrack));
						this.currentTrack.inputTrack = inputTrack;
						this.currentSegment.tracks.push(this.currentTrack);
					} else if (
						this.currentTrack.info.type === 'audio'
						&& this.currentTrack.info.numberOfChannels !== -1
						&& this.currentTrack.info.sampleRate !== -1
					) {
						if (codecIdWithoutSuffix === CODEC_STRING_MAP.aac) {
							this.currentTrack.info.codec = 'aac';
							this.currentTrack.info.aacCodecInfo = {
								isMpeg2: this.currentTrack.codecId.includes('MPEG2'),
							};
							this.currentTrack.info.codecDescription = this.currentTrack.codecPrivate;
						} else if (this.currentTrack.codecId === CODEC_STRING_MAP.mp3) {
							this.currentTrack.info.codec = 'mp3';
						} else if (codecIdWithoutSuffix === CODEC_STRING_MAP.opus) {
							this.currentTrack.info.codec = 'opus';
							this.currentTrack.info.codecDescription = this.currentTrack.codecPrivate;
						} else if (codecIdWithoutSuffix === CODEC_STRING_MAP.vorbis) {
							this.currentTrack.info.codec = 'vorbis';
							this.currentTrack.info.codecDescription = this.currentTrack.codecPrivate;
						} else if (codecIdWithoutSuffix === CODEC_STRING_MAP.flac) {
							this.currentTrack.info.codec = 'flac';
							this.currentTrack.info.codecDescription = this.currentTrack.codecPrivate;
						} else if (this.currentTrack.codecId === 'A_PCM/INT/LIT') {
							if (this.currentTrack.info.bitDepth === 8) {
								this.currentTrack.info.codec = 'pcm-u8';
							} else if (this.currentTrack.info.bitDepth === 16) {
								this.currentTrack.info.codec = 'pcm-s16';
							} else if (this.currentTrack.info.bitDepth === 24) {
								this.currentTrack.info.codec = 'pcm-s24';
							} else if (this.currentTrack.info.bitDepth === 32) {
								this.currentTrack.info.codec = 'pcm-s32';
							}
						} else if (this.currentTrack.codecId === 'A_PCM/INT/BIG') {
							if (this.currentTrack.info.bitDepth === 8) {
								this.currentTrack.info.codec = 'pcm-u8';
							} else if (this.currentTrack.info.bitDepth === 16) {
								this.currentTrack.info.codec = 'pcm-s16be';
							} else if (this.currentTrack.info.bitDepth === 24) {
								this.currentTrack.info.codec = 'pcm-s24be';
							} else if (this.currentTrack.info.bitDepth === 32) {
								this.currentTrack.info.codec = 'pcm-s32be';
							}
						} else if (this.currentTrack.codecId === 'A_PCM/FLOAT/IEEE') {
							if (this.currentTrack.info.bitDepth === 32) {
								this.currentTrack.info.codec = 'pcm-f32';
							} else if (this.currentTrack.info.bitDepth === 64) {
								this.currentTrack.info.codec = 'pcm-f64';
							}
						}

						const audioTrack = this.currentTrack as InternalAudioTrack;
						const inputTrack = new InputAudioTrack(new MatroskaAudioTrackBacking(audioTrack));
						this.currentTrack.inputTrack = inputTrack;
						this.currentSegment.tracks.push(this.currentTrack);
					}
				}

				this.currentTrack = null;
			}; break;

			case EBMLId.TrackNumber: {
				if (!this.currentTrack) break;

				this.currentTrack.id = reader.readUnsignedInt(size);
			}; break;

			case EBMLId.TrackType: {
				if (!this.currentTrack) break;

				const type = reader.readUnsignedInt(size);
				if (type === 1) {
					this.currentTrack.info = {
						type: 'video',
						width: -1,
						height: -1,
						rotation: 0,
						codec: null,
						codecDescription: null,
						colorSpace: null,
					};
				} else if (type === 2) {
					this.currentTrack.info = {
						type: 'audio',
						numberOfChannels: -1,
						sampleRate: -1,
						bitDepth: -1,
						codec: null,
						codecDescription: null,
						aacCodecInfo: null,
					};
				}
			}; break;

			case EBMLId.FlagEnabled: {
				if (!this.currentTrack) break;

				const enabled = reader.readUnsignedInt(size);
				if (!enabled) {
					this.currentSegment!.tracks.pop();
					this.currentTrack = null;
				}
			}; break;

			case EBMLId.FlagDefault: {
				if (!this.currentTrack) break;

				this.currentTrack.isDefault = !!reader.readUnsignedInt(size);
			}; break;

			case EBMLId.CodecID: {
				if (!this.currentTrack) break;

				this.currentTrack.codecId = reader.readAsciiString(size);
			}; break;

			case EBMLId.CodecPrivate: {
				if (!this.currentTrack) break;

				this.currentTrack.codecPrivate = reader.readBytes(size);
			}; break;

			case EBMLId.DefaultDuration: {
				if (!this.currentTrack) break;

				this.currentTrack.defaultDuration
					= this.currentTrack.segment.timestampFactor * reader.readUnsignedInt(size) / 1e9;
			}; break;

			case EBMLId.Language: {
				if (!this.currentTrack) break;

				this.currentTrack.languageCode = reader.readAsciiString(size);

				if (!isIso639Dash2LanguageCode(this.currentTrack.languageCode)) {
					this.currentTrack.languageCode = UNDETERMINED_LANGUAGE;
				}
			}; break;

			case EBMLId.Video: {
				if (this.currentTrack?.info?.type !== 'video') break;

				this.readContiguousElements(reader, size);
			}; break;

			case EBMLId.PixelWidth: {
				if (this.currentTrack?.info?.type !== 'video') break;

				this.currentTrack.info.width = reader.readUnsignedInt(size);
			}; break;

			case EBMLId.PixelHeight: {
				if (this.currentTrack?.info?.type !== 'video') break;

				this.currentTrack.info.height = reader.readUnsignedInt(size);
			}; break;

			case EBMLId.Colour: {
				if (this.currentTrack?.info?.type !== 'video') break;

				this.currentTrack.info.colorSpace = {};
				this.readContiguousElements(reader, size);
			}; break;

			case EBMLId.MatrixCoefficients: {
				if (this.currentTrack?.info?.type !== 'video' || !this.currentTrack.info.colorSpace) break;

				const matrixCoefficients = reader.readUnsignedInt(size);
				const mapped = MATRIX_COEFFICIENTS_MAP_INVERSE[matrixCoefficients] ?? null;
				this.currentTrack.info.colorSpace.matrix = mapped as VideoColorSpaceInit['matrix'];
			}; break;

			case EBMLId.Range: {
				if (this.currentTrack?.info?.type !== 'video' || !this.currentTrack.info.colorSpace) break;

				this.currentTrack.info.colorSpace.fullRange = reader.readUnsignedInt(size) === 2;
			}; break;

			case EBMLId.TransferCharacteristics: {
				if (this.currentTrack?.info?.type !== 'video' || !this.currentTrack.info.colorSpace) break;

				const transferCharacteristics = reader.readUnsignedInt(size);
				const mapped = TRANSFER_CHARACTERISTICS_MAP_INVERSE[transferCharacteristics] ?? null;
				this.currentTrack.info.colorSpace.transfer = mapped as VideoColorSpaceInit['transfer'];
			}; break;

			case EBMLId.Primaries: {
				if (this.currentTrack?.info?.type !== 'video' || !this.currentTrack.info.colorSpace) break;

				const primaries = reader.readUnsignedInt(size);
				const mapped = COLOR_PRIMARIES_MAP_INVERSE[primaries] ?? null;
				this.currentTrack.info.colorSpace.primaries = mapped as VideoColorSpaceInit['primaries'];
			}; break;

			case EBMLId.Projection: {
				if (this.currentTrack?.info?.type !== 'video') break;

				this.readContiguousElements(reader, size);
			}; break;

			case EBMLId.ProjectionPoseRoll: {
				if (this.currentTrack?.info?.type !== 'video') break;

				const rotation = reader.readFloat(size);
				const flippedRotation = -rotation; // Convert counter-clockwise to clockwise

				try {
					this.currentTrack.info.rotation = normalizeRotation(flippedRotation);
				} catch {
					// It wasn't a valid rotation
				}
			}; break;

			case EBMLId.Audio: {
				if (this.currentTrack?.info?.type !== 'audio') break;

				this.readContiguousElements(reader, size);
			}; break;

			case EBMLId.SamplingFrequency: {
				if (this.currentTrack?.info?.type !== 'audio') break;

				this.currentTrack.info.sampleRate = reader.readFloat(size);
			}; break;

			case EBMLId.Channels: {
				if (this.currentTrack?.info?.type !== 'audio') break;

				this.currentTrack.info.numberOfChannels = reader.readUnsignedInt(size);
			}; break;

			case EBMLId.BitDepth: {
				if (this.currentTrack?.info?.type !== 'audio') break;

				this.currentTrack.info.bitDepth = reader.readUnsignedInt(size);
			}; break;

			case EBMLId.CuePoint: {
				if (!this.currentSegment) break;

				this.readContiguousElements(reader, size);
				this.currentCueTime = null;
			}; break;

			case EBMLId.CueTime: {
				this.currentCueTime = reader.readUnsignedInt(size);
			}; break;

			case EBMLId.CueTrackPositions: {
				if (this.currentCueTime === null) break;
				assert(this.currentSegment);

				const cuePoint: CuePoint = { time: this.currentCueTime, trackId: -1, clusterPosition: -1 };
				this.currentSegment.cuePoints.push(cuePoint);
				this.readContiguousElements(reader, size);

				if (cuePoint.trackId === -1 || cuePoint.clusterPosition === -1) {
					this.currentSegment.cuePoints.pop();
				}
			}; break;

			case EBMLId.CueTrack: {
				const lastCuePoint = this.currentSegment?.cuePoints[this.currentSegment.cuePoints.length - 1];
				if (!lastCuePoint) break;

				lastCuePoint.trackId = reader.readUnsignedInt(size);
			}; break;

			case EBMLId.CueClusterPosition: {
				const lastCuePoint = this.currentSegment?.cuePoints[this.currentSegment.cuePoints.length - 1];
				if (!lastCuePoint) break;

				assert(this.currentSegment);
				lastCuePoint.clusterPosition = this.currentSegment.dataStartPos + reader.readUnsignedInt(size);
			}; break;

			case EBMLId.Timestamp: {
				if (!this.currentCluster) break;

				this.currentCluster.timestamp = reader.readUnsignedInt(size);
			}; break;

			case EBMLId.SimpleBlock: {
				if (!this.currentCluster) break;

				const trackNumber = reader.readVarInt();
				if (trackNumber === null) break;

				const relativeTimestamp = reader.readS16();

				const flags = reader.readU8();
				const isKeyFrame = !!(flags & 0x80);
				const lacing = (flags >> 1) & 0x3 as BlockLacing; // If the block is laced, we'll expand it later

				const trackData = this.getTrackDataInCluster(this.currentCluster, trackNumber);
				trackData.blocks.push({
					timestamp: relativeTimestamp, // We'll add the cluster's timestamp to this later
					duration: 0, // Will set later
					isKeyFrame,
					referencedTimestamps: [],
					data: reader.readBytes(size - (reader.pos - dataStartPos)),
					lacing,
				});
			}; break;

			case EBMLId.BlockGroup: {
				if (!this.currentCluster) break;

				this.readContiguousElements(reader, size);

				if (this.currentBlock) {
					for (let i = 0; i < this.currentBlock.referencedTimestamps.length; i++) {
						this.currentBlock.referencedTimestamps[i]! += this.currentBlock.timestamp;
					}

					this.currentBlock = null;
				}
			}; break;

			case EBMLId.Block: {
				if (!this.currentCluster) break;

				const trackNumber = reader.readVarInt();
				if (trackNumber === null) break;

				const relativeTimestamp = reader.readS16();

				const flags = reader.readU8();
				const lacing = (flags >> 1) & 0x3 as BlockLacing; // If the block is laced, we'll expand it later

				const trackData = this.getTrackDataInCluster(this.currentCluster, trackNumber);
				this.currentBlock = {
					timestamp: relativeTimestamp, // We'll add the cluster's timestamp to this later
					duration: 0, // Will set later
					isKeyFrame: true,
					referencedTimestamps: [],
					data: reader.readBytes(size - (reader.pos - dataStartPos)),
					lacing,
				};
				trackData.blocks.push(this.currentBlock);
			}; break;

			case EBMLId.BlockDuration: {
				if (!this.currentBlock) break;

				this.currentBlock.duration = reader.readUnsignedInt(size);
			}; break;

			case EBMLId.ReferenceBlock: {
				if (!this.currentBlock) break;

				this.currentBlock.isKeyFrame = false;

				const relativeTimestamp = reader.readSignedInt(size);

				// We'll offset this by the block's timestamp later
				this.currentBlock.referencedTimestamps.push(relativeTimestamp);
			}; break;
		}

		reader.pos = dataStartPos + size;
		return true;
	}
}

abstract class MatroskaTrackBacking implements InputTrackBacking {
	packetToClusterLocation = new WeakMap<EncodedPacket, {
		cluster: Cluster;
		blockIndex: number;
	}>();

	constructor(public internalTrack: InternalTrack) {}

	getId() {
		return this.internalTrack.id;
	}

	getCodec(): MediaCodec | null {
		throw new Error('Not implemented on base class.');
	}

	async computeDuration() {
		const lastPacket = await this.getPacket(Infinity, { metadataOnly: true });
		return (lastPacket?.timestamp ?? 0) + (lastPacket?.duration ?? 0);
	}

	getLanguageCode() {
		return this.internalTrack.languageCode;
	}

	async getFirstTimestamp() {
		const firstPacket = await this.getFirstPacket({ metadataOnly: true });
		return firstPacket?.timestamp ?? 0;
	}

	getTimeResolution() {
		return this.internalTrack.segment.timestampFactor;
	}

	async getFirstPacket(options: PacketRetrievalOptions) {
		return this.performClusterLookup(
			() => {
				const startCluster = this.internalTrack.segment.clusters[0] ?? null;
				if (startCluster?.isKnownToBeFirstCluster) {
					// Walk from the very first cluster in the file until we find one with our track in it
					let currentCluster: Cluster | null = startCluster;
					while (currentCluster) {
						const trackData = currentCluster.trackData.get(this.internalTrack.id);
						if (trackData) {
							return {
								clusterIndex: binarySearchExact(
									this.internalTrack.clusters,
									currentCluster.elementStartPos,
									x => x.elementStartPos,
								),
								blockIndex: 0,
								correctBlockFound: true,
							};
						}

						currentCluster = currentCluster.nextCluster;
					}
				}

				return {
					clusterIndex: -1,
					blockIndex: -1,
					correctBlockFound: false,
				};
			},
			-Infinity, // Use -Infinity as a search timestamp to avoid using the cues
			Infinity,
			options,
		);
	}

	private intoTimescale(timestamp: number) {
		// Do a little rounding to catch cases where the result is very close to an integer. If it is, it's likely
		// that the number was originally an integer divided by the timescale. For stability, it's best
		// to return the integer in this case.
		return roundToPrecision(timestamp * this.internalTrack.segment.timestampFactor, 14);
	}

	async getPacket(timestamp: number, options: PacketRetrievalOptions) {
		const timestampInTimescale = this.intoTimescale(timestamp);

		return this.performClusterLookup(
			() => this.findBlockInClustersForTimestamp(timestampInTimescale),
			timestampInTimescale,
			timestampInTimescale,
			options,
		);
	}

	async getNextPacket(packet: EncodedPacket, options: PacketRetrievalOptions) {
		const locationInCluster = this.packetToClusterLocation.get(packet);
		if (locationInCluster === undefined) {
			throw new Error('Packet was not created from this track.');
		}

		const trackData = locationInCluster.cluster.trackData.get(this.internalTrack.id)!;

		const clusterIndex = binarySearchExact(
			this.internalTrack.clusters,
			locationInCluster.cluster.elementStartPos,
			x => x.elementStartPos,
		);
		assert(clusterIndex !== -1);

		return this.performClusterLookup(
			() => {
				if (locationInCluster.blockIndex + 1 < trackData.blocks.length) {
					// We can simply take the next block in the cluster
					return {
						clusterIndex,
						blockIndex: locationInCluster.blockIndex + 1,
						correctBlockFound: true,
					};
				} else {
					// Walk the list of clusters until we find the next cluster for this track
					let currentCluster = locationInCluster.cluster;
					while (currentCluster.nextCluster) {
						currentCluster = currentCluster.nextCluster;

						const trackData = currentCluster.trackData.get(this.internalTrack.id);
						if (trackData) {
							const clusterIndex = binarySearchExact(
								this.internalTrack.clusters,
								currentCluster.elementStartPos,
								x => x.elementStartPos,
							);
							assert(clusterIndex !== -1);

							return {
								clusterIndex,
								blockIndex: 0,
								correctBlockFound: true,
							};
						}
					}

					return {
						clusterIndex,
						blockIndex: -1,
						correctBlockFound: false,
					};
				}
			},
			-Infinity, // Use -Infinity as a search timestamp to avoid using the cues
			Infinity,
			options,
		);
	}

	async getKeyPacket(timestamp: number, options: PacketRetrievalOptions) {
		const timestampInTimescale = this.intoTimescale(timestamp);

		return this.performClusterLookup(
			() => this.findKeyBlockInClustersForTimestamp(timestampInTimescale),
			timestampInTimescale,
			timestampInTimescale,
			options,
		);
	}

	async getNextKeyPacket(packet: EncodedPacket, options: PacketRetrievalOptions) {
		const locationInCluster = this.packetToClusterLocation.get(packet);
		if (locationInCluster === undefined) {
			throw new Error('Packet was not created from this track.');
		}

		const trackData = locationInCluster.cluster.trackData.get(this.internalTrack.id)!;

		const clusterIndex = binarySearchExact(
			this.internalTrack.clusters,
			locationInCluster.cluster.elementStartPos,
			x => x.elementStartPos,
		);
		assert(clusterIndex !== -1);

		return this.performClusterLookup(
			() => {
				const nextKeyFrameIndex = trackData.blocks.findIndex(
					(x, i) => x.isKeyFrame && i > locationInCluster.blockIndex,
				);

				if (nextKeyFrameIndex !== -1) {
					// We can simply take the next key frame in the cluster
					return {
						clusterIndex,
						blockIndex: nextKeyFrameIndex,
						correctBlockFound: true,
					};
				} else {
					// Walk the list of clusters until we find the next cluster for this track with a key frame
					let currentCluster = locationInCluster.cluster;
					while (currentCluster.nextCluster) {
						currentCluster = currentCluster.nextCluster;

						const trackData = currentCluster.trackData.get(this.internalTrack.id);
						if (trackData && trackData.firstKeyFrameTimestamp !== null) {
							const clusterIndex = binarySearchExact(
								this.internalTrack.clusters,
								currentCluster.elementStartPos,
								x => x.elementStartPos,
							);
							assert(clusterIndex !== -1);

							const keyFrameIndex = trackData.blocks.findIndex(x => x.isKeyFrame);
							assert(keyFrameIndex !== -1); // There must be one

							return {
								clusterIndex,
								blockIndex: keyFrameIndex,
								correctBlockFound: true,
							};
						}
					}

					return {
						clusterIndex,
						blockIndex: -1,
						correctBlockFound: false,
					};
				}
			},
			-Infinity, // Use -Infinity as a search timestamp to avoid using the cues
			Infinity,
			options,
		);
	}

	private async fetchPacketInCluster(cluster: Cluster, blockIndex: number, options: PacketRetrievalOptions) {
		if (blockIndex === -1) {
			return null;
		}

		const trackData = cluster.trackData.get(this.internalTrack.id)!;
		const block = trackData.blocks[blockIndex];
		assert(block);

		const data = options.metadataOnly ? PLACEHOLDER_DATA : block.data;
		const timestamp = block.timestamp / this.internalTrack.segment.timestampFactor;
		const duration = block.duration / this.internalTrack.segment.timestampFactor;
		const packet = new EncodedPacket(
			data,
			block.isKeyFrame ? 'key' : 'delta',
			timestamp,
			duration,
			cluster.dataStartPos + blockIndex,
			block.data.byteLength,
		);

		this.packetToClusterLocation.set(packet, { cluster, blockIndex });

		return packet;
	}

	private findBlockInClustersForTimestamp(timestampInTimescale: number) {
		const clusterIndex = binarySearchLessOrEqual(
			// This array is technically not sorted by start timestamp, but for any reasonable file, it basically is.
			this.internalTrack.clusters,
			timestampInTimescale,
			x => x.trackData.get(this.internalTrack.id)!.startTimestamp,
		);
		let blockIndex = -1;
		let correctBlockFound = false;

		if (clusterIndex !== -1) {
			const cluster = this.internalTrack.clusters[clusterIndex]!;
			const trackData = cluster.trackData.get(this.internalTrack.id)!;

			const index = binarySearchLessOrEqual(
				trackData.presentationTimestamps,
				timestampInTimescale,
				x => x.timestamp,
			);
			assert(index !== -1);

			blockIndex = trackData.presentationTimestamps[index]!.blockIndex;
			correctBlockFound = timestampInTimescale < trackData.endTimestamp;
		}

		return { clusterIndex, blockIndex, correctBlockFound };
	}

	private findKeyBlockInClustersForTimestamp(timestampInTimescale: number) {
		const indexInKeyFrameClusters = binarySearchLessOrEqual(
			// This array is technically not sorted by start timestamp, but for any reasonable file, it basically is.
			this.internalTrack.clustersWithKeyFrame,
			timestampInTimescale,
			x => x.trackData.get(this.internalTrack.id)!.firstKeyFrameTimestamp!,
		);

		let clusterIndex = -1;
		let blockIndex = -1;
		let correctBlockFound = false;

		if (indexInKeyFrameClusters !== -1) {
			const cluster = this.internalTrack.clustersWithKeyFrame[indexInKeyFrameClusters]!;

			// Now, let's find the actual index of the cluster in the list of ALL clusters, not just key frame ones
			clusterIndex = binarySearchExact(
				this.internalTrack.clusters,
				cluster.elementStartPos,
				x => x.elementStartPos,
			);
			assert(clusterIndex !== -1);

			const trackData = cluster.trackData.get(this.internalTrack.id)!;
			const index = findLastIndex(trackData.presentationTimestamps, (x) => {
				const block = trackData.blocks[x.blockIndex]!;
				return block.isKeyFrame && x.timestamp <= timestampInTimescale;
			});
			assert(index !== -1); // It's a key frame cluster, so there must be a key frame

			const entry = trackData.presentationTimestamps[index]!;
			blockIndex = entry.blockIndex;
			correctBlockFound = timestampInTimescale < trackData.endTimestamp;
		}

		return { clusterIndex, blockIndex, correctBlockFound };
	}

	/** Looks for a packet in the clusters while trying to load as few clusters as possible to retrieve it. */
	private async performClusterLookup(
		// This function returns the best-matching block that is currently loaded. Based on this information, we know
		// which clusters we need to load to find the actual match.
		getBestMatch: () => { clusterIndex: number; blockIndex: number; correctBlockFound: boolean },
		// The timestamp with which we can search the lookup table
		searchTimestamp: number,
		// The timestamp for which we know the correct block will not come after it
		latestTimestamp: number,
		options: PacketRetrievalOptions,
	): Promise<EncodedPacket | null> {
		const { demuxer, segment } = this.internalTrack;
		const release = await segment.clusterLookupMutex.acquire(); // The algorithm requires exclusivity

		try {
			const { clusterIndex, blockIndex, correctBlockFound } = getBestMatch();
			if (correctBlockFound) {
				// The correct block already exists, easy path.
				const cluster = this.internalTrack.clusters[clusterIndex]!;
				return this.fetchPacketInCluster(cluster, blockIndex, options);
			}

			// We use the metadata reader to find the cluster, but the cluster reader to load the cluster
			const metadataReader = demuxer.metadataReader;
			const clusterReader = demuxer.clusterReader;

			let prevCluster: Cluster | null = null;
			let bestClusterIndex = clusterIndex;
			let bestBlockIndex = blockIndex;

			// Search for a cue point; this way, we won't need to start searching from the start of the file
			// but can jump right into the correct cluster (or at least nearby).
			const cuePointIndex = binarySearchLessOrEqual(
				this.internalTrack.cuePoints,
				searchTimestamp,
				x => x.time,
			);
			const cuePoint = cuePointIndex !== -1 ? this.internalTrack.cuePoints[cuePointIndex]! : null;

			let nextClusterIsFirstCluster = false;

			if (clusterIndex === -1) {
				metadataReader.pos = cuePoint?.clusterPosition ?? segment.clusterSeekStartPos;
				nextClusterIsFirstCluster = metadataReader.pos === segment.clusterSeekStartPos;
			} else {
				const cluster = this.internalTrack.clusters[clusterIndex]!;

				if (!cuePoint || cluster.elementStartPos >= cuePoint.clusterPosition) {
					metadataReader.pos = cluster.elementEndPos;
					prevCluster = cluster;
				} else {
					// Use the lookup entry
					metadataReader.pos = cuePoint.clusterPosition;
				}
			}

			while (metadataReader.pos <= segment.elementEndPos - MIN_HEADER_SIZE) {
				if (prevCluster) {
					const trackData = prevCluster.trackData.get(this.internalTrack.id);
					if (trackData && trackData.startTimestamp > latestTimestamp) {
						// We're already past the upper bound, no need to keep searching
						break;
					}

					if (prevCluster.nextCluster) {
						// Skip ahead quickly without needing to read the file again
						metadataReader.pos = prevCluster.nextCluster.elementEndPos;
						prevCluster = prevCluster.nextCluster;
						continue;
					}
				}

				// Load the header
				await metadataReader.reader.loadRange(metadataReader.pos, metadataReader.pos + MAX_HEADER_SIZE);
				const elementStartPos = metadataReader.pos;
				const elementHeader = metadataReader.readElementHeader();
				if (!elementHeader) {
					break;
				}

				const id = elementHeader.id;
				let size = elementHeader.size;
				const dataStartPos = metadataReader.pos;

				if (id === EBMLId.Cluster) {
					const index = binarySearchExact(segment.clusters, elementStartPos, x => x.elementStartPos);

					let cluster: Cluster;
					if (index === -1) {
						// This is the first time we've seen this cluster
						metadataReader.pos = elementStartPos;
						cluster = await demuxer.readCluster(segment);
					} else {
						// We already know this cluster
						cluster = segment.clusters[index]!;
					}

					// Even if we already know the cluster, we might not yet know its predecessor, so always do this
					if (prevCluster) prevCluster.nextCluster = cluster;
					prevCluster = cluster;

					if (nextClusterIsFirstCluster) {
						cluster.isKnownToBeFirstCluster = true;
						nextClusterIsFirstCluster = false;
					}

					const { clusterIndex, blockIndex, correctBlockFound } = getBestMatch();
					if (correctBlockFound) {
						const cluster = this.internalTrack.clusters[clusterIndex]!;
						return this.fetchPacketInCluster(cluster, blockIndex, options);
					}
					if (clusterIndex !== -1) {
						bestClusterIndex = clusterIndex;
						bestBlockIndex = blockIndex;
					}
				}

				if (size === null) {
					// Undefined element size (can happen in livestreamed files). In this case, we need to do some
					// searching to determine the actual size of the element.

					if (id === EBMLId.Cluster) {
						// The cluster should have already computed its length, we can just copy that result
						assert(prevCluster);
						size = prevCluster.elementEndPos - dataStartPos;
					} else {
						// Search for the next element at level 0 or 1
						clusterReader.pos = dataStartPos;
						const nextElementPos = await clusterReader.searchForNextElementId(
							LEVEL_0_AND_1_EBML_IDS,
							segment.elementEndPos,
						);

						size = (nextElementPos ?? segment.elementEndPos) - dataStartPos;
					}

					const endPos = dataStartPos + size;
					if (endPos > segment.elementEndPos - MIN_HEADER_SIZE) {
						// No more elements fit in this segment
						break;
					} else {
						// Check the next element. If it's a new segment, we know this segment ends here. The new
						// segment is just ignored, since we're likely in a livestreamed file and thus only care about
						// the first segment.
						clusterReader.pos = endPos;
						const elementId = clusterReader.readElementId();
						if (elementId === EBMLId.Segment) {
							segment.elementEndPos = endPos;
							break;
						}
					}
				}

				metadataReader.pos = dataStartPos + size;
			}

			let result: EncodedPacket | null = null;
			const bestCluster = bestClusterIndex !== -1 ? this.internalTrack.clusters[bestClusterIndex]! : null;
			if (bestCluster) {
				// If we finished looping but didn't find a perfect match, still return the best match we found
				result = await this.fetchPacketInCluster(bestCluster, bestBlockIndex, options);
			}

			// Catch faulty cue points
			if (!result && cuePoint && (!bestCluster || bestCluster.elementStartPos < cuePoint.clusterPosition)) {
				// The cue point lied to us! We found a cue point but no cluster there that satisfied the match. In this
				// case, let's search again but using the cue point before that.
				const previousCuePoint = this.internalTrack.cuePoints[cuePointIndex - 1];
				const newSearchTimestamp = previousCuePoint?.time ?? -Infinity;
				return this.performClusterLookup(getBestMatch, newSearchTimestamp, latestTimestamp, options);
			}

			return result;
		} finally {
			release();
		}
	}
}

class MatroskaVideoTrackBacking extends MatroskaTrackBacking implements InputVideoTrackBacking {
	override internalTrack: InternalVideoTrack;
	decoderConfigPromise: Promise<VideoDecoderConfig> | null = null;

	constructor(internalTrack: InternalVideoTrack) {
		super(internalTrack);
		this.internalTrack = internalTrack;
	}

	override getCodec(): VideoCodec | null {
		return this.internalTrack.info.codec;
	}

	getCodedWidth() {
		return this.internalTrack.info.width;
	}

	getCodedHeight() {
		return this.internalTrack.info.height;
	}

	getRotation() {
		return this.internalTrack.info.rotation;
	}

	async getColorSpace(): Promise<VideoColorSpaceInit> {
		return {
			primaries: this.internalTrack.info.colorSpace?.primaries,
			transfer: this.internalTrack.info.colorSpace?.transfer,
			matrix: this.internalTrack.info.colorSpace?.matrix,
			fullRange: this.internalTrack.info.colorSpace?.fullRange,
		};
	}

	async getDecoderConfig(): Promise<VideoDecoderConfig | null> {
		if (!this.internalTrack.info.codec) {
			return null;
		}

		return this.decoderConfigPromise ??= (async (): Promise<VideoDecoderConfig> => {
			let firstPacket: EncodedPacket | null = null;
			const needsPacketForAdditionalInfo
				= this.internalTrack.info.codec === 'vp9'
					|| this.internalTrack.info.codec === 'av1'
					// Packets are in Annex B format:
					|| (this.internalTrack.info.codec === 'avc' && !this.internalTrack.info.codecDescription)
					// Packets are in Annex B format:
					|| (this.internalTrack.info.codec === 'hevc' && !this.internalTrack.info.codecDescription);

			if (needsPacketForAdditionalInfo) {
				firstPacket = await this.getFirstPacket({});
			}

			return {
				codec: extractVideoCodecString({
					width: this.internalTrack.info.width,
					height: this.internalTrack.info.height,
					codec: this.internalTrack.info.codec,
					codecDescription: this.internalTrack.info.codecDescription,
					colorSpace: this.internalTrack.info.colorSpace,
					avcCodecInfo: this.internalTrack.info.codec === 'avc' && firstPacket
						? extractAvcDecoderConfigurationRecord(firstPacket.data)
						: null,
					hevcCodecInfo: this.internalTrack.info.codec === 'hevc' && firstPacket
						? extractHevcDecoderConfigurationRecord(firstPacket.data)
						: null,
					vp9CodecInfo: this.internalTrack.info.codec === 'vp9' && firstPacket
						? extractVp9CodecInfoFromPacket(firstPacket.data)
						: null,
					av1CodecInfo: this.internalTrack.info.codec === 'av1' && firstPacket
						? extractAv1CodecInfoFromPacket(firstPacket.data)
						: null,
				}),
				codedWidth: this.internalTrack.info.width,
				codedHeight: this.internalTrack.info.height,
				description: this.internalTrack.info.codecDescription ?? undefined,
				colorSpace: this.internalTrack.info.colorSpace ?? undefined,
			};
		})();
	}
}

class MatroskaAudioTrackBacking extends MatroskaTrackBacking implements InputAudioTrackBacking {
	override internalTrack: InternalAudioTrack;
	decoderConfig: AudioDecoderConfig | null = null;

	constructor(internalTrack: InternalAudioTrack) {
		super(internalTrack);
		this.internalTrack = internalTrack;
	}

	override getCodec(): AudioCodec | null {
		return this.internalTrack.info.codec;
	}

	getNumberOfChannels() {
		return this.internalTrack.info.numberOfChannels;
	}

	getSampleRate() {
		return this.internalTrack.info.sampleRate;
	}

	async getDecoderConfig(): Promise<AudioDecoderConfig | null> {
		if (!this.internalTrack.info.codec) {
			return null;
		}

		return this.decoderConfig ??= {
			codec: extractAudioCodecString({
				codec: this.internalTrack.info.codec,
				codecDescription: this.internalTrack.info.codecDescription,
				aacCodecInfo: this.internalTrack.info.aacCodecInfo,
			}),
			numberOfChannels: this.internalTrack.info.numberOfChannels,
			sampleRate: this.internalTrack.info.sampleRate,
			description: this.internalTrack.info.codecDescription ?? undefined,
		};
	}
}

/** Sorts blocks such that referenced blocks come before the blocks that reference them. */
const sortBlocksByReferences = (blocks: ClusterBlock[]) => {
	const timestampToBlock = new Map<number, ClusterBlock>();

	for (let i = 0; i < blocks.length; i++) {
		const block = blocks[i]!;
		timestampToBlock.set(block.timestamp, block);
	}

	const processedBlocks = new Set<ClusterBlock>();
	const result: ClusterBlock[] = [];

	const processBlock = (block: ClusterBlock) => {
		if (processedBlocks.has(block)) {
			return;
		}

		// Marking the block as processed here already; prevents this algorithm from dying on cycles
		processedBlocks.add(block);

		for (let j = 0; j < block.referencedTimestamps.length; j++) {
			const timestamp = block.referencedTimestamps[j]!;
			const otherBlock = timestampToBlock.get(timestamp);
			if (!otherBlock) {
				continue;
			}

			processBlock(otherBlock);
		}

		result.push(block);
	};

	for (let i = 0; i < blocks.length; i++) {
		processBlock(blocks[i]!);
	}

	return result;
};
