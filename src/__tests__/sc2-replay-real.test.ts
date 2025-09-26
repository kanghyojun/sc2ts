// import { hash } from 'crypto';
import { SC2Replay } from '../sc2-replay';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('SC2Replay - Real Files', () => {
  const replayFiles = ['a.SC2Replay', 'b.SC2Replay', 'c.SC2Replay'];

  describe.each(replayFiles)('Real replay file: %s', (filename) => {
    let replayBuffer: Buffer;
    let replay: SC2Replay;

    beforeAll(() => {
      const filePath = resolve('replays', filename);
      replayBuffer = readFileSync(filePath);

      // Parse with minimal options to avoid errors from missing files
      replay = SC2Replay.fromBuffer(replayBuffer, {
        decodeGameEvents: false,
        decodeMessageEvents: false,
        decodeTrackerEvents: false,
        decodeInitData: false,
      });
    });

    it('should successfully parse the replay file', () => {
      expect(replay).toBeInstanceOf(SC2Replay);
    });

    it('should have a valid replay header', () => {
      const header = replay.replayHeader;
      expect(header).not.toBeNull();
      expect(header?.signature).toContain('StarCraft II replay');
      expect(header?.version.major).toBeGreaterThanOrEqual(2); // Real files may have higher version
      expect(header?.version.minor).toBeGreaterThanOrEqual(0);
      expect(header?.version.build).toBeGreaterThan(0);
      expect(header?.length).toBeGreaterThan(0);
    });

    it('should have replay details with default values', () => {
      const details = replay.replayDetails;
      expect(details).not.toBeNull();
      expect(details?.title).toBeDefined();
      expect(details?.playerList).toBeInstanceOf(Array);
      expect(details?.gameSpeed).toBeGreaterThan(0);
    });

    it('should have at least 2 players', () => {
      const players = replay.players;
      expect(players).toBeInstanceOf(Array);
      expect(players.length).toBeGreaterThanOrEqual(2);

      players.forEach((player, index) => {
        expect(player.name).toBeDefined();
        expect(player.teamId).toBeDefined();
        expect(player.userId).toBe(index);
        expect(player.color).toHaveProperty('r');
        expect(player.color).toHaveProperty('g');
        expect(player.color).toHaveProperty('b');
        expect(player.color).toHaveProperty('a');
      });
    });

    it('should return valid utility values', () => {
      const duration = replay.duration;
      const gameLength = replay.gameLength;

      expect(typeof duration).toBe('number');
      expect(duration).toBeGreaterThanOrEqual(0);

      expect(typeof gameLength).toBe('number');
      expect(gameLength).toBeGreaterThanOrEqual(0);

      // Winner might be null since we're using default data
      const winner = replay.winner;
      expect(winner === null || typeof winner === 'object').toBe(true);
    });

    it('should provide direct access to all replay data components', () => {
      expect(replay.replayHeader).toBeDefined();
      expect(replay.replayDetails).toBeDefined();
      expect(replay.replayInitData).toBeDefined();

      expect(replay.gameEvents).toBeInstanceOf(Array);
      expect(replay.messageEvents).toBeInstanceOf(Array);
      expect(replay.trackerEvents).toBeInstanceOf(Array);
    });

    it('should handle events arrays', () => {
      expect(replay.gameEvents).toBeInstanceOf(Array);
      expect(replay.messageEvents).toBeInstanceOf(Array);
      expect(replay.trackerEvents).toBeInstanceOf(Array);
    });

    it('should match expected file size properties', () => {
      const header = replay.replayHeader;
      expect(header?.length).toBeLessThan(replayBuffer.length);
      expect(header?.length).toBeGreaterThan(50); // Reasonable minimum for user data content
    });

    it('should parse MPQ archive header correctly', () => {
      // Test that parseHeader (via parseSync) correctly extracts MPQ header values
      // This tests the underlying MPQ archive parsing through SC2Replay
      const mpqArchive = replay['mpqArchive']; // Access private property for testing
      const header = mpqArchive.archiveHeader;

      expect(header).not.toBeNull();
      expect(header!.magic).toBe(441536589); // MPQ signature
      expect(header!.formatVersion).toBe(3); // SC2 uses format version 3
      expect(header!.headerSize).toBeGreaterThan(0);
      expect(header!.archiveSize).toBeGreaterThan(0);
      expect(header!.hashTableSize).toBeGreaterThan(0);
      expect(header!.blockTableSize).toBeGreaterThan(0);
    });

  });

  describe('parseHeader functionality', () => {
    it('should parse SC2ReplayHeader correctly from a.SC2Replay using SC2Replay.parse() (regression test)', () => {
      // Regression test for SC2Replay parseHeader - validates SC2ReplayHeader structure from a.SC2Replay
      // This test prevents regression of SC2 replay header parsing bugs
      // Updated to match actual decoded values from the real replay file
      const expectedSC2Header = {
        signature: 'StarCraft II replay11',
        version: {
          major: 5, // Actual major version from real replay
          minor: 0,
          revision: 14, // Actual revision from real replay
          build: 94137,
        },
        length: 115, // Actual length of user data content
      };

      const replayPath = resolve('replays', 'a.SC2Replay');
      const replayBuffer = readFileSync(replayPath);
      const replay = SC2Replay.fromBuffer(replayBuffer, {
        decodeGameEvents: false,
        decodeMessageEvents: false,
        decodeTrackerEvents: false,
      });

      const header = replay.replayHeader;

      expect(header).not.toBeNull();
      expect(header!.signature).toContain('StarCraft II replay');
      expect(header!.version.major).toBe(expectedSC2Header.version.major);
      expect(header!.version.minor).toBe(expectedSC2Header.version.minor);
      expect(header!.version.revision).toBe(expectedSC2Header.version.revision);
      expect(header!.version.build).toBe(expectedSC2Header.version.build);
      expect(header!.length).toBe(expectedSC2Header.length);
    });

    it('should parse MPQ archive header correctly from a.SC2Replay (regression test)', () => {
      // Regression test for MPQ parseHeader - validates against known good MPQ header values from a.SC2Replay
      // This test prevents regression of MPQ header parsing bugs by testing against actual SC2 replay data
      const expectedMpqHeader = {
        magic: 441536589,
        headerSize: 208,
        archiveSize: 60521,
        formatVersion: 3,
        blockSize: 5,
        hashTablePos: 59737,
        blockTablePos: 60249,
        hashTableSize: 32,
        blockTableSize: 17,
        hashTablePosHi: 0,
        blockTablePosHi: 0
      };

      const replayPath = resolve('replays', 'a.SC2Replay');
      const replayBuffer = readFileSync(replayPath);
      const replay = SC2Replay.fromBuffer(replayBuffer, {
        decodeGameEvents: false,
        decodeMessageEvents: false,
        decodeTrackerEvents: false,
      });

      const mpqArchive = replay['mpqArchive']; // Access private property for testing
      const header = mpqArchive.archiveHeader;

      expect(header).not.toBeNull();
      expect(header!.magic).toBe(expectedMpqHeader.magic);
      expect(header!.headerSize).toBe(expectedMpqHeader.headerSize);
      expect(header!.archiveSize).toBe(expectedMpqHeader.archiveSize);
      expect(header!.formatVersion).toBe(expectedMpqHeader.formatVersion);
      expect(header!.blockSize).toBe(expectedMpqHeader.blockSize);
      expect(header!.hashTablePos).toBe(expectedMpqHeader.hashTablePos);
      expect(header!.blockTablePos).toBe(expectedMpqHeader.blockTablePos);
      expect(header!.hashTableSize).toBe(expectedMpqHeader.hashTableSize);
      expect(header!.blockTableSize).toBe(expectedMpqHeader.blockTableSize);
      expect(header!.hashTablePosHi).toBe(expectedMpqHeader.hashTablePosHi);
      expect(header!.blockTablePosHi).toBe(expectedMpqHeader.blockTablePosHi);
    });
  });

  it('should handle all test files consistently', () => {
    const results = replayFiles.map(filename => {
      const filePath = resolve('replays', filename);
      const buffer = readFileSync(filePath);

      const replay = SC2Replay.fromBuffer(buffer, {
        decodeGameEvents: false,
        decodeMessageEvents: false,
        decodeTrackerEvents: false,
      });

      return {
        filename,
        playerCount: replay.players.length,
        duration: replay.duration,
        headerLength: replay.replayHeader?.length || 0,
      };
    });

    // All should have consistent basic structure
    results.forEach(result => {
      expect(result.playerCount).toBeGreaterThanOrEqual(2);
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.headerLength).toBeGreaterThan(50);
    });

    // Should have processed all files successfully
    expect(results).toHaveLength(replayFiles.length);
  });

});
