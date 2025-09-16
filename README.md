# MPQTS

A comprehensive TypeScript library for parsing MPQ (MoPaQ) archive files and StarCraft II replay files. This library provides a modern, type-safe interface for reading Blizzard Entertainment's proprietary archive format.

## Features

- 🏗️ **MPQ Archive Support**: Read and extract files from MPQ archives
- 🎮 **StarCraft II Replay Parsing**: Complete SC2 replay file analysis
- 📦 **Dual Module Support**: Both CommonJS and ESM exports
- 🛡️ **Type Safety**: Full TypeScript support with comprehensive type definitions
- 🧪 **Well Tested**: Extensive test coverage with real replay files
- 🔍 **Binary Data Handling**: Advanced bit-packed data decoding

## Installation

```bash
npm install mpqts
# or
pnpm add mpqts
# or
yarn add mpqts
```

## Quick Start

### Basic MPQ Archive Usage

```typescript
import { MpqArchive } from 'mpqts';
import { readFileSync } from 'fs';

// Load an MPQ archive from file
const buffer = readFileSync('example.mpq');
const archive = new MpqArchive(buffer);

// List all files in the archive
const files = archive.getFileList();
console.log('Files in archive:', files);

// Extract a specific file
const fileData = archive.readFile('path/to/file.txt');
if (fileData) {
  console.log('File content:', fileData.toString());
}

// Get archive information
console.log('Archive has', archive.fileCount, 'files');
console.log('Archive version:', archive.formatVersion);
```

### StarCraft II Replay Analysis

```typescript
import { SC2Replay } from 'mpqts';
import { readFileSync } from 'fs';

// Load and parse a StarCraft II replay
const replayBuffer = readFileSync('replay.SC2Replay');
const replay = SC2Replay.fromBuffer(replayBuffer);

// Get basic replay information
console.log('Map name:', replay.replayDetails?.title);
console.log('Game duration:', replay.getDuration(), 'seconds');
console.log('Players:', replay.players.length);

// Access player information
replay.players.forEach((player, index) => {
  console.log(`Player ${index + 1}:`, {
    name: player.name,
    race: player.race,
    teamId: player.teamId,
    color: player.color,
    result: player.result
  });
});

// Get the winner
const winner = replay.getWinner();
if (winner) {
  console.log('Winner:', winner.name);
}

// Get complete replay data structure
const replayData = replay.getReplayData();
console.log('Game events:', replayData.gameEvents.length);
console.log('Chat messages:', replayData.messageEvents.length);
```

### Advanced Replay Parsing with Options

```typescript
import { SC2Replay } from 'mpqts';

const replay = SC2Replay.fromBuffer(buffer, {
  // Enable/disable specific event parsing for performance
  decodeGameEvents: true,     // Parse gameplay events
  decodeMessageEvents: true,  // Parse chat messages
  decodeTrackerEvents: true,  // Parse detailed tracking events

  // Use fallback data if internal files are encrypted/missing
  allowFallback: true
});

// Access different types of events
const events = replay.events;
console.log('Game events:', events.game.length);
console.log('Message events:', events.message.length);
console.log('Tracker events:', events.tracker.length);

// Example: Find all chat messages
events.message.forEach(msg => {
  if (msg.text) {
    console.log(`${msg.playerId}: ${msg.text}`);
  }
});
```

### Low-Level MPQ Reader Usage

```typescript
import { MpqReader } from 'mpqts';

const reader = new MpqReader(buffer);

// Read MPQ header information
const header = reader.readMpqHeader();
console.log('MPQ Format Version:', header.formatVersion);
console.log('Archive Size:', header.archiveSize);

// Access hash and block tables
const hashTable = reader.readHashTable(header);
const blockTable = reader.readBlockTable(header);

console.log('Hash entries:', hashTable.length);
console.log('Block entries:', blockTable.length);
```

### Error Handling

```typescript
import { MpqError, MpqInvalidFormatError, SC2Replay } from 'mpqts';

try {
  const replay = SC2Replay.fromBuffer(buffer);
  console.log('Replay parsed successfully');
} catch (error) {
  if (error instanceof MpqInvalidFormatError) {
    console.error('Invalid MPQ format:', error.message);
  } else if (error instanceof MpqError) {
    console.error('MPQ parsing error:', error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## API Reference

### MpqArchive

The main class for working with MPQ archives.

#### Constructor
```typescript
new MpqArchive(buffer: Buffer, options?: MpqParseOptions)
```

#### Properties
- `fileCount: number` - Number of files in the archive
- `formatVersion: number` - MPQ format version

#### Methods
- `getFileList(): string[]` - Get list of all file paths
- `readFile(filename: string): Buffer | null` - Extract file content
- `hasFile(filename: string): boolean` - Check if file exists

### SC2Replay

Parser for StarCraft II replay files.

#### Static Methods
```typescript
SC2Replay.fromBuffer(buffer: Buffer, options?: SC2ReplayOptions): SC2Replay
```

#### Properties
- `replayHeader: SC2ReplayHeader | null` - Replay file header
- `replayDetails: SC2ReplayDetails | null` - Game details and metadata
- `players: SC2Player[]` - Array of player information
- `events: SC2Events` - Game, message, and tracker events

#### Methods
- `getDuration(): number` - Get game duration in seconds
- `getGameLength(): number` - Get game length in game time units
- `getWinner(): SC2Player | null` - Get winning player
- `getReplayData(): SC2ReplayData` - Get complete structured data

### Types

The library exports comprehensive TypeScript types:

```typescript
import type {
  MpqHeader,
  MpqHashTableEntry,
  MpqBlockTableEntry,
  MpqFile,
  SC2ReplayHeader,
  SC2ReplayDetails,
  SC2Player,
  SC2GameEvent,
  SC2MessageEvent,
  SC2TrackerEvent
} from 'mpqts';
```

## Development

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd mpqts

# Install dependencies
pnpm install

# Build the library
pnpm run build

# Run tests
pnpm run test

# Watch mode for development
pnpm run dev
```

### Scripts

- `pnpm run build` - Build both CommonJS and ESM versions
- `pnpm run dev` - Watch mode for development
- `pnpm run test` - Run test suite
- `pnpm run test:watch` - Run tests in watch mode
- `pnpm run test:coverage` - Run tests with coverage report
- `pnpm run lint` - Lint code
- `pnpm run typecheck` - Type checking

## File Format Support

### MPQ Archives
- MPQ format versions 0-4
- Hash table and block table parsing
- File compression support
- Encrypted file detection

### StarCraft II Replays
- All modern SC2 replay versions
- Header and metadata parsing
- Player information extraction
- Game events decoding
- Chat message parsing
- Tracker events (detailed statistics)

## Performance Considerations

- Use parsing options to disable unnecessary event decoding
- The library handles large replay files efficiently
- Memory usage scales with enabled parsing options
- Consider streaming for very large archives

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Based on analysis of Blizzard's [s2protocol](https://github.com/Blizzard/s2protocol) implementation
- MPQ format documentation and community research
- StarCraft II community for replay format insights