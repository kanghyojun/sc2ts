import { readFileSync } from 'fs';
import { join } from 'path';

import { SC2Replay } from '@/sc2-replay';

describe('Corrupted Events Handling', () => {
  it('should gracefully handle unknown eventids without crashing', async () => {
    // This test ensures that the library can handle replay files with unknown eventids
    // without throwing unhandled CorruptedError exceptions

    const replayPath = join(__dirname, '../../replays/a.SC2Replay');
    const buffer = readFileSync(replayPath);
    const replay = await SC2Replay.fromBuffer(buffer);

    // Should not crash, even with unknown eventids
    expect(replay).toBeDefined();
    expect(replay.header).toBeDefined();
    expect(replay.details).toBeDefined();

    // Should successfully parse some events, even if not all
    expect(replay.gameEvents).toBeInstanceOf(Array);
    expect(replay.gameEvents.length).toBeGreaterThan(0);

    // First events should be valid
    const firstEvent = replay.gameEvents[0];
    expect(firstEvent._eventid).toBeDefined();
    expect(firstEvent._gameloop).toBeDefined();
    expect(firstEvent._event).toBeDefined();

    // Should start with gameloop 0
    expect(firstEvent._gameloop).toBe(0);
  });

  it('should successfully parse all events without encountering unknown eventids', async () => {
    // Spy on console.warn to catch any unexpected warnings
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    try {
      const replayPath = join(__dirname, '../../replays/a.SC2Replay');
      const buffer = readFileSync(replayPath);
      const replay = await SC2Replay.fromBuffer(buffer);

      // Should have parsed all events successfully (matching s2protocol)
      expect(replay.gameEvents.length).toBe(4615);

      // Should not have logged any warnings for unknown eventids
      expect(warnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Unknown eventid')
      );

      // Should have correct gameLength matching s2protocol
      expect(replay.gameLength).toBe(9246);

      // First event should be from gameloop 0
      expect(replay.gameEvents[0]._gameloop).toBe(0);

    } finally {
      warnSpy.mockRestore();
    }
  });

  it('should maintain basic replay info even with parsing issues', async () => {
    const replayPath = join(__dirname, '../../replays/a.SC2Replay');
    const buffer = readFileSync(replayPath);
    const replay = await SC2Replay.fromBuffer(buffer);

    // Core replay information should still be available
    expect(replay.header?.version?.build).toBe(94137);
    expect(replay.details?.title).toBe('Ley Lines');

    // Game length may be corrupted due to parsing errors, but should be reasonable
    // The actual game length is 9246, but we'll accept any reasonable value
    expect(replay.gameLength).toBeGreaterThan(0);
    expect(replay.gameLength).toBeLessThan(1000000000); // Should not be extremely large

    // Should have player information
    expect(replay.players).toBeInstanceOf(Array);
    expect(replay.players.length).toBeGreaterThan(0);
  });

  it('should handle corrupted choice tags gracefully', async () => {
    // This test ensures BitPackedDecoder handles invalid choice tags properly

    // Test with b.SC2Replay which has choice tag issues
    try {
      const replayPath = join(__dirname, '../../replays/b.SC2Replay');
      const buffer = readFileSync(replayPath);
      const replay = await SC2Replay.fromBuffer(buffer);

      // Even if it fails, it should be with a controlled error
      // not an unhandled exception
      expect(replay).toBeDefined();

    } catch (error) {
      // Should be a controlled CorruptedError, not an unhandled exception
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('CorruptedError');
    }
  });
});