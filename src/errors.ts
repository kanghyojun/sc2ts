// MPQ Error Definitions

export class MpqError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'MpqError';
  }
}

export class MpqInvalidFormatError extends MpqError {
  constructor(message: string) {
    super(message, 'INVALID_FORMAT');
    this.name = 'MpqInvalidFormatError';
  }
}

export class MpqDecryptionError extends MpqError {
  constructor(message: string) {
    super(message, 'DECRYPTION_ERROR');
    this.name = 'MpqDecryptionError';
  }
}

export class MpqDecompressionError extends MpqError {
  constructor(message: string) {
    super(message, 'DECOMPRESSION_ERROR');
    this.name = 'MpqDecompressionError';
  }
}

export class MpqFileNotFoundError extends MpqError {
  constructor(filename: string) {
    super(`File not found in MPQ archive: ${filename}`, 'FILE_NOT_FOUND');
    this.name = 'MpqFileNotFoundError';
  }
}