import { db } from '../../../packages/db/index.js';
import { parseDeliveryMetricFilters } from '../lib/delivery-metric-filters.lib.js';
import type { DeliveryMetricFilter } from '../lib/delivery-metric-filters.lib.js';

const settingsId = 'delivery-dashboard';

function toSettings(filters: DeliveryMetricFilter[]) {
  return { filters: filters.map(({ id, showBid, label }) => ({ clickUrlId: id, showBid, name: label })) };
}

export async function getDeliveryMetricFilters() {
  const settings = await db.deliveryDashboardSettings.findUnique({ where: { id: settingsId } });
  return parseDeliveryMetricFilters(settings?.filters ?? []);
}

export async function getDeliveryMetricFilterSettings() {
  return toSettings(await getDeliveryMetricFilters());
}

export async function saveDeliveryMetricFilterSettings(filters: DeliveryMetricFilter[]) {
  const settings = toSettings(filters);
  await db.deliveryDashboardSettings.upsert({
    where: { id: settingsId },
    create: { id: settingsId, filters: settings.filters },
    update: { filters: settings.filters },
  });
  return settings;
}
