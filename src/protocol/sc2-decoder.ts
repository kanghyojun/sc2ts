// S2Protocol TypeScript decoder implementation
// Simplified version of s2protocol's VersionedDecoder

import type { BitarrayTypeInfo, IntTypeInfo, StructTypeInfo, TypeInfo } from './types';

export class BitPackedBuffer {
  private data: Buffer;
  private used = 0;
  private next = 0;
  private nextbits = 0;
  private bigendian: boolean;

  constructor(contents: Buffer, endian: 'big' | 'little' = 'big') {
    this.data = contents;
    this.bigendian = endian === 'big';
  }

  done(): boolean {
    return this.nextbits === 0 && this.used >= this.data.length;
  }

  usedBits(): number {
    return this.used * 8 - this.nextbits;
  }

  byteAlign(): void {
    this.nextbits = 0;
  }

  readAlignedBytes(bytes: number): Buffer {
    this.byteAlign();
    const data = this.data.subarray(this.used, this.used + bytes);
    this.used += bytes;
    if (data.length !== bytes) {
      throw new Error('TruncatedError: not enough data');
    }
    return data;
  }

  readBits(bits: number): number {
    let result = 0;
    let resultbits = 0;

    while (resultbits !== bits) {
      if (this.nextbits === 0) {
        if (this.done()) {
          throw new Error('TruncatedError: buffer exhausted');
        }
        this.next = this.data[this.used] || 0;
        this.used += 1;
        this.nextbits = 8;
      }

      const copybits = Math.min(bits - resultbits, this.nextbits);
      const copy = this.next & ((1 << copybits) - 1);

      if (this.bigendian) {
        result |= copy << (bits - resultbits - copybits);
      } else {
        result |= copy << resultbits;
      }

      this.next >>= copybits;
      this.nextbits -= copybits;
      resultbits += copybits;
    }

    return result;
  }
}

export class VersionedDecoder {
  private buffer: BitPackedBuffer;
  private typeinfos: TypeInfo[];

  constructor(contents: Buffer, typeinfos: TypeInfo[]) {
    this.buffer = new BitPackedBuffer(contents);
    this.typeinfos = typeinfos;
  }

  done(): boolean {
    return this.buffer.done();
  }

  used_bits(): number {
    return this.buffer.usedBits();
  }

  byte_align(): void {
    this.buffer.byteAlign();
  }

  private _expect_skip(expected: number): void {
    const actual = this.buffer.readBits(8);
    if (actual !== expected) {
      const position = this.buffer.usedBits() - 8;
      throw new Error(`CorruptedError: unexpected skip byte at bit ${position} (byte ${Math.floor(position/8)}): expected 0x${expected.toString(16).padStart(2, '0')}, got 0x${actual.toString(16).padStart(2, '0')}`);
    }
  }

  private _vint(): number {
    let b = this.buffer.readBits(8);
    const negative = b & 1;
    let result = (b >> 1) & 0x3f;
    let bits = 6;

    while ((b & 0x80) !== 0) {
      b = this.buffer.readBits(8);
      result |= (b & 0x7f) << bits;
      bits += 7;
    }

    return negative ? -result : result;
  }

  private _skip_instance(): void {
    const skip = this.buffer.readBits(8);
    if (skip === 0) { // array
      const length = this._vint();
      for (let i = 0; i < length; i++) {
        this._skip_instance();
      }
    } else if (skip === 1) { // bitblob
      const length = this._vint();
      this.buffer.readAlignedBytes(Math.floor((length + 7) / 8));
    } else if (skip === 2) { // blob
      const length = this._vint();
      this.buffer.readAlignedBytes(length);
    } else if (skip === 3) { // choice
      this._vint(); // tag
      this._skip_instance();
    } else if (skip === 4) { // optional
      const exists = this.buffer.readBits(8) !== 0;
      if (exists) {
        this._skip_instance();
      }
    } else if (skip === 5) { // struct
      const length = this._vint();
      for (let i = 0; i < length; i++) {
        this._vint(); // tag
        this._skip_instance();
      }
    } else if (skip === 6) { // u8
      this.buffer.readAlignedBytes(1);
    } else if (skip === 7) { // u32
      this.buffer.readAlignedBytes(4);
    } else if (skip === 8) { // u64
      this.buffer.readAlignedBytes(8);
    } else if (skip === 9) { // vint
      this._vint();
    }
  }

  instance(typeid: number): unknown {
    if (typeid >= this.typeinfos.length) {
      throw new Error(`CorruptedError: invalid typeid ${typeid}`);
    }

    const typeinfo = this.typeinfos[typeid];
    if (!typeinfo) {
      throw new Error(`Invalid typeinfo for typeid ${typeid}`);
    }
    switch (typeinfo.type) {
    case '_int': {
      return this._int(...typeinfo.args);
    }
    case '_struct': {
      if (typeinfo.args[0] == null || typeinfo.args.length !== 1) {
        throw new Error(`Invalid struct args for typeid ${typeid}`);
      }
      return this._struct(...typeinfo.args[0]);
    }
    case '_blob':
      if (typeinfo.args[0] == null) {
        throw new Error(`Invalid _blob args for typeid ${typeid}`);
      } else {
        return this._blob(typeinfo.args[0]);
      }
    case '_bool':
      return this._bool();
    case '_optional':
      return this._optional(typeinfo.args[0]);
    case '_array':
      return this._array(typeinfo.args[0], typeinfo.args[1]);
    case '_choice':
      return this._choice(typeinfo.args[0], typeinfo.args[1]);
    case '_fourcc':
      return this._fourcc();
    case '_null':
      return null;
    case '_bitarray':
      return this._bitarray(...typeinfo.args);
    case '_real32':
      return this._real32();
    case '_real64':
      return this._real64();
    default: {
      const t: never = typeinfo;
      throw new Error(`Unsupported type: ${t}`);
    }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _int(..._bounds: IntTypeInfo['args']): number {
    this._expect_skip(9);
    return this._vint();
  }

  private _struct(...fields: StructTypeInfo['args'][number]): Record<string, unknown> {
    this._expect_skip(5);
    const result: Record<string, unknown> = {};
    const length = this._vint();

    for (let i = 0; i < length; i++) {
      const tag = this._vint();
      const field = fields.find(f => f[2] === tag);

      if (field) {
        const [name, typeid] = field as [string, number, number];

        if (name === '__parent') {
          const parent = this.instance(typeid);
          if (typeof parent === 'object' && parent !== null) {
            Object.assign(result, parent);
          } else if (fields.length === 1) {
            return parent as Record<string, unknown>;
          } else {
            result[name] = parent;
          }
        } else {
          result[name] = this.instance(typeid);
        }
      } else {
        this._skip_instance();
      }
    }

    return result;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _blob(_bounds: [number, number]): Buffer {
    this._expect_skip(2);
    const length = this._vint();
    return this.buffer.readAlignedBytes(length);
  }

  private _bool(): boolean {
    this._expect_skip(6);
    return this.buffer.readBits(8) !== 0;
  }

  private _optional(typeid: number): unknown {
    this._expect_skip(4);
    const exists = this.buffer.readBits(8) !== 0;
    return exists ? this.instance(typeid) : null;
  }

  private _array(_bounds: [number, number], typeid: number): unknown[] {
    this._expect_skip(0);
    const length = this._vint();
    const result: unknown[] = [];
    for (let i = 0; i < length; i++) {
      result.push(this.instance(typeid));
    }
    return result;
  }

  private _choice(_bounds: [number, number], fields: Record<number, [string, number]>): unknown {
    this._expect_skip(3);
    const tag = this._vint();
    const field = fields[tag];
    if (!field) {
      this._skip_instance();
      return {};
    }
    const [name, typeid] = field;
    return { [name]: this.instance(typeid) };
  }

  private _fourcc(): string {
    this._expect_skip(7);
    const bytes = this.buffer.readAlignedBytes(4);
    return bytes.toString('ascii');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _bitarray(..._bounds: BitarrayTypeInfo['args']): [number, Buffer] {
    this._expect_skip(1);
    const length = this._vint();
    return [length, this.buffer.readAlignedBytes(Math.floor((length + 7) / 8))];
  }

  private _real32(): number {
    this._expect_skip(7);
    const bytes = this.buffer.readAlignedBytes(4);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return view.getFloat32(0, false); // big-endian
  }

  private _real64(): number {
    this._expect_skip(8);
    const bytes = this.buffer.readAlignedBytes(8);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return view.getFloat64(0, false); // big-endian
  }
}

export class BitPackedDecoder {
  private buffer: BitPackedBuffer;
  private typeinfos: TypeInfo[];

  constructor(contents: Buffer, typeinfos: TypeInfo[]) {
    this.buffer = new BitPackedBuffer(contents);
    this.typeinfos = typeinfos;
  }

  done(): boolean {
    return this.buffer.done();
  }

  used_bits(): number {
    return this.buffer.usedBits();
  }

  byte_align(): void {
    this.buffer.byteAlign();
  }

  instance(typeid: number): unknown {
    if (typeid >= this.typeinfos.length) {
      throw new Error(`CorruptedError: invalid typeid ${typeid}`);
    }

    const typeinfo = this.typeinfos[typeid];
    if (!typeinfo) {
      throw new Error(`Invalid typeinfo for typeid ${typeid}`);
    }
    switch (typeinfo.type) {
    case '_int': {
      if (!typeinfo.args[0]) {
        throw new Error(`Invalid _int args for typeid ${typeid}`);
      }
      const bounds = typeinfo.args[0];
      const normalizedBounds: [number, number] = [
        typeof bounds[0] === 'bigint' ? Number(bounds[0]) : bounds[0],
        bounds[1],
      ];
      return this._int(normalizedBounds);
    }
    case '_struct': {
      if (typeinfo.args[0] == null || typeinfo.args.length !== 1) {
        throw new Error(`Invalid struct args for typeid ${typeid}`);
      }
      return this._struct(typeinfo.args[0]);
    }
    case '_blob':
      if (typeinfo.args[0] == null) {
        throw new Error(`Invalid _blob args for typeid ${typeid}`);
      } else {
        return this._blob(typeinfo.args[0]);
      }
    case '_bool':
      return this._bool();
    case '_optional':
      return this._optional(typeinfo.args[0]);
    case '_array':
      return this._array(typeinfo.args[0], typeinfo.args[1]);
    case '_choice':
      return this._choice(typeinfo.args[0], typeinfo.args[1]);
    case '_fourcc':
      return this._fourcc();
    case '_null':
      return null;
    case '_bitarray':
      if (!typeinfo.args[0]) {
        throw new Error(`Invalid _bitarray args for typeid ${typeid}`);
      }
      return this._bitarray(typeinfo.args[0]);
    case '_real32':
      return this._real32();
    case '_real64':
      return this._real64();
    default: {
      const t: never = typeinfo;
      throw new Error(`Unsupported type: ${t}`);
    }
    }
  }

  private _int(bounds: [number, number]): number {
    return bounds[0] + this.buffer.readBits(bounds[1]);
  }

  private _struct(fields: StructTypeInfo['args'][number]): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const field of fields) {
      const [name, typeid] = field as [string, number, number];

      if (name === '__parent') {
        const parent = this.instance(typeid);
        if (typeof parent === 'object' && parent !== null) {
          Object.assign(result, parent);
        } else if (fields.length === 1) {
          return parent as Record<string, unknown>;
        } else {
          result[name] = parent;
        }
      } else {
        result[name] = this.instance(typeid);
      }
    }

    return result;
  }

  private _blob(bounds: [number, number]): Buffer {
    const length = this._int(bounds);
    return this.buffer.readAlignedBytes(length);
  }

  private _bool(): boolean {
    return this._int([0, 1]) !== 0;
  }

  private _optional(typeid: number): unknown {
    const exists = this._bool();
    return exists ? this.instance(typeid) : null;
  }

  private _array(bounds: [number, number], typeid: number): unknown[] {
    const length = this._int(bounds);
    const result: unknown[] = [];
    for (let i = 0; i < length; i++) {
      result.push(this.instance(typeid));
    }
    return result;
  }

  private _choice(bounds: [number, number], fields: Record<number, [string, number]>): unknown {
    const tag = this._int(bounds);
    const field = fields[tag];
    if (!field) {
      throw new Error(`CorruptedError: invalid choice tag ${tag}`);
    }
    const [name, typeid] = field;
    return { [name]: this.instance(typeid) };
  }

  private _fourcc(): string {
    const bytes = this.buffer.readAlignedBytes(4);
    return bytes.toString('ascii');
  }

  private _bitarray(bounds: [number, number]): [number, number] {
    const length = this._int(bounds);
    // BitPackedDecoder reads bits directly, not aligned bytes like VersionedDecoder
    const bits = this.buffer.readBits(length);
    return [length, bits];
  }

  private _real32(): number {
    const bytes = this.buffer.readAlignedBytes(4);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return view.getFloat32(0, false); // big-endian
  }

  private _real64(): number {
    const bytes = this.buffer.readAlignedBytes(8);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return view.getFloat64(0, false); // big-endian
  }
}
