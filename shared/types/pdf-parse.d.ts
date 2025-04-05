declare module 'pdf-parse' {
  interface PdfData {
    numpages: number;
    numrender: number;
    info: Record<string, any>;
    metadata: Record<string, any>;
    text: string;
    version: string;
  }

  function parse(dataBuffer: Buffer, options?: Record<string, any>): Promise<PdfData>;

  export = parse;
}