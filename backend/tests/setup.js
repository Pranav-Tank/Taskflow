import { readFile } from "node:fs/promises";
export async function initialize(pool) {
  await pool.query(
    await readFile(
      new URL(
        "../prisma/migrations/20261103000000_init/migration.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
}
