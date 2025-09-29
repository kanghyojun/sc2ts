// MPQ Archive Main Class

import Compress from "compressjs";
import { gunzipSync, inflateSync } from "fflate";

import { MpqFileNotFoundError } from "./errors";
import { createLogger } from "./logger";
import { MpqReader } from "./mpq-reader";
import type { MpqHeader, MpqHashTableEntry, MpqBlockTableEntry, MpqFile, MpqParseOptions } from "./types";

const logger = createLogger("mpq-archive");

export class MpqArchive {
  private reader: MpqReader;
  private header: MpqHeader | null = null;
  private headerOffset = 0;
  public hashTable: MpqHashTableEntry[] = [];
  private blockTable: MpqBlockTableEntry[] = [];
  private files: Map<string, MpqFile> = new Map();

  constructor(reader: MpqReader) {
    this.reader = reader;
  }

  static async open(filepath: string, options?: MpqParseOptions): Promise<MpqArchive> {
    const reader = await MpqReader.fromFile(filepath);
    const archive = new MpqArchive(reader);
    await archive.parse(options);
    return archive;
  }

  static fromBuffer(buffer: Buffer, options?: MpqParseOptions): MpqArchive {
    const reader = new MpqReader(buffer);
    const archive = new MpqArchive(reader);
    archive.parseSync(options);
    return archive;
  }

  private async parse(options?: MpqParseOptions): Promise<void> {
    this.parseSync(options);
  }

  private parseSync(options?: MpqParseOptions): void {
    // Find and read MPQ header
    this.headerOffset = this.reader.findMpqHeader();
    logger.debug(`MPQ Header Offset: ${this.headerOffset.toString(16)}`);
    this.header = this.reader.readMpqHeader();

    // MPQ formatVersion 3 support implemented with HET/BET table detection

    // Calculate actual table positions for formatVersion 3+
    let actualHashTablePos = this.header.hashTablePos;
    let actualBlockTablePos = this.header.blockTablePos;

    if (this.header.formatVersion >= 2 && this.header.hashTablePosHi !== undefined) {
      actualHashTablePos = this.header.hashTablePos + (this.header.hashTablePosHi << 16);
      logger.debug(`Calculated hashTablePos: ${actualHashTablePos.toString(16)}`);
    }

    if (this.header.formatVersion >= 2 && this.header.blockTablePosHi !== undefined) {
      actualBlockTablePos = this.header.blockTablePos + (this.header.blockTablePosHi << 16);
      logger.debug(`Calculated blockTablePos: ${actualBlockTablePos.toString(16)}`);
    }

    // Calculate actual table sizes (compressed tables in formatVersion 3+)
    const hashTableDataSize = actualBlockTablePos - actualHashTablePos;
    const blockTableDataSize = Number(this.header.archiveSize) - actualBlockTablePos;

    logger.debug(`Hash table data size: ${hashTableDataSize} bytes`);
    logger.debug(`Block table data size: ${blockTableDataSize} bytes`);
    logger.debug(`Expected hash entries: ${this.header.hashTableSize}`);
    logger.debug(`Expected block entries: ${this.header.blockTableSize}`);
    logger.debug(`Archive size: ${this.header.archiveSize.toString()}`);

    // For formatVersion 3+, try HET/BET tables first
    if (this.header.formatVersion >= 3) {
      // Check for HET/BET tables
      let hetTable = null;
      let betTable = null;

      try {
        hetTable = this.reader.readHetTable(
          Number(this.header.hetTablePos64 ?? 0),
          Number(this.header.hetTableSize64 ?? 0),
          this.headerOffset,
        );
      } catch (error) {
        logger.debug(`Error reading HET table: ${error}`);
      }

      try {
        betTable = this.reader.readBetTable(
          Number(this.header.betTablePos64 ?? 0),
          Number(this.header.betTableSize64 ?? 0),
          this.headerOffset,
        );
      } catch (error) {
        logger.debug(`Error reading BET table: ${error}`);
      }

      if (hetTable && betTable) {
        logger.debug("Using HET/BET tables");
        // TODO: Implement file search using HET/BET tables
        // For now, fall back to traditional tables
      } else {
        logger.debug("No valid HET/BET tables found, using traditional Hash/Block tables");
      }

      // Check if tables might be compressed
      const expectedHashTableSize = this.header.hashTableSize * 16;
      const expectedBlockTableSize = this.header.blockTableSize * 16;

      logger.debug(`Expected hash table size: ${expectedHashTableSize} bytes`);
      logger.debug(`Expected block table size: ${expectedBlockTableSize} bytes`);

      if (hashTableDataSize < expectedHashTableSize || blockTableDataSize < expectedBlockTableSize) {
        logger.warn("Tables appear to be compressed! Attempting decompression...");
        // For now, try to read as uncompressed anyway
        logger.warn("WARNING: Compressed table decompression not fully implemented, trying as uncompressed...");
      } else {
        logger.debug("Tables appear to be uncompressed");
        // Try both encrypted and unencrypted to see which gives better results
        logger.debug("Trying unencrypted tables...");
        try {
          this.hashTable = this.reader.readHashTableUnencrypted(
            actualHashTablePos,
            this.header.hashTableSize,
            this.headerOffset,
          );
          logger.debug(`First unencrypted hash entry: ${JSON.stringify({
            name1: this.hashTable[0]?.name1.toString(16),
            name2: this.hashTable[0]?.name2.toString(16),
          })}`);
          this.blockTable = this.reader.readBlockTableUnencrypted(
            actualBlockTablePos,
            this.header.blockTableSize,
            this.headerOffset,
          );

          // Check if results look reasonable using improved scoring
          // Note: For SC2 replays, blockIndex can be larger values like 0x72501ead
          const validHashEntries = this.hashTable.filter(entry => {
            // blockIndex of 0xFFFFFFFF means empty slot
            // Any other value could be valid for SC2
            return entry.blockIndex !== 0xFFFFFFFF ||
                   (entry.name1 === 0xFFFFFFFF && entry.name2 === 0xFFFFFFFF);
          }).length;

          const validBlockEntries = this.blockTable.filter(entry =>
            this.header != null && entry.filePos < this.header.archiveSize &&
            entry.compressedSize < this.header.archiveSize &&
            entry.fileSize < (100 * 1024 * 1024), // Less than 100MB
          ).length;

          logger.debug(`Unencrypted: ${validHashEntries}/${this.hashTable.length} valid hash entries, ${validBlockEntries}/${this.blockTable.length} valid block entries`);

          // For SC2 replays (formatVersion 3+), try encrypted hash table
          // to see if it matches the expected values
          if (this.header.formatVersion >= 3) {
            logger.debug("SC2 replay (formatVersion 3+), trying encrypted hash table...");
            this.hashTable = this.reader.readHashTable(
              actualHashTablePos,
              this.header.hashTableSize,
              this.headerOffset,
            );

            // SC2 replays use the encrypted hash table - keep using the decrypted one

          } else if (validHashEntries === 0) {
            logger.debug("Hash table looks invalid, trying encrypted...");
            this.hashTable = this.reader.readHashTable(
              actualHashTablePos,
              this.header.hashTableSize,
              this.headerOffset,
            );
          } else {
            logger.debug("Using unencrypted hash table");
          }

          if (validBlockEntries === 0) {
            logger.debug("Block table looks invalid, trying encrypted...");
            this.blockTable = this.reader.readBlockTable(
              actualBlockTablePos,
              this.header.blockTableSize,
              this.headerOffset,
            );
          } else {
            logger.debug("Using unencrypted block table");
          }
        } catch {
          logger.debug("Error reading unencrypted tables, trying encrypted...");
          this.hashTable = this.reader.readHashTable(
            actualHashTablePos,
            this.header.hashTableSize,
            this.headerOffset,
          );
          this.blockTable = this.reader.readBlockTable(
            actualBlockTablePos,
            this.header.blockTableSize,
            this.headerOffset,
          );
        }
      }
    } else {
      // For older MPQ formats, use standard decryption
      this.hashTable = this.reader.readHashTable(
        actualHashTablePos,
        this.header.hashTableSize,
        this.headerOffset,
      );
      this.blockTable = this.reader.readBlockTable(
        actualBlockTablePos,
        this.header.blockTableSize,
        this.headerOffset,
      );
    }


    // Process list file if provided
    if (options?.listFile) {
      this.processListFile(options.listFile);
    }
  }

  private processListFile(listFileContent: string): void {
    const filenames = listFileContent.split(/\r?\n/).filter(f => f.length > 0);

    for (const filename of filenames) {
      const hashEntry = this.findHashEntryByFilename(filename);

      if (hashEntry && hashEntry.blockIndex !== 0xFFFFFFFF) {
        const blockEntry = this.blockTable[hashEntry.blockIndex];
        if (blockEntry) {
          this.files.set(filename, {
            filename,
            data: Buffer.alloc(0), // Data will be loaded on demand
            compressedSize: blockEntry.compressedSize,
            fileSize: blockEntry.fileSize,
            flags: blockEntry.flags,
          });
        }
      }
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
        this.cryptTable[index2] = (temp1 | temp2);
      }
    }
  }

  private hashString(str: string, hashType: number): number {
    this.initializeCryptTable();

    let seed1 = 0x7FED7FED;
    let seed2 = 0xEEEEEEEE;

    // Convert to uppercase and replace forward slashes with backslashes
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

  public findHashEntryByFilename(filename: string): MpqHashTableEntry | null {
    const MPQ_HASH_TABLE_INDEX = 0;
    const MPQ_HASH_NAME_A = 1;
    const MPQ_HASH_NAME_B = 2;

    const dwIndex = this.hashString(filename, MPQ_HASH_TABLE_INDEX);
    const dwName1 = this.hashString(filename, MPQ_HASH_NAME_A);
    const dwName2 = this.hashString(filename, MPQ_HASH_NAME_B);

    // First, try a simple linear search (like mpyq does)
    // This works better for some SC2 replay files
    for (const entry of this.hashTable) {
      if (!entry) continue;

      // Check for exact match
      if (entry.name1 === dwName1 && entry.name2 === dwName2) {
        return entry;
      }

      // For SC2 replays, also accept partial matches where name1 matches
      // but name2 might be slightly different due to encryption variations
      if (entry.name1 === dwName1 && entry.blockIndex !== 0xFFFFFFFF) {
        // Note: For SC2 replays, name2 might not match exactly
        return entry;
      }
    }

    // If linear search fails, try hash chain search (standard MPQ algorithm)
    const hashTableSize = this.hashTable.length;
    const startIndex = dwIndex & (hashTableSize - 1);

    for (let i = 0; i < hashTableSize; i++) {
      const currentIndex = (startIndex + i) % hashTableSize;
      const entry = this.hashTable[currentIndex];

      if (!entry) continue;

      // Empty slot - file not found in hash chain
      if (entry.blockIndex === 0xFFFFFFFF && entry.name1 === 0xFFFFFFFF && entry.name2 === 0xFFFFFFFF) {
        break;
      }

      // Check if this is our file
      if (entry.name1 === dwName1 && entry.name2 === dwName2) {
        return entry;
      }
    }

    return null;
  }

  getFile(filename: string): MpqFile {
    let file = this.files.get(filename);
    if (!file) {
      // Try to find the file directly in the hash table even if not in list file
      const hashEntry = this.findHashEntryByFilename(filename);

      if (hashEntry && hashEntry.blockIndex !== 0xFFFFFFFF) {
        const blockEntry = this.blockTable[hashEntry.blockIndex];
        if (blockEntry) {
          file = {
            filename,
            data: Buffer.alloc(0), // Will be loaded below
            compressedSize: blockEntry.compressedSize,
            fileSize: blockEntry.fileSize,
            flags: blockEntry.flags,
          };
          this.files.set(filename, file);
        }
      }

      if (!file) {
        throw new MpqFileNotFoundError(filename);
      }
    }

    // Load file data on demand if not already loaded
    if (file.data.length === 0 && file.fileSize > 0) {
      const hashEntry = this.findHashEntryByFilename(filename);

      if (hashEntry && hashEntry.blockIndex !== 0xFFFFFFFF) {
        const blockEntry = this.blockTable[hashEntry.blockIndex];
        if (blockEntry) {
          let fileData = this.reader.readFileData(
            blockEntry.filePos,
            blockEntry.compressedSize,
            this.headerOffset,
          );

          // Auto-decompress bzip2 data if detected (for build 94137+)
          // This should only be applied to newer builds that use bzip2 compression
          fileData = this.decompressBzip2IfNeeded(fileData);

          // Update the file with actual data
          file = {
            ...file,
            data: fileData,
          };
          this.files.set(filename, file);
        }
      }
    }

    return file;
  }

  private decompressBzip2IfNeeded(data: Buffer): Buffer {
    if (data.length === 0) {
      return data;
    }

    // Check for various compression formats

    // Check for GZIP (RFC 1952)
    if (data.length >= 2 && data[0] === 0x1F && data[1] === 0x8B) {
      try {
        logger.debug("Detected GZIP compression, decompressing with fflate...");
        const decompressed = gunzipSync(new Uint8Array(data));
        logger.debug(`GZIP decompression successful: ${data.length} -> ${decompressed.length} bytes`);
        return Buffer.from(decompressed);
      } catch (error) {
        logger.warn(`GZIP decompression failed: ${error}. Trying other methods.`);
      }
    }

    // Check for DEFLATE (zlib format)
    if (data.length >= 2) {
      const first = data.readUInt8(0);
      const second = data.readUInt8(1);
      // zlib header: (CMF * 256 + FLG) % 31 == 0
      if ((first * 256 + second) % 31 === 0 && (first & 0x0F) === 0x08) {
        try {
          logger.debug("Detected DEFLATE/zlib compression, decompressing with fflate...");
          const decompressed = inflateSync(new Uint8Array(data));
          logger.debug(`DEFLATE decompression successful: ${data.length} -> ${decompressed.length} bytes`);
          return Buffer.from(decompressed);
        } catch (error) {
          logger.warn(`DEFLATE decompression failed: ${error}. Trying other methods.`);
        }
      }
    }

    // Check if data is bzip2 compressed
    // Pattern 1: BZh at start
    const isBzip2AtStart = data.length >= 3 &&
                          data[0] === 0x42 && // 'B'
                          data[1] === 0x5A && // 'Z'
                          data[2] === 0x68;   // 'h'

    // Pattern 2: 0x10 followed by BZh (common in SC2 build 94137+)
    const isBzip2AtOffset1 = data.length >= 4 &&
                             data[0] === 0x10 &&
                             data[1] === 0x42 && // 'B'
                             data[2] === 0x5A && // 'Z'
                             data[3] === 0x68;   // 'h'

    if (isBzip2AtStart || isBzip2AtOffset1) {
      try {
        // Use compressjs for bzip2 decompression (fallback to existing library)
        const bzip2 = Compress.Bzip2;

        let bzip2Data: Buffer;
        if (isBzip2AtOffset1) {
          // Skip the first 0x10 byte
          bzip2Data = data.subarray(1);
          logger.debug(`Auto-decompressing bzip2 data (skipping first byte), size: ${bzip2Data.length}`);
        } else {
          // Use entire buffer
          bzip2Data = data;
          logger.debug(`Auto-decompressing bzip2 data, size: ${bzip2Data.length}`);
        }

        const decompressedBytes = bzip2.decompressFile(Array.from(bzip2Data));
        const decompressed = Buffer.from(decompressedBytes);

        logger.debug(`Bzip2 decompression successful: ${data.length} -> ${decompressed.length} bytes`);
        return decompressed;

      } catch (error) {
        logger.warn(`Bzip2 decompression failed: ${error}. Returning original data.`);
        return data;
      }
    }

    // No recognized compression format, return original data
    return data;
  }

  hasFile(filename: string): boolean {
    return this.files.has(filename);
  }

  listFiles(): string[] {
    return Array.from(this.files.keys());
  }

  get fileCount(): number {
    return this.files.size;
  }

  get archiveHeader(): MpqHeader | null {
    return this.header;
  }

  /**
   * Get user data content from SC2 replay archives
   * This contains the actual game header information (matches s2protocol behavior)
   */
  getUserDataContent(): Buffer | null {
    if (!this.header) {
      return null;
    }

    try {
      // Seek to the beginning of the archive to read user data
      this.reader.seek(0);
      const userData = this.reader.readMpqUserData();

      // Read the content portion (user_data_header_size bytes after the 16-byte header)
      // This matches mpyq's behavior: header['content'] = self.file.read(header['user_data_header_size'])
      const contentSize = userData.userDataHeaderSize;
      if (contentSize <= 0) {
        return null;
      }

      // We're already positioned right after the 16-byte user data header
      // Read the content portion
      return this.reader.readBytes(contentSize);
    } catch (error) {
      logger.warn(`Failed to read user data content: ${error}`);
      return null;
    }
  }
}
