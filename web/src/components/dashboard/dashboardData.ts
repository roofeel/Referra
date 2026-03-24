export type MetricTone = 'positive' | 'negative' | 'neutral';

export type Metric = {
  title: string;
  value: string;
  note: string;
  tone: MetricTone;
  icon: string;
  progress?: number;
};

export type DistributionItem = {
  label: string;
  height: string;
  color: string;
};

export type DashboardInsightsPayload = {
  parsingSuccess: number;
  missedRules: number;
  aiParameterCoverage: number;
  unmatchedTokens: number;
  aiConfidenceAvg: number;
};

export type ReferrerTypeStat = {
  referrerType: string;
  count: number;
  percentage: number;
};

export type TableRow = {
  eventId: string;
  uid: string;
  eventName: string;
  ts: string;
  category: string;
  type: string;
  status: string;
  duration: string;
};

export type EventDetail = {
  url: string;
  ruleVersion: string;
  matchedRuleId: string;
  confidenceScore: string;
  aiResult: string;
  extractedParameters: Array<[string, string]>;
  attributionPath: Array<[string, string, string]>;
};

export function statusClasses(status: string) {
  if (status === 'SUCCESS') {
    return 'bg-emerald-500 text-emerald-600';
  }

  if (status === 'PENDING') {
    return 'bg-blue-500 text-blue-600';
  }

  return 'bg-rose-500 text-rose-600';
}
