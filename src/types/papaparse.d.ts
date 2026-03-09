// Type declarations for papaparse since @types/papaparse installation is failing
declare module 'papaparse' {
  export interface ParseConfig {
    header?: boolean;
    skipEmptyLines?: boolean | 'greedy';
    complete?: (results: ParseResult<any>) => void;
    error?: (error: ParseError) => void;
  }

  export interface ParseResult<T> {
    data: T[];
    errors: ParseError[];
    meta: {
      delimiter: string;
      linebreak: string;
      aborted: boolean;
      truncated: boolean;
      cursor: number;
    };
  }

  export interface ParseError {
    type: string;
    code: string;
    message: string;
    row: number;
  }

  export const parse: {
    <T>(input: string | File, config?: ParseConfig): void;
    (input: string | File, config?: ParseConfig): void;
  };
}
