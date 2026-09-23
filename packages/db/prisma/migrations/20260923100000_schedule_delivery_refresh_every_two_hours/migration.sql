UPDATE "DeliveryRefreshJob"
SET "cronExpression" = '0 */2 * * *'
WHERE "jobId" = 'delivery-overview-refresh';
