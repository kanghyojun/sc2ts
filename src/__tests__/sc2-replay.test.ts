import { SC2Replay } from '../sc2-replay';
// import { MpqArchive } from '../mpq-archive';

describe('SC2Replay', () => {
  let mockBuffer: Buffer;

  beforeEach(() => {
    // Create a mock MPQ archive buffer with SC2 replay structure
    mockBuffer = Buffer.alloc(2048);

    // Write MPQ header
    mockBuffer.writeUInt32LE(0x1A51504D, 0);  // Magic
    mockBuffer.writeUInt32LE(0x20, 4);        // Header size
    mockBuffer.writeUInt32LE(0x800, 8);       // Archive size
    mockBuffer.writeUInt16LE(0x0000, 12);     // Format version
    mockBuffer.writeUInt16LE(0x0200, 14);     // Block size
    mockBuffer.writeUInt32LE(0x0100, 16);     // Hash table pos
    mockBuffer.writeUInt32LE(0x0200, 20);     // Block table pos
    mockBuffer.writeUInt32LE(0x0003, 24);     // Hash table size (3 files)
    mockBuffer.writeUInt32LE(0x0003, 28);     // Block table size (3 files)

    // Create hash entries for SC2 replay files
    const files = ['replay.details', 'replay.initData', 'replay.game.events'];

    for (let i = 0; i < files.length; i++) {
      const filename = files[i];
      let hash1 = 0;
      let hash2 = 0;

      for (let j = 0; j < filename.length; j++) {
        hash1 = ((hash1 << 5) + hash1 + filename.charCodeAt(j)) >>> 0;
        hash2 = ((hash2 << 7) + hash2 + filename.charCodeAt(j)) >>> 0;
      }

      const hashOffset = 0x100 + (i * 16);
      mockBuffer.writeUInt32LE(hash1, hashOffset);
      mockBuffer.writeUInt32LE(hash2, hashOffset + 4);
      mockBuffer.writeUInt16LE(0x0000, hashOffset + 8);  // locale
      mockBuffer.writeUInt16LE(0x0000, hashOffset + 10); // platform
      mockBuffer.writeUInt32LE(i, hashOffset + 12);      // blockIndex

      // Write block table entry
      const blockOffset = 0x200 + (i * 16);
      mockBuffer.writeUInt32LE(0x300 + (i * 0x100), blockOffset);  // filePos
      mockBuffer.writeUInt32LE(0x50, blockOffset + 4);             // compressedSize
      mockBuffer.writeUInt32LE(0x50, blockOffset + 8);             // fileSize
      mockBuffer.writeUInt32LE(0x80000000, blockOffset + 12);      // flags (EXISTS)
    }

    // Write some mock file data
    for (let i = 0; i < 3; i++) {
      const fileOffset = 0x300 + (i * 0x100);
      // Write some dummy data that looks like SC2 replay data
      mockBuffer.writeUInt8(0x01, fileOffset); // Version
      mockBuffer.writeUInt8(0x02, fileOffset + 1); // Player count
      for (let j = 2; j < 0x50; j++) {
        mockBuffer.writeUInt8(j % 256, fileOffset + j);
      }
    }
  });

  describe('fromBuffer', () => {
    it('should create SC2Replay from buffer', () => {
      // const listFile = `replay.details
// replay.initData
// replay.game.events
// replay.message.events
// replay.tracker.events`;

      const replay = SC2Replay.fromBuffer(mockBuffer, {
        decodeGameEvents: false,
        decodeMessageEvents: false,
        decodeTrackerEvents: false,
      });

      expect(replay).toBeInstanceOf(SC2Replay);
      expect(replay.replayHeader).not.toBeNull();
      expect(replay.replayDetails).not.toBeNull();
    });

    it('should parse replay header correctly', () => {
      const replay = SC2Replay.fromBuffer(mockBuffer);
      const header = replay.replayHeader;

      expect(header?.signature).toBe('SC2Replay');
      expect(header?.version.major).toBe(2);
      expect(header?.version.minor).toBe(0);
      expect(header?.version.build).toBeGreaterThan(0);
    });

    it('should parse replay details', () => {
      const replay = SC2Replay.fromBuffer(mockBuffer);
      const details = replay.replayDetails;

      expect(details).not.toBeNull();
      expect(details?.playerList).toBeInstanceOf(Array);
      expect(details?.playerList.length).toBeGreaterThan(0);
      expect(details?.title).toBeDefined();
    });

    it('should parse player list', () => {
      const replay = SC2Replay.fromBuffer(mockBuffer);
      const players = replay.players;

      expect(players).toBeInstanceOf(Array);
      expect(players.length).toBeGreaterThan(0);

      const player = players[0];
      expect(player.name).toBeDefined();
      expect(player.userId).toBeDefined();
      expect(player.teamId).toBeDefined();
    });

    it('should handle replay options', () => {
      const replay = SC2Replay.fromBuffer(mockBuffer, {
        decodeGameEvents: true,
        decodeMessageEvents: false,
        decodeTrackerEvents: false,
      });

      expect(replay.events.game).toBeInstanceOf(Array);
    });
  });

  describe('utility methods', () => {
    let replay: SC2Replay;

    beforeEach(() => {
      replay = SC2Replay.fromBuffer(mockBuffer, {
        decodeGameEvents: false,
        decodeMessageEvents: false,
        decodeTrackerEvents: false,
      });
    });

    it('should calculate game duration', () => {
      const duration = replay.getDuration();
      expect(typeof duration).toBe('number');
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('should get game length in loops', () => {
      const gameLength = replay.getGameLength();
      expect(typeof gameLength).toBe('number');
      expect(gameLength).toBeGreaterThanOrEqual(0);
    });

    it('should return replay data structure', () => {
      const replayData = replay.getReplayData();

      expect(replayData.header).toBeDefined();
      expect(replayData.details).toBeDefined();
      expect(replayData.initData).toBeDefined();
      expect(replayData.gameEvents).toBeInstanceOf(Array);
      expect(replayData.messageEvents).toBeInstanceOf(Array);
      expect(replayData.trackerEvents).toBeInstanceOf(Array);
    });

    it('should handle missing winner gracefully', () => {
      const winner = replay.getWinner();
      // Should be null since our mock data doesn't have a winner
      expect(winner).toBeNull();
    });
  });
});
