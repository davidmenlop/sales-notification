import ExcelJS from 'exceljs';

export class ExcelValidator {
  private requiredColumns = [
    'Ejecutivo',
    'Disponibilidad',
    'Sku Infaltable',
    'ID Punto Venta',
    '% Real NSG',
    'Punto Venta'
  ];

  async validate(filePath: string): Promise<{
    valid: boolean;
    errors: string[];
    columns: string[];
  }> {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);

      const sheet = workbook.worksheets[0];
      if (!sheet) {
        return {
          valid: false,
          errors: ['El archivo no contiene ninguna hoja'],
          columns: []
        };
      }

      const headers: string[] = [];
      const headerRow = sheet.getRow(1);
      headerRow.eachCell((cell, colNumber) => {
        if (cell.value) {
          headers[colNumber] = String(cell.value).trim();
        }
      });

      const actualColumns = headers.filter(h => h);

      const missingColumns = this.requiredColumns.filter(
        col => !actualColumns.includes(col)
      );

      if (missingColumns.length > 0) {
        return {
          valid: false,
          errors: [`Columnas faltantes: ${missingColumns.join(', ')}`],
          columns: actualColumns
        };
      }

      return {
        valid: true,
        errors: [],
        columns: actualColumns
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`Error al leer el archivo: ${error}`],
        columns: []
      };
    }
  }
}

export const excelValidator = new ExcelValidator();
