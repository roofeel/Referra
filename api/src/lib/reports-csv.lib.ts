function normalizeHeaderKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function parseCsvRows(fileContent: string) {
  const text = fileContent.replace(/^\uFEFF/, '');
  const matrix: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      row.push(cell);
      cell = '';

      if (row.some((value) => value.trim().length > 0)) {
        matrix.push(row);
      }
      row = [];

      if (char === '\r' && nextChar === '\n') {
        i += 1;
      }
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some((value) => value.trim().length > 0)) {
    matrix.push(row);
  }

  if (matrix.length === 0) {
    return { headers: [], rows: [] as Array<Record<string, string>> };
  }

  const [headerRow, ...dataRows] = matrix;
  if (!headerRow) {
    return { headers: [], rows: [] as Array<Record<string, string>> };
  }

  const headers = headerRow.map((header) => header.trim());
  const rows = dataRows.map((values) => {
    const output: Record<string, string> = {};
    headers.forEach((header, index) => {
      output[header] = values[index] ?? '';
    });
    return output;
  });

  return { headers, rows };
}

export function findColumnName(
  headers: string[],
  fieldMappings: Record<string, string>,
  candidates: string[],
): string | undefined {
  const headerByNormalized = new Map<string, string>();
  headers.forEach((header) => {
    const normalized = normalizeHeaderKey(header);
    if (normalized && !headerByNormalized.has(normalized)) {
      headerByNormalized.set(normalized, header);
    }
  });

  for (const candidate of candidates) {
    const mapped = fieldMappings[candidate];
    if (mapped && headers.includes(mapped)) {
      return mapped;
    }

    const byNormalized = headerByNormalized.get(normalizeHeaderKey(candidate));
    if (byNormalized) {
      return byNormalized;
    }
  }

  return undefined;
}
