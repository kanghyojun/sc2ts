import { resolve } from 'path';
import { MpqArchive } from '../mpq-archive';
import { readFileSync } from 'fs';

describe('MpqReader', () => {
  describe('a.SC2Replay', () => {
    it.each([
      { filename: 'replay.details', name1: 0xD383C29C, name2: 0xEF402E92 },
      { filename: 'replay.details.backup', name1: 0xD609C5AE, name2: 0xCAA8D159 },
      { filename: 'replay.initData.backup', name1: 0x4C69CF64, name2: 0x6041E38B },
      { filename: 'replay.resumable.events', name1: 0xC1F84209, name2: 0x41580DCA },
      { filename: 'replay.game.events', name1: 0xAAC2A54B, name2: 0xF4762B95 },
      { filename: 'replay.sync.events', name1: 0xC9E5B770, name2: 0x3B18F6B6 },
      { filename: 'replay.load.info', name1: 0x343C087B, name2: 0x278E3682 },
      { filename: 'replay.smartcam.events', name1: 0x3B2B1EA0, name2: 0xB72EF057 },
      { filename: 'replay.gamemetadata.json', name1: 0xE92EC10B, name2: 0x4214208C },
      { filename: 'replay.server.battlelobby', name1: 0x764499DD, name2: 0x6B1B61B0 },
      { filename: '(attributes)', name1: 0xD38437CB, name2: 0x07DFEAEC },
      { filename: 'replay.sync.history', name1: 0x2E74D7E1, name2: 0x8B271E10 },
      { filename: 'replay.tracker.events', name1: 0xFE19CB9E, name2: 0x6240705D },
      { filename: 'replay.initData', name1: 0x5A7E8BDC, name2: 0xFF253F5C },
      { filename: '(listfile)', name1: 0xFD657910, name2: 0x4E9B98A7 },
      { filename: 'replay.attributes.events', name1: 0x1DA8B0CF, name2: 0xA2CEFF28 },
      { filename: 'replay.message.events', name1: 0x31952289, name2: 0x6A5FFAA3 }
    ])('should correctly parse hash table with expected name1/name2 values', (expectedEntry) => {
      const filePath = resolve('replays', 'a.SC2Replay');
      const mpqArchive = MpqArchive.fromBuffer(readFileSync(filePath));
      const hashTable = mpqArchive.hashTable
      expect(hashTable.length).toBe(32);
      const hashEntry = mpqArchive.findHashEntryByFilename(expectedEntry.filename);
      console.log(hashTable.map(e => ({ name1: e.name1.toString(16), name2: e.name2.toString(16) })));
      expect(hashEntry).not.toBeNull();
      if (hashEntry != null) {
        expect(hashEntry.name1).toBe(expectedEntry.name1);
        expect(hashEntry.name2).toBe(expectedEntry.name2);
      }
    });
  });
});
