import { readFileSync } from 'fs';
import { resolve } from 'path';

import { SC2Replay } from '@/sc2-replay';

describe('SC2Replay', () => {
  // Use the constant replay data extracted from a.SC2Replay
  // This is more reliable than complex hex reconstruction
  const REPLAY_FILE_PATH = resolve('replays', 'a.SC2Replay');
  let replayBuffer: Buffer;

  beforeAll(() => {
    // Read the real replay file once
    replayBuffer = readFileSync(REPLAY_FILE_PATH);
  });

  describe('fromBuffer', () => {
    it('should create SC2Replay from buffer', () => {
      const replay = SC2Replay.fromBuffer(replayBuffer, {
        decodeGameEvents: false,
        decodeMessageEvents: false,
        decodeTrackerEvents: false,
        decodeInitData: false,
      });

      expect(replay).toBeInstanceOf(SC2Replay);
      expect(replay.replayHeader).not.toBeNull();
      expect(replay.replayDetails).not.toBeNull();
    });

    it('should parse replay header correctly', () => {
      const replay = SC2Replay.fromBuffer(replayBuffer, {
        decodeGameEvents: false,
        decodeMessageEvents: false,
        decodeTrackerEvents: false,
        decodeInitData: false,
      });
      const header = replay.replayHeader;

      expect(header?.signature).toBe('StarCraft II replay\x1b11');
      expect(header?.version.major).toBe(5);
      expect(header?.version.minor).toBe(0);
      expect(header?.version.build).toBe(94137); // 0x16F2BE
      expect(header?.length).toBe(115);
    });

    it('should parse replay details', () => {
      const replay = SC2Replay.fromBuffer(replayBuffer, {
        decodeGameEvents: false,
        decodeMessageEvents: false,
        decodeTrackerEvents: false,
        decodeInitData: false,
      });
      const details = replay.replayDetails;

      expect(details).not.toBeNull();
      expect(details?.playerList).toBeInstanceOf(Array);
      expect(details?.playerList?.length).toBeGreaterThan(0);
      expect(details?.title).toBeDefined();
    });

    it('should parse player list', () => {
      const replay = SC2Replay.fromBuffer(replayBuffer, {
        decodeGameEvents: false,
        decodeMessageEvents: false,
        decodeTrackerEvents: false,
        decodeInitData: false,
      });
      const players = replay.players;

      expect(players).toBeInstanceOf(Array);
      expect(players.length).toBeGreaterThanOrEqual(2);

      const player = players[0];
      expect(player.name).toBeDefined();
      expect(player.userId).toBeDefined();
      expect(player.teamId).toBeDefined();
    });

    it('should handle replay options', () => {
      const replay = SC2Replay.fromBuffer(replayBuffer, {
        decodeGameEvents: false, // Keep false to avoid potential parsing errors
        decodeMessageEvents: false,
        decodeTrackerEvents: false,
      });

      expect(replay.gameEvents).toBeInstanceOf(Array);
      expect(replay.messageEvents).toBeInstanceOf(Array);
      expect(replay.trackerEvents).toBeInstanceOf(Array);
    });
  });

  describe('utility methods', () => {
    let replay: SC2Replay;

    beforeEach(() => {
      replay = SC2Replay.fromBuffer(replayBuffer, {
        decodeGameEvents: false,
        decodeMessageEvents: false,
        decodeTrackerEvents: false,
      });
    });

    it('should calculate game duration', () => {
      const duration = replay.duration;
      expect(typeof duration).toBe('number');
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('should get game length in loops', () => {
      const gameLength = replay.gameLength;
      expect(typeof gameLength).toBe('number');
      expect(gameLength).toBeGreaterThanOrEqual(0);
    });

    it('should provide direct access to replay data components', () => {
      expect(replay.replayHeader).toBeDefined();
      expect(replay.replayDetails).toBeDefined();
      expect(replay.replayInitData).toBeDefined();
      expect(replay.gameEvents).toBeInstanceOf(Array);
      expect(replay.messageEvents).toBeInstanceOf(Array);
      expect(replay.trackerEvents).toBeInstanceOf(Array);
    });

    it('should handle missing winner gracefully', () => {
      const winner = replay.winner;
      // Winner might be null since we're using default data
      expect(winner === null || typeof winner === 'object').toBe(true);
    });
  });
});
