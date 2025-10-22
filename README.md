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
- 📝 **Structured Logging**: Optional LogTape integration for debugging and monitoring
- ⚡ **Modern Bundler Support**: Works seamlessly with Next.js, Webpack, Vite, and other modern bundlers

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

// Method 1: Load from buffer (async)
const buffer = readFileSync('example.mpq');
const archive = await MpqArchive.fromBuffer(buffer);

// Method 2: Load from file path (async)
const archive2 = await MpqArchive.open('example.mpq');

// List all files in the archive
const files = archive.listFiles();
console.log('Files in archive:', files);

// Extract a specific file (async)
const fileData = await archive.getFile('path/to/file.txt');
console.log('File content:', fileData.data.toString());
console.log('Original size:', fileData.fileSize);
console.log('Compressed size:', fileData.compressedSize);

// Check if file exists
if (archive.hasFile('some/file.dat')) {
  console.log('File exists!');
}

// Get archive information
console.log('Archive has', archive.fileCount, 'files');
```

### StarCraft II Replay Analysis

```typescript
import { SC2Replay } from 'sc2ts';
import { readFileSync } from 'fs';

// Method 1: Load from buffer (async)
const replayBuffer = readFileSync('replay.SC2Replay');
const replay = await SC2Replay.fromBuffer(replayBuffer);

// Method 2: Load from file path (async)
const replay2 = await SC2Replay.fromFile('replay.SC2Replay');

// Get basic replay information
console.log('Map name:', replay.replayDetails?.title);
console.log('Game duration:', replay.duration, 'seconds');  // Getter property
console.log('Game loops:', replay.gameLength);              // Getter property
console.log('Players:', replay.players.length);

// Access player information
replay.players.forEach((player, index) => {
  console.log(`Player ${index + 1}:`, {
    name: player.name,
    race: player.race,
    teamId: player.teamId,
    color: player.color,
    result: player.result  // 1 = Win, 2 = Loss, 3 = Tie
  });
});

// Get the winner (getter property)
const winner = replay.winner;
if (winner) {
  console.log('Winner:', winner.name);
}

// Access replay events
console.log('Game events:', replay.gameEvents.length);
console.log('Chat messages:', replay.messageEvents.length);
console.log('Tracker events:', replay.trackerEvents.length);
```

### Advanced Replay Parsing with Options

```typescript
import { SC2Replay } from 'sc2ts';

const replay = await SC2Replay.fromBuffer(buffer, {
  // Enable/disable specific event parsing for performance
  decodeGameEvents: true,     // Parse gameplay events (default: true)
  decodeMessageEvents: true,  // Parse chat messages (default: true)
  decodeTrackerEvents: true,  // Parse detailed tracking events (default: true)
  decodeInitData: false       // Parse initialization data (default: false)
});

// Access different types of events
console.log('Game events:', replay.gameEvents.length);
console.log('Message events:', replay.messageEvents.length);
console.log('Tracker events:', replay.trackerEvents.length);

// Example: Find all chat messages
replay.messageEvents.forEach(msg => {
  if (msg._event === 'NNet.Game.SChatMessage') {
    console.log(`Player ${msg.m_userId}: ${msg.m_string}`);
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
  const replay = await SC2Replay.fromBuffer(buffer);
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

### Logging Configuration (Optional)

sc2ts uses [LogTape](https://logtape.org/) for structured logging. Following LogTape's best practices for library authors, **sc2ts does not configure logging itself** - it's up to your application to configure logging if you want to see debug output.

#### Basic Logging Setup

If you want to see debug logs from sc2ts in your application:

```typescript
import { configure, getConsoleSink } from '@logtape/logtape';
import { SC2Replay } from 'sc2ts';

// Configure LogTape in your application (not in the library)
await configure({
  sinks: {
    console: getConsoleSink(),
  },
  loggers: [
    // Configure sc2ts logging
    {
      category: ['sc2ts'],
      lowestLevel: 'debug',  // Show all debug logs
      sinks: ['console'],
    },
  ],
});

// Now sc2ts will log debug information
const replay = await SC2Replay.fromFile('replay.SC2Replay');
// Logs will show: MPQ header parsing, file extraction, decompression, etc.
```

#### Log Categories

sc2ts uses these log categories (all under the `sc2ts` namespace):

- `['sc2ts', 'mpq-archive']` - MPQ archive parsing and file extraction
- `['sc2ts', 'mpq-reader']` - Low-level binary reading and decryption
- `['sc2ts', 'sc2-replay']` - SC2 replay parsing
- `['sc2ts', 'protocol']` - Protocol decoder and event parsing
- `['sc2ts', 'cli']` - CLI command execution
- `['sc2ts', 'cli-extractor']` - CLI file extraction
- `['sc2ts', 'cli-formatter']` - CLI output formatting

#### Production vs Development

```typescript
await configure({
  sinks: {
    console: getConsoleSink(),
  },
  loggers: [
    {
      category: ['sc2ts'],
      // Only show warnings and errors in production
      lowestLevel: process.env.NODE_ENV === 'production' ? 'warning' : 'debug',
      sinks: ['console'],
    },
  ],
});
```

#### Disabling Logs

If you don't configure LogTape, sc2ts will not produce any log output. This is intentional - libraries should not force logging configuration on applications.

#### Custom Logger Access

If you're building tools on top of sc2ts and want to use the same logger:

```typescript
import { getScLogger } from 'sc2ts';

// Create a logger for your module (will be under ['sc2ts', 'your-module'])
const logger = getScLogger('your-module');

logger.info('Processing replay batch', { count: 10 });
logger.debug('Detailed processing info', { fileSize: 1024 });
```

For more information about LogTape configuration, see the [LogTape documentation](https://logtape.org/).

## API Reference

### MpqArchive

The main class for working with MPQ archives.

#### Static Methods
```typescript
MpqArchive.fromBuffer(buffer: Buffer, options?: MpqParseOptions): Promise<MpqArchive>
MpqArchive.open(filepath: string, options?: MpqParseOptions): Promise<MpqArchive>
```

#### Constructor (Advanced)
```typescript
new MpqArchive(reader: MpqReader)
```

#### Properties (Getters)
- `fileCount: number` - Number of files in the archive
- `archiveHeader: MpqHeader | null` - MPQ archive header information

#### Methods
- `listFiles(): string[]` - Get list of all file paths
- `getFile(filename: string): Promise<MpqFile>` - Extract file content and metadata (async)
- `hasFile(filename: string): boolean` - Check if file exists
- `getUserDataContent(): Buffer | null` - Get user data content from SC2 replays

### SC2Replay

Parser for StarCraft II replay files.

#### Static Methods
```typescript
SC2Replay.fromBuffer(buffer: Buffer, options?: ReplayOptions): Promise<SC2Replay>
SC2Replay.fromFile(filepath: string, options?: ReplayOptions): Promise<SC2Replay>
```

#### Properties (Getters)
- `replayHeader: ReplayHeader | null` - Replay file header
- `replayDetails: ReplayDetails | null` - Game details and metadata
- `replayInitData: ReplayInitData | null` - Initialization data (if parsed)
- `players: Player[]` - Array of player information
- `gameEvents: GameEvent[]` - Gameplay events
- `messageEvents: MessageEvent[]` - Chat messages and pings
- `trackerEvents: TrackerEvent[]` - Detailed unit/building tracking events
- `gameLength: number` - Game length in game loops
- `duration: number` - Game duration in seconds (gameLength / 16)
- `winner: Player | null` - Winning player
- `mpqArchive: MpqArchive` - Access to underlying MPQ archive

### Types

The library exports comprehensive TypeScript types:

```typescript
import type {
  MpqHeader,
  MpqHashTableEntry,
  MpqBlockTableEntry,
  MpqFile,
  MpqParseOptions,
  ReplayHeader,
  ReplayDetails,
  ReplayInitData,
  ReplayData,
  Player,
  GameEvent,
  MessageEvent,
  TrackerEvent,
  ReplayOptions
} from 'sc2ts';
```

## Development

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd sc2ts

# Install dependencies (this also sets up Git hooks via Husky)
pnpm install

# Build the library
pnpm run build

# Run tests
pnpm run test

# Watch mode for development
pnpm run dev
```

**Note**: `pnpm install` automatically sets up Git hooks (via Husky) that run quality checks before each commit. This ensures code quality and prevents regressions.

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
