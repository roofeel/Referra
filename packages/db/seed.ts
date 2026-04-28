import { initDatabase, clients, users } from "./index.js";

console.log("Initializing database...");
await initDatabase();

console.log("Creating seed data...");

// Create users
const user1 = await users.create({
  email: "john@example.com",
  name: "John Doe",
  avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuDHGXN8Y6hzYlCGQKogfljkJrLdsYywA9uCAIF0y1jiN8FC4i4JjoZrtjbBgELKuPDDJ_LvPEe1VnavWA2DDwec7uWBIWY7XHRw9DqfT4f-UEbcF4LJ7szkAsg3DCLVcbluIFOcyU0g87hWR4u5PVAsBdrgfXYb900PtT9YEKHwboavYJ5AJm_cUOyh2gnMUiXbR0d5_EJGdOMGWxz856BNhiw_UhatJCb88hrh0kpQ1mrltLlQVQ-G5l78a6Om6YK9EzjoomcNoZQ",
});

const user2 = await users.create({
  email: "jane@example.com",
  name: "Jane Smith",
});

const user3 = await users.create({
  email: "bob@example.com",
  name: "Bob Johnson",
});

console.log(`Created ${3} users`);

await clients.getOrCreateByName("Demo Client A");
await clients.getOrCreateByName("Demo Client B");
console.log("Created sample clients");
console.log("\nDatabase seeded successfully!");
console.log("\nYou can now start the API server with: bun api/index.ts");
