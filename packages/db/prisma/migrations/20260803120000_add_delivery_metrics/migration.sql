CREATE TABLE "DeliveryMetric" (
    "id" TEXT NOT NULL,
    "bucketStart" TIMESTAMP(3) NOT NULL,
    "metricType" TEXT NOT NULL,
    "dimension" TEXT NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "installs" INTEGER NOT NULL DEFAULT 0,
    "bidRequests" INTEGER NOT NULL DEFAULT 0,
    "bids" INTEGER NOT NULL DEFAULT 0,
    "ipm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryMetric_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeliveryMetric_bucketStart_metricType_dimension_key"
ON "DeliveryMetric"("bucketStart", "metricType", "dimension");

CREATE INDEX "DeliveryMetric_metricType_bucketStart_idx"
ON "DeliveryMetric"("metricType", "bucketStart");
