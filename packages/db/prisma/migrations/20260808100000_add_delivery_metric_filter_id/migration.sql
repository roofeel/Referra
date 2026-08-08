ALTER TABLE "DeliveryMetric" ADD COLUMN "filterId" INTEGER;

DROP INDEX "DeliveryMetric_bucketStart_metricType_dimension_key";

CREATE UNIQUE INDEX "DeliveryMetric_bucketStart_metricType_dimension_filterId_key"
ON "DeliveryMetric"("bucketStart", "metricType", "dimension", "filterId");
