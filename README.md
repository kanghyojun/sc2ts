# sc2ts

A comprehensive TypeScript library for parsing MPQ (MoPaQ) archive files and StarCraft II replay files. This library provides a modern, type-safe interface for reading Blizzard Entertainment's proprietary archive format.

## Features

- 🏗️ **MPQ Archive Support**: Read and extract files from MPQ archives
- 🎮 **StarCraft II Replay Parsing**: Complete SC2 replay file analysis
- 🖥️ **Command Line Interface**: Extract and analyze replays without coding
- 📦 **Dual Module Support**: Both CommonJS and ESM exports
- 🛡️ **Type Safety**: Full TypeScript support with comprehensive type definitions
- 🧪 **Well Tested**: Extensive test coverage with real replay files
- 🔍 **Binary Data Handling**: Advanced bit-packed data decoding

## Installation

```bash
npm install sc2ts
# or
pnpm add sc2ts
# or
yarn add sc2ts
```

## Command Line Interface (CLI)

sc2ts includes a powerful CLI tool for extracting and analyzing SC2 replay files without writing any code.

### CLI Installation

After installing the package, the `sc2ts` command becomes available:

```bash
# Install globally for CLI access
npm install -g sc2ts

# Or use directly with npx
npx sc2ts --help
```

### CLI Commands

#### Extract Files from Replays

Extract files from SC2 replay archives in JSON or raw binary format:

```bash
# Extract all files as JSON (default)
sc2ts extract replay.SC2Replay

# Extract to specific directory
sc2ts extract replay.SC2Replay --output ./extracted

# Extract specific files only
sc2ts extract replay.SC2Replay --files "replay.details,replay.game.events"

# Extract as raw binary files
sc2ts extract replay.SC2Replay --format raw

# Pretty print JSON output
sc2ts extract replay.SC2Replay --pretty

# Verbose output
sc2ts extract replay.SC2Replay --verbose
```

**Extract Command Options:**
- `--output, -o <dir>`: Output directory (default: `./extracted`)
- `--format, -f <format>`: Output format - `json` or `raw` (default: `json`)
- `--files <files>`: Comma-separated list of files to extract (default: `all`)
- `--pretty`: Pretty print JSON output
- `--verbose, -v`: Show detailed extraction progress

#### List Files in Archive

Display all files available in an SC2 replay archive:

```bash
# Simple file listing
sc2ts list replay.SC2Replay

# Show detailed file information
sc2ts list replay.SC2Replay --details

# Filter files by name
sc2ts list replay.SC2Replay --filter "events"

# Verbose output
sc2ts list replay.SC2Replay --verbose
```

**List Command Options:**
- `--details, -d`: Show detailed file information (size, compression, etc.)
- `--filter, -f <pattern>`: Filter files by name pattern
- `--verbose, -v`: Show additional information

#### Display Replay Information

Show comprehensive information about SC2 replay files:

```bash
# Basic replay information
sc2ts info replay.SC2Replay

# Show detailed player information
sc2ts info replay.SC2Replay --players

# Show event statistics
sc2ts info replay.SC2Replay --events

# Output as JSON
sc2ts info replay.SC2Replay --json

# All options combined
sc2ts info replay.SC2Replay --players --events --json --verbose
```

**Info Command Options:**
- `--json, -j`: Output information as JSON
- `--players, -p`: Show detailed player information
- `--events, -e`: Show event counts and statistics
- `--verbose, -v`: Show additional technical details

#### Parse Replay Data (Human-Readable)

Parse and display SC2 replay data in a human-readable format:

```bash
# Parse replay with human-readable output
sc2ts parse replay.SC2Replay

# Parse with verbose information
sc2ts parse replay.SC2Replay --verbose

# Parse and save as JSON
sc2ts parse replay.SC2Replay --json --pretty --output parsed_replay.json

# Parse and output JSON to console
sc2ts parse replay.SC2Replay --json --pretty
```

**Parse Command Options:**
- `--output, -o <file>`: Save parsed data to file (JSON format only)
- `--json, -j`: Output as structured JSON instead of human-readable format
- `--pretty`: Pretty-print JSON output (only works with --json)
- `--verbose, -v`: Show verbose parsing information

**Parse vs Extract vs Info:**
- `extract`: Extracts raw binary files from replay archive (base64 encoded)
- `info`: Shows basic replay metadata and statistics
- `parse`: **NEW!** Parses replay data into human-readable format with game details, players, chat messages, and event summaries

### CLI Examples

#### Complete Workflow Example

```bash
# 1. First, examine the replay file
sc2ts info replay.SC2Replay --players
# Output: Shows game info, players, duration, etc.

# 2. See what files are available
sc2ts list replay.SC2Replay --details
# Output: Lists all extractable files with sizes

# 3. Extract specific game data
sc2ts extract replay.SC2Replay --files "replay.details,replay.game.events" --pretty

# 4. Extract all files as raw binaries for advanced analysis
sc2ts extract replay.SC2Replay --format raw --output ./raw_data
```

#### Batch Processing

```bash
# Process multiple replays (using shell scripting)
for replay in *.SC2Replay; do
  echo "Processing $replay..."
  sc2ts info "$replay" --json > "${replay%.SC2Replay}_info.json"
  sc2ts extract "$replay" --files "replay.details" --output "./details/"
done
```

### Supported Files for Extraction

The CLI can extract these files from SC2 replay archives:

- **`(attributes)`** - Game attributes and settings
- **`(listfile)`** - Archive file listing
- **`replay.attributes.events`** - Game attribute events
- **`replay.details`** - Game details and player information
- **`replay.game.events`** - All gameplay events and actions
- **`replay.initData`** - Game initialization data
- **`replay.load.info`** - Loading screen information
- **`replay.message.events`** - Chat messages and pings
- **`replay.server.battlelobby`** - Battle.net lobby information
- **`replay.sync.events`** - Synchronization events
- **`replay.tracker.events`** - Detailed unit/building tracking

### Output Formats

#### JSON Format

When using `--format json` (default), files are extracted as structured JSON with metadata:

```json
{
  "filename": "replay.details",
  "fileSize": 2048,
  "compressedSize": 1024,
  "flags": 2,
  "data": "base64-encoded-content...",
  "metadata": {
    "isCompressed": true,
    "compressionRatio": 0.5
  }
}
```

#### Raw Format

When using `--format raw`, files are extracted as their original binary data, perfect for advanced analysis or processing with other tools.

## Quick Start

### Basic MPQ Archive Usage

```typescript
import { MpqArchive } from 'sc2ts';
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
import { SC2Replay } from 'sc2ts';
import { readFileSync } from 'fs';

// Load and parse a StarCraft II replay
const replayBuffer = readFileSync('replay.SC2Replay');
const replay = SC2Replay.fromBuffer(replayBuffer);

// Get basic replay information
console.log('Map name:', replay.replayDetails?.title);
console.log('Game duration:', replay.duration, 'seconds');
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
const winner = replay.winner;
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
import { SC2Replay } from 'sc2ts';

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
import { MpqReader } from 'sc2ts';

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
import { MpqError, MpqInvalidFormatError, SC2Replay } from 'sc2ts';

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
} from 'sc2ts';
```

## Development

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd sc2ts

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

- `pnpm run build` - Build both CommonJS and ESM versions + CLI
- `pnpm run dev` - Watch mode for development
- `pnpm run dev:cli` - Run CLI in development mode
- `pnpm run test` - Run test suite
- `pnpm run test:watch` - Run tests in watch mode
- `pnpm run test:coverage` - Run tests with coverage report
- `pnpm run lint` - Lint code
- `pnpm run typecheck` - Type checking

### Testing the CLI

After building, you can test the CLI locally:

```bash
# Build the project
pnpm run build

# Test CLI commands
./bin/run.mjs --help
./bin/run.mjs extract replay.SC2Replay
./bin/run.mjs list replay.SC2Replay --details
./bin/run.mjs info replay.SC2Replay --players
```

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
