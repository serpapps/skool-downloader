/*!
 * Copyright (c) 2025-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { InputVideoTrack } from './input-track';
import { EncodedPacket, PacketType } from './packet';
/** Converts an AVC packet in Annex B format to length-prefixed format. */
export declare const transformAnnexBToLengthPrefixed: (packetData: Uint8Array) => Uint8Array<ArrayBuffer> | null;
export type AvcDecoderConfigurationRecord = {
    configurationVersion: number;
    avcProfileIndication: number;
    profileCompatibility: number;
    avcLevelIndication: number;
    lengthSizeMinusOne: number;
    sequenceParameterSets: Uint8Array[];
    pictureParameterSets: Uint8Array[];
    chromaFormat: number | null;
    bitDepthLumaMinus8: number | null;
    bitDepthChromaMinus8: number | null;
    sequenceParameterSetExt: Uint8Array[] | null;
};
/** Builds an AvcDecoderConfigurationRecord from an AVC packet in Annex B format. */
export declare const extractAvcDecoderConfigurationRecord: (packetData: Uint8Array) => AvcDecoderConfigurationRecord | null;
/** Serializes an AvcDecoderConfigurationRecord into the format specified in Section 5.3.3.1 of ISO 14496-15. */
export declare const serializeAvcDecoderConfigurationRecord: (record: AvcDecoderConfigurationRecord) => Uint8Array<ArrayBuffer>;
export type HevcDecoderConfigurationRecord = {
    configurationVersion: number;
    generalProfileSpace: number;
    generalTierFlag: number;
    generalProfileIdc: number;
    generalProfileCompatibilityFlags: number;
    generalConstraintIndicatorFlags: Uint8Array;
    generalLevelIdc: number;
    minSpatialSegmentationIdc: number;
    parallelismType: number;
    chromaFormatIdc: number;
    bitDepthLumaMinus8: number;
    bitDepthChromaMinus8: number;
    avgFrameRate: number;
    constantFrameRate: number;
    numTemporalLayers: number;
    temporalIdNested: number;
    lengthSizeMinusOne: number;
    arrays: {
        arrayCompleteness: number;
        nalUnitType: number;
        nalUnits: Uint8Array[];
    }[];
};
/** Builds a HevcDecoderConfigurationRecord from an HEVC packet in Annex B format. */
export declare const extractHevcDecoderConfigurationRecord: (packetData: Uint8Array) => HevcDecoderConfigurationRecord | null;
/** Serializes an HevcDecoderConfigurationRecord into the format specified in Section 8.3.3.1 of ISO 14496-15. */
export declare const serializeHevcDecoderConfigurationRecord: (record: HevcDecoderConfigurationRecord) => Uint8Array<ArrayBuffer>;
export type Vp9CodecInfo = {
    profile: number;
    level: number;
    bitDepth: number;
    chromaSubsampling: number;
    videoFullRangeFlag: number;
    colourPrimaries: number;
    transferCharacteristics: number;
    matrixCoefficients: number;
};
export declare const extractVp9CodecInfoFromPacket: (packet: Uint8Array) => Vp9CodecInfo | null;
export type Av1CodecInfo = {
    profile: number;
    level: number;
    tier: number;
    bitDepth: number;
    monochrome: number;
    chromaSubsamplingX: number;
    chromaSubsamplingY: number;
    chromaSamplePosition: number;
};
/** Iterates over all OBUs in an AV1 packet bistream. */
export declare function iterateAv1PacketObus(packet: Uint8Array): Generator<{
    type: number;
    data: Uint8Array<ArrayBufferLike>;
}, void, unknown>;
/**
 * When AV1 codec information is not provided by the container, we can still try to extract the information by digging
 * into the AV1 bitstream.
 */
export declare const extractAv1CodecInfoFromPacket: (packet: Uint8Array) => Av1CodecInfo | null;
export declare const parseOpusIdentificationHeader: (bytes: Uint8Array) => {
    outputChannelCount: number;
    preSkip: number;
    inputSampleRate: number;
    outputGain: number;
    channelMappingFamily: number;
    channelMappingTable: Uint8Array<ArrayBufferLike> | null;
};
export declare const parseOpusTocByte: (packet: Uint8Array) => {
    durationInSamples: number;
};
export declare const parseModesFromVorbisSetupPacket: (setupHeader: Uint8Array) => {
    modeBlockflags: number[];
};
/** Determines a packet's type (key or delta) by digging into the packet bitstream. */
export declare const determineVideoPacketType: (videoTrack: InputVideoTrack, packet: EncodedPacket) => Promise<PacketType | null>;
//# sourceMappingURL=codec-data.d.ts.map