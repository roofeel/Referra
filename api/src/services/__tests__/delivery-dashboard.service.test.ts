import { describe, expect, it } from 'bun:test';
import { extractUrlParam, mergeElasticInstalls } from '../delivery-dashboard.service.js';

const creative = 'FeedTV23703-2026-May-MultiVP-Credit_5CashBack-2025MemberTestimonial-Edgar-30s-HifiVideo-16x9-P';
const impressionUrl = `https://impression.api.feedmob.com/v2/23703/impression?CREATIVE=${creative}&DMA=640&APP_NAME=LG+Channels`;

describe('delivery dashboard attribution dimensions', () => {
  it('decodes impression parameters used by both DMA and creative metrics', () => {
    expect(extractUrlParam(impressionUrl, 'dma')).toBe('640');
    expect(extractUrlParam(impressionUrl, 'creative')).toBe(creative);
    expect(extractUrlParam(impressionUrl, 'app_name')).toBe('LG Channels');
  });

  it('counts an install with DMA and creative dimensions', () => {
    const rows = [
      { bucketStart: new Date('2026-08-08T00:00:00.000Z'), metricType: 'dma' as const, dimension: '640', impressions: 10, installs: 0, bidRequests: 0, bids: 0, ipm: 0 },
      { bucketStart: new Date('2026-08-08T00:00:00.000Z'), metricType: 'creative' as const, dimension: creative, impressions: 10, installs: 0, bidRequests: 0, bids: 0, ipm: 0 },
    ];

    mergeElasticInstalls(rows, [{
      eventTime: new Date('2026-08-08T12:00:00.000Z'),
      creative: extractUrlParam(impressionUrl, 'creative'),
      dma: extractUrlParam(impressionUrl, 'dma'),
    }]);

    expect(rows.find((row) => row.metricType === 'dma')?.installs).toBe(1);
    expect(rows.find((row) => row.metricType === 'creative')?.installs).toBe(1);
    expect(rows.find((row) => row.metricType === 'creative')?.ipm).toBe(100);
  });
});
