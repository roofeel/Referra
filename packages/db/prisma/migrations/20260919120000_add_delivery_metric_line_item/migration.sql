ALTER TABLE "DeliveryMetric" ADD COLUMN "lineItemId" TEXT;

DROP INDEX "DeliveryMetric_bucketStart_metricType_dimension_filterId_key";

CREATE UNIQUE INDEX "DeliveryMetric_bucketStart_metricType_dimension_filterId_lineItemId_key"
ON "DeliveryMetric"("bucketStart", "metricType", "dimension", "filterId", "lineItemId");
