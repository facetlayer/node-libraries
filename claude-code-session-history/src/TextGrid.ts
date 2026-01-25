export interface TextGridColumn {
  header: string;
  width?: number;
  align?: 'left' | 'right';
}

export class TextGrid {
  private columns: TextGridColumn[];
  private rows: string[][] = [];

  constructor(columns: TextGridColumn[]) {
    this.columns = columns;
  }

  addRow(values: (string | number)[]): void {
    this.rows.push(values.map(v => String(v)));
  }

  private getColumnWidths(): number[] {
    return this.columns.map((col, i) => {
      if (col.width) return col.width;

      // Auto-size: max of header and all row values
      const headerWidth = col.header.length;
      const maxRowWidth = this.rows.reduce((max, row) => {
        return Math.max(max, (row[i] || '').length);
      }, 0);
      return Math.max(headerWidth, maxRowWidth);
    });
  }

  private padCell(value: string, width: number, align: 'left' | 'right'): string {
    if (align === 'right') {
      return value.padStart(width);
    }
    return value.padEnd(width);
  }

  print(): void {
    const widths = this.getColumnWidths();

    // Print header row
    const headerCells = this.columns.map((col, i) =>
      this.padCell(col.header, widths[i], col.align || 'left')
    );
    console.log(headerCells.join(' | '));

    // Print separator row
    const separatorCells = widths.map(w => '-'.repeat(w));
    console.log(separatorCells.join('-|-'));

    // Print data rows
    for (const row of this.rows) {
      const cells = this.columns.map((col, i) =>
        this.padCell(row[i] || '', widths[i], col.align || 'left')
      );
      console.log(cells.join(' | '));
    }
  }
}
