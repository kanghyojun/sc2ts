// MPQ (MoPaQ) Archive Parser Library with SC2 Replay Support
// Main entry point
import { MpqError } from "./errors";
import { configureLogger } from "./logger";
import { MpqArchive } from "./mpq-archive";
import { MpqReader } from "./mpq-reader";
import { VersionedDecoder, BitPackedBuffer } from "./protocol/sc2-decoder";
import { SC2Replay } from "./sc2-replay";

// Initialize logger on module load
// eslint-disable-next-line no-console
configureLogger().catch(console.error);

export { MpqArchive } from "./mpq-archive";
export { MpqReader } from "./mpq-reader";
export { SC2Replay } from "./sc2-replay";
export { VersionedDecoder, BitPackedBuffer } from "./protocol/sc2-decoder";
export { configureLogger } from "./logger";

export type {
  MpqHeader,
  MpqHashTableEntry,
  MpqBlockTableEntry,
  MpqFile,
  MpqParseOptions,
  ReplayHeader,
  ReplayDetails,
  Player,
  GameEvent,
  MessageEvent,
  TrackerEvent,
  ReplayInitData,
  ReplayData,
  ReplayOptions as SC2ReplayOptions,
} from "./types";

export { MpqError } from "./errors";

// Default export for convenience
export default {
  MpqArchive,
  MpqReader,
  SC2Replay,
  VersionedDecoder,
  BitPackedBuffer,
  configureLogger,
  MpqError,
};
