import { PrismaClient } from "@prisma/client";

export const db = new PrismaClient();

export async function initDatabase() {
  try {
    await db.$connect();
    console.log("Database connected successfully");
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "errorCode" in error &&
      error.errorCode === "P1003"
    ) {
      console.error(
        "Database does not exist. Check DATABASE_URL and create the target PostgreSQL database before starting the API.",
      );
    }
    console.error("Failed to connect to database:", error);
    throw error;
  }
}

export function generateId() {
  return crypto.randomUUID();
}
