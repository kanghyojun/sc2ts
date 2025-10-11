// Protocol System Types

import type z from "zod";

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ProtocolDecoder {
  version: SupportProtocolVersion;
  decodeReplayHeader(data: Buffer): any;
  decodeReplayDetails(data: Buffer): any;
  decodeReplayInitdata(data: Buffer): any;
  decodeReplayGameEvents(data: Buffer): any[];
  decodeReplayMessageEvents(data: Buffer): any[];
  decodeReplayTrackerEvents?(data: Buffer): any[];
  decodeReplayAttributesEvents(data: Buffer): any;
}

interface BaseTypeInfo {
  type: string;
}

export interface IntTypeInfo extends BaseTypeInfo {
  type: "_int";
  args: [number | bigint, number][];
}

export interface StructTypeInfo extends BaseTypeInfo {
  type: "_struct";
  args: [string, number, number][][];
}

export interface BlobTypeInfo extends BaseTypeInfo {
  type: "_blob";
  args: [number, number][];
}

export interface BoolTypeInfo extends BaseTypeInfo {
  type: "_bool";
  args: [];
}

export interface OptionalTypeInfo extends BaseTypeInfo {
  type: "_optional";
  args: [number];
}

interface ArrayTypeInfo extends BaseTypeInfo {
  type: "_array";
  args: [[number, number], number];
}

interface ChoiceTypeInfo extends BaseTypeInfo {
  type: "_choice";
  args: [[number, number], Record<number, [string, number]>];
}

interface FourccTypeInfo extends BaseTypeInfo {
  type: "_fourcc";
  args: [];
}

interface NullTypeInfo extends BaseTypeInfo {
  type: "_null";
  args: [];
}

export interface BitarrayTypeInfo extends BaseTypeInfo {
  type: "_bitarray";
  args: [number, number][];
}

interface Real32TypeInfo extends BaseTypeInfo {
  type: "_real32";
  args: [];
}

interface Real64TypeInfo extends BaseTypeInfo {
  type: "_real64";
  args: [];
}

export type TypeInfo =
  | IntTypeInfo
  | StructTypeInfo
  | BlobTypeInfo
  | BoolTypeInfo
  | OptionalTypeInfo
  | ArrayTypeInfo
  | ChoiceTypeInfo
  | FourccTypeInfo
  | NullTypeInfo
  | BitarrayTypeInfo
  | Real32TypeInfo
  | Real64TypeInfo;


export type SupportProtocolVersion =
  | 80949
  | 81009
  | 81102
  | 81433
  | 82457
  | 83830
  | 84643
  | 88500
  | 88661
  | 90136
  | 92440
  | 93272
  | 93333
  | 94137
  | 95248
  | 95299;

export interface ZodTypeInfos {
  replayHeader: z.ZodType<any>;
  replayDetails: z.ZodType<any>;
  replayInitdata: z.ZodType<any>;
  replayGameEvents: z.ZodType<any>;
  replayMessageEvents: z.ZodType<any>;
  replayTrackerEvents: z.ZodType<any>;
  replayAttributesEvents: z.ZodType<any>;
}
