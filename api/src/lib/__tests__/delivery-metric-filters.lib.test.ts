import { describe, expect, it } from 'bun:test';
import { parseDeliveryMetricFilters } from '../delivery-metric-filters.lib';

describe('delivery metric filters JSON', () => {
  it('accepts the settings format and existing field aliases', () => {
    expect(parseDeliveryMetricFilters([
      { clickUrlId: 23703, showBid: true, name: ' Bidder A ' },
      { id: '45678', showBid: false, clickUrlLabel: 'Bidder B' },
      { id: 1, showBid: false },
    ])).toEqual([
      { id: 23703, showBid: true, label: 'Bidder A' },
      { id: 45678, showBid: false, label: 'Bidder B' },
      { id: 1, showBid: false, label: 'Click URL 1' },
    ]);
    expect(parseDeliveryMetricFilters([])).toEqual([]);
  });

  it('rejects invalid IDs, duplicate IDs and invalid field types', () => {
    for (const id of [null, false, '', ' ', -1, 1.5, 'invalid', undefined]) {
      expect(() => parseDeliveryMetricFilters([{ clickUrlId: id, showBid: false }])).toThrow();
    }
    expect(() => parseDeliveryMetricFilters([{ id: 1, showBid: 'true' }])).toThrow('showBid');
    expect(() => parseDeliveryMetricFilters([{ id: 1, showBid: false, name: 123 }])).toThrow('Name');
    expect(() => parseDeliveryMetricFilters([{ id: 1, showBid: false }, { clickUrlId: 1, showBid: true }])).toThrow('Duplicate');
    for (const value of [undefined, null, {}, '[]', [null], [[]]]) {
      expect(() => parseDeliveryMetricFilters(value)).toThrow();
    }
  });
});
