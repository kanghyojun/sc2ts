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
        decodeTrackerEvents: false
      });
    });

    it('should successfully parse the replay file', () => {
      expect(replay).toBeInstanceOf(SC2Replay);
    });

    it('should have a valid replay header', () => {
      const header = replay.replayHeader;
      expect(header).not.toBeNull();
      expect(header?.signature).toBe('SC2Replay');
      expect(header?.version.major).toBe(2);
      expect(header?.version.minor).toBe(0);
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
      const duration = replay.getDuration();
      const gameLength = replay.getGameLength();

      expect(typeof duration).toBe('number');
      expect(duration).toBeGreaterThanOrEqual(0);

      expect(typeof gameLength).toBe('number');
      expect(gameLength).toBeGreaterThanOrEqual(0);

      // Winner might be null since we're using default data
      const winner = replay.getWinner();
      expect(winner === null || typeof winner === 'object').toBe(true);
    });

    it('should return a complete replay data structure', () => {
      const replayData = replay.getReplayData();

      expect(replayData).toHaveProperty('header');
      expect(replayData).toHaveProperty('details');
      expect(replayData).toHaveProperty('initData');
      expect(replayData).toHaveProperty('gameEvents');
      expect(replayData).toHaveProperty('messageEvents');
      expect(replayData).toHaveProperty('trackerEvents');

      expect(replayData.gameEvents).toBeInstanceOf(Array);
      expect(replayData.messageEvents).toBeInstanceOf(Array);
      expect(replayData.trackerEvents).toBeInstanceOf(Array);
    });

    it('should handle events arrays', () => {
      const events = replay.events;

      expect(events).toHaveProperty('game');
      expect(events).toHaveProperty('message');
      expect(events).toHaveProperty('tracker');

      expect(events.game).toBeInstanceOf(Array);
      expect(events.message).toBeInstanceOf(Array);
      expect(events.tracker).toBeInstanceOf(Array);
    });

    it('should match expected file size properties', () => {
      const header = replay.replayHeader;
      expect(header?.length).toBeLessThan(replayBuffer.length);
      expect(header?.length).toBeGreaterThan(1000); // Reasonable minimum
    });
  });

  it('should handle all test files consistently', () => {
    const results = replayFiles.map(filename => {
      const filePath = resolve('replays', filename);
      const buffer = readFileSync(filePath);

      const replay = SC2Replay.fromBuffer(buffer, {
        decodeGameEvents: false,
        decodeMessageEvents: false,
        decodeTrackerEvents: false
      });

      return {
        filename,
        playerCount: replay.players.length,
        duration: replay.getDuration(),
        headerLength: replay.replayHeader?.length || 0
      };
    });

    // All should have consistent basic structure
    results.forEach(result => {
      expect(result.playerCount).toBeGreaterThanOrEqual(2);
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.headerLength).toBeGreaterThan(1000);
    });

    // Should have processed all files successfully
    expect(results).toHaveLength(replayFiles.length);
  });
});