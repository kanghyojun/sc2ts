# MPQ TypeScript Library with SC2 Replay Support

A TypeScript library for reading MPQ (MoPaQ) archive files and parsing StarCraft II replay files.

## Features

- **MPQ Archive Reading**: Parse and extract files from MPQ archives
- **SC2 Replay Parsing**: Parse StarCraft II replay files (based on Blizzard's s2protocol)
- **TypeScript Support**: Full type definitions for all data structures
- **Dual Module Support**: Both CommonJS and ESM builds

## Installation

```bash
npm install mpqts
# or
pnpm install mpqts
```

## Usage

### Reading MPQ Archives

```typescript
import { MpqArchive } from 'mpqts';

// From file
const archive = await MpqArchive.open('replay.SC2Replay');

// From buffer
const buffer = fs.readFileSync('replay.SC2Replay');
const archive = MpqArchive.fromBuffer(buffer);

// List files
console.log(archive.listFiles());

// Extract file
const file = archive.getFile('replay.details');
console.log(file.data);
```

### Parsing SC2 Replays

```typescript
import { SC2Replay } from 'mpqts';

// From file
const replay = await SC2Replay.fromFile('replay.SC2Replay');

// From buffer
const buffer = fs.readFileSync('replay.SC2Replay');
const replay = SC2Replay.fromBuffer(buffer, {
  decodeGameEvents: true,
  decodeMessageEvents: true,
  decodeTrackerEvents: true
});

// Get replay information
console.log('Players:', replay.players);
console.log('Duration:', replay.getDuration(), 'seconds');
console.log('Winner:', replay.getWinner());

// Get detailed data
const replayData = replay.getReplayData();
console.log('Game Events:', replayData.gameEvents.length);
console.log('Message Events:', replayData.messageEvents.length);
console.log('Tracker Events:', replayData.trackerEvents.length);
```

### Advanced Usage

```typescript
import { MpqArchive, SC2Replay, VersionedDecoder } from 'mpqts';

// Custom file list for MPQ archives
const customListFile = `file1.txt
file2.dat
subfolder/file3.bin`;

const archive = MpqArchive.fromBuffer(buffer, {
  listFile: customListFile,
  decrypt: true,
  decompress: true
});

// Manual binary decoding
const decoder = new VersionedDecoder(someBuffer);
const value = decoder.decodeValue({ type: 'int', size: 32 });
```

## API Reference

### MpqArchive

- `MpqArchive.open(filepath, options?)` - Open MPQ archive from file
- `MpqArchive.fromBuffer(buffer, options?)` - Create from buffer
- `archive.listFiles()` - Get list of files in archive
- `archive.hasFile(filename)` - Check if file exists
- `archive.getFile(filename)` - Extract file data
- `archive.fileCount` - Number of files in archive

### SC2Replay

- `SC2Replay.fromFile(filepath, options?)` - Parse replay from file
- `SC2Replay.fromBuffer(buffer, options?)` - Parse replay from buffer
- `replay.players` - Array of player information
- `replay.getDuration()` - Game duration in seconds
- `replay.getWinner()` - Winning player (if available)
- `replay.getReplayData()` - Complete replay data structure

### Options

```typescript
interface MpqParseOptions {
  decrypt?: boolean;
  decompress?: boolean;
  verifyChecksums?: boolean;
  listFile?: string;
}

interface SC2ReplayOptions {
  decodeGameEvents?: boolean;
  decodeMessageEvents?: boolean;
  decodeTrackerEvents?: boolean;
}
```

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm run build

# Test
pnpm run test

# Type check
pnpm run typecheck
```

## License

MIT License