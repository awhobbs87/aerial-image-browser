import {
  formatDate,
  formatScale,
  formatCoordinates,
  formatFileSize,
  getLayerTypeLabel,
  getLayerType,
} from '@/lib/format';

describe('formatDate', () => {
  it('returns null for null input', () => {
    expect(formatDate(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(formatDate(undefined)).toBeNull();
  });

  it('returns null for 0 (falsy timestamp)', () => {
    expect(formatDate(0)).toBeNull();
  });

  it('formats a valid timestamp to Australian locale date string', () => {
    // 1 January 2020 00:00:00 UTC = 1577836800000ms
    const result = formatDate(1577836800000);
    expect(result).toBeTypeOf('string');
    // Australian locale: "1 January 2020"
    expect(result).toContain('2020');
    expect(result).toContain('January');
  });

  it('formats another valid timestamp correctly', () => {
    // 15 June 1985 = 487728000000ms
    const result = formatDate(487728000000);
    expect(result).toBeTypeOf('string');
    expect(result).toContain('1985');
    expect(result).toContain('June');
  });
});

describe('formatScale', () => {
  it('returns null for null input', () => {
    expect(formatScale(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(formatScale(undefined)).toBeNull();
  });

  it('returns null for 0 (falsy scale)', () => {
    expect(formatScale(0)).toBeNull();
  });

  it('formats a valid scale number', () => {
    const result = formatScale(15000);
    expect(result).toBe('1:15,000');
  });

  it('formats a small scale number', () => {
    const result = formatScale(500);
    expect(result).toBe('1:500');
  });

  it('formats a large scale number', () => {
    const result = formatScale(1000000);
    expect(result).toBe('1:1,000,000');
  });
});

describe('formatCoordinates', () => {
  it('formats with default precision (4 decimal places)', () => {
    const result = formatCoordinates(-42.8821, 147.3272);
    expect(result).toBe('-42.8821, 147.3272');
  });

  it('formats with custom precision', () => {
    const result = formatCoordinates(-42.88213456, 147.32725678, 6);
    expect(result).toBe('-42.882135, 147.327257');
  });

  it('formats with precision 0', () => {
    const result = formatCoordinates(-42.8821, 147.3272, 0);
    expect(result).toBe('-43, 147');
  });

  it('formats with precision 2', () => {
    const result = formatCoordinates(-42.8821, 147.3272, 2);
    expect(result).toBe('-42.88, 147.33');
  });
});

describe('formatFileSize', () => {
  it('formats bytes', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(1023)).toBe('1023 B');
  });

  it('formats kilobytes', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(1048575)).toBe('1024.0 KB');
  });

  it('formats megabytes', () => {
    expect(formatFileSize(1048576)).toBe('1.0 MB');
    expect(formatFileSize(5242880)).toBe('5.0 MB');
  });

  it('formats gigabytes', () => {
    expect(formatFileSize(1073741824)).toBe('1.0 GB');
    expect(formatFileSize(2684354560)).toBe('2.5 GB');
  });
});

describe('getLayerTypeLabel', () => {
  it('returns "Aerial" for layer 0', () => {
    expect(getLayerTypeLabel(0)).toBe('Aerial');
  });

  it('returns "Orthophoto" for layer 1', () => {
    expect(getLayerTypeLabel(1)).toBe('Orthophoto');
  });

  it('returns "Digital" for layer 2', () => {
    expect(getLayerTypeLabel(2)).toBe('Digital');
  });

  it('returns "Unknown" for unknown layer IDs', () => {
    expect(getLayerTypeLabel(3)).toBe('Unknown');
    expect(getLayerTypeLabel(-1)).toBe('Unknown');
    expect(getLayerTypeLabel(99)).toBe('Unknown');
  });
});

describe('getLayerType', () => {
  it('returns "aerial" for layer 0', () => {
    expect(getLayerType(0)).toBe('aerial');
  });

  it('returns "ortho" for layer 1', () => {
    expect(getLayerType(1)).toBe('ortho');
  });

  it('returns "digital" for layer 2', () => {
    expect(getLayerType(2)).toBe('digital');
  });

  it('returns "digital" for any layer >= 2', () => {
    // The ternary falls through to "digital" for anything not 0 or 1
    expect(getLayerType(5)).toBe('digital');
  });
});
