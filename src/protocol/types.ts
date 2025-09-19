// Protocol System Types

import type z from 'zod';

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

export interface SC2ReplayHeaderDecoded {
  signature: string;
  version: {
    major: number;
    minor: number;
    revision: number;
    build: number;
    baseBuild: number;
  };
  length: number;
  type: number;
  elapsedGameLoops: number;
  useScaledTime: boolean;
  dataBuildNum: number;
}export interface ZodTypeInfos {
  replayHeader: z.ZodTypeAny;
  replayDetails: z.ZodTypeAny;
  replayInitdata: z.ZodTypeAny;
  replayGameEvents: z.ZodTypeAny;
  replayMessageEvents: z.ZodTypeAny;
  replayTrackerEvents: z.ZodTypeAny;
  replayAttributesEvents: z.ZodTypeAny;
}
