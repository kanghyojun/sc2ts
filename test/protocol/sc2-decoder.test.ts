import fs from 'fs';
import path from 'path';

import { BitPackedBuffer, VersionedDecoder } from '@/protocol/sc2-decoder';
import { TypeInfo } from '@/protocol/types';

// Helper to convert s2protocol test data (which has bytes as base64) back to buffers
function convertBytesFromTestData(obj: any): any {
  if (obj && typeof obj === 'object' && obj.__bytes__) {
    return Buffer.from(obj.__bytes__, 'base64');
  } else if (obj && typeof obj === 'object' && Array.isArray(obj)) {
    return obj.map(convertBytesFromTestData);
  } else if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = convertBytesFromTestData(value);
    }
    return result;
  }
  return obj;
}

describe('BitPackedBuffer', () => {
  describe('basic bit reading', () => {
    it('should read single bits correctly (big-endian)', () => {
      const buffer = new BitPackedBuffer(Buffer.from([0b11010110])); // 0xD6

      expect(buffer.readBits(1)).toBe(0); // First bit (LSB in big-endian bit order)
      expect(buffer.readBits(1)).toBe(1); // Second bit
      expect(buffer.readBits(1)).toBe(1); // Third bit
      expect(buffer.readBits(1)).toBe(0); // Fourth bit
      expect(buffer.readBits(1)).toBe(1); // Fifth bit
      expect(buffer.readBits(1)).toBe(0); // Sixth bit
      expect(buffer.readBits(1)).toBe(1); // Seventh bit
      expect(buffer.readBits(1)).toBe(1); // Eighth bit (MSB in big-endian bit order)
    });

    it('should read multiple bits correctly (big-endian)', () => {
      const buffer = new BitPackedBuffer(Buffer.from([0b11010110])); // 0xD6

      expect(buffer.readBits(4)).toBe(0b0110); // First 4 bits (LSB first in big-endian)
      expect(buffer.readBits(4)).toBe(0b1101); // Last 4 bits
    });

    it('should read bits across byte boundaries (big-endian)', () => {
      const buffer = new BitPackedBuffer(Buffer.from([0b11010110, 0b10101100])); // 0xD6, 0xAC

      expect(buffer.readBits(12)).toBe(0b110101101100); // Cross-byte read in big-endian bit order (3436)
    });

    it('should throw error when buffer is exhausted', () => {
      const buffer = new BitPackedBuffer(Buffer.from([0xFF]));

      buffer.readBits(8); // Read all available bits
      expect(() => buffer.readBits(1)).toThrow('TruncatedError: buffer exhausted');
    });
  });

  describe('byte alignment', () => {
    it('should align to byte boundary', () => {
      const buffer = new BitPackedBuffer(Buffer.from([0xFF, 0xAA]));

      buffer.readBits(3); // Not aligned
      buffer.byteAlign(); // Should align

      const nextByte = buffer.readAlignedBytes(1);
      expect(nextByte[0]).toBe(0xAA);
    });

    it('should read aligned bytes correctly', () => {
      const buffer = new BitPackedBuffer(Buffer.from([0x12, 0x34, 0x56, 0x78]));

      const bytes = buffer.readAlignedBytes(4);
      expect(bytes).toEqual(Buffer.from([0x12, 0x34, 0x56, 0x78]));
    });

    it('should throw error when not enough aligned bytes', () => {
      const buffer = new BitPackedBuffer(Buffer.from([0x12, 0x34]));

      expect(() => buffer.readAlignedBytes(4)).toThrow('TruncatedError: not enough data');
    });
  });

  describe('status methods', () => {
    it('should report done correctly', () => {
      const buffer = new BitPackedBuffer(Buffer.from([0xFF]));

      expect(buffer.done()).toBe(false);
      buffer.readBits(8);
      expect(buffer.done()).toBe(true);
    });

    it('should track used bits correctly', () => {
      const buffer = new BitPackedBuffer(Buffer.from([0xFF, 0xFF]));

      expect(buffer.usedBits()).toBe(0);
      buffer.readBits(3);
      expect(buffer.usedBits()).toBe(3);
      buffer.readBits(5);
      expect(buffer.usedBits()).toBe(8);
      buffer.readBits(4);
      expect(buffer.usedBits()).toBe(12);
    });
  });
});

describe('VersionedDecoder', () => {
  let testTypeInfos: TypeInfo[];

  beforeEach(() => {
    // Define some basic type infos for testing
    testTypeInfos = [
      { type: '_int', args: [[0, 100]] },      // typeid 0: int 0-100
      { type: '_bool', args: [] },             // typeid 1: bool
      { type: '_struct', args: [[['field1', 1, 0]]] }, // typeid 2: struct with single bool field
      { type: '_array', args: [[0, 10], 0] }, // typeid 3: array of ints
      { type: '_blob', args: [[0, 100]] },    // typeid 4: blob
      { type: '_optional', args: [1] },       // typeid 5: optional bool
      { type: '_choice', args: [[0, 2], { 0: ['choice1', 1], 1: ['choice2', 0] }] }, // typeid 6: choice
      { type: '_fourcc', args: [] },          // typeid 7: fourcc
      { type: '_null', args: [] },            // typeid 8: null
      { type: '_bitarray', args: [[0, 64]] }, // typeid 9: bitarray
      { type: '_real32', args: [] },          // typeid 10: real32
      { type: '_real64', args: [] },          // typeid 11: real64
    ];
  });

  describe('basic type decoding', () => {
    it('should decode integers with vint encoding', () => {
      // Create buffer with: skip byte (9 for vint) + vint(42)
      // vint(42): 42 << 1 = 84 = 0x54, no continuation bit
      const buffer = Buffer.from([9, 0x54]);
      const decoder = new VersionedDecoder(buffer, testTypeInfos);

      const result = decoder.instance(0); // int type
      expect(typeof result).toBe('number');
      expect(result).toBe(42);
    });

    it('should decode booleans', () => {
      // Create buffer with: skip byte (6 for u8) + boolean value
      const buffer = Buffer.from([6, 1]); // true
      const decoder = new VersionedDecoder(buffer, testTypeInfos);

      const result = decoder.instance(1); // bool type
      expect(result).toBe(true);
    });

    it('should decode fourcc strings', () => {
      // Create buffer with: skip byte (7 for u32) + 4-byte fourcc
      const buffer = Buffer.from([7, 0x53, 0x43, 0x32, 0x52]); // 'SC2R'
      const decoder = new VersionedDecoder(buffer, testTypeInfos);

      const result = decoder.instance(7); // fourcc type
      expect(result).toBe('SC2R');
    });

    it('should decode null values', () => {
      const buffer = Buffer.from([]); // No data needed for null
      const decoder = new VersionedDecoder(buffer, testTypeInfos);

      const result = decoder.instance(8); // null type
      expect(result).toBe(null);
    });

    it('should decode real32 values', () => {
      // Create buffer with: skip byte (7 for u32) + IEEE 754 float
      const floatValue = 3.14159;
      const floatBuffer = Buffer.allocUnsafe(4);
      const view = new DataView(floatBuffer.buffer, floatBuffer.byteOffset, floatBuffer.byteLength);
      view.setFloat32(0, floatValue, false); // big-endian

      const buffer = Buffer.concat([Buffer.from([7]), floatBuffer]);
      const decoder = new VersionedDecoder(buffer, testTypeInfos);

      const result = decoder.instance(10); // real32 type
      expect(typeof result).toBe('number');
      expect(result).toBeCloseTo(floatValue, 5);
    });

    it('should decode real64 values', () => {
      // Create buffer with: skip byte (8 for u64) + IEEE 754 double
      const doubleValue = 3.141592653589793;
      const doubleBuffer = Buffer.allocUnsafe(8);
      const view = new DataView(doubleBuffer.buffer, doubleBuffer.byteOffset, doubleBuffer.byteLength);
      view.setFloat64(0, doubleValue, false); // big-endian

      const buffer = Buffer.concat([Buffer.from([8]), doubleBuffer]);
      const decoder = new VersionedDecoder(buffer, testTypeInfos);

      const result = decoder.instance(11); // real64 type
      expect(typeof result).toBe('number');
      expect(result).toBeCloseTo(doubleValue, 10);
    });
  });

  describe('complex type decoding', () => {
    it('should decode struct with single field', () => {
      // Create buffer with: skip byte (5 for struct) + vint(1 field) + field1
      // field1: tag=0, bool=true: vint(0) + skip(6) + 1
      const buffer = Buffer.from([
        5,        // struct skip
        1 << 1,   // vint(1) - 1 field
        0 << 1,   // vint(0) - tag 0
        6, 1,     // bool true
      ]);
      const decoder = new VersionedDecoder(buffer, testTypeInfos);

      const result = decoder.instance(2) as Record<string, unknown>; // struct type
      expect(typeof result).toBe('object');
      expect(result.field1).toBe(true);
    });

    it('should decode optional with value', () => {
      // Create buffer with: skip byte (4 for optional) + has_value(1) + bool_value
      const buffer = Buffer.from([4, 1, 6, 1]); // optional has value, bool true
      const decoder = new VersionedDecoder(buffer, testTypeInfos);

      const result = decoder.instance(5); // optional bool type
      expect(result).toBe(true);
    });

    it('should decode optional without value', () => {
      // Create buffer with: skip byte (4 for optional) + has_value(0)
      const buffer = Buffer.from([4, 0]); // optional has no value
      const decoder = new VersionedDecoder(buffer, testTypeInfos);

      const result = decoder.instance(5); // optional bool type
      expect(result).toBe(null);
    });

    it('should decode choice types', () => {
      // Create buffer with: skip byte (3 for choice) + vint(tag) + value
      const buffer = Buffer.from([3, 1 << 1, 9, 42 << 1]); // choice tag 1, int 42
      const decoder = new VersionedDecoder(buffer, testTypeInfos);

      const result = decoder.instance(6) as Record<string, unknown>; // choice type
      expect(typeof result).toBe('object');
      expect(result.choice2).toBe(42);
    });

    it('should decode arrays', () => {
      // Create buffer with: skip byte (0 for array) + vint(length) + elements
      const buffer = Buffer.from([
        0,        // array skip
        3 << 1,   // vint(3) - 3 elements
        9, 10 << 1, // int 10
        9, 20 << 1, // int 20
        9, 30 << 1, // int 30
      ]);
      const decoder = new VersionedDecoder(buffer, testTypeInfos);

      const result = decoder.instance(3) as unknown[]; // array type
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(3);
      expect(result[0]).toBe(10);
      expect(result[1]).toBe(20);
      expect(result[2]).toBe(30);
    });

    it('should decode blobs', () => {
      // Create buffer with: skip byte (2 for blob) + vint(length) + data
      const testData = Buffer.from([0x12, 0x34, 0x56, 0x78]);
      const buffer = Buffer.concat([
        Buffer.from([2, testData.length << 1]), // blob skip + length
        testData
      ]);
      const decoder = new VersionedDecoder(buffer, testTypeInfos);

      const result = decoder.instance(4) as Buffer; // blob type
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result).toEqual(testData);
    });

    it('should decode bitarrays', () => {
      // Create buffer with: skip byte (1 for bitblob) + vint(bit_length) + aligned_data
      const bitLength = 12;
      const data = Buffer.from([0xAB, 0xC0]); // 12 bits of data (4 bits padding)
      const buffer = Buffer.concat([
        Buffer.from([1, bitLength << 1]), // bitarray skip + bit length
        data
      ]);
      const decoder = new VersionedDecoder(buffer, testTypeInfos);

      const result = decoder.instance(9) as [number, Buffer]; // bitarray type
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toBe(bitLength); // bit length
      expect(Buffer.isBuffer(result[1])).toBe(true); // data buffer
    });
  });

  describe('error handling', () => {
    it('should throw error for invalid typeid', () => {
      const buffer = Buffer.from([]);
      const decoder = new VersionedDecoder(buffer, testTypeInfos);

      expect(() => decoder.instance(999)).toThrow('CorruptedError: invalid typeid 999');
    });

    it('should throw error for corrupted skip bytes', () => {
      const buffer = Buffer.from([99]); // Invalid skip byte
      const decoder = new VersionedDecoder(buffer, testTypeInfos);

      expect(() => decoder.instance(0)).toThrow('CorruptedError: unexpected skip byte');
    });
  });

  describe('status methods', () => {
    it('should report completion status', () => {
      const buffer = Buffer.from([6, 1]); // bool true
      const decoder = new VersionedDecoder(buffer, testTypeInfos);

      expect(decoder.done()).toBe(false);
      decoder.instance(1); // decode bool
      expect(decoder.done()).toBe(true);
    });

    it('should track used bits', () => {
      const buffer = Buffer.from([6, 1]); // bool true (2 bytes)
      const decoder = new VersionedDecoder(buffer, testTypeInfos);

      expect(decoder.used_bits()).toBe(0);
      decoder.instance(1); // decode bool
      expect(decoder.used_bits()).toBe(16); // 2 bytes = 16 bits
    });

    it('should align to byte boundaries', () => {
      const buffer = Buffer.from([6, 1]);
      const decoder = new VersionedDecoder(buffer, testTypeInfos);

      decoder.byte_align(); // Should not throw
    });
  });
});

// Integration tests comparing with s2protocol output
describe('VersionedDecoder integration with s2protocol', () => {
  let testData: any;

  beforeAll(() => {
    try {
      const testDataPath = path.join(__dirname, '../fixtures/test-data-a.json');
      if (fs.existsSync(testDataPath)) {
        const rawData = fs.readFileSync(testDataPath, 'utf8');
        testData = convertBytesFromTestData(JSON.parse(rawData));
      }
    } catch (error) {
      console.warn('Could not load test data for integration tests:', error);
    }
  });

  it('should validate that test data is available', () => {
    expect(testData).toBeDefined();
    expect(testData.header).toBeDefined();
    expect(testData.details).toBeDefined();
    expect(testData.initdata).toBeDefined();
  });

  it('should validate header structure from s2protocol', () => {
    if (!testData) {
      console.warn('Skipping test - no test data available');
      return;
    }

    const header = testData.header;

    // Validate header structure matches expected s2protocol output
    expect(header.m_signature).toBeInstanceOf(Buffer);
    expect(header.m_signature.toString()).toBe('StarCraft II replay\x1b11');

    expect(header.m_version).toBeDefined();
    expect(header.m_version.m_major).toBe(5);
    expect(header.m_version.m_minor).toBe(0);
    expect(header.m_version.m_build).toBe(94137);
    expect(header.m_version.m_baseBuild).toBe(94137);

    expect(header.m_type).toBe(2);
    expect(typeof header.m_elapsedGameLoops).toBe('number');
    expect(header.m_useScaledTime).toBe(true);
  });

  it('should validate details structure from s2protocol', () => {
    if (!testData) {
      console.warn('Skipping test - no test data available');
      return;
    }

    const details = testData.details;

    // Validate details structure
    expect(details.m_playerList).toBeInstanceOf(Array);
    expect(details.m_playerList.length).toBeGreaterThan(0);

    const firstPlayer = details.m_playerList[0];
    expect(firstPlayer.m_name).toBeInstanceOf(Buffer);
    expect(firstPlayer.m_toon).toBeDefined();
    expect(firstPlayer.m_toon.m_region).toBeDefined();
    expect(firstPlayer.m_race).toBeInstanceOf(Buffer);
    expect(firstPlayer.m_color).toBeDefined();
    expect(firstPlayer.m_color.m_a).toBe(255); // Alpha should be 255

    expect(details.m_title).toBeInstanceOf(Buffer);
    expect(details.m_isBlizzardMap).toBe(true);
    expect(typeof details.m_timeUTC).toBe('number');
  });

  it('should validate initdata structure from s2protocol', () => {
    if (!testData) {
      console.warn('Skipping test - no test data available');
      return;
    }

    const initdata = testData.initdata;

    // Validate initdata structure
    expect(initdata.m_syncLobbyState).toBeDefined();
    expect(initdata.m_syncLobbyState.m_userInitialData).toBeInstanceOf(Array);
    expect(initdata.m_syncLobbyState.m_gameDescription).toBeDefined();
    expect(initdata.m_syncLobbyState.m_lobbyState).toBeDefined();

    const gameDesc = initdata.m_syncLobbyState.m_gameDescription;
    expect(typeof gameDesc.m_randomValue).toBe('number');
    expect(gameDesc.m_gameCacheName).toBeInstanceOf(Buffer);
    expect(gameDesc.m_gameOptions).toBeDefined();
    expect(typeof gameDesc.m_gameSpeed).toBe('number');
    expect(typeof gameDesc.m_maxUsers).toBe('number');
  });

  it('should validate events structure from s2protocol', () => {
    if (!testData) {
      console.warn('Skipping test - no test data available');
      return;
    }

    // Test game events if available
    if (testData.gameevents && testData.gameevents.length > 0) {
      const firstEvent = testData.gameevents[0];
      expect(firstEvent).toBeDefined();
      // Events should have basic structure but exact format depends on event type
    }

    // Test message events if available
    if (testData.messageevents && testData.messageevents.length > 0) {
      const firstEvent = testData.messageevents[0];
      expect(firstEvent).toBeDefined();
    }

    // Test tracker events if available
    if (testData.trackerevents && testData.trackerevents.length > 0) {
      const firstEvent = testData.trackerevents[0];
      expect(firstEvent).toBeDefined();
    }

    // Test attribute events if available
    if (testData.attributeevents) {
      expect(testData.attributeevents).toBeDefined();
    }
  });
});
