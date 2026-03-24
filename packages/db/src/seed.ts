import { db } from "./client.js";

async function seed() {
  console.log("Seeding database...");

  // Create a test user
  const user = await db.user.upsert({
    where: { email: "test@example.com" },
    update: {},
    create: {
      email: "test@example.com",
      name: "Test User",
      avatar: "https://via.placeholder.com/40",
    },
  });

  console.log("Created test user:", user);
  console.log("\nTest user ID:", user.id);
  console.log("Use this ID as authorId when creating ideas from the frontend.");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
