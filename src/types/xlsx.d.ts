declare module 'xlsx' {
  export interface WorkSheet {
    [key: string]: any;
  }

  export interface WorkBook {
    SheetNames: string[];
    Sheets: { [sheet: string]: WorkSheet };
  }

  export function utils(): {
    json_to_sheet<T>(data: T[]): WorkSheet;
    sheet_to_json<T>(worksheet: WorkSheet): T[];
    book_new(): WorkBook;
    book_append_sheet(workbook: WorkBook, worksheet: WorkSheet, name: string): void;
  };

  export function readFile(filename: string): WorkBook;
  export function read(data: any, options?: any): WorkBook;
  export function writeFile(workbook: WorkBook, filename: string): void;
  export function write(workbook: WorkBook, options: any): any;
}

// Add to window object for browser usage
interface Window {
  XLSX: any;
}