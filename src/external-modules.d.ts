// Type declarations for external modules without TypeScript definitions

declare module "seek-bzip" {
  const seekBzip: {
    decode: (data: number[] | Uint8Array) => number[];
    decodeBzip2: (data: number[] | Uint8Array | Buffer) => number[];
  };

  export = seekBzip;
}

declare module "compressjs" {
  interface CompressJS {
    Bzip2: {
      decompressFile: (data: number[]) => number[];
    };
  }

  const Compress: CompressJS;
  export = Compress;
}