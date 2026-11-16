export interface CsvParseResult {
  rows: string[][];
  error: 'unterminated_quote' | null;
}

/**
 * Small RFC 4180 style parser: quoted cells (commas, doubled quotes, line breaks), CRLF or LF,
 * a leading byte order mark. Fully blank lines are skipped, like the server does.
 * Empty cells stay empty strings; nothing is converted to a number here.
 */
export function parseCsv(input: string): CsvParseResult {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  let cellStarted = false;

  const endCell = () => {
    row.push(cell);
    cell = '';
    cellStarted = false;
  };
  const endRow = () => {
    endCell();
    // A line with a single empty cell is a blank line.
    if (!(row.length === 1 && row[0] === '')) rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
    } else if (char === '"' && !cellStarted) {
      inQuotes = true;
      cellStarted = true;
    } else if (char === ',') {
      endCell();
    } else if (char === '\n') {
      endRow();
    } else if (char === '\r') {
      if (text[i + 1] === '\n') i += 1;
      endRow();
    } else {
      cell += char;
      cellStarted = true;
    }
  }

  if (inQuotes) return { rows, error: 'unterminated_quote' };
  if (cell !== '' || row.length > 0 || cellStarted) endRow();
  return { rows, error: null };
}

function escapeCsvCell(raw: string): string {
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return /[",\n\r]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

/** Builds an RFC 4180 CSV error report with spreadsheet formula-injection escaping (DEC-005). */
export function buildErrorReportCsv(
  errors: readonly { row: number; column: string | null; message: string }[],
): string {
  const header = 'row,column,message';
  const lines = errors.map((item) =>
    [String(item.row), escapeCsvCell(item.column ?? ''), escapeCsvCell(item.message)].join(','),
  );
  return [header, ...lines].join('\n');
}
