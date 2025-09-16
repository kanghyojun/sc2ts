// MPQ (MoPaQ) Archive Parser Library with SC2 Replay Support
// Main entry point

export { MpqArchive } from './mpq-archive';
export { MpqReader } from './mpq-reader';
export { SC2Replay } from './sc2-replay';
export { VersionedDecoder, BitPackedBuffer } from './sc2-decoder';

export type {
  MpqHeader,
  MpqHashTableEntry,
  MpqBlockTableEntry,
  MpqFile,
  MpqParseOptions,
  SC2ReplayHeader,
  SC2ReplayDetails,
  SC2Player,
  SC2GameEvent,
  SC2MessageEvent,
  SC2TrackerEvent,
  SC2ReplayInitData,
  SC2ReplayData,
  SC2ReplayOptions
} from './types';

export { MpqError } from './errors';