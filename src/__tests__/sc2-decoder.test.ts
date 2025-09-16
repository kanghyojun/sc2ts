import { BitPackedBuffer, VersionedDecoder } from '../sc2-decoder';

describe('BitPackedBuffer', () => {
  let buffer: BitPackedBuffer;

  beforeEach(() => {
    const data = Buffer.from([
      0b11010110, // 0xD6 = 214
      0b10101100, // 0xAC = 172
      0b11110000, // 0xF0 = 240
      0b10101010, // 0xAA = 170
      0x12, 0x34, 0x56, 0x78, // Multi-byte data
      0x87, 0x65, 0x43, 0x21,
      0x81, 0x02, // VarInt: 257 (0x81 = 129 = 0x80 | 1, 0x02 = 2)
      0x7F, 0x00  // VarInt: 127
    ]);
    buffer = new BitPackedBuffer(data);
  });

  describe('bit reading', () => {
    it('should read single bits correctly', () => {
      buffer.reset();
      expect(buffer.readBits(1)).toBe(1); // First bit of 0xD6
      expect(buffer.readBits(1)).toBe(1); // Second bit
      expect(buffer.readBits(1)).toBe(0); // Third bit
      expect(buffer.readBits(1)).toBe(1); // Fourth bit
    });

    it('should read multiple bits correctly', () => {
      buffer.reset();
      expect(buffer.readBits(4)).toBe(0b1101); // First 4 bits of 0xD6
      expect(buffer.readBits(4)).toBe(0b0110); // Last 4 bits of 0xD6
    });

    it('should read bits across byte boundaries', () => {
      buffer.reset();
      // 0xD6 = 11010110, 0xAC = 10101100
      // First 8 bits: 11010110, next 4 bits: 1010
      // Combined: 110101101010
      expect(buffer.readBits(12)).toBe(0b110101101010);
    });

    it('should handle reading 0 bits', () => {
      buffer.reset();
      expect(buffer.readBits(0)).toBe(0);
    });

    it('should throw error when reading too many bits', () => {
      buffer.reset();
      expect(() => buffer.readBits(33)).toThrow('Cannot read more than 32 bits at once');
    });

    it('should throw error on buffer overflow', () => {
      buffer.reset();
      // Try to read more bits than available
      expect(() => {
        while (true) {
          buffer.readBits(8);
        }
      }).toThrow('Buffer overflow: not enough data');
    });
  });

  describe('byte reading', () => {
    it('should read single bytes', () => {
      buffer.reset();
      expect(buffer.readUInt8()).toBe(0xD6);
      expect(buffer.readUInt8()).toBe(0xAC);
    });

    it('should read multiple bytes', () => {
      buffer.reset();
      const bytes = buffer.readBytes(4);
      expect(bytes).toEqual(Buffer.from([0xD6, 0xAC, 0xF0, 0xAA]));
    });

    it('should read little-endian integers', () => {
      buffer.reset(4); // Start at the multi-byte data
      expect(buffer.readUInt16LE()).toBe(0x3412);
      expect(buffer.readUInt32LE()).toBe(0x78563412);
    });

    it('should throw error when not byte-aligned', () => {
      buffer.reset();
      buffer.readBits(1); // Not byte-aligned
      expect(() => buffer.readBytes(1)).toThrow('Cannot read bytes when not byte-aligned');
    });
  });

  describe('variable integer reading', () => {
    it('should read variable integers correctly', () => {
      buffer.reset(8); // Start at VarInt data
      expect(buffer.readVarInt()).toBe(257);
      expect(buffer.readVarInt()).toBe(127);
    });

    it('should handle single byte varints', () => {
      const singleByteBuffer = new BitPackedBuffer(Buffer.from([0x7F]));
      expect(singleByteBuffer.readVarInt()).toBe(127);
    });
  });

  describe('alignment', () => {
    it('should align to byte boundary', () => {
      buffer.reset();
      buffer.readBits(3);
      buffer.align();
      expect(buffer.readUInt8()).toBe(0xAC); // Should read next full byte
    });

    it('should do nothing when already aligned', () => {
      buffer.reset();
      const offsetBefore = buffer.offset;
      buffer.align();
      expect(buffer.offset).toBe(offsetBefore);
    });
  });

  describe('properties', () => {
    it('should report correct offset', () => {
      buffer.reset();
      expect(buffer.offset).toBe(0);
      buffer.readUInt8();
      expect(buffer.offset).toBe(1);
    });

    it('should report remaining bytes correctly', () => {
      buffer.reset();
      const initialRemaining = buffer.remainingBytes;
      buffer.readUInt8();
      expect(buffer.remainingBytes).toBe(initialRemaining - 1);
    });
  });
});

describe('VersionedDecoder', () => {
  let decoder: VersionedDecoder;

  beforeEach(() => {
    // Create test data with various types
    const data = Buffer.concat([
      Buffer.from([0x80]), // Bool: true (bit 1 set)
      Buffer.from([0x00]), // Bool: false
      Buffer.from([0x05]), // VarInt: 5 (blob length)
      Buffer.from('Hello'), // Blob data
      Buffer.from([0x0A]), // VarInt: 10 (string length)
      Buffer.from('TestString'), // String data
      Buffer.from([0x03]), // VarInt: 3 (array length)
      Buffer.from([0x01, 0x02, 0x03]), // Array data (will be read as bits)
      Buffer.from([0x80]), // Optional: has value (bit 1 set)
      Buffer.from([0xFF]), // Optional value
      Buffer.from([0x01]), // Choice index (1, not 0)
      Buffer.from([0xAB])  // Choice value
    ]);
    decoder = new VersionedDecoder(data);
  });

  describe('basic type decoding', () => {
    it('should decode booleans', () => {
      decoder.reset();
      expect(decoder.decodeBool()).toBe(true);
      expect(decoder.decodeBool()).toBe(false);
    });

    it('should decode integers', () => {
      decoder.reset();
      const value = decoder.decodeInt({ size: 8 });
      expect(typeof value).toBe('number');
    });

    it('should decode blobs', () => {
      decoder.reset(2); // Skip bools
      const blob = decoder.decodeBlob({});
      expect(blob).toBeInstanceOf(Buffer);
      expect(blob.toString()).toBe('Hello');
    });

    it('should decode strings', () => {
      decoder.reset(7); // Skip to string data
      const str = decoder.decodeString();
      expect(str).toBe('TestString');
    });
  });

  describe('complex type decoding', () => {
    it('should decode arrays', () => {
      const mockTypeInfo = {
        type: 'array',
        element: { type: 'int', size: 8 }
      };

      decoder.reset(18); // Skip to array data
      const array = decoder.decodeArray(mockTypeInfo);
      expect(array).toBeInstanceOf(Array);
      expect(array.length).toBe(3);
    });

    it('should decode optional types with value', () => {
      const mockTypeInfo = {
        type: 'optional',
        element: { type: 'int', size: 8 }
      };

      decoder.reset(21); // Skip to optional data
      const optional = decoder.decodeOptional(mockTypeInfo);
      expect(optional).not.toBeNull();
    });

    it('should decode optional types without value', () => {
      const data = Buffer.from([0x00]); // No value
      const decoder2 = new VersionedDecoder(data);

      const mockTypeInfo = {
        type: 'optional',
        element: { type: 'int', size: 8 }
      };

      const optional = decoder2.decodeOptional(mockTypeInfo);
      expect(optional).toBeNull();
    });

    it('should decode choice types', () => {
      const mockTypeInfo = {
        type: 'choice',
        choices: [
          { name: 'option1', type: { type: 'int', size: 8 } },
          { name: 'option2', type: { type: 'int', size: 8 } }
        ]
      };

      decoder.reset(23); // Skip to choice data
      const choice = decoder.decodeChoice(mockTypeInfo);
      expect(choice).toHaveProperty('choice');
      expect(choice).toHaveProperty('value');
      expect(choice.choice).toBe('option2');
    });

    it('should throw error for invalid choice index', () => {
      const mockTypeInfo = {
        type: 'choice',
        choices: [
          { name: 'option1', type: { type: 'int', size: 8 } }
        ]
      };

      const data = Buffer.from([0x02, 0xFF]); // Invalid choice index 2
      const decoder2 = new VersionedDecoder(data);

      expect(() => decoder2.decodeChoice(mockTypeInfo)).toThrow('Invalid choice index: 2');
    });
  });

  describe('struct decoding', () => {
    it('should decode struct types', () => {
      const mockTypeInfo = {
        type: 'struct',
        fields: [
          { name: 'field1', type: { type: 'bool' } },
          { name: 'field2', type: { type: 'bool' } }
        ]
      };

      decoder.reset();
      const struct = decoder.decodeStruct(mockTypeInfo);
      expect(struct).toHaveProperty('field1');
      expect(struct).toHaveProperty('field2');
      expect(struct.field1).toBe(true);
      expect(struct.field2).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should throw error for unknown type', () => {
      const mockTypeInfo = { type: 'unknown' };
      expect(() => decoder.decodeValue(mockTypeInfo)).toThrow('Unknown type: unknown');
    });

    it('should throw error for invalid type info', () => {
      expect(() => decoder.decodeValue(null)).toThrow('Invalid type info');
      expect(() => decoder.decodeValue({})).toThrow('Invalid type info');
    });
  });

  describe('properties', () => {
    it('should report correct offset', () => {
      expect(decoder.offset).toBe(0);
      decoder.decodeBool();
      expect(decoder.offset).toBeGreaterThan(0);
    });

    it('should report remaining bytes', () => {
      const initialRemaining = decoder.remainingBytes;
      decoder.decodeBool();
      expect(decoder.remainingBytes).toBeLessThan(initialRemaining);
    });
  });
});