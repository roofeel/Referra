import { PrismaClient } from "@prisma/client";

export const db = new PrismaClient();

export async function initDatabase() {
  try {
    // Test connection
    await db.$connect();
    console.log("Database connected successfully");
  } catch (error) {
    console.error("Failed to connect to database:", error);
    throw error;
  }
}

export function generateId() {
  return crypto.randomUUID();
}
