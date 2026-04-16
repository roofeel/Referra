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
  sourceTs: string;
  firstPageLoadTs?: string;
  firstPageLoadDuration?: string;
  firstPageLoadToRegistrationDuration?: string;
  category: string;
  type: string;
  status: string;
  duration: string;
};

export type EventDetail = {
  url: string;
  ruleName: string;
  confidenceScore: string;
  aiResult: string;
  extractedParameters: Array<[string, string]>;
  attributionPath: Array<[string, string, string]>;
  firstPageLoadEventTime?: string;
  firstPageLoadDuration?: string;
  firstPageLoadToRegistrationDuration?: string;
  journey?: {
    sourceWindow: string;
    eventWindow: string;
    eventUrlParam: string;
    athenaUrlParam: string;
    athenaUrlField: string;
    athenaTimeField: string;
    rows: Array<{
      ts: string;
      event: string;
      url: string;
      idValue: string;
    }>;
  };
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
