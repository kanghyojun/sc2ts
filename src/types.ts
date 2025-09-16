// MPQ Archive Type Definitions

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