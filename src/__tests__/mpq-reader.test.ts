import { MpqReader } from '../mpq-reader';
import { MpqInvalidFormatError } from '../errors';

describe('MpqReader', () => {
  let reader: MpqReader;

  beforeEach(() => {
    // Create a mock MPQ header buffer
    const buffer = Buffer.alloc(512);
    // Write MPQ magic signature (MPQ\x1A)
    buffer.writeUInt32LE(0x1A51504D, 0);
    // Write header size
    buffer.writeUInt32LE(0x20, 4);
    // Write archive size
    buffer.writeUInt32LE(0x1000, 8);
    // Write format version
    buffer.writeUInt16LE(0x0000, 12);
    // Write block size
    buffer.writeUInt16LE(0x0200, 14);
    // Write hash table position
    buffer.writeUInt32LE(0x0100, 16);
    // Write block table position
    buffer.writeUInt32LE(0x0200, 20);
    // Write hash table size
    buffer.writeUInt32LE(0x0010, 24);
    // Write block table size
    buffer.writeUInt32LE(0x0008, 28);

    reader = new MpqReader(buffer);
  });

  describe('readMpqHeader', () => {
    it('should read a valid MPQ header', () => {
      const header = reader.readMpqHeader();

      expect(header.magic).toBe(0x1A51504D);
      expect(header.headerSize).toBe(0x20);
      expect(header.archiveSize).toBe(0x1000);
      expect(header.formatVersion).toBe(0x0000);
      expect(header.blockSize).toBe(0x0200);
      expect(header.hashTablePos).toBe(0x0100);
      expect(header.blockTablePos).toBe(0x0200);
      expect(header.hashTableSize).toBe(0x0010);
      expect(header.blockTableSize).toBe(0x0008);
    });

    it('should throw error for invalid magic signature', () => {
      const invalidBuffer = Buffer.alloc(32);
      invalidBuffer.writeUInt32LE(0x12345678, 0);
      const invalidReader = new MpqReader(invalidBuffer);

      expect(() => invalidReader.readMpqHeader()).toThrow(MpqInvalidFormatError);
    });
  });

  describe('read methods', () => {
    it('should read UInt32LE correctly', () => {
      const value = reader.readUInt32LE();
      expect(value).toBe(0x1A51504D);
      expect(reader.position).toBe(4);
    });

    it('should read UInt16LE correctly', () => {
      reader.seek(12);
      const value = reader.readUInt16LE();
      expect(value).toBe(0x0000);
      expect(reader.position).toBe(14);
    });

    it('should read bytes correctly', () => {
      const bytes = reader.readBytes(4);
      expect(bytes.length).toBe(4);
      expect(reader.position).toBe(4);
    });
  });

  describe('seek and position', () => {
    it('should seek to correct position', () => {
      reader.seek(100);
      expect(reader.position).toBe(100);
    });

    it('should return correct buffer length', () => {
      expect(reader.length).toBe(512);
    });
  });
});