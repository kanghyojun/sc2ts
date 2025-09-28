import path from 'path';

import { SC2Replay } from '@/sc2-replay';

describe('All Tracker Event Types Field Extraction', () => {
  let replay: SC2Replay;

  beforeAll(async () => {
    const replayPath = path.join(__dirname, '../../replays/a.SC2Replay');
    replay = await SC2Replay.fromFile(replayPath, {
      decodeTrackerEvents: true,
    });
  });

  // Expected field mappings for each event type
  const expectedFields = {
    'NNet.Replay.Tracker.SPlayerStatsEvent': ['m_playerId', 'm_stats'],
    'NNet.Replay.Tracker.SUnitBornEvent': [
      'm_unitTagIndex', 'm_unitTagRecycle', 'm_unitTypeName', 'm_controlPlayerId',
      'm_upkeepPlayerId', 'm_x', 'm_y', 'm_creatorUnitTagIndex', 'm_creatorUnitTagRecycle', 'm_creatorAbilityName'
    ],
    'NNet.Replay.Tracker.SUnitDiedEvent': [
      'm_unitTagIndex', 'm_unitTagRecycle', 'm_killerPlayerId', 'm_x', 'm_y', 'm_killerUnitTagIndex', 'm_killerUnitTagRecycle'
    ],
    'NNet.Replay.Tracker.SUnitOwnerChangeEvent': [
      'm_unitTagIndex', 'm_unitTagRecycle', 'm_controlPlayerId', 'm_upkeepPlayerId'
    ],
    'NNet.Replay.Tracker.SUnitTypeChangeEvent': [
      'm_unitTagIndex', 'm_unitTagRecycle', 'm_unitTypeName'
    ],
    'NNet.Replay.Tracker.SUpgradeEvent': [
      'm_playerId', 'm_upgradeTypeName', 'm_count'
    ],
    'NNet.Replay.Tracker.SUnitInitEvent': [
      'm_unitTagIndex', 'm_unitTagRecycle', 'm_unitTypeName', 'm_controlPlayerId', 'm_upkeepPlayerId', 'm_x', 'm_y'
    ],
    'NNet.Replay.Tracker.SUnitDoneEvent': [
      'm_unitTagIndex', 'm_unitTagRecycle'
    ],
    'NNet.Replay.Tracker.SUnitPositionsEvent': [
      'm_firstUnitIndex', 'm_items'
    ],
    'NNet.Replay.Tracker.SPlayerSetupEvent': [
      'm_playerId', 'm_type', 'm_userId', 'm_slotId'
    ]
  };

  const expectedEventIds = {
    'NNet.Replay.Tracker.SPlayerStatsEvent': 0,
    'NNet.Replay.Tracker.SUnitBornEvent': 1,
    'NNet.Replay.Tracker.SUnitDiedEvent': 2,
    'NNet.Replay.Tracker.SUnitOwnerChangeEvent': 3,
    'NNet.Replay.Tracker.SUnitTypeChangeEvent': 4,
    'NNet.Replay.Tracker.SUpgradeEvent': 5,
    'NNet.Replay.Tracker.SUnitInitEvent': 6,
    'NNet.Replay.Tracker.SUnitDoneEvent': 7,
    'NNet.Replay.Tracker.SUnitPositionsEvent': 8,
    'NNet.Replay.Tracker.SPlayerSetupEvent': 9
  };

  describe('Field Extraction Verification', () => {
    it('should extract all expected fields for each event type present in replay', () => {
      const trackerEvents = replay.trackerEvents;
      expect(trackerEvents.length).toBeGreaterThan(0);

      // Group events by type
      const eventsByType: Record<string, any[]> = {};
      for (const event of trackerEvents) {
        const eventType = event._event;
        if (!eventsByType[eventType]) {
          eventsByType[eventType] = [];
        }
        eventsByType[eventType].push(event);
      }

      // Test each event type found in replay
      for (const [eventType, events] of Object.entries(eventsByType)) {
        const firstEvent = events[0];
        const expectedFieldsForType = expectedFields[eventType as keyof typeof expectedFields];
        const expectedEventId = expectedEventIds[eventType as keyof typeof expectedEventIds];

        // Test event ID
        expect(firstEvent._eventid).toBe(expectedEventId);

        // Test basic metadata fields
        expect(firstEvent._event).toBe(eventType);
        expect(typeof firstEvent._gameloop).toBe('number');
        expect(typeof firstEvent._bits).toBe('number');
        expect(firstEvent.eventType).toBe(eventType);
        expect(firstEvent.loop).toBe(firstEvent._gameloop);

        // Test struct fields
        if (!expectedFieldsForType) {
          throw new Error(`No expected fields defined for ${eventType}`);
        }

        const actualFields = Object.keys(firstEvent).filter(
          key => !key.startsWith('_') && !['loop', 'eventType'].includes(key)
        );

        // Check that all expected fields are present
        for (const expectedField of expectedFieldsForType) {
          expect(actualFields).toContain(expectedField);
          expect(firstEvent[expectedField]).toBeDefined();
        }

        // Check that no unexpected fields are present
        for (const actualField of actualFields) {
          expect(expectedFieldsForType).toContain(actualField);
        }

        expect(actualFields.sort()).toEqual(expectedFieldsForType.sort());

        // Test field values
        if ('m_unitTagIndex' in firstEvent) {
          expect(typeof firstEvent.m_unitTagIndex).toBe('number');
          expect(firstEvent.m_unitTagIndex).toBeGreaterThanOrEqual(0);
        }

        if ('m_playerId' in firstEvent) {
          expect(typeof firstEvent.m_playerId).toBe('number');
          expect(firstEvent.m_playerId).toBeGreaterThanOrEqual(0);
          expect(firstEvent.m_playerId).toBeLessThanOrEqual(15);
        }

        if ('m_x' in firstEvent && 'm_y' in firstEvent) {
          expect(typeof firstEvent.m_x).toBe('number');
          expect(typeof firstEvent.m_y).toBe('number');
          expect(firstEvent.m_x).toBeGreaterThanOrEqual(0);
          expect(firstEvent.m_y).toBeGreaterThanOrEqual(0);
        }

        if ('m_unitTypeName' in firstEvent) {
          expect(firstEvent.m_unitTypeName).toBeDefined();
          // Now should be a string (converted from Buffer)
          expect(typeof firstEvent.m_unitTypeName).toBe('string');
          expect((firstEvent.m_unitTypeName as string).length).toBeGreaterThan(0);
        }

        if ('m_upgradeTypeName' in firstEvent) {
          expect(firstEvent.m_upgradeTypeName).toBeDefined();
          // Now should be a string (converted from Buffer)
          expect(typeof firstEvent.m_upgradeTypeName).toBe('string');
        }

        // Test consistency across all instances
        for (const event of events) {
          const actualFieldsForEvent = Object.keys(event).filter(
            key => !key.startsWith('_') && !['loop', 'eventType'].includes(key)
          );
          expect(actualFieldsForEvent.sort()).toEqual(expectedFieldsForType!.sort());
        }
      }
    });

    it('should handle all known event types without errors', () => {
      const trackerEvents = replay.trackerEvents;
      const foundEventTypes = new Set(trackerEvents.map(e => e._event));

      console.log('Event types found in replay:', Array.from(foundEventTypes).sort());
      console.log('Expected event types:', Object.keys(expectedFields).sort());

      // Verify all found event types are known
      for (const eventType of foundEventTypes) {
        expect(Object.keys(expectedFields)).toContain(eventType);
      }

      // Report missing event types (this is not a failure, just informational)
      const missingEventTypes = Object.keys(expectedFields).filter(
        eventType => !foundEventTypes.has(eventType)
      );

      if (missingEventTypes.length > 0) {
        console.log('Event types not present in this replay (this is normal):', missingEventTypes);
      }
    });

    it('should have no events with only basic metadata (regression test)', () => {
      const trackerEvents = replay.trackerEvents;

      for (const event of trackerEvents) {
        const structFields = Object.keys(event).filter(
          key => !key.startsWith('_') && !['loop', 'eventType'].includes(key)
        );

        // Every event should have at least one struct field
        expect(structFields.length).toBeGreaterThan(0);

        // Should not have the old eventData wrapper
        expect(event).not.toHaveProperty('eventData');
      }
    });
  });

  describe('Event Count Statistics', () => {
    it('should report event count statistics', () => {
      const trackerEvents = replay.trackerEvents;
      const eventCounts: Record<string, number> = {};

      for (const event of trackerEvents) {
        const eventType = event._event;
        eventCounts[eventType] = (eventCounts[eventType] || 0) + 1;
      }

      console.log('\n=== Event Count Statistics ===');
      for (const [eventType, count] of Object.entries(eventCounts).sort()) {
        console.log(`${eventType}: ${count} events`);
      }
      console.log(`Total tracker events: ${trackerEvents.length}`);

      expect(trackerEvents.length).toBeGreaterThan(0);
    });
  });
});