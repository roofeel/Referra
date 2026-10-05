CREATE TABLE "DeliveryDashboardSettings" (
    "id" TEXT NOT NULL DEFAULT 'delivery-dashboard',
    "filters" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DeliveryDashboardSettings_pkey" PRIMARY KEY ("id")
);
