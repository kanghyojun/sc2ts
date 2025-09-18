import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createLogger } from '../../logger';
import type { MpqFile } from '../../types';

const logger = createLogger('cli-formatter');

export interface FormatOptions {
  format: 'json' | 'raw';
  pretty?: boolean;
  outputDir: string;
}

export class OutputFormatter {
  constructor(private options: FormatOptions) {}

  async saveFile(filename: string, file: MpqFile): Promise<string> {
    const outputPath = join(this.options.outputDir, filename);
    const outputDir = dirname(outputPath);

    // Ensure output directory exists
    await mkdir(outputDir, { recursive: true });

    if (this.options.format === 'json') {
      return this.saveAsJson(outputPath, file);
    } else {
      return this.saveAsRaw(outputPath, file);
    }
  }

  private async saveAsJson(outputPath: string, file: MpqFile): Promise<string> {
    const jsonPath = outputPath.replace(/\.[^/.]+$/, '') + '.json';

    const jsonData = {
      filename: file.filename,
      fileSize: file.fileSize,
      compressedSize: file.compressedSize,
      flags: file.flags,
      data: file.data.toString('base64'), // Convert binary data to base64
      metadata: {
        isCompressed: file.compressedSize !== file.fileSize,
        compressionRatio: file.fileSize > 0 ? file.compressedSize / file.fileSize : 0,
      },
    };

    const content = this.options.pretty
      ? JSON.stringify(jsonData, null, 2)
      : JSON.stringify(jsonData);

    await writeFile(jsonPath, content, 'utf8');
    logger.debug(`Saved JSON file: ${jsonPath}`);
    return jsonPath;
  }

  private async saveAsRaw(outputPath: string, file: MpqFile): Promise<string> {
    await writeFile(outputPath, file.data);
    logger.debug(`Saved raw file: ${outputPath}`);
    return outputPath;
  }

  static formatFileList(files: string[]): string {
    return files.map((file, index) => `${index + 1}. ${file}`).join('\n');
  }

  static formatFileInfo(file: MpqFile): string {
    const compressionRatio = file.fileSize > 0
      ? ((1 - file.compressedSize / file.fileSize) * 100).toFixed(1)
      : '0.0';

    return [
      `File: ${file.filename}`,
      `Size: ${file.fileSize} bytes`,
      `Compressed: ${file.compressedSize} bytes`,
      `Compression: ${compressionRatio}%`,
      `Flags: 0x${file.flags.toString(16).toUpperCase()}`,
    ].join('\n');
  }
}