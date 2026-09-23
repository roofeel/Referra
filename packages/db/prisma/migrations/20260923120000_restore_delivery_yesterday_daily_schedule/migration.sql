UPDATE "DeliveryRefreshJob"
SET "cronExpression" = '0 10 * * *',
    "timezone" = 'UTC'
WHERE "jobId" = 'delivery-overview-refresh';
