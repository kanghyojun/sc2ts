// MPQ Archive Reader Implementation

import { readFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import type { MpqHeader, MpqHashTableEntry, MpqBlockTableEntry } from './types';
import { MpqInvalidFormatError } from './errors';

export class MpqReader {
  private buffer: Buffer;
  private offset: number = 0;

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
        // Found potential signature, validate by checking if we can read a reasonable header
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
            archiveSize > 0 && archiveSize <= this.buffer.length &&
            formatVersion >= 0 && formatVersion <= 4 &&
            hashTablePos > 0 && hashTablePos < archiveSize &&
            blockTablePos > 0 && blockTablePos < archiveSize &&
            (offset + hashTablePos) < this.buffer.length &&
            (offset + blockTablePos) < this.buffer.length
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

    throw new MpqInvalidFormatError('No valid MPQ header found in file');
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
      blockTableSize
    };

    // Read extended header for format version 2+
    if (formatVersion >= 2) {
      header.hiBlockTablePos64 = BigInt(this.readUInt32LE()) << 32n | BigInt(this.readUInt32LE());
      header.hashTablePosHi = this.readUInt16LE();
      header.blockTablePosHi = this.readUInt16LE();
    }

    // Reset to end of header
    this.seek(startOffset + headerSize);

    return header;
  }

  readHashTable(offset: number, size: number, headerOffset: number = 0): MpqHashTableEntry[] {
    this.seek(headerOffset + offset);
    const entries: MpqHashTableEntry[] = [];

    for (let i = 0; i < size; i++) {
      entries.push({
        name1: this.readUInt32LE(),
        name2: this.readUInt32LE(),
        locale: this.readUInt16LE(),
        platform: this.readUInt16LE(),
        blockIndex: this.readUInt32LE()
      });
    }

    return entries;
  }

  readBlockTable(offset: number, size: number, headerOffset: number = 0): MpqBlockTableEntry[] {
    this.seek(headerOffset + offset);
    const entries: MpqBlockTableEntry[] = [];

    for (let i = 0; i < size; i++) {
      entries.push({
        filePos: this.readUInt32LE(),
        compressedSize: this.readUInt32LE(),
        fileSize: this.readUInt32LE(),
        flags: this.readUInt32LE()
      });
    }

    return entries;
  }

  readFileData(filePos: number, size: number, headerOffset: number = 0): Buffer {
    this.seek(headerOffset + filePos);
    return this.readBytes(size);
  }
}