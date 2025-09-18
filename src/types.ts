// MPQ Archive Type Definitions

export interface MpqUserData {
  magic: number; // 'MPQ\x1B' (0x1B51504D)
  userDataSize: number; // Maximum size of the user data
  mpqHeaderOffset: number; // Offset to the MPQ header from start of file
  userDataHeaderSize: number; // Size of this header
}

export interface MpqHeader {
  magic: number;
  headerSize: number;
  archiveSize: number;
  formatVersion: number;
  blockSize: number;
  hashTablePos: number;
  blockTablePos: number;
  hashTableSize: number;
  blockTableSize: number;
  // Extended header fields for format version 2+
  hiBlockTablePos64?: bigint;
  hashTablePosHi?: number;
  blockTablePosHi?: number;
  // Extended header fields for format version 3+ (208-byte header)
  hetTablePos64?: bigint;
  betTablePos64?: bigint;
  hetTableSize64?: bigint;
  betTableSize64?: bigint;
  rawChunkSize?: number;
  blockTableArrayHash?: Buffer;
  hashTableArrayHash?: Buffer;
  betTableArrayHash?: Buffer;
  hetTableArrayHash?: Buffer;
  compressionLevel?: number;
}

export interface MpqHashTableEntry {
  name1: number;
  name2: number;
  locale: number;
  platform: number;
  blockIndex: number;
}

export interface MpqBlockTableEntry {
  filePos: number;
  compressedSize: number;
  fileSize: number;
  flags: number;
}

// HET/BET Table types for format version 3+
export interface HetTableHeader {
  signature: number; // 'HET\x1A'
  version: number;
  dataSize: number;
  tableSize: number;
  maxFileCount: number;
  hashTableSize: number;
  hashEntrySize: number;
  totalIndexSize: number;
  indexSizeExtra: number;
  indexSize: number;
  blockTableSize: number;
}

export interface BetTableHeader {
  signature: number; // 'BET\x1A'
  version: number;
  dataSize: number;
  tableSize: number;
  fileCount: number;
  unknown: number;
  tableEntrySize: number;
  bitIndexFilePos: number;
  bitIndexFileSize: number;
  bitIndexCmpSize: number;
  bitIndexFlagIndex: number;
  bitIndexNameHash2: number;
  bitCountFilePos: number;
  bitCountFileSize: number;
  bitCountCmpSize: number;
  bitCountFlagIndex: number;
  bitCountNameHash2: number;
  totalBetHashSize: number;
  betHashSizeExtra: number;
  betHashSize: number;
  betHashArraySize: number;
  flagCount: number;
}

export interface MpqFile {
  filename?: string;
  data: Buffer;
  compressedSize: number;
  fileSize: number;
  flags: number;
}

export interface MpqParseOptions {
  // Whether to decrypt protected files
  decrypt?: boolean;
  // Whether to decompress compressed files
  decompress?: boolean;
  // Whether to verify checksums
  verifyChecksums?: boolean;
  // List file content for resolving filenames
  listFile?: string;
}

// SC2 Replay Types
export interface SC2ReplayHeader {
  signature: string;
  version: {
    major: number;
    minor: number;
    revision: number;
    build: number;
  };
  length: number;
  crc32: number;
}

export interface SC2ReplayDetails {
  playerList: SC2Player[];
  title: string;
  difficulty: string;
  thumbnail: {
    file: string;
  };
  isBlizzardMap: boolean;
  timeUTC: number;
  timeLocalOffset: number;
  description: string;
  imageFilePath: string;
  campaignIndex: number;
  mapFileName: string;
  cacheHandles: string[];
  miniSave: boolean;
  gameSpeed: number;
  type: number;
  realTimeLength: number;
  mapSizeX: number;
  mapSizeY: number;
}

export interface SC2Player {
  name: string;
  type: number;
  race: string;
  difficulty: number;
  aiBuild: number;
  handicap: number;
  observe: number;
  result: number;
  workingSetSlotId: number;
  color: {
    a: number;
    r: number;
    g: number;
    b: number;
  };
  control: number;
  teamId: number;
  userId: number;
}

export interface SC2GameEvent {
  loop: number;
  userId: number;
  eventType: string;
  eventData: any;
}

export interface SC2MessageEvent {
  loop: number;
  userId: number;
  messageType: string;
  messageData: any;
}

export interface SC2TrackerEvent {
  loop: number;
  eventType: string;
  eventData: any;
}

export interface SC2ReplayInitData {
  gameDescription: {
    cacheHandles: string[];
    gameOptions: any;
    gameSpeed: number;
    gameCacheName: string;
    mapAuthorName: string;
  };
  lobbyState: {
    slots: any[];
  };
  syncLobbyState: {
    userInitialData: any[];
  };
}

export interface SC2ReplayData {
  header: SC2ReplayHeader;
  details: SC2ReplayDetails;
  initData: SC2ReplayInitData;
  gameEvents: SC2GameEvent[];
  messageEvents: SC2MessageEvent[];
  trackerEvents: SC2TrackerEvent[];
}

export interface SC2ReplayOptions {
  decodeGameEvents?: boolean;
  decodeMessageEvents?: boolean;
  decodeTrackerEvents?: boolean;
}

export enum MpqFileFlags {
  COMPRESSED = 0x00000200,
  ENCRYPTED = 0x00010000,
  SINGLE_UNIT = 0x01000000,
  DELETE_MARKER = 0x02000000,
  SECTOR_CRC = 0x04000000,
  EXISTS = 0x80000000
}

export enum MpqCompression {
  HUFFMAN = 0x01,
  ZLIB = 0x02,
  PKWARE = 0x08,
  BZIP2 = 0x10,
  SPARSE = 0x20,
  ADPCM_MONO = 0x40,
  ADPCM_STEREO = 0x80,
  LZMA = 0x12
}