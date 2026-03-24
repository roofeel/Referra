import { initDatabase, users, groups, groupMembers, ideas } from "./index.js";

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

// Create groups
const group1 = await groups.create({
  name: "Marketing Q4 Strategy",
  department: "Marketing Department",
  icon: "campaign",
});

const group2 = await groups.create({
  name: "Product Roadmap 2024",
  department: "Product Team",
  icon: "rocket_launch",
});

const group3 = await groups.create({
  name: "Office Redesign Ideas",
  department: "Operations",
  icon: "apartment",
});

console.log(`Created ${3} groups`);

// Add members to groups
await groupMembers.add({ userId: user1.id, groupId: group1.id, role: "admin" });
await groupMembers.add({ userId: user2.id, groupId: group1.id });
await groupMembers.add({ userId: user3.id, groupId: group1.id });

await groupMembers.add({ userId: user1.id, groupId: group2.id });
await groupMembers.add({ userId: user2.id, groupId: group2.id, role: "admin" });

await groupMembers.add({ userId: user3.id, groupId: group3.id, role: "admin" });

console.log("Added members to groups");

// Create ideas
await ideas.create({
  title: "New social media campaign",
  content: "Launch a TikTok campaign targeting Gen Z",
  groupId: group1.id,
  authorId: user1.id,
});

await ideas.create({
  title: "Email marketing automation",
  content: "Implement automated email sequences for leads",
  groupId: group1.id,
  authorId: user2.id,
});

await ideas.create({
  title: "Mobile app redesign",
  content: "Modernize the mobile app UI/UX",
  groupId: group2.id,
  authorId: user2.id,
});

await ideas.create({
  title: "Standing desks for all",
  content: "Replace all desks with adjustable standing desks",
  groupId: group3.id,
  authorId: user3.id,
});

console.log("Created sample ideas");
console.log("\nDatabase seeded successfully!");
console.log("\nYou can now start the API server with: bun api/index.ts");
