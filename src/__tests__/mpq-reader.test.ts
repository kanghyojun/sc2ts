import { MpqReader } from '../mpq-reader';
import { MpqInvalidFormatError } from '../errors';

describe('MpqReader', () => {
  describe('Direct MPQ Header (0x1A)', () => {
    let mockBuffer: Buffer;

    beforeEach(() => {
      // Create a mock buffer with direct MPQ header
      mockBuffer = Buffer.alloc(1024);

      // Write direct MPQ header (MPQ\x1A)
      mockBuffer.writeUInt32LE(0x1A51504D, 0);  // Magic 'MPQ\x1A'
      mockBuffer.writeUInt32LE(0x20, 4);        // Header size
      mockBuffer.writeUInt32LE(0x400, 8);       // Archive size
      mockBuffer.writeUInt16LE(0x0000, 12);     // Format version
      mockBuffer.writeUInt16LE(0x0200, 14);     // Block size
      mockBuffer.writeUInt32LE(0x0100, 16);     // Hash table pos
      mockBuffer.writeUInt32LE(0x0200, 20);     // Block table pos
      mockBuffer.writeUInt32LE(0x0001, 24);     // Hash table size
      mockBuffer.writeUInt32LE(0x0001, 28);     // Block table size
    });

    it('should find direct MPQ header at offset 0', () => {
      const reader = new MpqReader(mockBuffer);
      const headerOffset = reader.findMpqHeader();
      expect(headerOffset).toBe(0);
    });

    it('should read direct MPQ header correctly', () => {
      const reader = new MpqReader(mockBuffer);
      const header = reader.readMpqHeader();

      expect(header.magic).toBe(0x1A51504D);
      expect(header.headerSize).toBe(0x20);
      expect(header.archiveSize).toBe(0x400);
      expect(header.formatVersion).toBe(0);
      expect(header.blockSize).toBe(0x0200);
      expect(header.hashTablePos).toBe(0x0100);
      expect(header.blockTablePos).toBe(0x0200);
      expect(header.hashTableSize).toBe(1);
      expect(header.blockTableSize).toBe(1);
    });

    it('should find direct MPQ header at non-zero offset', () => {
      // Create buffer with MPQ header at offset 0x100
      const bufferWithOffset = Buffer.alloc(1024);
      mockBuffer.copy(bufferWithOffset, 0x100);

      const reader = new MpqReader(bufferWithOffset);
      const headerOffset = reader.findMpqHeader();
      expect(headerOffset).toBe(0x100);
    });
  });

  describe('User Data Header (0x1B)', () => {
    let mockBuffer: Buffer;

    beforeEach(() => {
      // Create a mock buffer with user data header followed by MPQ header
      mockBuffer = Buffer.alloc(1024);

      // Write user data header (MPQ\x1B) at offset 0
      mockBuffer.writeUInt32LE(0x1B51504D, 0);  // Magic 'MPQ\x1B'
      mockBuffer.writeUInt32LE(0x200, 4);       // User data size
      mockBuffer.writeUInt32LE(0x100, 8);       // MPQ header offset (relative to user data header start)
      mockBuffer.writeUInt32LE(0x10, 12);       // User data header size

      // Write actual MPQ header at offset 0x100
      mockBuffer.writeUInt32LE(0x1A51504D, 0x100);  // Magic 'MPQ\x1A'
      mockBuffer.writeUInt32LE(0x20, 0x104);         // Header size
      mockBuffer.writeUInt32LE(0x400, 0x108);        // Archive size
      mockBuffer.writeUInt16LE(0x0001, 0x10C);       // Format version
      mockBuffer.writeUInt16LE(0x0200, 0x10E);       // Block size
      mockBuffer.writeUInt32LE(0x0200, 0x110);       // Hash table pos
      mockBuffer.writeUInt32LE(0x0300, 0x114);       // Block table pos
      mockBuffer.writeUInt32LE(0x0002, 0x118);       // Hash table size
      mockBuffer.writeUInt32LE(0x0002, 0x11C);       // Block table size
    });

    it('should find MPQ header through user data header at offset 0', () => {
      const reader = new MpqReader(mockBuffer);
      const headerOffset = reader.findMpqHeader();
      expect(headerOffset).toBe(0x100); // Should return actual MPQ header offset, not user data header offset
    });

    it('should read user data and navigate to actual MPQ header', () => {
      const reader = new MpqReader(mockBuffer);
      const header = reader.readMpqHeader();

      // Should have read the actual MPQ header, not the user data header
      expect(header.magic).toBe(0x1A51504D);
      expect(header.headerSize).toBe(0x20);
      expect(header.archiveSize).toBe(0x400);
      expect(header.formatVersion).toBe(1);
      expect(header.blockSize).toBe(0x0200);
      expect(header.hashTablePos).toBe(0x0200);
      expect(header.blockTablePos).toBe(0x0300);
      expect(header.hashTableSize).toBe(2);
      expect(header.blockTableSize).toBe(2);
    });

    it('should read user data header directly', () => {
      const reader = new MpqReader(mockBuffer);
      reader.seek(0);
      const userData = reader.readMpqUserData();

      expect(userData.magic).toBe(0x1B51504D);
      expect(userData.userDataSize).toBe(0x200);
      expect(userData.mpqHeaderOffset).toBe(0x100);
      expect(userData.userDataHeaderSize).toBe(0x10);
    });

    it('should throw error if MPQ header at offset is invalid', () => {
      // Corrupt the actual MPQ header
      mockBuffer.writeUInt32LE(0x12345678, 0x100); // Invalid magic

      const reader = new MpqReader(mockBuffer);
      expect(() => reader.readMpqHeader()).toThrow(MpqInvalidFormatError);
      // The findMpqHeader will not find the user data header as valid since the MPQ header it points to is invalid
      expect(() => reader.readMpqHeader()).toThrow(/No valid MPQ header found/);
    });

    it('should find MPQ header through user data header at non-zero offset', () => {
      // Create buffer with user data header at offset 0x50
      const bufferWithOffset = Buffer.alloc(1024);
      mockBuffer.copy(bufferWithOffset, 0x50);

      // Update the MPQ header offset in the copied user data header (absolute offset)
      bufferWithOffset.writeUInt32LE(0x150, 0x50 + 8); // MPQ header at absolute offset 0x150

      const reader = new MpqReader(bufferWithOffset);
      const headerOffset = reader.findMpqHeader();
      expect(headerOffset).toBe(0x150); // Should return absolute MPQ header offset
    });
  });

  describe('Error handling', () => {
    it('should throw error for invalid MPQ magic signature', () => {
      const invalidBuffer = Buffer.alloc(1024);
      invalidBuffer.writeUInt32LE(0x12345678, 0); // Invalid magic

      const reader = new MpqReader(invalidBuffer);
      expect(() => reader.readMpqHeader()).toThrow(MpqInvalidFormatError);
      expect(() => reader.readMpqHeader()).toThrow(/No valid MPQ header found/);
    });

    it('should throw error for invalid user data magic signature', () => {
      const invalidBuffer = Buffer.alloc(1024);
      invalidBuffer.writeUInt32LE(0x12345678, 0); // Invalid magic

      const reader = new MpqReader(invalidBuffer);
      reader.seek(0);
      expect(() => reader.readMpqUserData()).toThrow(MpqInvalidFormatError);
      expect(() => reader.readMpqUserData()).toThrow(/Invalid MPQ user data magic signature/);
    });

    it('should throw error when no valid MPQ header found', () => {
      const emptyBuffer = Buffer.alloc(100);

      const reader = new MpqReader(emptyBuffer);
      expect(() => reader.findMpqHeader()).toThrow(MpqInvalidFormatError);
      expect(() => reader.findMpqHeader()).toThrow(/No valid MPQ header found/);
    });
  });

  describe('Extended headers', () => {
    it('should handle format version 2 extended header', () => {
      const mockBuffer = Buffer.alloc(1024);

      // Write MPQ header with format version 2
      mockBuffer.writeUInt32LE(0x1A51504D, 0);  // Magic
      mockBuffer.writeUInt32LE(0x2C, 4);        // Header size (44 bytes for v2)
      mockBuffer.writeUInt32LE(0x400, 8);       // Archive size
      mockBuffer.writeUInt16LE(0x0002, 12);     // Format version 2
      mockBuffer.writeUInt16LE(0x0200, 14);     // Block size
      mockBuffer.writeUInt32LE(0x0100, 16);     // Hash table pos
      mockBuffer.writeUInt32LE(0x0200, 20);     // Block table pos
      mockBuffer.writeUInt32LE(0x0001, 24);     // Hash table size
      mockBuffer.writeUInt32LE(0x0001, 28);     // Block table size

      // Extended fields for v2
      mockBuffer.writeUInt32LE(0x12345678, 32); // hiBlockTablePos64 low
      mockBuffer.writeUInt32LE(0x9ABCDEF0, 36); // hiBlockTablePos64 high
      mockBuffer.writeUInt16LE(0x1234, 40);     // hashTablePosHi
      mockBuffer.writeUInt16LE(0x5678, 42);     // blockTablePosHi

      const reader = new MpqReader(mockBuffer);
      const header = reader.readMpqHeader();

      expect(header.formatVersion).toBe(2);
      expect(header.hiBlockTablePos64).toBe(0x9ABCDEF012345678n);
      expect(header.hashTablePosHi).toBe(0x1234);
      expect(header.blockTablePosHi).toBe(0x5678);
    });
  });

  describe('Basic read methods', () => {
    let reader: MpqReader;

    beforeEach(() => {
      const buffer = Buffer.alloc(32);
      buffer.writeUInt32LE(0x1A51504D, 0);
      buffer.writeUInt16LE(0x1234, 4);
      reader = new MpqReader(buffer);
    });

    it('should read UInt32LE correctly', () => {
      const value = reader.readUInt32LE();
      expect(value).toBe(0x1A51504D);
      expect(reader.position).toBe(4);
    });

    it('should read UInt16LE correctly', () => {
      reader.seek(4);
      const value = reader.readUInt16LE();
      expect(value).toBe(0x1234);
      expect(reader.position).toBe(6);
    });

    it('should read bytes correctly', () => {
      const bytes = reader.readBytes(4);
      expect(bytes.length).toBe(4);
      expect(reader.position).toBe(4);
    });

    it('should seek to correct position', () => {
      reader.seek(10);
      expect(reader.position).toBe(10);
    });

    it('should return correct buffer length', () => {
      expect(reader.length).toBe(32);
    });
  });
});