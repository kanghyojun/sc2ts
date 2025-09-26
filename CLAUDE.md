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

### Test-Driven Development (TDD) Requirements

**CRITICAL**: When writing or modifying any code, you MUST follow Test-Driven Development practices. Always write tests BEFORE implementing the functionality.

#### TDD Workflow:

1. **Write Tests First**: Before implementing any feature or fix, write comprehensive tests that define the expected behavior
2. **Run Tests (Red)**: Verify that tests fail initially (since the implementation doesn't exist yet)
3. **Implement Code**: Write the minimal code necessary to make the tests pass
4. **Run Tests (Green)**: Verify that all tests pass
5. **Refactor**: Clean up and optimize the implementation while keeping tests green

#### ❌ **NEVER do this:**
```typescript
// Wrong: Writing implementation first
function parseHashTable(buffer: Buffer): MpqHashTableEntry[] {
  // Implementation code here...
  return entries;
}

// Then writing tests afterwards
it('should parse hash table', () => {
  // Test written after implementation
});
```

#### ✅ **ALWAYS do this:**
```typescript
// Correct: Write test first
it('should parse hash table with correct name1/name2 values', () => {
  const testBuffer = Buffer.from([/* test data */]);
  const expectedEntries = [
    { filename: 'replay.details', name1: 0xD383C29C, name2: 0xEF402E92 },
    { filename: 'replay.initData', name1: 0x12345678, name2: 0x87654321 }
  ];

  const entries = parseHashTable(testBuffer);

  expect(entries).toHaveLength(2);
  expect(entries[0]).toEqual(expectedEntries[0]);
  expect(entries[1]).toEqual(expectedEntries[1]);
});

// Then implement the function
function parseHashTable(buffer: Buffer): MpqHashTableEntry[] {
  // Implementation to make the test pass
}
```

#### TDD Guidelines for This Project:

1. **New Features**: Always write unit tests that define the expected API and behavior
2. **Bug Fixes**: Write failing tests that reproduce the bug, then fix the implementation
3. **Refactoring**: Ensure existing tests continue to pass throughout the refactoring process
4. **Edge Cases**: Write tests for boundary conditions, error cases, and invalid inputs
5. **Integration Tests**: For complex workflows, write integration tests that test multiple components together

#### Test File Organization:

- Place test files in `src/__tests__/` directory
- Use descriptive test names that explain the expected behavior
- Group related tests using `describe` blocks
- Use `beforeEach`/`afterEach` for test setup and cleanup

#### Example TDD Process:

```typescript
// Step 1: Write failing test
describe('MpqArchive', () => {
  it('should throw MpqInvalidFormatError for corrupted headers', () => {
    const corruptedBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00]); // Invalid signature

    expect(() => new MpqArchive(corruptedBuffer))
      .toThrow(MpqInvalidFormatError);
  });
});

// Step 2: Run test (should fail)
// Step 3: Implement minimal code to pass test
export class MpqArchive {
  constructor(buffer: Buffer) {
    if (buffer.readUInt32LE(0) !== 0x1A51504D) { // 'MPQ\x1A'
      throw new MpqInvalidFormatError('Invalid MPQ signature');
    }
    // ... rest of implementation
  }
}

// Step 4: Run test (should pass)
// Step 5: Refactor if needed while keeping tests green
```

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

## Import Guidelines

### TypeScript Import Rules

#### ❌ **NEVER do this:**
```typescript
// Wrong: Using .js extension in TypeScript files
import { something } from './module.js';
import type { Type } from '../types.js';
```

#### ✅ **ALWAYS do this:**
```typescript
// Correct: No extension in TypeScript files
import { something } from './module';
import type { Type } from '../types';
```

#### Why?
- TypeScript compiler handles extension resolution automatically
- `.js` extensions in TypeScript source cause module resolution issues
- Build tools (webpack, esbuild, etc.) expect TypeScript-style imports
- Mixing extensions creates inconsistency and potential runtime errors

#### How to Check:
```bash
# Search for problematic imports
grep -r "\.js';" src/
```

#### Auto-fix with ESLint:
Consider adding ESLint rules to catch these issues automatically:
```typescript
// Add to eslint rules if needed
"@typescript-eslint/consistent-type-imports": "error"
```

## TypeScript Type Safety Guidelines

### Strict Type Safety Requirements

**CRITICAL**: This project prioritizes type safety above all else. Always leverage TypeScript's type system to its fullest potential.

#### ❌ **NEVER do this:**
```typescript
// Wrong: Avoid any and unknown types
const data: any = parseResponse(buffer);
const result: unknown = processData(input);

// Wrong: Avoid forced type casting
const header = buffer as MpqHeader;
const entry = data as MpqHashTableEntry;
```

#### ✅ **ALWAYS do this:**
```typescript
// Correct: Define proper interfaces and use type guards
interface ParsedResponse {
  header: MpqHeader;
  entries: MpqHashTableEntry[];
}

function parseResponse(buffer: Buffer): ParsedResponse {
  // Implementation with proper typing
}

// Correct: Use type guards instead of casting
function isMpqHeader(data: unknown): data is MpqHeader {
  return typeof data === 'object' && data !== null &&
         'signature' in data && 'headerSize' in data;
}
```

#### Guidelines for Type Safety:

1. **Ban `any` and `unknown`**: Never use `any` or `unknown` types in production code
2. **No Type Casting**: Avoid forced type casting with `as` - use type guards instead
3. **Proper Interface Design**: Create specific interfaces for all data structures
4. **Type Guards**: Implement runtime type checking with proper type guard functions
5. **Strict Null Checks**: Handle null/undefined cases explicitly

#### When Data Structure is Unknown:

If you encounter data with an unknown structure, follow this process:

1. **Create Debug Script**: Write a debug script in `.debug/` to analyze the data structure
2. **Log and Inspect**: Output the data structure to understand its shape
3. **Design Interface**: Create a proper TypeScript interface based on findings
4. **Implement Type Guards**: Add runtime validation for the new interface
5. **Add Tests**: Write tests to validate the interface works correctly

#### Example Process for Unknown Data:

```javascript
// Step 1: Create .debug/analyze-data-structure.js
const fs = require('fs');

function analyzeUnknownData(buffer) {
  // Parse and log the structure
  console.log('Data structure analysis:');
  console.log(JSON.stringify(parsed, null, 2));

  // Identify field types and patterns
  Object.entries(parsed).forEach(([key, value]) => {
    console.log(`${key}: ${typeof value} (${Array.isArray(value) ? 'array' : 'single'})`);
  });
}

// Run analysis
analyzeUnknownData(testBuffer);
```

```typescript
// Step 2: Create interface based on analysis
interface NewDataStructure {
  field1: string;
  field2: number;
  field3: Array<{
    subField1: string;
    subField2: number;
  }>;
}

// Step 3: Implement type guard
function isNewDataStructure(data: unknown): data is NewDataStructure {
  return typeof data === 'object' && data !== null &&
         'field1' in data && typeof (data as any).field1 === 'string' &&
         'field2' in data && typeof (data as any).field2 === 'number' &&
         'field3' in data && Array.isArray((data as any).field3);
}

// Step 4: Use in production code
function parseNewData(buffer: Buffer): NewDataStructure {
  const parsed = parseBuffer(buffer);

  if (!isNewDataStructure(parsed)) {
    throw new Error('Invalid data structure');
  }

  return parsed; // TypeScript now knows this is NewDataStructure
}
```

#### Type Safety Enforcement:

- **Review Process**: All PRs must demonstrate proper typing without `any`/`unknown`
- **ESLint Rules**: Configure ESLint to ban `any` and `unknown` types:
  ```typescript
  "@typescript-eslint/no-explicit-any": "error",
  "@typescript-eslint/no-unsafe-assignment": "error",
  "@typescript-eslint/no-unsafe-call": "error",
  "@typescript-eslint/no-unsafe-member-access": "error"
  ```
- **Build Verification**: TypeScript strict mode must pass without warnings

## Git Commit Guidelines

### Atomic Commits and Consistency

**CRITICAL**: All commits must follow atomic commit principles with consistent formatting and prefixes to maintain a clean, readable project history.

#### Atomic Commit Requirements:

1. **One Logical Change Per Commit**: Each commit should represent a single, complete change
2. **Self-Contained**: Each commit should be functional and not break the build
3. **Focused Scope**: Avoid mixing unrelated changes (e.g., feature + refactoring + fix)
4. **Complete**: Include all necessary files for the change to work properly

#### ❌ **BAD Examples:**
```bash
# Wrong: Multiple unrelated changes
git commit -m "Add new feature, fix bug, and update docs"

# Wrong: Incomplete change
git commit -m "Add new function" # (missing tests, types, etc.)

# Wrong: No prefix or unclear description
git commit -m "update code"
git commit -m "changes"
```

#### ✅ **GOOD Examples:**
```bash
# Correct: Single, focused changes with clear prefixes
git commit -m "feat: add MPQ hash table parsing with encryption support"
git commit -m "fix: correct hash table name1/name2 calculation for SC2 replays"
git commit -m "refactor: extract binary reading logic into separate utility functions"
git commit -m "test: add comprehensive hash table parsing regression tests"
```

### Commit Message Format

All commit messages MUST follow this structure:

```
<prefix>: <description>

[optional body]

[optional footer]
```

#### Required Prefixes:

- **feat**: New feature or functionality
- **fix**: Bug fix or error correction
- **refactor**: Code restructuring without changing functionality
- **test**: Adding or modifying tests
- **docs**: Documentation changes
- **chore**: Maintenance tasks (build, deps, config)
- **perf**: Performance improvements
- **style**: Code formatting changes (no logic changes)
- **ci**: Continuous integration changes
- **build**: Build system or external dependency changes

#### Message Guidelines:

1. **Imperative Mood**: Use "add", "fix", "refactor" (not "added", "fixing", "refactors")
2. **Lowercase**: Start description with lowercase letter
3. **No Period**: Don't end the subject line with a period
4. **50 Characters Max**: Keep the subject line concise and under 50 characters
5. **Clear and Specific**: Describe what the commit does, not what was wrong

#### Examples by Category:

```bash
# Features
feat: implement SC2 replay decompression with zlib support
feat: add MPQ block table parsing with encryption detection

# Bug Fixes
fix: resolve hash table parsing errors for corrupted replay files
fix: handle edge case where MPQ header size is zero

# Refactoring
refactor: extract common binary reading operations into MpqReader class
refactor: simplify error handling with custom exception hierarchy

# Tests
test: add unit tests for MPQ archive file listing functionality
test: create regression tests for hash table name collision edge cases

# Documentation
docs: update API documentation for MpqArchive class methods
docs: add usage examples for binary file extraction

# Chores
chore: update TypeScript to v5.9.2 and adjust tsconfig settings
chore: configure Vitest for better test coverage reporting
```

#### Multi-line Commit Messages:

For complex changes, provide additional context in the body:

```bash
git commit -m "fix: resolve memory leak in large MPQ file processing

The previous implementation kept entire file buffers in memory during
parsing, causing memory exhaustion with files over 100MB. This change
implements streaming buffer processing to maintain constant memory usage.

Fixes issue where parsing 'large-replay.SC2Replay' (150MB) would crash
with out-of-memory errors. Memory usage now remains under 50MB regardless
of input file size.

Closes #42"
```

### Commit Workflow:

1. **Stage Related Changes Only**: Use `git add` selectively for atomic commits
2. **Review Before Committing**: Use `git diff --cached` to verify staged changes
3. **Write Clear Messages**: Follow the prefix and format guidelines above
4. **Test Before Commit**: Ensure `pnpm run test` and `pnpm run typecheck` pass
5. **One Logical Change**: If you have multiple unrelated changes, make separate commits

#### Example Workflow:

```bash
# Make changes to hash table parsing
git add src/mpq-reader.ts src/__tests__/mpq-reader.test.ts
git commit -m "fix: correct endianness handling in hash table parsing"

# Make separate commit for type improvements
git add src/types.ts
git commit -m "refactor: improve type definitions for MpqHashTableEntry"

# Make separate commit for documentation
git add README.md
git commit -m "docs: add hash table parsing examples to README"
```

### Commit History Quality:

- **Clean History**: Avoid "fix typo" or "oops" commits - use `git commit --amend` instead
- **Logical Sequence**: Commits should tell a coherent story of development
- **Bisectable**: Each commit should leave the codebase in a working state
- **Searchable**: Use consistent language and prefixes for easy history searching

```bash
# Good commit sequence that tells a story:
feat: implement basic MPQ archive reading functionality
test: add comprehensive tests for MPQ header parsing
fix: handle corrupted MPQ signatures gracefully
refactor: optimize memory usage in large file processing
docs: document MPQ archive API with usage examples
```
