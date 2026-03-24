import { initDatabase } from "../packages/db/index.js";
import { handleRequest } from "./src/http/app.js";

await initDatabase();

Bun.serve({
  port: 3000,
  fetch: handleRequest,
  development: {
    hmr: true,
    console: true,
  },
});

console.log("API server running on http://localhost:3000");
