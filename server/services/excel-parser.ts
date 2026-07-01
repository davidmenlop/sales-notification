import ExcelJS from 'exceljs';
import type { ExcelRow, ParsedExcelData } from '../types/excel.js';

export class ExcelParser {
  async parse(filePath: string): Promise<ParsedExcelData> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new Error('No se encontró ninguna hoja en el archivo Excel');
    }

    const headers: string[] = [];
    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      if (cell.value) {
        headers[colNumber] = String(cell.value).trim();
      }
    });

    const rows: ExcelRow[] = [];
    let currentGroupData: ExcelRow = {};
    const groupColumns = new Set<number>();

    for (let rowIdx = 2; rowIdx <= sheet.rowCount; rowIdx++) {
      const row = sheet.getRow(rowIdx);
      const rowData: ExcelRow = {};
      let hasGroupData = false;

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const header = headers[colNumber];
        if (!header) return;

        const value = cell.value;
        let parsedValue: string | number | boolean | null = null;

        if (value === null || value === undefined) {
          parsedValue = null;
        } else if (typeof value === 'object' && 'result' in value) {
          const formulaValue = (value as ExcelJS.CellFormulaValue).result;
          parsedValue = formulaValue !== null && formulaValue !== undefined ? String(formulaValue) : null;
        } else if (typeof value === 'object' && 'richText' in value) {
          parsedValue = (value as ExcelJS.CellRichTextValue).richText.map(r => r.text).join('');
        } else if (value instanceof Date) {
          parsedValue = value.toISOString().split('T')[0];
        } else if (typeof value === 'number') {
          parsedValue = value;
        } else if (typeof value === 'boolean') {
          parsedValue = value;
        } else {
          const strValue = String(value).trim();
          const percentMatch = strValue.match(/^(-?\d+(?:\.\d+)?)%$/);
          if (percentMatch) {
            parsedValue = parseFloat(percentMatch[1]);
          } else {
            parsedValue = strValue;
          }
        }

        rowData[header] = parsedValue;

        if (parsedValue !== null && parsedValue !== '' && parsedValue !== undefined) {
          if (colNumber <= 8) {
            groupColumns.add(colNumber);
            hasGroupData = true;
          }
        }
      });

      if (hasGroupData) {
        currentGroupData = {};
        for (const colNum of groupColumns) {
          const header = headers[colNum];
          if (header && rowData[header] !== null && rowData[header] !== '' && rowData[header] !== undefined) {
            currentGroupData[header] = rowData[header];
          }
        }
      }

      const mergedRow: ExcelRow = { ...rowData };
      
      for (const colNum of groupColumns) {
        const header = headers[colNum];
        if (header && (mergedRow[header] === null || mergedRow[header] === '' || mergedRow[header] === undefined)) {
          mergedRow[header] = currentGroupData[header] ?? null;
        }
      }

      rows.push(mergedRow);
    }

    return {
      headers: headers.filter(h => h),
      rows,
      metadata: {
        totalRows: rows.length,
        sheetName: sheet.name,
        fileName: filePath.split('/').pop() || filePath,
        dateRange: this.extractDateRange(rows)
      }
    };
  }

  private extractDateRange(rows: ExcelRow[]): string | undefined {
    const dates: Date[] = [];
    
    for (const row of rows) {
      const fecha = row['Fecha'];
      if (fecha) {
        const dateStr = String(fecha);
        // Intentar parsear formato DD/MM/YYYY
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const year = parseInt(parts[2], 10);
          const date = new Date(year, month, day);
          if (!isNaN(date.getTime())) {
            dates.push(date);
          }
        }
      }
    }
    
    if (dates.length === 0) return undefined;
    
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    const formatDate = (date: Date): string => {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };
    
    return `Semana del ${formatDate(minDate)} al ${formatDate(maxDate)}`;
  }

  getUniqueValues(data: ParsedExcelData, field: string): string[] {
    const values = new Set<string>();
    for (const row of data.rows) {
      const value = row[field];
      if (value !== null && value !== undefined && value !== '') {
        values.add(String(value));
      }
    }
    return Array.from(values).sort();
  }
}

export const excelParser = new ExcelParser();
