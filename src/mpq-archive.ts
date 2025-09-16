// MPQ Archive Main Class

import { MpqReader } from './mpq-reader';
import type { MpqHeader, MpqHashTableEntry, MpqBlockTableEntry, MpqFile, MpqParseOptions } from './types';
import { MpqFileNotFoundError } from './errors';

export class MpqArchive {
  private reader: MpqReader;
  private header: MpqHeader | null = null;
  private headerOffset: number = 0;
  private hashTable: MpqHashTableEntry[] = [];
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
    this.header = this.reader.readMpqHeader();

    // Read hash table
    this.hashTable = this.reader.readHashTable(
      this.header.hashTablePos,
      this.header.hashTableSize,
      this.headerOffset
    );

    // Read block table
    this.blockTable = this.reader.readBlockTable(
      this.header.blockTablePos,
      this.header.blockTableSize,
      this.headerOffset
    );

    // Process list file if provided
    if (options?.listFile) {
      this.processListFile(options.listFile);
    }
  }

  private processListFile(listFileContent: string): void {
    const filenames = listFileContent.split(/\r?\n/).filter(f => f.length > 0);

    for (const filename of filenames) {
      const hash = this.hashFilename(filename);
      const hashEntry = this.findHashEntry(hash.name1, hash.name2);

      if (hashEntry && hashEntry.blockIndex !== 0xFFFFFFFF) {
        const blockEntry = this.blockTable[hashEntry.blockIndex];
        if (blockEntry) {
          this.files.set(filename, {
            filename,
            data: Buffer.alloc(0), // Data will be loaded on demand
            compressedSize: blockEntry.compressedSize,
            fileSize: blockEntry.fileSize,
            flags: blockEntry.flags
          });
        }
      }
    }
  }

  private hashFilename(filename: string): { name1: number, name2: number } {
    // Simplified hash function - actual implementation would use MPQ hash algorithm
    let hash1 = 0;
    let hash2 = 0;

    for (let i = 0; i < filename.length; i++) {
      hash1 = ((hash1 << 5) + hash1 + filename.charCodeAt(i)) >>> 0;
      hash2 = ((hash2 << 7) + hash2 + filename.charCodeAt(i)) >>> 0;
    }

    return { name1: hash1, name2: hash2 };
  }

  private findHashEntry(name1: number, name2: number): MpqHashTableEntry | null {
    for (const entry of this.hashTable) {
      if (entry.name1 === name1 && entry.name2 === name2) {
        return entry;
      }
    }
    return null;
  }

  getFile(filename: string): MpqFile {
    let file = this.files.get(filename);
    if (!file) {
      throw new MpqFileNotFoundError(filename);
    }

    // Load file data on demand if not already loaded
    if (file.data.length === 0 && file.fileSize > 0) {
      const hash = this.hashFilename(filename);
      const hashEntry = this.findHashEntry(hash.name1, hash.name2);

      if (hashEntry && hashEntry.blockIndex !== 0xFFFFFFFF) {
        const blockEntry = this.blockTable[hashEntry.blockIndex];
        if (blockEntry) {
          const fileData = this.reader.readFileData(
            blockEntry.filePos,
            blockEntry.compressedSize,
            this.headerOffset
          );

          // Update the file with actual data
          file = {
            ...file,
            data: fileData
          };
          this.files.set(filename, file);
        }
      }
    }

    return file;
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
}