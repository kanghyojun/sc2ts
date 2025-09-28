import path from 'path';

import { SC2Replay } from '@/sc2-replay';
import type { SUnitBornEvent, SUpgradeEvent, SPlayerSetupEvent } from '@/types';

describe('Event Field Extraction', () => {
  let replay: SC2Replay;

  beforeAll(async () => {
    const replayPath = path.join(__dirname, '../../replays/a.SC2Replay');
    replay = await SC2Replay.fromFile(replayPath, {
      decodeTrackerEvents: true,
    });
  });

  describe('SUnitBornEvent', () => {
    it('should extract all struct fields for SUnitBornEvent', () => {
      const unitBornEvents = replay.trackerEvents.filter(
        e => e._event === 'NNet.Replay.Tracker.SUnitBornEvent'
      ) as SUnitBornEvent[];

      expect(unitBornEvents.length).toBeGreaterThan(0);

      const firstEvent = unitBornEvents[0];
      // Verify basic event metadata
      expect(firstEvent._event).toBe('NNet.Replay.Tracker.SUnitBornEvent');
      expect(firstEvent._eventid).toBe(1);
      expect(typeof firstEvent._gameloop).toBe('number');
      expect(typeof firstEvent._bits).toBe('number');
      expect(firstEvent.eventType).toBe('NNet.Replay.Tracker.SUnitBornEvent');
      expect(firstEvent.loop).toBe(firstEvent._gameloop);

      // Verify struct fields are present
      expect(typeof firstEvent.m_unitTagIndex).toBe('number');
      expect(typeof firstEvent.m_unitTagRecycle).toBe('number');
      expect(firstEvent.m_unitTypeName).toBeDefined();
      expect(typeof firstEvent.m_controlPlayerId).toBe('number');
      expect(typeof firstEvent.m_upkeepPlayerId).toBe('number');
      expect(typeof firstEvent.m_x).toBe('number');
      expect(typeof firstEvent.m_y).toBe('number');

      // Verify unit type name is now a string (converted from Buffer)
      expect(typeof firstEvent.m_unitTypeName).toBe('string');
      expect(firstEvent.m_unitTypeName).toMatch(/[A-Za-z]/);

      // Verify coordinates are reasonable (within map bounds)
      expect(firstEvent.m_x).toBeGreaterThanOrEqual(0);
      expect(firstEvent.m_y).toBeGreaterThanOrEqual(0);
      expect(firstEvent.m_x).toBeLessThan(1000); // Reasonable map size
      expect(firstEvent.m_y).toBeLessThan(1000);
    });

    it('should decode unit type name as readable string', () => {
      const unitBornEvents = replay.trackerEvents.filter(
        e => e._event === 'NNet.Replay.Tracker.SUnitBornEvent'
      ) as SUnitBornEvent[];

      const firstEvent = unitBornEvents[0];
      const unitNameString = firstEvent.m_unitTypeName as string;

      // Should be a readable unit name (contains letters)
      expect(unitNameString).toMatch(/[A-Za-z]/);
      expect(unitNameString.length).toBeGreaterThan(0);

      // Known unit types from the replay
      const knownUnitTypes = ['RichVespeneGeyser', 'VespeneGeyser', 'UnbuildablePlatesDestructible'];
      const foundKnownType = unitBornEvents.some(event => {
        const name = event.m_unitTypeName as string;
        return knownUnitTypes.includes(name);
      });
      expect(foundKnownType).toBe(true);
    });
  });

  describe('SUpgradeEvent', () => {
    it('should extract all struct fields for SUpgradeEvent', () => {
      const upgradeEvents = replay.trackerEvents.filter(
        e => e._event === 'NNet.Replay.Tracker.SUpgradeEvent'
      ) as SUpgradeEvent[];

      if (upgradeEvents.length === 0) {
        // Skip test if no upgrade events in this replay
        return;
      }

      const firstEvent = upgradeEvents[0];

      // Verify basic event metadata
      expect(firstEvent._event).toBe('NNet.Replay.Tracker.SUpgradeEvent');
      expect(firstEvent._eventid).toBe(5);
      expect(firstEvent.eventType).toBe('NNet.Replay.Tracker.SUpgradeEvent');

      // Verify struct fields are present
      expect(typeof firstEvent.m_playerId).toBe('number');
      expect(firstEvent.m_upgradeTypeName).toBeDefined();
      expect(typeof firstEvent.m_count).toBe('number');

      // Verify player ID is valid
      expect(firstEvent.m_playerId).toBeGreaterThanOrEqual(0);
      expect(firstEvent.m_playerId).toBeLessThanOrEqual(15); // Reasonable player count

      // Verify count is positive
      expect(firstEvent.m_count).toBeGreaterThan(0);
    });
  });

  describe('SPlayerSetupEvent', () => {
    it('should extract all struct fields for SPlayerSetupEvent', () => {
      const setupEvents = replay.trackerEvents.filter(
        e => e._event === 'NNet.Replay.Tracker.SPlayerSetupEvent'
      ) as SPlayerSetupEvent[];

      expect(setupEvents.length).toBeGreaterThan(0);

      const firstEvent = setupEvents[0];

      // Verify basic event metadata
      expect(firstEvent._event).toBe('NNet.Replay.Tracker.SPlayerSetupEvent');
      expect(firstEvent._eventid).toBe(9);
      expect(firstEvent.eventType).toBe('NNet.Replay.Tracker.SPlayerSetupEvent');

      // Verify struct fields are present
      expect(typeof firstEvent.m_playerId).toBe('number');
      expect(typeof firstEvent.m_type).toBe('number');
      expect(typeof firstEvent.m_userId).toBe('number');
      expect(firstEvent.m_slotId).toBeDefined();

      // Verify player ID is valid
      expect(firstEvent.m_playerId).toBeGreaterThanOrEqual(0);
      expect(firstEvent.m_playerId).toBeLessThanOrEqual(15);
    });
  });

  describe('Event Structure Integrity', () => {
    it('should preserve all event fields without duplication', () => {
      const trackerEvents = replay.trackerEvents;
      expect(trackerEvents.length).toBeGreaterThan(0);

      const firstEvent = trackerEvents[0];
      const keys = Object.keys(firstEvent);

      // Should have both metadata and struct fields
      expect(keys).toContain('_event');
      expect(keys).toContain('_eventid');
      expect(keys).toContain('_gameloop');
      expect(keys).toContain('_bits');
      expect(keys).toContain('loop');
      expect(keys).toContain('eventType');

      // Should not have the old eventData wrapper
      expect(keys).not.toContain('eventData');

      // All keys should be unique (no duplicates)
      const uniqueKeys = [...new Set(keys)];
      expect(uniqueKeys.length).toBe(keys.length);
    });

    it('should maintain consistency across all event types', () => {
      const eventTypes = [...new Set(replay.trackerEvents.map(e => e._event))];
      expect(eventTypes.length).toBeGreaterThan(1);

      for (const eventType of eventTypes) {
        const events = replay.trackerEvents.filter(e => e._event === eventType);
        expect(events.length).toBeGreaterThan(0);

        const firstEvent = events[0];

        // All events should have basic metadata
        expect(firstEvent._event).toBe(eventType);
        expect(typeof firstEvent._eventid).toBe('number');
        expect(typeof firstEvent._gameloop).toBe('number');
        expect(typeof firstEvent._bits).toBe('number');
        expect(firstEvent.eventType).toBe(eventType);
        expect(firstEvent.loop).toBe(firstEvent._gameloop);
      }
    });
  });
});