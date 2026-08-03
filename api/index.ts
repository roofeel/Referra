import { initDatabase } from "../packages/db/index.js";
import { captureApiException, initSentry } from "./src/config/sentry.js";
import { handleRequest } from "./src/http/app.js";
import { startDeliveryMetricScheduler } from './src/services/delivery-dashboard.service.js';

initSentry();

process.on("unhandledRejection", (reason) => {
  captureApiException(reason);
});

process.on("uncaughtException", (error) => {
  captureApiException(error);
});

await initDatabase();
startDeliveryMetricScheduler();

Bun.serve({
  port: 3000,
  fetch: handleRequest,
  development: {
    hmr: true,
    console: true,
  },
});

console.log("API server running on http://localhost:3000");
