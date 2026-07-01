export interface ExcelRow {
  [key: string]: string | number | boolean | null | undefined;
}

export interface ParsedExcelData {
  headers: string[];
  rows: ExcelRow[];
  metadata: {
    totalRows: number;
    sheetName: string;
    fileName: string;
    dateRange?: string;
  };
}

export interface GroupedRow {
  [key: string]: string | number | boolean | null | undefined | ExcelRow;
  _groupData?: ExcelRow;
}
