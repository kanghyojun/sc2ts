// SC2 Replay Binary Decoder
// Based on Blizzard's s2protocol implementation

export class BitPackedBuffer {
  private buffer: Buffer;
  private byteOffset = 0;
  private bitOffset = 0;

  constructor(buffer: Buffer) {
    this.buffer = buffer;
  }

  reset(offset = 0): void {
    this.byteOffset = offset;
    this.bitOffset = 0;
  }

  readBits(numBits: number): number {
    if (numBits === 0) return 0;
    if (numBits > 32) throw new Error('Cannot read more than 32 bits at once');

    let result = 0;
    let bitsToRead = numBits;
    let resultBitOffset = 0;

    while (bitsToRead > 0) {
      if (this.byteOffset >= this.buffer.length) {
        throw new Error('Buffer overflow: not enough data');
      }

      const bitsInCurrentByte = 8 - this.bitOffset;
      const bitsFromThisByte = Math.min(bitsToRead, bitsInCurrentByte);

      // Read bits from most significant to least significant (left to right)
      const mask = (1 << bitsFromThisByte) - 1;
      const shift = 8 - this.bitOffset - bitsFromThisByte;
      const bits = (this.buffer[this.byteOffset]! >> shift) & mask;

      result |= bits << (numBits - resultBitOffset - bitsFromThisByte);

      resultBitOffset += bitsFromThisByte;
      bitsToRead -= bitsFromThisByte;
      this.bitOffset += bitsFromThisByte;

      if (this.bitOffset === 8) {
        this.bitOffset = 0;
        this.byteOffset++;
      }
    }

    return result;
  }

  readBytes(numBytes: number): Buffer {
    if (this.bitOffset !== 0) {
      throw new Error('Cannot read bytes when not byte-aligned');
    }

    if (this.byteOffset + numBytes > this.buffer.length) {
      throw new Error('Buffer overflow: not enough data');
    }

    const result = this.buffer.subarray(this.byteOffset, this.byteOffset + numBytes);
    this.byteOffset += numBytes;
    return result;
  }

  readUInt8(): number {
    return this.readBytes(1)[0]!;
  }

  readUInt16LE(): number {
    return this.readBytes(2).readUInt16LE(0);
  }

  readUInt32LE(): number {
    return this.readBytes(4).readUInt32LE(0);
  }

  readVarInt(): number {
    let result = 0;
    let shift = 0;

    while (true) {
      const byte = this.readUInt8();
      result |= (byte & 0x7F) << shift;

      if ((byte & 0x80) === 0) {
        break;
      }

      shift += 7;
      if (shift >= 32) {
        throw new Error('VarInt too long');
      }
    }

    return result;
  }

  align(): void {
    if (this.bitOffset !== 0) {
      this.bitOffset = 0;
      this.byteOffset++;
    }
  }

  get offset(): number {
    return this.byteOffset + (this.bitOffset > 0 ? 1 : 0);
  }

  get remainingBytes(): number {
    return this.buffer.length - this.offset;
  }
}

export class VersionedDecoder {
  private buffer: BitPackedBuffer;

  constructor(buffer: Buffer) {
    this.buffer = new BitPackedBuffer(buffer);
  }

  reset(offset = 0): void {
    this.buffer.reset(offset);
  }

  decodeInt(typeInfo: any): number {
    return this.buffer.readBits(typeInfo.size || 32);
  }

  decodeBool(): boolean {
    return this.buffer.readBits(1) === 1;
  }

  decodeBlob(): Buffer {
    const length = this.buffer.readVarInt();
    return this.buffer.readBytes(length);
  }

  decodeString(): string {
    const blob = this.decodeBlob();
    return blob.toString('utf8');
  }

  decodeStruct(typeInfo: any): any {
    const result: any = {};

    if (typeInfo.fields) {
      for (const field of typeInfo.fields) {
        result[field.name] = this.decodeValue(field.type);
      }
    }

    return result;
  }

  decodeArray(typeInfo: any): any[] {
    const length = this.buffer.readVarInt();
    const result: any[] = [];

    for (let i = 0; i < length; i++) {
      result.push(this.decodeValue(typeInfo.element));
    }

    return result;
  }

  decodeOptional(typeInfo: any): any {
    const hasValue = this.decodeBool();
    return hasValue ? this.decodeValue(typeInfo.element) : null;
  }

  decodeChoice(typeInfo: any): any {
    const index = this.buffer.readVarInt();

    if (typeInfo.choices && index < typeInfo.choices.length) {
      const choice = typeInfo.choices[index];
      return {
        choice: choice.name,
        value: this.decodeValue(choice.type),
      };
    }

    throw new Error(`Invalid choice index: ${index}`);
  }

  decodeValue(typeInfo: any): any {
    if (!typeInfo || !typeInfo.type) {
      throw new Error('Invalid type info');
    }

    switch (typeInfo.type) {
    case 'int':
      return this.decodeInt(typeInfo);
    case 'bool':
      return this.decodeBool();
    case 'blob':
      return this.decodeBlob();
    case 'string':
      return this.decodeString();
    case 'struct':
      return this.decodeStruct(typeInfo);
    case 'array':
      return this.decodeArray(typeInfo);
    case 'optional':
      return this.decodeOptional(typeInfo);
    case 'choice':
      return this.decodeChoice(typeInfo);
    default:
      throw new Error(`Unknown type: ${typeInfo.type}`);
    }
  }

  get offset(): number {
    return this.buffer.offset;
  }

  get remainingBytes(): number {
    return this.buffer.remainingBytes;
  }
}
