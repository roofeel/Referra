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

export const metrics: Metric[] = [
  { title: 'Total Events', value: '1,284,930', note: '12.4% vs prev', tone: 'positive', icon: 'data_object' },
  { title: 'Impression Count', value: '842,102', note: '65% of total volume', tone: 'neutral', icon: 'visibility', progress: 65 },
  { title: 'Pageload Count', value: '312,440', note: '37.1% conversion from imp', tone: 'neutral', icon: 'browser_updated' },
  { title: 'Registration Count', value: '12,840', note: '2.1% vs target', tone: 'negative', icon: 'person_add' },
  { title: 'Successful Attributions', value: '9,412', note: 'Verified logical chains', tone: 'neutral', icon: 'check_circle' },
  { title: 'Attribution Rate (%)', value: '73.3%', note: 'Target: > 75.0%', tone: 'neutral', icon: 'percent' },
  { title: 'Avg Duration', value: '4.2h', note: 'Time-to-action median', tone: 'neutral', icon: 'timer' },
];

export const distribution: DistributionItem[] = [
  { label: 'organic', height: '85%', color: 'bg-blue-700' },
  { label: 'referral', height: '45%', color: 'bg-blue-300' },
  { label: 'direct', height: '25%', color: 'bg-slate-300' },
  { label: 'paid', height: '60%', color: 'bg-blue-500/45' },
];

export const tableRows: TableRow[] = [
  {
    eventId: 'ev_9x128a',
    uid: 'u_881-x92',
    eventName: 'REGISTRATION',
    ts: '2023-10-24 14:22:01',
    category: 'Organic Search',
    type: 'Direct Link',
    status: 'SUCCESS',
    duration: '12.4m',
  },
  {
    eventId: 'ev_9x129b',
    uid: 'u_421-k12',
    eventName: 'PAGELOAD',
    ts: '2023-10-24 14:23:45',
    category: 'Paid Social',
    type: 'Short URL',
    status: 'PENDING',
    duration: '0.8m',
  },
  {
    eventId: 'ev_9x130c',
    uid: 'u_109-f54',
    eventName: 'REGISTRATION',
    ts: '2023-10-24 14:25:12',
    category: 'Referral',
    type: 'Partner Portal',
    status: 'UNMATCHED',
    duration: '4.1h',
  },
  {
    eventId: 'ev_9x131d',
    uid: 'u_881-x92',
    eventName: 'IMPRESSION',
    ts: '2023-10-24 14:26:59',
    category: 'Internal',
    type: 'Cross-Product',
    status: 'SUCCESS',
    duration: '--',
  },
];

export const eventDetails: Record<string, EventDetail> = {
  ev_9x128a: {
    url: 'https://enterprise.kinetic-intel.com/v1/auth/callback?session=xyz_7721&ref=ad_campaign_alpha_441&utm_source=google&utm_medium=cpc',
    ruleVersion: 'v2.4.1 (Active)',
    matchedRuleId: 'r_auth_772',
    confidenceScore: '98.2%',
    aiResult: 'Parameter ref mapped to internal_campaign_id based on historical path variance.',
    extractedParameters: [
      ['utm_source', 'google'],
      ['session', 'xyz_7721'],
      ['campaign', 'alpha_441'],
    ],
    attributionPath: [
      ['Impression (Ad #441)', 'Oct 24, 09:12 AM • Google Search', 'bg-emerald-500'],
      ['Landing Page', 'Oct 24, 11:45 AM • /solutions/enterprise', 'bg-blue-500'],
      ['Registration', 'Oct 24, 14:22 PM • Success', 'bg-blue-700'],
    ],
  },
  ev_9x129b: {
    url: 'https://engage.kinetic-intel.com/social/launch?click_id=ps_5512&ref=meta_launch_q4&utm_source=meta&utm_medium=paid_social',
    ruleVersion: 'v2.4.1 (Active)',
    matchedRuleId: 'r_social_551',
    confidenceScore: '91.4%',
    aiResult: 'Meta paid-social click identifier aligned with paid_campaign_group after fallback token normalization.',
    extractedParameters: [
      ['utm_source', 'meta'],
      ['click_id', 'ps_5512'],
      ['campaign', 'launch_q4'],
    ],
    attributionPath: [
      ['Paid Social Click', 'Oct 24, 14:17 PM • Meta Campaign', 'bg-blue-500'],
      ['Redirect', 'Oct 24, 14:21 PM • Short URL Resolver', 'bg-slate-400'],
      ['Pageload', 'Oct 24, 14:23 PM • Pending Match', 'bg-blue-700'],
    ],
  },
  ev_9x130c: {
    url: 'https://partners.kinetic-intel.com/invite?partner_id=ref_892&token=zz19-alpha&src=channel_referral',
    ruleVersion: 'v2.3.0 (Specified)',
    matchedRuleId: 'r_partner_089',
    confidenceScore: '64.7%',
    aiResult: 'Referral token likely maps to partner_program_id, but the final registration event is outside the current confidence threshold.',
    extractedParameters: [
      ['partner_id', 'ref_892'],
      ['token', 'zz19-alpha'],
      ['src', 'channel_referral'],
    ],
    attributionPath: [
      ['Referral Click', 'Oct 24, 10:02 AM • Partner Portal', 'bg-emerald-500'],
      ['Landing Page', 'Oct 24, 10:06 AM • /invite/accept', 'bg-blue-500'],
      ['Registration', 'Oct 24, 14:25 PM • Unmatched', 'bg-rose-500'],
    ],
  },
  ev_9x131d: {
    url: 'https://internal.kinetic-intel.com/cross-product?placement=banner_11&origin=analytics_hub&uid=u_881-x92',
    ruleVersion: 'v2.4.1 (Active)',
    matchedRuleId: 'r_internal_118',
    confidenceScore: '96.1%',
    aiResult: 'Cross-product internal source matched through signed placement metadata and prior session stitching.',
    extractedParameters: [
      ['placement', 'banner_11'],
      ['origin', 'analytics_hub'],
      ['uid', 'u_881-x92'],
    ],
    attributionPath: [
      ['Internal Impression', 'Oct 24, 14:26 PM • Analytics Hub', 'bg-emerald-500'],
      ['Cross-Product Link', 'Oct 24, 14:26 PM • Internal Router', 'bg-blue-500'],
      ['Verification', 'Oct 24, 14:27 PM • Success', 'bg-blue-700'],
    ],
  },
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
