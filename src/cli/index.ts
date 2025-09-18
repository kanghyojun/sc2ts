#!/usr/bin/env node

import {
  type InferValue,
  argument,
  command,
  constant,
  merge,
  object,
  option,
  optional,
  or,
  withDefault,
} from '@optique/core/parser';
import { choice, string } from '@optique/core/valueparser';
import { path, run } from '@optique/run';
import { configureLogger, createLogger } from '../logger';
import { FileExtractor } from './utils/extractor';
import { OutputFormatter } from './utils/formatter';

// Initialize logger
configureLogger().catch(console.error);

// Create CLI logger
const logger = createLogger('cli');

// Common options for all commands
const commonOptions = object('Common', {
  verbose: optional(option('-v', '--verbose')),
});

// Extract command parser
const extractCommand = command('extract', merge(
  object({ action: constant('extract') }),
  commonOptions,
  object('Extract Options', {
    replayFile: argument(path({ mustExist: true })),
    output: withDefault(option('-o', '--output', path()), './extracted'),
    format: withDefault(option('-f', '--format', choice(['json', 'raw'])), 'json'),
    files: withDefault(option('--files', string()), 'all'),
    pretty: optional(option('--pretty')),
  }),
));

// List command parser
const listCommand = command('list', merge(
  object({ action: constant('list') }),
  commonOptions,
  object('List Options', {
    replayFile: argument(path({ mustExist: true })),
    details: optional(option('-d', '--details')),
    filter: optional(option('-f', '--filter', string())),
  }),
));

// Info command parser
const infoCommand = command('info', merge(
  object({ action: constant('info') }),
  commonOptions,
  object('Info Options', {
    replayFile: argument(path({ mustExist: true })),
    json: optional(option('-j', '--json')),
    players: optional(option('-p', '--players')),
    events: optional(option('-e', '--events')),
  }),
));

// Main CLI parser
const cli = or(extractCommand, listCommand, infoCommand);

type Config = InferValue<typeof cli>;

// Execute the command
async function executeCommand(config: Config) {
  const extractor = new FileExtractor();

  try {
    await extractor.openReplay(config.replayFile);

    switch (config.action) {
    case 'extract':
      await executeExtract(config, extractor);
      break;
    case 'list':
      await executeList(config, extractor);
      break;
    case 'info':
      await executeInfo(config, extractor);
      break;
    }
  } catch (error) {
    logger.error('CLI execution error', { error });
    process.exit(1);
  } finally {
    extractor.close();
  }
}

async function executeExtract(config: InferValue<typeof extractCommand>, extractor: FileExtractor) {
  const formatter = new OutputFormatter({
    format: config.format as 'json' | 'raw',
    pretty: config.pretty ?? false,
    outputDir: config.output,
  });

  if (config.verbose) {
    logger.info('Starting extraction', {
      replayFile: config.replayFile,
      outputDir: config.output,
      format: config.format
    });
    logger.info(`Extracting files from: ${config.replayFile}`);
    logger.info(`Output directory: ${config.output}`);
    logger.info(`Format: ${config.format}`);
  }

  const filePatterns = config.files.split(',').map((f: string) => f.trim());
  const result = await extractor.extractFiles(filePatterns);

  if (result.errors.length > 0) {
    logger.warn('Errors occurred during extraction', { errors: result.errors });
    if (config.verbose) {
      logger.warn('Errors occurred during extraction:');
      result.errors.forEach(error => logger.warn(`  ${error}`));
    }
  }

  const savedFiles: string[] = [];
  for (const [filename, file] of result.files) {
    try {
      const outputPath = await formatter.saveFile(filename, file);
      savedFiles.push(outputPath);
      if (config.verbose) {
        logger.info(`Saved: ${outputPath}`);
      }
    } catch (error) {
      logger.error('Failed to save file', { filename, error });
      logger.warn(`Failed to save ${filename}: ${error}`);
    }
  }

  logger.info('');
  logger.info('Extraction Summary:');
  logger.info(`  Files found: ${result.total}`);
  logger.info(`  Files extracted: ${result.extracted}`);
  logger.info(`  Files saved: ${savedFiles.length}`);
  logger.info(`  Files skipped: ${result.skipped}`);
  logger.info(`  Output directory: ${config.output}`);
  logger.info(`  Format: ${config.format}`);

  if (savedFiles.length > 0) {
    logger.info('');
    logger.info('Extracted files:');
    savedFiles.forEach(file => logger.info(`  ${file}`));
  }
}

async function executeList(config: InferValue<typeof listCommand>, extractor: FileExtractor) {
  if (config.verbose) {
    logger.info('Listing files', { replayFile: config.replayFile });
    logger.info(`Listing files in: ${config.replayFile}`);
  }

  const files = extractor.getAvailableFiles();
  const filteredFiles = config.filter
    ? files.filter(file => file.toLowerCase().includes(config.filter!.toLowerCase()))
    : files;

  if (filteredFiles.length === 0) {
    logger.info('No files found matching the criteria.');
    return;
  }

  logger.info(`Found ${filteredFiles.length} file(s) in replay archive:`);
  logger.info('');

  if (config.details) {
    for (const filename of filteredFiles) {
      try {
        const file = extractor.archive?.getFile(filename);
        if (file) {
          const fileInfo = OutputFormatter.formatFileInfo(file);
          fileInfo.split('\n').forEach(line => logger.info(line));
          logger.info('');
        }
      } catch (error) {
        logger.error('Failed to get file details', { filename, error });
        process.stderr.write(`Failed to get details for ${filename}: ${error}\n`);
      }
    }
  } else {
    const fileList = OutputFormatter.formatFileList(filteredFiles);
    fileList.split('\n').forEach(line => {
      if (line.trim()) logger.info(line);
    });
  }

  if (config.verbose) {
    logger.info('');
    logger.info(`Total files in archive: ${files.length}`);
    if (config.filter) {
      logger.info(`Files matching filter '${config.filter}': ${filteredFiles.length}`);
    }
  }
}

async function executeInfo(config: InferValue<typeof infoCommand>, extractor: FileExtractor) {
  if (config.verbose) {
    logger.info('Getting replay info', { replayFile: config.replayFile });
    logger.info(`Getting info from: ${config.replayFile}`);
  }

  const info = extractor.getReplayInfo();

  if (config.json) {
    const jsonOutput = JSON.stringify(info, null, 2);
    jsonOutput.split('\n').forEach(line => logger.info(line));
    return;
  }

  logger.info('SC2 Replay Information');
  logger.info('======================');
  logger.info('');

  // Basic replay info
  if (info.header) {
    logger.info('Header:');
    logger.info(`  Version: ${info.header.version?.major}.${info.header.version?.minor}.${info.header.version?.revision}.${info.header.version?.build}`);
    logger.info(`  Length: ${info.header.length} bytes`);
    logger.info('');
  }

  // Game details
  if (info.details) {
    logger.info('Game Details:');
    logger.info(`  Title: ${info.details.title || 'Unknown'}`);
    logger.info(`  Map: ${info.details.mapFileName || 'Unknown'}`);
    logger.info(`  Game Speed: ${info.details.gameSpeed || 'Unknown'}`);
    logger.info(`  Duration: ${formatDuration(info.duration)} (${info.duration} seconds)`);
    logger.info(`  Game Length: ${info.gameLength} loops`);
    logger.info(`  Players: ${info.details.playerList?.length || 0}`);
    logger.info('');
  }

  // Winner information
  if (info.winner) {
    logger.info('Winner:');
    logger.info(`  Name: ${info.winner.name}`);
    logger.info(`  Race: ${info.winner.race}`);
    logger.info(`  Team: ${info.winner.teamId}`);
    logger.info('');
  }

  // Player information
  if (config.players && info.players && info.players.length > 0) {
    logger.info('Players:');
    info.players.forEach((player: any, index: number) => {
      logger.info(`  ${index + 1}. ${player.name || 'Unknown'}`);
      logger.info(`     Race: ${player.race || 'Unknown'}`);
      logger.info(`     Team: ${player.teamId !== undefined ? player.teamId : 'Unknown'}`);
      logger.info(`     Result: ${formatResult(player.result)}`);
      logger.info(`     Color: RGB(${player.color?.r || 0}, ${player.color?.g || 0}, ${player.color?.b || 0})`);
      logger.info('');
    });
  }

  // Event counts
  if (config.events) {
    logger.info('Events:');
    logger.info('  Game Events: Available');
    logger.info('  Message Events: Available');
    logger.info('  Tracker Events: Available');
    logger.info('');
  }

  // Archive information
  logger.info('Archive Information:');
  const archiveInfo = extractor.archive?.archiveHeader;
  if (archiveInfo) {
    logger.info(`  Format Version: ${archiveInfo.formatVersion}`);
    logger.info(`  Archive Size: ${archiveInfo.archiveSize} bytes`);
    logger.info(`  Block Size: ${archiveInfo.blockSize}`);
    logger.info(`  Hash Table Size: ${archiveInfo.hashTableSize} entries`);
    logger.info(`  Block Table Size: ${archiveInfo.blockTableSize} entries`);
  }

  const fileCount = extractor.getAvailableFiles().length;
  logger.info(`  Files in Archive: ${fileCount}`);
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

function formatResult(result: number): string {
  switch (result) {
  case 1: return 'Victory';
  case 2: return 'Defeat';
  case 3: return 'Tie';
  default: return 'Unknown';
  }
}


// Run the CLI
const config = run(cli, {
  programName: 'sc2ts',
  help: 'both',
  colors: true,
});

executeCommand(config).catch(error => {
  logger.error('Fatal CLI error', { error });
  process.exit(1);
});