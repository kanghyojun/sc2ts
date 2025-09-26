import { resolve } from 'path';
import { MpqArchive } from '@/mpq-archive';
import { readFileSync } from 'fs';

describe('MpqReader', () => {
  // Regression test for hash table parsing - validates against mpyq reference implementation
  it.each(['a.SC2Replay', 'b.SC2Replay', 'c.SC2Replay'])('should parse complete hash table correctly for %s (regression test against mpyq)', (replayFile) => {
    // This test prevents regression of hash table parsing bugs by comparing
    // our implementation against known good values from mpyq library
    // All three replay files have identical hash table structures
    const expectedHashEntries = [
      { name1: 0xD609C5AE, name2: 0xCAA8D159, locale: 0, platform: 0, blockIndex: 1 },
      { name1: 0x4C69CF64, name2: 0x6041E38B, locale: 0, platform: 0, blockIndex: 4 },
      { name1: 0xC1F84209, name2: 0x41580DCA, locale: 0, platform: 0, blockIndex: 14 },
      { name1: 0xAAC2A54B, name2: 0xF4762B95, locale: 0, platform: 0, blockIndex: 6 },
      { name1: 0xFFFFFFFF, name2: 0xFFFFFFFF, locale: 65535, platform: 65535, blockIndex: 4294967295 },
      { name1: 0xC9E5B770, name2: 0x3B18F6B6, locale: 0, platform: 0, blockIndex: 9 },
      { name1: 0x343C087B, name2: 0x278E3682, locale: 0, platform: 0, blockIndex: 8 },
      { name1: 0x3B2B1EA0, name2: 0xB72EF057, locale: 0, platform: 0, blockIndex: 12 },
      { name1: 0xFFFFFFFF, name2: 0xFFFFFFFF, locale: 65535, platform: 65535, blockIndex: 4294967295 },
      { name1: 0xFFFFFFFF, name2: 0xFFFFFFFF, locale: 65535, platform: 65535, blockIndex: 4294967295 },
      { name1: 0xD383C29C, name2: 0xEF402E92, locale: 0, platform: 0, blockIndex: 0 },
      { name1: 0xFFFFFFFF, name2: 0xFFFFFFFF, locale: 65535, platform: 65535, blockIndex: 4294967295 },
      { name1: 0xE92EC10B, name2: 0x4214208C, locale: 0, platform: 0, blockIndex: 2 },
      { name1: 0xFFFFFFFF, name2: 0xFFFFFFFF, locale: 65535, platform: 65535, blockIndex: 4294967295 },
      { name1: 0x764499DD, name2: 0x6B1B61B0, locale: 0, platform: 0, blockIndex: 5 },
      { name1: 0xD38437CB, name2: 0x07DFEAEC, locale: 0, platform: 0, blockIndex: 16 },
      { name1: 0x2E74D7E1, name2: 0x8B271E10, locale: 0, platform: 0, blockIndex: 10 },
      { name1: 0xFFFFFFFF, name2: 0xFFFFFFFF, locale: 65535, platform: 65535, blockIndex: 4294967295 },
      { name1: 0xFFFFFFFF, name2: 0xFFFFFFFF, locale: 65535, platform: 65535, blockIndex: 4294967295 },
      { name1: 0xFE19CB9E, name2: 0x6240705D, locale: 0, platform: 0, blockIndex: 11 },
      { name1: 0xFFFFFFFF, name2: 0xFFFFFFFF, locale: 65535, platform: 65535, blockIndex: 4294967295 },
      { name1: 0x5A7E8BDC, name2: 0xFF253F5C, locale: 0, platform: 0, blockIndex: 3 },
      { name1: 0xFFFFFFFF, name2: 0xFFFFFFFF, locale: 65535, platform: 65535, blockIndex: 4294967295 },
      { name1: 0xFFFFFFFF, name2: 0xFFFFFFFF, locale: 65535, platform: 65535, blockIndex: 4294967295 },
      { name1: 0xFFFFFFFF, name2: 0xFFFFFFFF, locale: 65535, platform: 65535, blockIndex: 4294967295 },
      { name1: 0xFD657910, name2: 0x4E9B98A7, locale: 0, platform: 0, blockIndex: 15 },
      { name1: 0xFFFFFFFF, name2: 0xFFFFFFFF, locale: 65535, platform: 65535, blockIndex: 4294967295 },
      { name1: 0xFFFFFFFF, name2: 0xFFFFFFFF, locale: 65535, platform: 65535, blockIndex: 4294967295 },
      { name1: 0xFFFFFFFF, name2: 0xFFFFFFFF, locale: 65535, platform: 65535, blockIndex: 4294967295 },
      { name1: 0xFFFFFFFF, name2: 0xFFFFFFFF, locale: 65535, platform: 65535, blockIndex: 4294967295 },
      { name1: 0x1DA8B0CF, name2: 0xA2CEFF28, locale: 0, platform: 0, blockIndex: 13 },
      { name1: 0x31952289, name2: 0x6A5FFAA3, locale: 0, platform: 0, blockIndex: 7 },
    ];

    const filePath = resolve('replays', replayFile);
    const mpqArchive = MpqArchive.fromBuffer(readFileSync(filePath));
    const hashTable = mpqArchive.hashTable;

    expect(hashTable.length).toBe(expectedHashEntries.length);

    // Validate each hash table entry matches mpyq reference
    expectedHashEntries.forEach((expected, index) => {
      const actual = hashTable[index];
      expect(actual).toBeDefined();
      expect(actual!.name1).toBe(expected.name1);
      expect(actual!.name2).toBe(expected.name2);
      expect(actual!.locale).toBe(expected.locale);
      expect(actual!.platform).toBe(expected.platform);
      expect(actual!.blockIndex).toBe(expected.blockIndex);
    });
  });
});
