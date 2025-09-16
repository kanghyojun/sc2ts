# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MPQ (MoPaQ) file format parsing library implementation in TypeScript. MPQ is a proprietary archive format used by Blizzard Entertainment games.

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
mpqts/
├── src/
│   ├── index.ts              # Main entry point
│   ├── mpq-archive.ts        # Main MPQ archive class
│   ├── mpq-reader.ts         # Binary reader implementation
│   ├── types.ts              # TypeScript type definitions
│   ├── errors.ts             # Custom error classes
│   └── __tests__/            # Test files
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