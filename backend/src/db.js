import { PrismaClient } from "../generated/prisma/index.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { setTimeout as delay } from "node:timers/promises";
import { config } from "./config.js";
const adapter = new PrismaPg({
  connectionString: config.databaseUrl,
  max: Number(process.env.DB_POOL_MAX || 10),
  connectionTimeoutMillis: 10000,
  statement_timeout: 15000,
  options: "-c timezone=UTC",
});
export const prisma = new PrismaClient({
  adapter,
});
// Callbacks contain database work only: retries must not send emails or external requests.
export async function transaction(callback) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(callback, {
        isolationLevel: "Serializable",
        maxWait: 10000,
        timeout: 30000,
      });
    } catch (error) {
      if (error.code !== "P2034" || attempt === 2) throw error;
      await delay(20 * (attempt + 1));
    }
  }
}
