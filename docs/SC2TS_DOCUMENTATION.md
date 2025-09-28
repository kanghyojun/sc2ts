# SC2TS - StarCraft II TypeScript Library

A comprehensive TypeScript library for parsing MPQ (MoPaQ) archive files and StarCraft II replay files with modern, type-safe interfaces.

## Overview

SC2TS provides a complete solution for:
- Reading and extracting MPQ archive files
- Parsing StarCraft II replay data
- Decoding game events, messages, and tracker data
- Command-line tools for replay analysis

## Installation

```bash
npm install sc2ts
# or
pnpm install sc2ts
# or
yarn add sc2ts
```

## Quick Start

### Basic Replay Parsing

```typescript
import { SC2Replay } from 'sc2ts';

// Parse a SC2 replay file
const replay = await SC2Replay.fromFile('path/to/replay.SC2Replay', {
  decodeGameEvents: true,
  decodeMessageEvents: true,
  decodeTrackerEvents: true,
});

// Access replay data
console.log('Game duration:', replay.duration, 'seconds');
console.log('Winner:', replay.winner?.name);
console.log('Players:', replay.players.map(p => p.name));
console.log('Total events:', replay.gameEvents.length);
```

### Working with MPQ Archives

```typescript
import { MpqArchive } from 'sc2ts';

// Open an MPQ archive
const archive = new MpqArchive('path/to/archive.mpq');

// List files in the archive
const files = archive.getFileList();
console.log('Files in archive:', files);

// Extract a specific file
const fileData = archive.getFile('replay.details');
if (fileData) {
  console.log('File size:', fileData.data.length);
}
```

## Command Line Interface

SC2TS includes a powerful CLI tool for replay analysis:

### Installation

```bash
npm install -g sc2ts
```

### Available Commands

#### Parse Command
Extract comprehensive replay data including events, players, and metadata:

```bash
# Human-readable output
sc2ts parse "replay.SC2Replay"

# JSON output
sc2ts parse "replay.SC2Replay" --json --pretty

# Save to file
sc2ts parse "replay.SC2Replay" --json --pretty -o "analysis.json"
```

#### Events Command
Analyze detailed game events with advanced filtering:

```bash
# All events
sc2ts events "replay.SC2Replay"

# Only tracker events (unit movements, births, deaths)
sc2ts events "replay.SC2Replay" --type tracker

# Filter for unit-related events only
sc2ts events "replay.SC2Replay" --type tracker --filter unit

# Exclude map initialization events
sc2ts events "replay.SC2Replay" --type tracker --filter unit --gameplay-only

# JSON output with specific filtering
sc2ts events "replay.SC2Replay" --type tracker --filter "Probe" --gameplay-only --json --pretty
```

#### Info Command
Display basic replay information:

```bash
# Basic info
sc2ts info "replay.SC2Replay"

# Include player details
sc2ts info "replay.SC2Replay" --players

# JSON format
sc2ts info "replay.SC2Replay" --json
```

#### List Command
List files within the MPQ archive:

```bash
# Simple file list
sc2ts list "replay.SC2Replay"

# Detailed file information
sc2ts list "replay.SC2Replay" --details

# Filter files by name
sc2ts list "replay.SC2Replay" --filter "replay.game"
```

#### Extract Command
Extract files from the MPQ archive:

```bash
# Extract all files as JSON
sc2ts extract "replay.SC2Replay" --format json -o "./extracted"

# Extract specific files
sc2ts extract "replay.SC2Replay" --files "replay.details,replay.initData"

# Extract as raw binary
sc2ts extract "replay.SC2Replay" --format raw
```

## API Reference

### SC2Replay Class

Main class for parsing StarCraft II replay files.

#### Static Methods

```typescript
// Create SC2Replay from file path
static async fromFile(filePath: string, options?: ReplayOptions): Promise<SC2Replay>

// Create SC2Replay from buffer
static fromBuffer(buffer: Buffer, options?: ReplayOptions): SC2Replay
```

#### Properties (Getters)

```typescript
// Core replay data
get replayHeader(): ReplayHeader | null      // Header with version info and metadata
get replayDetails(): ReplayDetails | null    // Game details, map info, and players
get replayInitData(): ReplayInitData | null  // Initialization data (optional)

// Players and events
get players(): Player[]                       // All players in the game
get gameEvents(): GameEvent[]                 // Player actions and commands
get messageEvents(): MessageEvent[]           // Chat messages and notifications
get trackerEvents(): TrackerEvent[]           // Unit tracking and game state

// Computed properties
get gameLength(): number                      // Game length in loops
get duration(): number                        // Game duration in seconds (gameLength/16)
get winner(): Player | null                   // Winning player (result === 1)
```

#### Usage Examples

```typescript
// Basic parsing with all events
const replay = await SC2Replay.fromFile('replay.SC2Replay');

// Selective parsing for performance
const replay = await SC2Replay.fromFile('replay.SC2Replay', {
  decodeGameEvents: false,     // Skip player actions
  decodeMessageEvents: true,   // Include chat messages
  decodeTrackerEvents: true,   // Include unit tracking
  decodeInitData: false        // Skip initialization data
});

// Parse from buffer (useful for browser/stream)
const buffer = fs.readFileSync('replay.SC2Replay');
const replay = SC2Replay.fromBuffer(buffer);

// Access data
console.log('Game duration:', replay.duration, 'seconds');
console.log('Total loops:', replay.gameLength);
console.log('Winner:', replay.winner?.name);
console.log('Chat messages:', replay.messageEvents.length);
console.log('Unit events:', replay.trackerEvents.filter(e =>
  e.eventType?.includes('SUnitBorn')
).length);
```
```

### MpqArchive Class

Low-level class for working with MPQ archive files.

```typescript
class MpqArchive {
  constructor(input: string | Buffer)

  // Methods
  getFileList(): string[]
  getFile(filename: string): MpqFile | null

  // Properties
  archiveHeader: MpqArchiveHeader
  files: Map<string, MpqFile>
}
```

### Event Types

#### Game Events
Player actions and game state changes:
- Unit commands (move, attack, build)
- Ability usage
- Camera movements
- Selection changes

#### Message Events
Chat messages and system notifications:
- Player chat messages
- Game notifications
- System messages

#### Tracker Events
Unit and game state tracking:
- Unit births and deaths (`SUnitBornEvent`, `SUnitDiedEvent`)
- Unit movements and positions
- Resource changes
- Upgrade completions

### Time Conversion

The library automatically handles game speed conversion:

```typescript
// Game loops to real time conversion
const gameSpeed = replay.replayDetails.gameSpeed; // 1-5
const loopsPerSecond = getLoopsPerSecond(gameSpeed);
const realTimeSeconds = gameLoop / loopsPerSecond;

// Game speed mappings:
// Speed 1 (Slower): 8 loops/sec
// Speed 2 (Slow): 11.2 loops/sec
// Speed 3 (Normal): 16 loops/sec
// Speed 4 (Fast): 22.4 loops/sec
// Speed 5 (Faster): 32 loops/sec
```

## Advanced Usage

### Event Filtering and Analysis

#### Unit Production Analysis

```typescript
const replay = await SC2Replay.fromFile('replay.SC2Replay');

// Get all unit births (excluding map initialization)
const unitBirths = replay.trackerEvents.filter(event =>
  event.eventType === 'NNet.Replay.Tracker.SUnitBornEvent' &&
  event.loop > 0 // Exclude map initialization
);

// Analyze unit production by player
const player1Units = unitBirths.filter(event =>
  (event as any).m_controlPlayerId === 1
);

// Get units produced by specific structures
const nexusProduced = unitBirths.filter(event =>
  (event as any).m_creatorAbilityName === 'NexusTrain'
);

console.log(`Player 1 produced ${player1Units.length} units`);
console.log(`Nexus produced ${nexusProduced.length} units`);
```

#### Chat Message Analysis

```typescript
// Extract all chat messages
const chatMessages = replay.messageEvents.filter(event =>
  event.messageType.includes('Chat') &&
  typeof event.messageData === 'object' &&
  event.messageData &&
  'm_string' in event.messageData
);

// Group messages by player
const messagesByPlayer = chatMessages.reduce((acc, msg) => {
  const playerId = msg.userId ?? 0;
  if (!acc[playerId]) acc[playerId] = [];
  acc[playerId].push({
    time: Math.floor(msg.loop / 22.4), // Convert to seconds
    message: (msg.messageData as any).m_string,
    player: replay.players[playerId]?.name || 'Unknown'
  });
  return acc;
}, {} as Record<number, any[]>);

console.log('Chat history:', messagesByPlayer);
```

#### Time-based Analysis

```typescript
// Analyze events by game phase
const gameSpeed = replay.replayDetails?.gameSpeed || 4;
const loopsPerSecond = gameSpeed === 4 ? 22.4 : 16; // Adjust based on speed

const phases = {
  early: unitBirths.filter(e => e.loop < (5 * 60 * loopsPerSecond)),    // 0-5 min
  mid: unitBirths.filter(e => e.loop >= (5 * 60 * loopsPerSecond) &&
                              e.loop < (15 * 60 * loopsPerSecond)),      // 5-15 min
  late: unitBirths.filter(e => e.loop >= (15 * 60 * loopsPerSecond))    // 15+ min
};

console.log('Early game units:', phases.early.length);
console.log('Mid game units:', phases.mid.length);
console.log('Late game units:', phases.late.length);
```

#### Build Order Analysis

```typescript
// Get first 10 units/buildings for each player
function getBuildOrder(playerId: number, limit: number = 10) {
  return unitBirths
    .filter(event => (event as any).m_controlPlayerId === playerId && event.loop > 0)
    .sort((a, b) => a.loop - b.loop)
    .slice(0, limit)
    .map(event => ({
      unit: (event as any).m_unitTypeName,
      time: Math.floor(event.loop / loopsPerSecond),
      gameTime: `${Math.floor(event.loop / loopsPerSecond / 60)}:${(Math.floor(event.loop / loopsPerSecond) % 60).toString().padStart(2, '0')}`
    }));
}

const player1BuildOrder = getBuildOrder(1);
const player2BuildOrder = getBuildOrder(2);

console.log('Player 1 build order:', player1BuildOrder);
console.log('Player 2 build order:', player2BuildOrder);
```

### Performance Optimization

#### Selective Parsing for Large Files

```typescript
// Only parse what you need for better performance
const replay = await SC2Replay.fromFile('large-replay.SC2Replay', {
  decodeGameEvents: false,      // Skip if you don't need player actions
  decodeMessageEvents: true,    // Parse only chat messages
  decodeTrackerEvents: true,    // Parse unit tracking
  decodeInitData: false         // Skip initialization data
});

// For unit analysis only
const replayUnitsOnly = await SC2Replay.fromFile('replay.SC2Replay', {
  decodeGameEvents: false,
  decodeMessageEvents: false,
  decodeTrackerEvents: true,    // Only unit events
  decodeInitData: false
});
```

#### Streaming Processing for Multiple Files

```typescript
async function processReplayDirectory(directory: string) {
  const files = fs.readdirSync(directory).filter(f => f.endsWith('.SC2Replay'));

  const results = [];
  for (const file of files) {
    try {
      const replay = await SC2Replay.fromFile(path.join(directory, file), {
        decodeGameEvents: false,    // Minimize parsing for batch processing
        decodeMessageEvents: false,
        decodeTrackerEvents: true,
        decodeInitData: false
      });

      results.push({
        file,
        duration: replay.duration,
        winner: replay.winner?.name,
        playerCount: replay.players.length,
        unitCount: replay.trackerEvents.filter(e =>
          e.eventType === 'NNet.Replay.Tracker.SUnitBornEvent'
        ).length
      });
    } catch (error) {
      console.error(`Failed to process ${file}:`, error);
    }
  }

  return results;
}
```

### Error Handling

```typescript
try {
  const replay = await SC2Replay.fromFile('replay.SC2Replay');
} catch (error) {
  if (error instanceof MpqError) {
    console.error('MPQ parsing error:', error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Type Definitions

### ReplayOptions

```typescript
interface ReplayOptions {
  decodeGameEvents?: boolean      // Parse player actions (default: true)
  decodeMessageEvents?: boolean   // Parse chat messages (default: true)
  decodeTrackerEvents?: boolean   // Parse unit tracking (default: true)
  decodeInitData?: boolean        // Parse initialization data (default: false)
}
```

### Player

```typescript
interface Player {
  name: string                    // Player name
  race: string                    // Race (e.g., "프로토스", "테란", "저그")
  color: {                        // Player color
    r: number, g: number, b: number, a: number
  }
  control: number                 // Control type
  teamId: number                  // Team identifier
  handicap: number                // Handicap percentage
  observe: number                 // Observer status
  result: number                  // 1 = Victory, 2 = Defeat, 3 = Tie
  workingSetSlotId?: number       // Working set slot
  hero: string                    // Hero unit (if applicable)
  userId: number                  // User identifier
  toon: {                         // Battle.net account info
    region: number
    programId: string
    realm: number
    name: string
    id: string
  }
}
```

### ReplayHeader

```typescript
interface ReplayHeader {
  signature: string               // "StarCraft II replay\u001b11"
  version: {                      // Game version info
    flags: number
    major: number                 // Major version (e.g., 5)
    minor: number                 // Minor version (e.g., 0)
    revision: number              // Revision (e.g., 14)
    build: number                 // Build number (e.g., 94137)
    baseBuild: number             // Base build number
  }
  type: number                    // Replay type
  elapsedGameLoops: number        // Total game loops
  useScaledTime: boolean          // Whether scaled time is used
  length: number                  // Header length
}
```

### Game Event

```typescript
interface GameEvent extends BaseEvent {
  _event: string                  // Raw event name
  _eventid: number                // Event ID
  _gameloop: number               // Game loop when event occurred
  _userid: number                 // User who triggered event
  loop: number                    // Normalized loop number
  userId?: number                 // User identifier
  eventType: string               // Event type name
  eventData: unknown              // Event-specific data
}
```

### Message Event

```typescript
interface MessageEvent extends BaseEvent {
  _event: string                  // Raw event name
  _eventid: number                // Event ID
  _gameloop: number               // Game loop when message sent
  loop: number                    // Normalized loop number
  userId?: number                 // User who sent message
  messageType: string             // Message type
  messageData: unknown            // Message content (string or object)
}
```

### Tracker Event

```typescript
interface TrackerEvent extends BaseEvent {
  _event: string                  // Raw event name (e.g., "NNet.Replay.Tracker.SUnitBornEvent")
  _eventid: number                // Event ID
  _gameloop: number               // Game loop when event occurred
  loop: number                    // Normalized loop number
  eventType: string               // Event type name
  [key: string]: unknown          // Event-specific fields
}

// Specific tracker events
interface SUnitBornEvent extends TrackerEvent {
  m_unitTagIndex?: number         // Unit tag index
  m_unitTagRecycle?: number       // Unit tag recycle
  m_unitTypeName?: string         // Unit type (e.g., "Probe", "Nexus")
  m_controlPlayerId?: number      // Controlling player ID
  m_upkeepPlayerId?: number       // Upkeep player ID
  m_x?: number                    // X coordinate
  m_y?: number                    // Y coordinate
  m_creatorUnitTagIndex?: number  // Creator unit tag
  m_creatorAbilityName?: string   // Creator ability (e.g., "NexusTrain")
}

interface SUnitDiedEvent extends TrackerEvent {
  m_unitTagIndex?: number         // Unit that died
  m_unitTagRecycle?: number       // Unit tag recycle
  m_killerPlayerId?: number       // Player who killed the unit
  m_x?: number                    // Death location X
  m_y?: number                    // Death location Y
  m_killerUnitTagIndex?: number   // Unit that killed this unit
}
```

## Development

### Building

```bash
# Install dependencies
pnpm install

# Build the library
pnpm run build

# Run tests
pnpm run test

# Lint code
pnpm run lint

# Type checking
pnpm run typecheck
```

### Testing

```bash
# Run all tests
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Run with coverage
pnpm run test:coverage
```

### CLI Development

```bash
# Run CLI in development mode
pnpm run dev:cli [command] [options]

# Example: Parse a replay in development
pnpm run dev:cli parse "replays/example.SC2Replay" --json --pretty
```

## Browser Support

SC2TS works in both Node.js and browser environments:

```typescript
// Browser usage with File API
const fileInput = document.querySelector('input[type="file"]');
fileInput.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  const buffer = await file.arrayBuffer();
  const replay = await SC2Replay.fromBuffer(Buffer.from(buffer));
  console.log('Replay loaded:', replay.replayDetails.title);
});
```

## Performance

- **Streaming**: Large files are processed efficiently with streaming decompression
- **Memory**: Constant memory usage regardless of replay file size
- **Speed**: Optimized binary parsing with minimal overhead
- **Concurrent**: Thread-safe for parallel processing

## Supported Formats

- **StarCraft II Replay Files**: `.SC2Replay` files from all game versions
- **MPQ Archives**: Standard Blizzard MPQ format (version 0, 1, 2, 3)
- **Compression**: Support for zlib, bzip2, and LZMA compression
- **Encryption**: Handles encrypted MPQ files and hash tables

## Error Types

```typescript
// Custom error hierarchy
MpqError                    // Base MPQ error
├── MpqInvalidFormatError  // Invalid file format
├── MpqDecryptionError     // Decryption failed
├── MpqDecompressionError  // Decompression failed
└── MpqFileNotFoundError   // File not found in archive
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Changelog

### Latest Changes

- ✨ **New Events Command**: Added comprehensive event analysis with filtering
- 🎯 **Gameplay Filtering**: `--gameplay-only` option to exclude map initialization
- ⏱️ **Smart Time Conversion**: Automatic game speed detection and time calculation
- 🔍 **Advanced Filtering**: Filter events by type, unit, player, or custom criteria
- 📊 **Rich Output**: Human-readable summaries with JSON export options
- 🚀 **Performance**: Optimized parsing and streaming for large replay files