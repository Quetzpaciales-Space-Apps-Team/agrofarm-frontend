import { describe, expect, it } from 'vitest';
import { parseCsv } from '../domain/csv';

describe('parseCsv', () => {
  it('splits rows and cells and keeps empty cells as empty strings', () => {
    expect(parseCsv('a,b,c\n1,,3\n').rows).toEqual([
      ['a', 'b', 'c'],
      ['1', '', '3'],
    ]);
  });

  it('handles CRLF line endings and a missing final newline', () => {
    expect(parseCsv('a,b\r\n1,2').rows).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('handles quoted cells with commas, doubled quotes and line breaks', () => {
    const { rows, error } = parseCsv('a,b\n"x, y","say ""hi"""\n"two\nlines",z\n');
    expect(error).toBeNull();
    expect(rows).toEqual([
      ['a', 'b'],
      ['x, y', 'say "hi"'],
      ['two\nlines', 'z'],
    ]);
  });

  it('strips a leading byte order mark', () => {
    expect(parseCsv('﻿a,b\n1,2\n').rows[0]).toEqual(['a', 'b']);
  });

  it('skips fully blank lines like the server does', () => {
    expect(parseCsv('a\n\n1\n\n').rows).toEqual([['a'], ['1']]);
  });

  it('reports an unterminated quote instead of guessing', () => {
    expect(parseCsv('a,b\n"open,2\n').error).toBe('unterminated_quote');
  });

  it('never turns an empty cell into anything but an empty string', () => {
    expect(parseCsv('a,b\n,\n').rows[1]).toEqual(['', '']);
  });
});
