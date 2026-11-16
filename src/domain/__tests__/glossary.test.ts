import { describe, expect, it } from 'vitest';
import { GLOSSARY_TERMS, splitByGlossary, safeEvidenceUrl } from '../glossary';

describe('glossary terms', () => {
  it('cover the five terms required by the product rules', () => {
    expect([...GLOSSARY_TERMS]).toEqual([
      'evapotranspiration',
      'ndvi',
      'soil_moisture_anomaly',
      'frost_risk',
      'water_balance',
    ]);
  });
});

describe('splitByGlossary', () => {
  const patterns = { ndvi: 'NDVI', water_balance: 'water balance' } as const;

  it('returns plain text when no term appears', () => {
    expect(splitByGlossary('Rain falls in May.', patterns)).toEqual([
      { text: 'Rain falls in May.' },
    ]);
  });

  it('splits around terms, ignoring case and keeping the original wording', () => {
    expect(splitByGlossary('Low ndvi and a weak Water Balance.', patterns)).toEqual([
      { text: 'Low ' },
      { text: 'ndvi', term: 'ndvi' },
      { text: ' and a weak ' },
      { text: 'Water Balance', term: 'water_balance' },
      { text: '.' },
    ]);
  });

  it('does not match inside longer words', () => {
    expect(splitByGlossary('NDVIs and xNDVI', patterns)).toEqual([{ text: 'NDVIs and xNDVI' }]);
  });
});

describe('safeEvidenceUrl', () => {
  it('returns only http and https URLs that the evidence item actually carries', () => {
    expect(safeEvidenceUrl({ url: 'https://example.org/a' })).toBe('https://example.org/a');
    expect(safeEvidenceUrl({ url: 'http://example.org/a' })).toBe('http://example.org/a');
  });

  it('returns null for missing, empty, malformed or script URLs', () => {
    expect(safeEvidenceUrl({})).toBeNull();
    expect(safeEvidenceUrl({ url: '' })).toBeNull();
    expect(safeEvidenceUrl({ url: 'not a url' })).toBeNull();
    expect(safeEvidenceUrl({ url: 'javascript:alert(1)' })).toBeNull();
  });
});
