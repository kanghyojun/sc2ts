// MPQ Archive Reader Implementation

import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";

import { MpqInvalidFormatError } from "./errors";
import { getScLogger } from "./logger";
import type { MpqHeader, MpqUserData, MpqHashTableEntry, MpqBlockTableEntry, BetTableHeader, HetTableHeader } from "./types";

const logger = getScLogger("mpq-reader");

export class MpqReader {
  private buffer: Buffer;
  private offset = 0;

  constructor(buffer: Buffer) {
    this.buffer = buffer;
  }

  static async fromFile(filepath: string): Promise<MpqReader> {
    const buffer = await readFile(filepath);
    return new MpqReader(buffer);
  }

  readUInt32LE(): number {
    const value = this.buffer.readUInt32LE(this.offset);
    this.offset += 4;
    return value;
  }

  readUInt16LE(): number {
    const value = this.buffer.readUInt16LE(this.offset);
    this.offset += 2;
    return value;
  }

  readBytes(length: number): Buffer {
    const bytes = this.buffer.subarray(this.offset, this.offset + length);
    this.offset += length;
    return bytes;
  }

  seek(offset: number): void {
    this.offset = offset;
  }

  get position(): number {
    return this.offset;
  }

  get length(): number {
    return this.buffer.length;
  }

  findMpqHeader(): number {
    // Search for MPQ signature starting from current position
    const MPQ_SIGNATURES = [0x1A51504D, 0x1B51504D];

    for (let offset = this.offset; offset < this.buffer.length - 32; offset += 4) {
      const signature = this.buffer.readUInt32LE(offset);
      if (MPQ_SIGNATURES.includes(signature)) {

        if (signature === 0x1B51504D) {
          // User data header - validate as user data structure
          const tempOffset = this.offset;
          this.seek(offset);

          try {
            this.readUInt32LE(); // magic
            const userDataSize = this.readUInt32LE();
            const mpqHeaderOffset = this.readUInt32LE();
            const userDataHeaderSize = this.readUInt32LE();

            // Basic validation for user data structure
            const isValidUserData = (
              userDataSize >= 16 && userDataSize <= 0x100000 &&
              mpqHeaderOffset >= 16 && mpqHeaderOffset < this.buffer.length &&
              userDataHeaderSize >= 16 && userDataHeaderSize <= 1024
            );

            if (isValidUserData) {
              this.seek(tempOffset); // Restore original position
              return mpqHeaderOffset;
            }
          } catch {
            // Continue searching if we can't read the user data header
          }

          this.seek(tempOffset); // Restore position
        } else {
          // Direct MPQ header - validate as MPQ structure
          const tempOffset = this.offset;
          this.seek(offset);

          try {
            // Try to read header fields to see if they look reasonable
            this.readUInt32LE(); // magic
            const headerSize = this.readUInt32LE();
            const archiveSize = this.readUInt32LE();
            const formatVersion = this.readUInt16LE();
            this.readUInt16LE(); // blockSize
            const hashTablePos = this.readUInt32LE();
            const blockTablePos = this.readUInt32LE();

            // More strict validation for proper MPQ header
            const isValidHeader = (
              headerSize >= 32 && headerSize <= 1024 &&
              archiveSize > 0 &&
              formatVersion >= 0 && formatVersion <= 4 &&
              hashTablePos >= 0 && hashTablePos < archiveSize &&
              blockTablePos >= 0 && blockTablePos < archiveSize
            );

            if (isValidHeader) {
              this.seek(tempOffset); // Restore original position
              return offset;
            }
          } catch {
            // Continue searching if we can't read the header
          }

          this.seek(tempOffset); // Restore position
        }
      }
    }

    throw new MpqInvalidFormatError("No valid MPQ header found in file");
  }

  readMpqUserData(): MpqUserData {
    // Read MPQ user data header structure
    const magic = this.readUInt32LE();
    if (magic !== 0x1B51504D) {
      throw new MpqInvalidFormatError(`Invalid MPQ user data magic signature: 0x${magic.toString(16)}`);
    }

    return {
      magic,
      userDataSize: this.readUInt32LE(),
      mpqHeaderOffset: this.readUInt32LE(),
      userDataHeaderSize: this.readUInt32LE(),
    };
  }

  readMpqHeader(): MpqHeader {
    // Find the MPQ header first
    const headerOffset = this.findMpqHeader();
    this.seek(headerOffset);

    const startOffset = this.offset;

    // Read magic signature (MPQ\x1A or MPQ\x1B)
    const magic = this.readUInt32LE();
    if (magic !== 0x1A51504D && magic !== 0x1B51504D) {
      throw new MpqInvalidFormatError(`Invalid MPQ magic signature: 0x${magic.toString(16)}`);
    }

    // Handle user data header (MPQ\x1B)
    if (magic === 0x1B51504D) {
      // Reset to read the full user data header
      this.seek(headerOffset);
      const userData = this.readMpqUserData();
      logger.debug(`Header offset: ${headerOffset}, MPQ header offset: ${userData.mpqHeaderOffset.toString(16)}`);

      // Navigate to the actual MPQ header (relative to the begin of user data header)
      this.seek(headerOffset + userData.mpqHeaderOffset);
      const actualStartOffset = this.offset;

      // Read the actual MPQ header magic
      const actualMagic = this.readUInt32LE();
      if (actualMagic !== 0x1A51504D) {
        throw new MpqInvalidFormatError(`Invalid MPQ header magic at offset ${userData.mpqHeaderOffset}: 0x${actualMagic.toString(16)}`);
      }

      // Continue reading the actual MPQ header
      const headerSize = this.readUInt32LE();
      const archiveSize = this.readUInt32LE();
      const formatVersion = this.readUInt16LE();
      const blockSize = this.readUInt16LE();
      const hashTablePos = this.readUInt32LE();
      const blockTablePos = this.readUInt32LE();
      const hashTableSize = this.readUInt32LE();
      const blockTableSize = this.readUInt32LE();

      const header: MpqHeader = {
        magic: actualMagic,
        headerSize,
        archiveSize,
        formatVersion,
        blockSize,
        hashTablePos,
        blockTablePos,
        hashTableSize,
        blockTableSize,
      };
      logger.debug(`MPQ Header found at offset ${actualStartOffset.toString(16)}: ${JSON.stringify({
        magic: actualMagic.toString(16),
        headerSize: headerSize.toString(16),
        archiveSize: archiveSize.toString(16),
        formatVersion: formatVersion.toString(16),
        blockSize: blockSize.toString(16),
        hashTablePos: hashTablePos.toString(16),
        blockTablePos: blockTablePos.toString(16),
        hashTableSize: hashTableSize.toString(16),
        blockTableSize: blockTableSize.toString(16),
      })}`);

      // Read extended header for format version 2+
      if (formatVersion >= 2) {
        const hiBlockTablePosLow = this.readUInt32LE();
        const hiBlockTablePosHigh = this.readUInt32LE();
        header.hiBlockTablePos64 = BigInt(hiBlockTablePosHigh) << 32n | BigInt(hiBlockTablePosLow);
        header.hashTablePosHi = this.readUInt16LE();
        header.blockTablePosHi = this.readUInt16LE();
      }

      // Read extended header for format version 3+ (208-byte header)
      if (formatVersion >= 3 && headerSize >= 68) {
        // Additional fields for 208-byte header
        header.hetTablePos64 = BigInt(this.readUInt32LE()) << 32n | BigInt(this.readUInt32LE());
        header.betTablePos64 = BigInt(this.readUInt32LE()) << 32n | BigInt(this.readUInt32LE());
        header.hetTableSize64 = BigInt(this.readUInt32LE()) << 32n | BigInt(this.readUInt32LE());
        header.betTableSize64 = BigInt(this.readUInt32LE()) << 32n | BigInt(this.readUInt32LE());
        header.rawChunkSize = this.readUInt32LE();

        // Read MD5 hashes (16 bytes each)
        header.blockTableArrayHash = this.readBytes(16);
        header.hashTableArrayHash = this.readBytes(16);
        header.betTableArrayHash = this.readBytes(16);
        header.hetTableArrayHash = this.readBytes(16);

        // Skip to compression level if header is large enough
        if (headerSize >= 208) {
          // Skip remaining fields and read compression level
          const remainingBytes = headerSize - (this.offset - actualStartOffset);
          if (remainingBytes >= 4) {
            this.seek(actualStartOffset + headerSize - 4);
            header.compressionLevel = this.readUInt32LE();
          }
        }
      }

      // Reset to end of header
      this.seek(actualStartOffset + headerSize);
      return header;
    } else {
      // Handle direct MPQ header (MPQ\x1A)
      const headerSize = this.readUInt32LE();
      const archiveSize = this.readUInt32LE();
      const formatVersion = this.readUInt16LE();
      const blockSize = this.readUInt16LE();
      const hashTablePos = this.readUInt32LE();
      const blockTablePos = this.readUInt32LE();
      const hashTableSize = this.readUInt32LE();
      const blockTableSize = this.readUInt32LE();

      const header: MpqHeader = {
        magic,
        headerSize,
        archiveSize,
        formatVersion,
        blockSize,
        hashTablePos,
        blockTablePos,
        hashTableSize,
        blockTableSize,
      };

      // Read extended header for format version 2+
      if (formatVersion >= 2) {
        const hiBlockTablePosLow = this.readUInt32LE();
        const hiBlockTablePosHigh = this.readUInt32LE();
        header.hiBlockTablePos64 = BigInt(hiBlockTablePosHigh) << 32n | BigInt(hiBlockTablePosLow);
        header.hashTablePosHi = this.readUInt16LE();
        header.blockTablePosHi = this.readUInt16LE();
      }

      // Read extended header for format version 3+ (208-byte header)
      if (formatVersion >= 3 && headerSize >= 68) {
        // Additional fields for 208-byte header
        header.hetTablePos64 = BigInt(this.readUInt32LE()) << 32n | BigInt(this.readUInt32LE());
        header.betTablePos64 = BigInt(this.readUInt32LE()) << 32n | BigInt(this.readUInt32LE());
        header.hetTableSize64 = BigInt(this.readUInt32LE()) << 32n | BigInt(this.readUInt32LE());
        header.betTableSize64 = BigInt(this.readUInt32LE()) << 32n | BigInt(this.readUInt32LE());
        header.rawChunkSize = this.readUInt32LE();

        // Read MD5 hashes (16 bytes each)
        header.blockTableArrayHash = this.readBytes(16);
        header.hashTableArrayHash = this.readBytes(16);
        header.betTableArrayHash = this.readBytes(16);
        header.hetTableArrayHash = this.readBytes(16);

        // Skip to compression level if header is large enough
        if (headerSize >= 208) {
          // Skip remaining fields and read compression level
          const remainingBytes = headerSize - (this.offset - startOffset);
          if (remainingBytes >= 4) {
            this.seek(startOffset + headerSize - 4);
            header.compressionLevel = this.readUInt32LE();
          }
        }
      }

      // Reset to end of header
      this.seek(startOffset + headerSize);

      return header;
    }
  }

  private cryptTable: number[] = [];

  private initializeCryptTable(): void {
    if (this.cryptTable.length > 0) return;

    let seed = 0x00100001;

    for (let index1 = 0; index1 < 0x100; index1++) {
      for (let index2 = index1, i = 0; i < 5; i++, index2 += 0x100) {
        seed = (seed * 125 + 3) % 0x2AAAAB;
        const temp1 = (seed & 0xFFFF) << 0x10;
        seed = (seed * 125 + 3) % 0x2AAAAB;
        const temp2 = (seed & 0xFFFF);
        this.cryptTable[index2] = (temp1 | temp2) >>> 0;
      }
    }
  }

  private decrypt(data: Buffer, key: number): Buffer {
    this.initializeCryptTable();

    const result = Buffer.from(data); // Copy the data
    let seed1 = key;
    let seed2 = 0xEEEEEEEE;

    for (let i = 0; i < data.length; i += 4) {
      // Step 1: Update seed2 - exactly like mpyq
      seed2 = (seed2 + (this.cryptTable[0x400 + (seed1 & 0xFF)] ?? 0)) >>> 0;

      // Step 2: Read 4 bytes as little-endian 32-bit unsigned integer
      const value = data.readUInt32LE(i);

      // Step 3: XOR operation with seeds - exactly like mpyq
      const ch = (value ^ (seed1 + seed2)) >>> 0;

      // Step 4: Seed1 transformation - exactly like mpyq
      seed1 = (((~seed1 << 0x15) + 0x11111111) | (seed1 >>> 0x0B)) >>> 0;

      // Step 5: Seed2 transformation - exactly like mpyq
      seed2 = (ch + seed2 + (seed2 << 5) + 3) >>> 0;

      // Step 6: Write decrypted bytes back
      result.writeUInt32LE(ch, i);
    }

    return result;
  }

  readHashTableUnencrypted(offset: number, size: number, headerOffset = 0): MpqHashTableEntry[] {
    this.seek(headerOffset + offset);
    const rawData = this.readBytes(size * 16); // Each entry is 16 bytes

    const entries: MpqHashTableEntry[] = [];
    for (let i = 0; i < size; i++) {
      const entryOffset = i * 16;
      entries.push({
        name1: rawData.readUInt32LE(entryOffset),
        name2: rawData.readUInt32LE(entryOffset + 4),
        locale: rawData.readUInt16LE(entryOffset + 8),
        platform: rawData.readUInt16LE(entryOffset + 10),
        blockIndex: rawData.readUInt32LE(entryOffset + 12),
      });
    }

    return entries;
  }

  private hashString(str: string, hashType: number): number {
    this.initializeCryptTable();

    let seed1 = 0x7FED7FED;
    let seed2 = 0xEEEEEEEE;

    str = str.toUpperCase().replace(/\//g, "\\");

    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      const tableIndex = (hashType << 8) + ch;
      const cryptValue = this.cryptTable[tableIndex] ?? 0;
      seed1 = (cryptValue ^ (seed1 + seed2)) >>> 0;
      seed2 = (ch + seed1 + seed2 + (seed2 << 5) + 3) >>> 0;
    }

    return seed1;
  }

  readHashTable(offset: number, size: number, headerOffset = 0): MpqHashTableEntry[] {
    logger.debug(`Start readHashTable at ${(headerOffset + offset).toString(16)}, size: ${size * 16}`);
    this.seek(headerOffset + offset);
    const rawData = this.readBytes(size * 16); // Each entry is 16 bytes

    // Log raw data for debugging
    logger.debug(`Raw hash table data (first 32 bytes): ${rawData.subarray(0, 32).toString("hex")}`);

    // Decrypt the hash table using the standard MPQ key
    const key = this.hashString("(hash table)", 3);
    logger.debug(`Decryption key for "(hash table)": ${key.toString(16)}`);

    const decryptedData = this.decrypt(rawData, key);

    // Log decrypted data for debugging
    logger.debug(`Decrypted hash table data (first 32 bytes): ${decryptedData.subarray(0, 32).toString("hex")}`);
    const firstEntry = {
      name1: decryptedData.readUInt32LE(0),
      name2: decryptedData.readUInt32LE(4),
      locale: decryptedData.readUInt16LE(8),
      platform: decryptedData.readUInt16LE(10),
      blockIndex: decryptedData.readUInt32LE(12),
    };
    logger.debug(`First decrypted hash entry: ${JSON.stringify({
      name1: firstEntry.name1.toString(16),
      name2: firstEntry.name2.toString(16),
      locale: firstEntry.locale,
      platform: firstEntry.platform,
      blockIndex: firstEntry.blockIndex.toString(16),
    })}`);

    const entries: MpqHashTableEntry[] = [];
    for (let i = 0; i < size; i++) {
      const entryOffset = i * 16;

      // Parse according to struct format '2I2HI'
      // 2I = two unsigned ints (hash_a, hash_b)
      // 2H = two unsigned shorts (locale, platform)
      // I = one unsigned int (block_table_index)
      entries.push({
        name1: decryptedData.readUInt32LE(entryOffset),      // hash_a
        name2: decryptedData.readUInt32LE(entryOffset + 4),  // hash_b
        locale: decryptedData.readUInt16LE(entryOffset + 8), // locale
        platform: decryptedData.readUInt16LE(entryOffset + 10), // platform
        blockIndex: decryptedData.readUInt32LE(entryOffset + 12), // block_table_index
      });
    }

    return entries;
  }

  readBlockTable(offset: number, size: number, headerOffset = 0): MpqBlockTableEntry[] {
    this.seek(headerOffset + offset);
    const rawData = this.readBytes(size * 16); // Each entry is 16 bytes

    // Decrypt the block table using the standard MPQ key
    const key = this.hashString("(block table)", 3);
    const decryptedData = this.decrypt(rawData, key);

    const entries: MpqBlockTableEntry[] = [];
    for (let i = 0; i < size; i++) {
      const entryOffset = i * 16;

      // Parse according to struct format '4I' (4 unsigned ints)
      entries.push({
        filePos: decryptedData.readUInt32LE(entryOffset),
        compressedSize: decryptedData.readUInt32LE(entryOffset + 4),
        fileSize: decryptedData.readUInt32LE(entryOffset + 8),
        flags: decryptedData.readUInt32LE(entryOffset + 12),
      });
    }

    return entries;
  }

  readBlockTableUnencrypted(offset: number, size: number, headerOffset = 0): MpqBlockTableEntry[] {
    this.seek(headerOffset + offset);
    const rawData = this.readBytes(size * 16); // Each entry is 16 bytes

    const entries: MpqBlockTableEntry[] = [];
    for (let i = 0; i < size; i++) {
      const entryOffset = i * 16;
      entries.push({
        filePos: rawData.readUInt32LE(entryOffset),
        compressedSize: rawData.readUInt32LE(entryOffset + 4),
        fileSize: rawData.readUInt32LE(entryOffset + 8),
        flags: rawData.readUInt32LE(entryOffset + 12),
      });
    }

    return entries;
  }

  readHetTable(hetTablePos: number, hetTableSize: number, headerOffset = 0): HetTableHeader | null {
    if (hetTablePos === 0 || hetTableSize === 0) {
      return null; // No HET table
    }

    this.seek(headerOffset + Number(hetTablePos));

    // Read HET table header
    const signature = this.readUInt32LE();
    if (signature !== 0x1A544548) { // 'HET\x1A'
      logger.warn(`Invalid HET table signature: ${signature.toString(16)}`);
      return null;
    }

    const hetHeader = {
      signature,
      version: this.readUInt32LE(),
      dataSize: this.readUInt32LE(),
      tableSize: this.readUInt32LE(),
      maxFileCount: this.readUInt32LE(),
      hashTableSize: this.readUInt32LE(),
      hashEntrySize: this.readUInt32LE(),
      totalIndexSize: this.readUInt32LE(),
      indexSizeExtra: this.readUInt32LE(),
      indexSize: this.readUInt32LE(),
      blockTableSize: this.readUInt32LE(),
    };

    logger.debug(`HET Table found: ${JSON.stringify(hetHeader)}`);

    // TODO: Implement full HET table parsing
    // For now, return header info
    return hetHeader;
  }

  readBetTable(betTablePos: number, betTableSize: number, headerOffset = 0): BetTableHeader | null {
    if (betTablePos === 0 || betTableSize === 0) {
      return null; // No BET table
    }

    this.seek(headerOffset + Number(betTablePos));

    // Read BET table header
    const signature = this.readUInt32LE();
    if (signature !== 0x1A544542) { // 'BET\x1A'
      logger.warn(`Invalid BET table signature: ${signature.toString(16)}`);
      return null;
    }

    const betHeader = {
      signature,
      version: this.readUInt32LE(),
      dataSize: this.readUInt32LE(),
      tableSize: this.readUInt32LE(),
      fileCount: this.readUInt32LE(),
      unknown: this.readUInt32LE(),
      tableEntrySize: this.readUInt32LE(),
      bitIndexFilePos: this.readUInt32LE(),
      bitIndexFileSize: this.readUInt32LE(),
      bitIndexCmpSize: this.readUInt32LE(),
      bitIndexFlagIndex: this.readUInt32LE(),
      bitIndexNameHash2: this.readUInt32LE(),
      bitCountFilePos: this.readUInt32LE(),
      bitCountFileSize: this.readUInt32LE(),
      bitCountCmpSize: this.readUInt32LE(),
      bitCountFlagIndex: this.readUInt32LE(),
      bitCountNameHash2: this.readUInt32LE(),
      totalBetHashSize: this.readUInt32LE(),
      betHashSizeExtra: this.readUInt32LE(),
      betHashSize: this.readUInt32LE(),
      betHashArraySize: this.readUInt32LE(),
      flagCount: this.readUInt32LE(),
    };

    logger.debug(`BET Table found: ${JSON.stringify(betHeader)}`);

    // TODO: Implement full BET table parsing
    // For now, return header info
    return betHeader;
  }

  readFileData(filePos: number, size: number, headerOffset = 0): Buffer {
    this.seek(headerOffset + filePos);
    return this.readBytes(size);
  }
}
