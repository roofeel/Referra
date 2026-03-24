export type ReportTaskStatus = 'Running' | 'Completed' | 'Failed' | 'Paused';

export function normalizeReportTaskStatus(raw?: string | null): ReportTaskStatus | undefined {
  const status = raw?.trim().toLowerCase();
  if (!status) return undefined;

  if (status === 'running') return 'Running';
  if (status === 'completed') return 'Completed';
  if (status === 'failed') return 'Failed';
  if (status === 'paused') return 'Paused';
  return undefined;
}

export function computeSuccessRateAvg(list: Array<{ attribution: string }>) {
  const values = list
    .map((task) => Number.parseFloat(task.attribution.replace('%', '')))
    .filter((value) => Number.isFinite(value));

  if (values.length === 0) return 0;

  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.round(avg * 10) / 10;
}

function pad(value: number) {
  return value.toString().padStart(2, '0');
}

export function formatCreatedAt(dateInput: Date | string) {
  const date = new Date(dateInput);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const hours24 = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  return `${months[date.getMonth()]} ${pad(date.getDate())}, ${pad(hours12)}:${pad(minutes)} ${ampm}`;
}

export function formatCompactCount(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '0';
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export function progressLabelFor(status: ReportTaskStatus, progress: number) {
  if (status === 'Completed') return '100% Success';
  if (status === 'Running') return `${progress}% Processed`;
  if (status === 'Paused') return `${progress}% Complete`;
  return progress <= 0 ? 'Failed' : `Error after ${progress}%`;
}
