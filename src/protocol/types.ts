// Protocol System Types

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ProtocolDecoder {
  decode_replay_header(data: Buffer): any;
  decode_replay_details(data: Buffer): any;
  decode_replay_initdata(data: Buffer): any;
  decode_replay_game_events(data: Buffer): any[];
  decode_replay_message_events(data: Buffer): any[];
  decode_replay_tracker_events?(data: Buffer): any[];
  decode_replay_attributes_events(data: Buffer): any;
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
}