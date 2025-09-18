# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A comprehensive TypeScript library for parsing MPQ (MoPaQ) archive files and StarCraft II replay files. This library provides a modern, type-safe interface for reading Blizzard Entertainment's proprietary archive format.

## Development Setup

This project uses:
- **Package Manager**: pnpm (v10.16.1)
- **Language**: TypeScript (v5.9.2)
- **Testing**: Vitest with coverage
- **Build Configuration**: Dual module output (CommonJS and ESM)

## Development Commands

```bash
# Install dependencies
pnpm install

# Build the library (both CommonJS and ESM)
pnpm run build

# Development mode (watch for changes)
pnpm run dev

# Run tests
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Run tests with coverage
pnpm run test:coverage

# Lint code
pnpm run lint

# Fix linting issues
pnpm run lint:fix

# Type checking
pnpm run typecheck

# Clean build output
pnpm run clean
```

## Project Structure

```
/
├── src/
│   ├── index.ts              # Main entry point
│   ├── mpq-archive.ts        # Main MPQ archive class
│   ├── mpq-reader.ts         # Binary reader implementation
│   ├── types.ts              # TypeScript type definitions
│   ├── errors.ts             # Custom error classes
│   └── __tests__/            # Test files
├── .debug/                   # Debug scripts and analysis tools
├── dist/                     # Build output (generated)
├── package.json              # Project configuration
├── tsconfig.json             # Main TypeScript config
├── tsconfig.cjs.json         # CommonJS build config
├── tsconfig.esm.json         # ESM build config
├── vitest.config.ts          # Vitest configuration
└── docs/
    └── mpq.html              # MPQ format documentation
```

## TypeScript Configuration

The project uses strict TypeScript settings with:
- Module system: Dual output (CommonJS and ESM)
- Target: ES2022
- Strict mode enabled with all strict checks
- Source maps and declaration files enabled

## Library Architecture

The library is structured around these main components:

1. **MpqArchive**: Main class for working with MPQ archives
   - Opens and parses MPQ files
   - Manages file listing and extraction
   - Handles both file and buffer inputs

2. **MpqReader**: Low-level binary reader
   - Reads MPQ headers, hash tables, and block tables
   - Provides position-based reading methods

3. **Type Definitions**: Comprehensive TypeScript types for MPQ structures
   - MpqHeader, MpqHashTableEntry, MpqBlockTableEntry
   - MpqFile, MpqParseOptions
   - Enums for flags and compression types

4. **Error Handling**: Custom error classes for MPQ-specific errors
   - MpqError (base class)
   - MpqInvalidFormatError, MpqDecryptionError, MpqDecompressionError
   - MpqFileNotFoundError

## Testing and Quality Assurance

### Regression Testing Requirements

**IMPORTANT**: When fixing any bug or issue in the codebase, you MUST add regression tests to prevent the same issue from occurring again in the future.

#### Guidelines for Regression Tests:

1. **Identify the Root Cause**: Understand what caused the bug and what specific behavior was broken
2. **Create Targeted Tests**: Write tests that specifically validate the fixed behavior
3. **Use Real Data When Possible**: For MPQ/SC2 replay parsing, use actual replay files to test against known good hash table values
4. **Document the Issue**: Include comments in tests explaining what bug the test prevents
5. **Test Edge Cases**: Consider boundary conditions and edge cases related to the original bug

#### Test Categories for Regression:

- **Hash Table Parsing**: When fixing hash table parsing issues, validate name1/name2 values against known good data
- **File Format Compatibility**: Test with multiple SC2 replay versions and MPQ format versions
- **Memory and Performance**: Add performance regression tests for large files
- **Error Handling**: Ensure error conditions are properly caught and reported

#### Example Regression Test Pattern:

```typescript
// Regression test for issue #123: Hash table parsing returns incorrect name1/name2
it('should correctly parse hash table name1/name2 values (regression test)', () => {
  // This test prevents regression of hash table parsing bug found in a.SC2Replay
  const expectedEntries = [
    { filename: 'replay.details', name1: 0xD383C29C, name2: 0xEF402E92 },
    // ... more expected values from known good data
  ];

  // Validate that parsing produces expected hash values
  // ... test implementation
});
```

## Debugging and Development Tools

### Debug Scripts Directory

All debugging and analysis scripts should be placed in the `.debug/` directory to keep them organized and separate from the main codebase. These scripts are typically Node.js files used for investigating issues, analyzing binary data, or testing specific algorithms.

#### Guidelines for Debug Scripts:

1. **Location**: Always create debug scripts in the `.debug/` directory
2. **File naming**: Use descriptive names like `analyze-hash-mismatch.js`, `test-sc2-decryption.js`
3. **Node.js compatibility**: Write scripts as plain Node.js files (not TypeScript) for quick execution
4. **Self-contained**: Include all necessary functions within the script for easy execution
5. **Documentation**: Add comments explaining what the script does and how to interpret results

#### Example Debug Script Structure:

```javascript
// .debug/analyze-issue.js
const fs = require('fs');

// Helper functions
function helperFunction() {
  // Implementation
}

// Main analysis
console.log('Starting analysis...');
// Analysis code here
console.log('Analysis complete.');
```

#### Running Debug Scripts:

```bash
# Execute debug scripts directly with Node.js
node .debug/analyze-hash-mismatch.js
node .debug/test-sc2-decryption.js
```

**Note**: Debug scripts are excluded from linting and TypeScript compilation as they are development tools, not part of the library codebase.
