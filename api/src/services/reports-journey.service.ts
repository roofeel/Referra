import { db } from '../../../packages/db/index.js';
import { getSearchParamIgnoreCase, parseTimestampToMs, parseUrl } from '../lib/reports-url.lib.js';

const MAX_JOURNEY_ROWS_PER_EVENT = 200;
const MAX_PATTERN_DAYS = 90;

export type JourneyConfig = {
  athenaTableId: string;
  athenaTableName: string;
  eventUrlParam: string;
  athenaUrlParam: string;
  athenaUrlField: string;
  athenaTimeField: string;
};

type JourneyInputRow = {
  eventUrl: string;
  sourceTime: string;
  eventTime: string;
};

type CandidateJourneyRow = {
  tsMs: number;
  row: Record<string, unknown>;
};

function isSafeIdentifierPart(value: string) {
  return /^[A-Za-z_][A-Za-z0-9_$]*$/.test(value);
}

function quoteIdentifier(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function quoteQualifiedIdentifier(value: string) {
  const parts = value.split('.').map((item) => item.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  if (!parts.every(isSafeIdentifierPart)) return null;
  return parts.map((part) => quoteIdentifier(part)).join('.');
}

function pad(value: number) {
  return value.toString().padStart(2, '0');
}

function toDateBucketTokens(ms: number) {
  const date = new Date(ms);
  const yyyy = `${date.getFullYear()}`;
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  return {
    yyyy,
    MM,
    dd,
    yyyyMMdd: `${yyyy}${MM}${dd}`,
    yyyyMM: `${yyyy}${MM}`,
    'yyyy-MM-dd': `${yyyy}-${MM}-${dd}`,
    'yyyy_MM_dd': `${yyyy}_${MM}_${dd}`,
  };
}

function resolveTableNamesByPattern(pattern: string, startMs: number, endMs: number) {
  const normalized = pattern.trim();
  if (!normalized) return [];

  const hasDateToken = /{yyyyMMdd}|{yyyyMM}|{yyyy-MM-dd}|{yyyy_MM_dd}/.test(normalized);
  if (!hasDateToken) return [normalized];

  const startDay = new Date(startMs);
  startDay.setHours(0, 0, 0, 0);
  const endDay = new Date(endMs);
  endDay.setHours(0, 0, 0, 0);
  const names: string[] = [];
  const seen = new Set<string>();
  let cursorMs = startDay.getTime();
  let count = 0;
  while (cursorMs <= endDay.getTime() && count <= MAX_PATTERN_DAYS) {
    const tokens = toDateBucketTokens(cursorMs);
    const name = normalized
      .replaceAll('{yyyyMMdd}', tokens.yyyyMMdd)
      .replaceAll('{yyyyMM}', tokens.yyyyMM)
      .replaceAll('{yyyy-MM-dd}', tokens['yyyy-MM-dd'])
      .replaceAll('{yyyy_MM_dd}', tokens['yyyy_MM_dd']);
    if (!seen.has(name)) {
      names.push(name);
      seen.add(name);
    }
    cursorMs += 24 * 60 * 60 * 1000;
    count += 1;
  }
  return names;
}

export async function buildJourneyLogsForRows(options: {
  journeyConfig: JourneyConfig;
  rows: JourneyInputRow[];
}) {
  const rows = options.rows;
  if (rows.length === 0) return [];

  const eventIdByIndex = new Map<number, string>();
  const idSet = new Set<string>();
  let minSourceMs: number | null = null;
  let maxEventMs: number | null = null;
  rows.forEach((item, index) => {
    const eventUrl = parseUrl(item.eventUrl);
    const eventId = eventUrl ? getSearchParamIgnoreCase(eventUrl, options.journeyConfig.eventUrlParam).trim() : '';
    if (eventId) {
      eventIdByIndex.set(index, eventId);
      idSet.add(eventId);
    }
    const sourceMs = parseTimestampToMs(item.sourceTime);
    const eventMs = parseTimestampToMs(item.eventTime);
    if (sourceMs !== null) {
      minSourceMs = minSourceMs === null ? sourceMs : Math.min(minSourceMs, sourceMs);
    }
    if (eventMs !== null) {
      maxEventMs = maxEventMs === null ? eventMs : Math.max(maxEventMs, eventMs);
    }
  });

  if (idSet.size === 0 || minSourceMs === null || maxEventMs === null || maxEventMs < minSourceMs) {
    return rows.map(() => null);
  }

  const tableNames = resolveTableNamesByPattern(options.journeyConfig.athenaTableName, minSourceMs, maxEventMs);
  if (tableNames.length === 0) {
    return rows.map(() => null);
  }

  const quotedUrlField = quoteQualifiedIdentifier(options.journeyConfig.athenaUrlField);
  const quotedTimeField = quoteQualifiedIdentifier(options.journeyConfig.athenaTimeField);
  if (!quotedUrlField || !quotedTimeField) {
    return rows.map(() => null);
  }

  const candidateMap = new Map<string, CandidateJourneyRow[]>();
  const firstLike = `%?${options.journeyConfig.athenaUrlParam}=%`;
  const secondLike = `%&${options.journeyConfig.athenaUrlParam}=%`;

  for (const rawTableName of tableNames) {
    const quotedTableName = quoteQualifiedIdentifier(rawTableName);
    if (!quotedTableName) continue;

    const query = `
      SELECT to_jsonb(t) AS row_json, ${quotedUrlField}::text AS journey_url, ${quotedTimeField}::text AS journey_time
      FROM ${quotedTableName} AS t
      WHERE ${quotedUrlField} IS NOT NULL
        AND (${quotedUrlField}::text ILIKE $1 OR ${quotedUrlField}::text ILIKE $2)
    `;
    let rowsFromTable: Array<{ row_json: unknown; journey_url: unknown; journey_time: unknown }> = [];
    try {
      rowsFromTable = (await (db as any).$queryRawUnsafe(query, firstLike, secondLike)) || [];
    } catch {
      continue;
    }

    for (const row of rowsFromTable) {
      const urlRaw = typeof row.journey_url === 'string' ? row.journey_url.trim() : String(row.journey_url ?? '').trim();
      if (!urlRaw) continue;
      const parsedUrl = parseUrl(urlRaw);
      if (!parsedUrl) continue;

      const idValue = getSearchParamIgnoreCase(parsedUrl, options.journeyConfig.athenaUrlParam).trim();
      if (!idValue || !idSet.has(idValue)) continue;

      const tsMs = parseTimestampToMs(String(row.journey_time ?? ''));
      if (tsMs === null || tsMs < minSourceMs || tsMs > maxEventMs) continue;

      const rowJson =
        row.row_json && typeof row.row_json === 'object' && !Array.isArray(row.row_json)
          ? (row.row_json as Record<string, unknown>)
          : {};

      const bucket = candidateMap.get(idValue) || [];
      bucket.push({
        tsMs,
        row: rowJson,
      });
      candidateMap.set(idValue, bucket);
    }
  }

  candidateMap.forEach((items, key) => {
    items.sort((a, b) => a.tsMs - b.tsMs);
    candidateMap.set(key, items);
  });

  return rows.map((item, index) => {
    const eventId = eventIdByIndex.get(index) || '';
    const sourceMs = parseTimestampToMs(item.sourceTime);
    const eventMs = parseTimestampToMs(item.eventTime);
    const candidates = eventId ? candidateMap.get(eventId) || [] : [];
    const inWindow = candidates.filter((candidate) => {
      if (sourceMs !== null && candidate.tsMs < sourceMs) return false;
      if (eventMs !== null && candidate.tsMs > eventMs) return false;
      return true;
    });

    return inWindow.slice(0, MAX_JOURNEY_ROWS_PER_EVENT).map((candidate) => candidate.row);
  });
}
