import {
  GetQueryExecutionCommand,
  GetQueryResultsCommand,
  StartQueryExecutionCommand,
} from '@aws-sdk/client-athena';
import { HttpRequest } from '@smithy/protocol-http';
import { db } from '../../../packages/db/index.js';
import { createAthenaClient, createElasticsearchSigner } from '../lib/aws-clients.lib.js';

type AggregatedRow = {
  bucketStart: Date;
  metricType: 'hourly' | 'dma' | 'creative';
  dimension: string;
  impressions: number;
  installs: number;
  bidRequests: number;
  bids: number;
  ipm: number;
};

type ElasticInstall = {
  eventTime: Date;
  creative: string;
  dma: string;
};

export type DeliveryMetricFilter = { id: number; showBid: boolean };

const refreshPromises = new Map<string, Promise<{ rows: number; refreshedAt: string }>>();

export function isDeliveryMetricsRefreshing() {
  return refreshPromises.size > 0;
}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for delivery dashboard aggregation`);
  return value;
}

function identifier(value: string, name: string) {
  if (!/^[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)?$/.test(value)) {
    throw new Error(`${name} must be a valid Athena table identifier`);
  }
  return value;
}

export function parseDeliveryMetricFilters(value = process.env.DELIVERY_METRICS_FILTERS || process.env.DELIVERY_METRICS_FILTER || ''): DeliveryMetricFilter[] {
  return value.split(',').map((entry) => entry.trim()).filter(Boolean).map((entry) => {
    const [idValue, showBidValue = 'false'] = entry.split(':').map((part) => part.trim());
    const id = Number(idValue);
    if (!Number.isSafeInteger(id) || id < 0) throw new Error(`DELIVERY_METRICS_FILTERS contains an invalid id: ${idValue}`);
    if (!/^(true|false)$/i.test(showBidValue)) throw new Error(`DELIVERY_METRICS_FILTERS contains an invalid showBid value for ${idValue}`);
    return { id, showBid: showBidValue.toLowerCase() === 'true' };
  });
}

function getConfig() {
  const impressionTable = identifier(process.env.ATHENA_IMPRESSION_TABLE?.trim() || 'impression_logs', 'ATHENA_IMPRESSION_TABLE');
  const installTable = identifier(process.env.ATHENA_INSTALL_TABLE?.trim() || 'tracking_lb_logs', 'ATHENA_INSTALL_TABLE');
  const bidTable = identifier(process.env.ATHENA_BID_TABLE?.trim() || 'fm_bidding_agent_production_bids', 'ATHENA_BID_TABLE');
  const filters = parseDeliveryMetricFilters();
  return {
    database: requiredEnv('ATHENA_DATABASE'),
    workgroup: process.env.ATHENA_WORKGROUP?.trim() || 'primary',
    outputLocation: requiredEnv('ATHENA_OUTPUT_LOCATION'),
    impressionTable,
    installTable,
    bidTable,
    filters,
    bidMetricsEnabled: filters.some((filter) => filter.showBid),
  };
}

function getElasticConfig() {
  const url = process.env.ELASTICSEARCH_URL?.trim();
  if (!url) throw new Error('ELASTICSEARCH_URL is required for attributed install aggregation');
  return {
    url: url.replace(/\/$/, ''),
    index: process.env.ELASTICSEARCH_INDEX?.trim() || 'conversion_records-*',
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function buildAggregationSql(config: ReturnType<typeof getConfig>, date: string) {
  // Athena's URL helper decodes query parameters (including '+' and percent
  // encoding), keeping impression dimensions identical to the ES parser below.
  const creativeExpression = "coalesce(nullif(url_extract_parameter(url, 'CREATIVE'), ''), 'Unknown')";
  const dmaExpression = "coalesce(nullif(url_extract_parameter(url, 'DMA'), ''), 'Unknown')";
  const impressionFilter = config.filters.length
    ? `AND (${config.filters.map(({ id }) => `url LIKE '%/v2/${id}/impression%'`).join(' OR ')})`
    : '';
  const bidEvents = config.bidMetricsEnabled ? `
bid_events AS (
  SELECT date_trunc('hour', from_iso8601_timestamp(json_extract_scalar(raw_json, '$.timestamp'))) AS bucket_start,
    cardinality(coalesce(cast(json_extract(raw_json, '$.response.bids') AS array(json)), cast(array[] AS array(json)))) AS bid_count
  FROM ${config.bidTable}
  WHERE "date" = '${date}'
),` : '';
  return `
WITH impression_events AS (
  SELECT
    date_trunc('hour', from_iso8601_timestamp(substr("timestamp", 1, 19))) AS bucket_start,
    ${creativeExpression} AS creative,
    ${dmaExpression} AS dma
  FROM ${config.impressionTable}
  WHERE month = date_format(DATE '${date}', '%Y/%m')
    ${impressionFilter}
    AND from_iso8601_timestamp(substr("timestamp", 1, 19)) >= CAST(DATE '${date}' AS timestamp)
    AND from_iso8601_timestamp(substr("timestamp", 1, 19)) < CAST(date_add('day', 1, DATE '${date}') AS timestamp)
),${bidEvents}
hourly AS (
  SELECT
    ${config.bidMetricsEnabled ? 'coalesce(i.bucket_start, b.bucket_start)' : 'i.bucket_start'} AS bucket_start,
    'hourly' AS metric_type,
    'ALL' AS dimension,
    coalesce(i.impressions, 0) AS impressions,
    0 AS installs,
    ${config.bidMetricsEnabled ? 'coalesce(b.bid_requests, 0)' : '0'} AS bid_requests,
    ${config.bidMetricsEnabled ? 'coalesce(b.bids, 0)' : '0'} AS bids
  FROM (
    SELECT bucket_start, count(*) AS impressions
    FROM impression_events
    GROUP BY bucket_start
  ) i
  ${config.bidMetricsEnabled ? `FULL OUTER JOIN (
    SELECT bucket_start, count(*) AS bid_requests,
      sum(CASE WHEN bid_count > 0 THEN 1 ELSE 0 END) AS bids
    FROM bid_events GROUP BY bucket_start
  ) b ON b.bucket_start = i.bucket_start` : ''}
),
dma_daily AS (
  SELECT
    date_trunc('day', i.bucket_start) AS bucket_start,
    'dma' AS metric_type,
    i.dma AS dimension,
    count(*) AS impressions,
    0 AS installs,
    0 AS bid_requests,
    0 AS bids
  FROM impression_events i
  GROUP BY date_trunc('day', i.bucket_start), i.dma
),
creative_daily AS (
  SELECT
    date_trunc('day', i.bucket_start) AS bucket_start,
    'creative' AS metric_type,
    i.creative AS dimension,
    count(*) AS impressions,
    0 AS installs,
    0 AS bid_requests,
    0 AS bids
  FROM impression_events i
  GROUP BY date_trunc('day', i.bucket_start), i.creative
)
SELECT bucket_start, metric_type, dimension, impressions, installs, bid_requests, bids,
  round(1000.0 * installs / nullif(impressions, 0), 4) AS ipm
FROM (SELECT * FROM hourly UNION ALL SELECT * FROM dma_daily UNION ALL SELECT * FROM creative_daily)
ORDER BY bucket_start, metric_type, dimension
`;
}

async function runQuery(query: string, config: ReturnType<typeof getConfig>) {
  const athena = createAthenaClient();
  const started = await athena.send(new StartQueryExecutionCommand({
    QueryString: query,
    QueryExecutionContext: { Database: config.database },
    ResultConfiguration: { OutputLocation: config.outputLocation },
    WorkGroup: config.workgroup,
  }));
  const queryExecutionId = started.QueryExecutionId;
  if (!queryExecutionId) throw new Error('Athena did not return a query execution id');

  for (;;) {
    await sleep(2_000);
    const execution = await athena.send(new GetQueryExecutionCommand({ QueryExecutionId: queryExecutionId }));
    const state = execution.QueryExecution?.Status?.State;
    if (state === 'SUCCEEDED') break;
    if (state === 'FAILED' || state === 'CANCELLED') {
      throw new Error(`Delivery aggregation Athena query ${state}: ${execution.QueryExecution?.Status?.StateChangeReason || 'unknown reason'}`);
    }
  }

  const rows: string[][] = [];
  let nextToken: string | undefined;
  do {
    const result = await athena.send(new GetQueryResultsCommand({ QueryExecutionId: queryExecutionId, NextToken: nextToken }));
    for (const row of result.ResultSet?.Rows || []) {
      rows.push((row.Data || []).map((cell) => cell.VarCharValue ?? ''));
    }
    nextToken = result.NextToken;
  } while (nextToken);
  return rows.slice(1);
}

export function extractUrlParam(url: string, name: string) {
  try {
    const params = new URL(url).searchParams;
    for (const [key, value] of params.entries()) {
      if (key.toLowerCase() === name.toLowerCase()) return value.trim() || 'Unknown';
    }
    return 'Unknown';
  } catch {
    const match = url.match(new RegExp(`(?:^|[?&])${name}=([^&#]*)`, 'i'));
    if (!match?.[1]) return 'Unknown';
    try {
      return decodeURIComponent(match[1]).trim() || 'Unknown';
    } catch {
      return match[1].trim() || 'Unknown';
    }
  }
}

function extractCreative(url: string) {
  return extractUrlParam(url, 'CREATIVE');
}

function extractDma(url: string) {
  return extractUrlParam(url, 'DMA');
}

async function fetchElasticInstalls(from: Date, to: Date, filters = parseDeliveryMetricFilters()): Promise<ElasticInstall[]> {
  const config = getElasticConfig();
  const installs: ElasticInstall[] = [];
  let searchAfter: unknown[] | undefined;
  const signer = createElasticsearchSigner();

  for (;;) {
    const searchBody = {
      size: 1000,
      _source: ['click_event_time', 'click_ourl'],
      sort: [{ click_event_time: 'asc' }, { _id: 'asc' }],
      ...(searchAfter ? { search_after: searchAfter } : {}),
      query: {
        bool: {
          filter: [
            ...(filters.length ? [{ terms: { click_url_id: filters.map((filter) => filter.id) } }] : []),
            { term: { status: 'normal' } },
            { term: { track_type: 'install' } },
            { range: { click_event_time: { gte: from.toISOString(), lt: to.toISOString() } } },
            { exists: { field: 'click_ourl' } },
          ],
        },
      },
    };
    const searchUrl = new URL(`${config.url}/${encodeURIComponent(config.index)}/_search`);
    searchUrl.searchParams.set('source', JSON.stringify(searchBody));
    searchUrl.searchParams.set('source_content_type', 'application/json');

    const signedRequest = await signer.sign(new HttpRequest({
      protocol: searchUrl.protocol,
      hostname: searchUrl.hostname,
      port: searchUrl.port ? Number(searchUrl.port) : undefined,
      method: 'GET',
      path: searchUrl.pathname,
      query: Object.fromEntries(searchUrl.searchParams.entries()),
      headers: { host: searchUrl.host },
    }));

    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: signedRequest.headers,
    });
    if (!response.ok) throw new Error(`Elasticsearch query failed (${response.status}): ${(await response.text()).slice(0, 500)}`);
    const payload = await response.json() as {
      hits?: { hits?: Array<{ _source?: { click_event_time?: string; click_ourl?: string }; sort?: unknown[] }> };
    };
    const hits = payload.hits?.hits || [];
    for (const hit of hits) {
      const eventTime = new Date(hit._source?.click_event_time || '');
      const url = hit._source?.click_ourl || '';
      if (!url || Number.isNaN(eventTime.getTime())) continue;
      installs.push({ eventTime, creative: extractCreative(url), dma: extractDma(url) });
    }
    if (hits.length < 1000) break;
    searchAfter = hits[hits.length - 1]?.sort;
    if (!searchAfter) throw new Error('Elasticsearch did not return sort values for pagination');
  }
  return installs;
}

function parseRows(rows: string[][]): AggregatedRow[] {
  return rows.flatMap((row) => {
    if (row.length < 8) return [];
    const bucketStart = new Date(row[0]!);
    if (Number.isNaN(bucketStart.getTime())) return [];
    return [{
      bucketStart,
      metricType: row[1] as 'hourly' | 'dma' | 'creative',
      dimension: row[2] || 'Unknown',
      impressions: Number(row[3]) || 0,
      installs: Number(row[4]) || 0,
      bidRequests: Number(row[5]) || 0,
      bids: Number(row[6]) || 0,
      ipm: Number(row[7]) || 0,
    }];
  });
}

export function mergeElasticInstalls(rows: AggregatedRow[], installs: ElasticInstall[]) {
  const hourly = new Map(rows.filter((row) => row.metricType === 'hourly').map((row) => [row.bucketStart.getTime(), row]));
  const dma = new Map(rows.filter((row) => row.metricType === 'dma').map((row) => [`${row.bucketStart.getTime()}\u0000${row.dimension}`, row]));
  const creative = new Map(rows.filter((row) => row.metricType === 'creative').map((row) => [`${row.bucketStart.getTime()}\u0000${row.dimension}`, row]));
  for (const install of installs) {
    const hour = new Date(install.eventTime);
    hour.setUTCMinutes(0, 0, 0);
    const hourRow = hourly.get(hour.getTime());
    if (hourRow) hourRow.installs += 1;

    const day = new Date(install.eventTime);
    day.setUTCHours(0, 0, 0, 0);
    const dmaKey = `${day.getTime()}\u0000${install.dma}`;
    let dmaRow = dma.get(dmaKey);
    if (!dmaRow) {
      dmaRow = { bucketStart: day, metricType: 'dma', dimension: install.dma, impressions: 0, installs: 0, bidRequests: 0, bids: 0, ipm: 0 };
      rows.push(dmaRow);
      dma.set(dmaKey, dmaRow);
    }
    dmaRow.installs += 1;

    const key = `${day.getTime()}\u0000${install.creative}`;
    let creativeRow = creative.get(key);
    if (!creativeRow) {
      creativeRow = { bucketStart: day, metricType: 'creative', dimension: install.creative, impressions: 0, installs: 0, bidRequests: 0, bids: 0, ipm: 0 };
      rows.push(creativeRow);
      creative.set(key, creativeRow);
    }
    creativeRow.installs += 1;
  }
  for (const row of rows) {
    if (row.metricType === 'creative') row.ipm = row.impressions ? (row.installs / row.impressions) * 1000 : 0;
    if (row.metricType === 'dma') row.ipm = row.impressions ? (row.installs / row.impressions) * 1000 : 0;
    if (row.metricType === 'hourly') row.ipm = row.impressions ? (row.installs / row.impressions) * 1000 : 0;
  }
}

export async function refreshDeliveryMetrics(date = new Date().toISOString().slice(0, 10)) {
  const running = refreshPromises.get(date);
  if (running) return running;
  const refreshPromise = (async () => {
    const config = getConfig();
    const rows = parseRows(await runQuery(buildAggregationSql(config, date), config));
    const from = new Date(`${date}T00:00:00.000Z`);
    const to = new Date(from);
    to.setUTCDate(to.getUTCDate() + 1);
    mergeElasticInstalls(rows, await fetchElasticInstalls(from, to, config.filters));
    // Rebuild only the requested date. Keep other dates intact so a manual
    // refresh for a historical date cannot corrupt today's dashboard.
    await (db as any).deliveryMetric.deleteMany({
      where: { bucketStart: { gte: from, lt: to } },
    });
    for (const row of rows) {
      await (db as any).deliveryMetric.upsert({
        where: { bucketStart_metricType_dimension: { bucketStart: row.bucketStart, metricType: row.metricType, dimension: row.dimension } },
        create: row,
        update: row,
      });
    }
    return { rows: rows.length, refreshedAt: new Date().toISOString() };
  })().finally(() => {
    refreshPromises.delete(date);
  });
  refreshPromises.set(date, refreshPromise);
  return refreshPromise;
}

export async function getDeliveryDashboard(date = new Date().toISOString().slice(0, 10)) {
  const rangeSince = new Date(`${date}T00:00:00.000Z`);
  const rangeUntil = new Date(rangeSince);
  rangeUntil.setUTCDate(rangeUntil.getUTCDate() + 1);
  const comparisonStart = new Date(rangeSince);
  comparisonStart.setUTCDate(comparisonStart.getUTCDate() - 1);
  const rows = await (db as any).deliveryMetric.findMany({
    where: { bucketStart: { gte: comparisonStart, lt: rangeUntil } },
    orderBy: { bucketStart: 'asc' },
  }) as Array<AggregatedRow & { updatedAt: Date }>;
  const allHourly = rows.filter((row) => row.metricType === 'hourly');
  const hourly = allHourly.filter((row) => row.bucketStart >= rangeSince && row.bucketStart < rangeUntil);
  const dma = rows.filter((row) => row.metricType === 'dma' && row.bucketStart >= rangeSince && row.bucketStart < rangeUntil);
  const creative = rows.filter((row) => row.metricType === 'creative' && row.bucketStart >= rangeSince && row.bucketStart < rangeUntil);
  const today = hourly;
  const comparisonRows = allHourly.filter((row) => row.bucketStart >= comparisonStart);
  const comparisonByHour = new Map<number, { time: Date; today: number; yesterday: number }>();
  const comparisonCutoff = rangeSince;
  comparisonRows.forEach((row) => {
    const isToday = row.bucketStart >= comparisonCutoff;
    const comparisonTime = isToday
      ? row.bucketStart
      : new Date(row.bucketStart.getTime() + 24 * 60 * 60 * 1000);
    const key = comparisonTime.getTime();
    const current = comparisonByHour.get(key) || { time: comparisonTime, today: 0, yesterday: 0 };
    if (isToday) current.today += Number(row.impressions || 0);
    else current.yesterday += Number(row.impressions || 0);
    comparisonByHour.set(key, current);
  });
  const previousHourlyByHour = new Map<number, AggregatedRow>();
  allHourly.filter((row) => row.bucketStart < rangeSince).forEach((row) => {
    previousHourlyByHour.set(row.bucketStart.getUTCHours(), row);
  });
  const total = (key: keyof AggregatedRow) => today.reduce((sum, row) => sum + Number(row[key] || 0), 0);
  const lastUpdated = rows.reduce<Date | null>((latest, row) => !latest || row.updatedAt > latest ? row.updatedAt : latest, null);

  const dmaTotals = Array.from(dma.reduce((result, row) => {
    const current = result.get(row.dimension) || { dma: row.dimension, impressions: 0, installs: 0 };
    current.impressions += row.impressions;
    current.installs += row.installs;
    result.set(row.dimension, current);
    return result;
  }, new Map<string, { dma: string; impressions: number; installs: number }>()).values())
    .map((row) => ({ ...row, ipm: row.impressions ? (row.installs / row.impressions) * 1000 : 0 }))
    .sort((left, right) => right.ipm - left.ipm)
    .slice(0, 5);

  const creativeTotals = Array.from(creative.reduce((result, row) => {
    const current = result.get(row.dimension) || { creative: row.dimension, impressions: 0, installs: 0 };
    current.impressions += row.impressions;
    current.installs += row.installs;
    result.set(row.dimension, current);
    return result;
  }, new Map<string, { creative: string; impressions: number; installs: number }>()).values())
    .map((row) => ({ ...row, ipm: row.impressions ? (row.installs / row.impressions) * 1000 : 0 }))
    .sort((left, right) => right.ipm - left.ipm)
    .slice(0, 10);

  return {
    source: 'athena',
    bidMetricsEnabled: getConfig().bidMetricsEnabled,
    lastUpdated: lastUpdated?.toISOString() || null,
    metrics: { impressions: total('impressions'), installs: total('installs'), bidRequests: total('bidRequests'), bids: total('bids'), ipm: total('impressions') ? (total('installs') / total('impressions')) * 1000 : 0 },
    hourly: hourly.map((row) => ({
      time: row.bucketStart.toISOString(),
      ipm: row.ipm,
      previousIpm: previousHourlyByHour.get(row.bucketStart.getUTCHours())?.ipm || 0,
      impressions: row.impressions,
      installs: row.installs,
      bidResponses: row.bids,
      bidRate: row.bidRequests ? (row.bids / row.bidRequests) * 100 : 0,
      winRate: row.bids ? (row.impressions / row.bids) * 100 : 0,
    })),
    comparison: Array.from(comparisonByHour.values())
      .sort((left, right) => left.time.getTime() - right.time.getTime())
      .map((row) => ({ time: row.time.toISOString(), today: row.today, yesterday: row.yesterday })),
    dma: dmaTotals,
    creative: creativeTotals,
  };
}

export function startDeliveryMetricScheduler() {
  const enabled = (process.env.DELIVERY_METRICS_ENABLED || 'true').toLowerCase() !== 'false';
  if (!enabled) return;
  const intervalMs = Math.max(Number(process.env.DELIVERY_METRICS_INTERVAL_MS) || 3_600_000, 60_000);
  const run = () => void refreshDeliveryMetrics().catch((error) => console.error('[delivery-metrics] refresh failed:', error));
  if ((process.env.DELIVERY_METRICS_RUN_ON_START || 'true').toLowerCase() === 'true') run();
  setInterval(run, intervalMs);
  console.log(`[delivery-metrics] scheduler started, interval=${intervalMs}ms`);
}
