import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import { generateText } from 'ai';

type JourneyLogEntry = {
  ts: string;
  event: string;
  url: string;
  idValue: string;
};

type JourneyContext = {
  sourceTime: string;
  eventTime: string;
  rows: JourneyLogEntry[];
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function pickText(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
}

function normalizeJourneyEntry(value: unknown): JourneyLogEntry | null {
  const row = asRecord(value);
  const nested = asRecord(row.row);

  const ts =
    pickText(row, ['ts', 'time', 'timestamp', 'event_time', 'registration_time']) ||
    pickText(nested, ['ts', 'time', 'timestamp', 'event_time', 'registration_time']);
  const event = pickText(row, ['event', 'event_name', 'event_type', 'action', 'ev']) || pickText(nested, ['event', 'event_name']);
  const url =
    pickText(row, ['url', 'event_url', 'registration_url', 'ourl', 'page_load_url']) ||
    pickText(nested, ['url', 'event_url', 'registration_url', 'ourl', 'page_load_url']);
  const idValue = pickText(row, ['idValue', 'uid']) || pickText(nested, ['idValue', 'uid']);

  if (!ts && !event && !url && !idValue) return null;
  return {
    ts: ts || '--',
    event: event || '--',
    url: url || '--',
    idValue,
  };
}

function normalizeJourneyContext(journeyLogs: unknown): JourneyContext | null {
  if (!journeyLogs) return null;

  if (Array.isArray(journeyLogs)) {
    const rows = journeyLogs
      .map((item) => normalizeJourneyEntry(item))
      .filter((item): item is JourneyLogEntry => Boolean(item));
    return rows.length > 0 ? { sourceTime: '', eventTime: '', rows } : null;
  }

  const root = asRecord(journeyLogs);
  const rawRows = Array.isArray(root.rows) ? root.rows : [];
  const rows = rawRows
    .map((item) => normalizeJourneyEntry(item))
    .filter((item): item is JourneyLogEntry => Boolean(item));

  if (rows.length === 0) return null;

  return {
    sourceTime: pickText(root, ['source_time', 'sourceTime']),
    eventTime: pickText(root, ['event_time', 'eventTime']),
    rows,
  };
}

function buildPrompt(input: JourneyContext) {
  const context = {
    source_time: input.sourceTime || null,
    event_time: input.eventTime || null,
    journey_logs: input.rows.slice(0, 300),
  };

  return `You are a fraud investigation analyst. Convert the provided journey_logs into a concise, factual markdown timeline report.

Output requirements:
- Use Markdown only.
- Group by day using headings exactly like: Day N: Weekday, Month DD, YYYY (Device: <summary if inferred or Unknown>)
- Under each day, list chronological events as bullet lines in this format: HH:mm:ss: <event narrative>
- Mention suspicious anomalies when obvious (impossible duplicate closes, abrupt device jumps, impossible timing).
- If fields are missing, keep placeholders concise (e.g. unknown url, unknown event).
- Do not invent facts not present in logs.
- Keep raw URLs short when possible; include path or key URL only.

Data context (JSON):
${JSON.stringify(context, null, 2)}`;
}

export async function generateUserJourneyDocFromLogs(journeyLogs: unknown) {
  const normalized = normalizeJourneyContext(journeyLogs);
  if (!normalized) {
    throw new Error('journey_logs is empty');
  }

  const region = process.env.AWS_REGION?.trim() || process.env.AWS_DEFAULT_REGION?.trim() || 'us-east-1';
  const modelId = process.env.BEDROCK_SONNET_MODEL_ID?.trim() || 'global.anthropic.claude-sonnet-4-5-20250929-v1:0';

  const bedrock = createAmazonBedrock({
    region,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  });

  const result = await generateText({
    model: bedrock(modelId),
    prompt: buildPrompt(normalized),
    temperature: 0.2,
    maxOutputTokens: 1800,
  });

  const content = result.text.trim();
  if (!content) {
    throw new Error('model returned empty content');
  }

  return content;
}
