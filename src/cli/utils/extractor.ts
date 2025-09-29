import { createLogger } from "../../logger";
import type { MpqArchive } from "../../mpq-archive";
import { SC2Replay } from "../../sc2-replay";
import type { MpqFile } from "../../types";

const logger = createLogger("cli-extractor");

export interface ExtractionResult {
    files: Map<string, MpqFile>;
    total: number;
    extracted: number;
    skipped: number;
    errors: string[];
}

export class FileExtractor {
  private _archive: MpqArchive | null = null;
  private replay: SC2Replay | null = null;

  async openReplay(replayPath: string): Promise<void> {
    try {
      logger.debug(`Opening replay file: ${replayPath}`);
      this.replay = await SC2Replay.fromFile(replayPath);
      this._archive = this.replay.mpqArchive; // Access private field
      logger.debug("Replay file opened successfully");
    } catch (error) {
      logger.error(`Failed to open replay file: ${error}`);
      throw new Error(`Failed to open replay file: ${error}`);
    }
  }

  get archive(): MpqArchive | null {
    return this._archive;
  }

  getAvailableFiles(): string[] {
    if (!this._archive) {
      throw new Error("No archive opened. Call openReplay() first.");
    }

    const files = this._archive.listFiles();
    logger.debug(`Found ${files.length} files in archive`);
    return files;
  }

  async extractFiles(filePatterns: string[] = ["all"]): Promise<ExtractionResult> {
    if (!this._archive) {
      throw new Error("No archive opened. Call openReplay() first.");
    }

    const availableFiles = this.getAvailableFiles();
    const filesToExtract = this.resolveFilePatterns(filePatterns, availableFiles);

    const result: ExtractionResult = {
      files: new Map(),
      total: filesToExtract.length,
      extracted: 0,
      skipped: 0,
      errors: [],
    };

    for (const filename of filesToExtract) {
      try {
        logger.debug(`Extracting file: ${filename}`);
        const file = this._archive.getFile(filename);
        result.files.set(filename, file);
        result.extracted++;
        logger.debug(`Successfully extracted: ${filename} (${file.fileSize} bytes)`);
      } catch (error) {
        const errorMsg = `Failed to extract ${filename}: ${error}`;
        logger.warn(errorMsg);
        result.errors.push(errorMsg);
        result.skipped++;
      }
    }

    logger.info(`Extraction completed: ${result.extracted}/${result.total} files extracted`);
    return result;
  }

  get replayInstance(): SC2Replay {
    if (!this.replay) {
      throw new Error("No replay opened. Call openReplay() first.");
    }
    return this.replay;
  }

  private resolveFilePatterns(patterns: string[], availableFiles: string[]): string[] {
    if (patterns.includes("all")) {
      return [...availableFiles];
    }

    const filesToExtract = new Set<string>();

    for (const pattern of patterns) {
      if (availableFiles.includes(pattern)) {
        filesToExtract.add(pattern);
      } else {
        // Try pattern matching
        const matchedFiles = availableFiles.filter((file) =>
          file.toLowerCase().includes(pattern.toLowerCase()),
        );
        matchedFiles.forEach((file) => filesToExtract.add(file));
      }
    }

    return Array.from(filesToExtract);
  }

  close(): void {
    this._archive = null;
    this.replay = null;
    logger.debug("Extractor closed");
  }
}
