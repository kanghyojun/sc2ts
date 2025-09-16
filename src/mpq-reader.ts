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

  readMpqHeader(): MpqHeader {
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

  readHashTable(offset: number, size: number): MpqHashTableEntry[] {
    this.seek(offset);
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

  readBlockTable(offset: number, size: number): MpqBlockTableEntry[] {
    this.seek(offset);
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
}